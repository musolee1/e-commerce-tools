import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

interface SiteProductJSON {
    TrendyolKey: string;
    Barcode: string;
    SitePrice: string;
}

// POST - Delete all first, then fetch from external JSON and save to Supabase
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user settings for the API URL
        const { data: settings } = await supabase
            .from('user_settings')
            .select('site_products_api_url')
            .eq('user_id', user.id)
            .single();

        const siteProductsUrl = settings?.site_products_api_url;

        if (!siteProductsUrl) {
            return NextResponse.json(
                { error: 'Site Ürünleri API URL ayarlanmamış. Lütfen Ayarlar sayfasından API URL\'ini girin.' },
                { status: 400 }
            );
        }

        // ✅ Step 1: Delete all existing products for this user first
        console.log('🗑️ Mevcut site ürünleri siliniyor...');
        const { error: deleteError } = await supabase
            .from('site_products')
            .delete()
            .eq('user_id', user.id);

        if (deleteError) {
            console.error('Delete error:', deleteError);
            return NextResponse.json(
                { error: 'Mevcut veriler silinirken hata oluştu: ' + deleteError.message },
                { status: 500 }
            );
        }
        console.log('✅ Mevcut ürünler silindi');

        // ✅ Step 2: Fetch from external JSON
        console.log('🔍 Site ürünleri çekiliyor:', siteProductsUrl);
        const response = await fetch(siteProductsUrl);

        if (!response.ok) {
            throw new Error(`External API failed: ${response.status}`);
        }

        const jsonData: SiteProductJSON[] = await response.json();

        if (!Array.isArray(jsonData) || jsonData.length === 0) {
            return NextResponse.json({ error: 'Veri bulunamadı' }, { status: 400 });
        }

        console.log(`📦 ${jsonData.length} site ürünü alındı`);

        // ✅ Step 3: Remove duplicates - keep last occurrence of each TrendyolKey
        const uniqueProducts = new Map<string, SiteProductJSON>();
        for (const item of jsonData) {
            if (item.TrendyolKey) {
                uniqueProducts.set(item.TrendyolKey, item);
            }
        }

        console.log(`🔄 ${jsonData.length} üründen ${uniqueProducts.size} benzersiz ürün`);

        // ✅ Step 4: Transform and insert
        const insertData = Array.from(uniqueProducts.values()).map(item => ({
            user_id: user.id,
            trendyol_key: item.TrendyolKey,
            barcode: item.Barcode,
            site_price: parseFloat(item.SitePrice),
            fetched_at: new Date().toISOString(),
        }));

        // Batch insert - 500 at a time
        const BATCH_SIZE = 500;
        let totalInserted = 0;

        for (let i = 0; i < insertData.length; i += BATCH_SIZE) {
            const batch = insertData.slice(i, i + BATCH_SIZE);
            const { error: insertError } = await supabase
                .from('site_products')
                .insert(batch);

            if (insertError) {
                console.error(`Batch ${i / BATCH_SIZE + 1} insert error:`, insertError);
                return NextResponse.json(
                    { error: 'Veriler kaydedilirken hata oluştu: ' + insertError.message },
                    { status: 500 }
                );
            }

            totalInserted += batch.length;
            console.log(`✅ Batch ${i / BATCH_SIZE + 1}: ${batch.length} kayıt eklendi`);
        }

        // Fetch updated products to return
        const { data: updatedProducts } = await supabase
            .from('site_products')
            .select('*')
            .eq('user_id', user.id)
            .order('fetched_at', { ascending: false })
            .range(0, 9999);

        // Transform to camelCase for frontend
        const formattedProducts = (updatedProducts || []).map(p => ({
            trendyolKey: p.trendyol_key,
            barcode: p.barcode,
            sitePrice: p.site_price,
            fetchedAt: p.fetched_at,
        }));

        return NextResponse.json({
            success: true,
            count: totalInserted,
            products: formattedProducts,
        });
    } catch (error: any) {
        console.error('Site products fetch error:', error);
        return NextResponse.json(
            { error: error.message || 'Site ürünleri alınırken hata oluştu' },
            { status: 500 }
        );
    }
}

// GET - Read from Supabase
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: products, error } = await supabase
            .from('site_products')
            .select('*')
            .eq('user_id', user.id)
            .order('fetched_at', { ascending: false })
            .range(0, 9999);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Transform to camelCase
        const formattedProducts = (products || []).map(p => ({
            trendyolKey: p.trendyol_key,
            barcode: p.barcode,
            sitePrice: p.site_price,
            fetchedAt: p.fetched_at,
        }));

        return NextResponse.json({ products: formattedProducts });
    } catch (error: any) {
        console.error('Get site products error:', error);
        return NextResponse.json(
            { error: error.message || 'Ürünler alınırken hata oluştu' },
            { status: 500 }
        );
    }
}

// DELETE - Clear all products
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { error } = await supabase
            .from('site_products')
            .delete()
            .eq('user_id', user.id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Tüm site ürünleri silindi' });
    } catch (error: any) {
        console.error('Delete site products error:', error);
        return NextResponse.json(
            { error: error.message || 'Ürünler silinirken hata oluştu' },
            { status: 500 }
        );
    }
}
