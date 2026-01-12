import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scrapeTrendyol } from '@/lib/scrapers/trendyol';

export const maxDuration = 300; // 5 minutes for scraping
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Check auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user settings INCLUDING brand slug and replacement flag
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('trendyol_target_url, trendyol_brand_slug, replace_genel_markalar')
            .eq('user_id', user.id)
            .single();

        if (settingsError || !settings?.trendyol_target_url) {
            return NextResponse.json(
                { error: 'Trendyol URL ayarlanmamış. Lütfen önce ayarlar sayfasından URL ekleyin.' },
                { status: 400 }
            );
        }

        // Scrape Trendyol
        console.log('🔍 Trendyol scraping başlatılıyor...');
        const products = await scrapeTrendyol(settings.trendyol_target_url);

        // ✅ Apply brand slug replacement if enabled
        if (settings.replace_genel_markalar && settings.trendyol_brand_slug) {
            console.log(`🔄 "genel-markalar" → "${settings.trendyol_brand_slug}" değiştiriliyor...`);
            products.forEach(product => {
                if (product.link.includes('/genel-markalar/')) {
                    product.link = product.link.replace('/genel-markalar/', `/${settings.trendyol_brand_slug}/`);
                }
            });
        }

        // UPSERT products (update if product_link exists, insert if not)
        if (products.length > 0) {
            // ✅ Remove duplicates - keep last occurrence of each link
            const uniqueProducts = new Map<string, typeof products[0]>();
            for (const p of products) {
                uniqueProducts.set(p.link, p); // Overwrites duplicates
            }

            const insertData = Array.from(uniqueProducts.values()).map(p => ({
                user_id: user.id,
                product_name: p.name,
                normal_price: p.normalPrice,
                discounted_price: p.discountedPrice,
                product_link: p.link,
                scraped_at: new Date().toISOString(),
            }));

            console.log(`📝 ${products.length} ürün çekildi, ${insertData.length} benzersiz ürün kaydediliyor...`);

            const { error: upsertError } = await supabase
                .from('trendyol_products')
                .upsert(insertData, {
                    onConflict: 'user_id,product_link',
                    ignoreDuplicates: false // Update existing products
                });

            if (upsertError) {
                console.error('Upsert error:', upsertError);
                return NextResponse.json(
                    { error: 'Ürünler kaydedilirken hata oluştu: ' + upsertError.message },
                    { status: 500 }
                );
            }
        }

        // ✅ Fetch and return updated products to fix state update issue
        const { data: updatedProducts } = await supabase
            .from('trendyol_products')
            .select('*')
            .eq('user_id', user.id)
            .order('scraped_at', { ascending: false })
            .range(0, 9999); // Supabase varsayılan 1000 limitini aş

        return NextResponse.json({
            success: true,
            count: products.length,
            products: updatedProducts || products,
        });
    } catch (error: any) {
        console.error('Trendyol scraping error:', error);
        return NextResponse.json(
            { error: error.message || 'Scraping sırasında hata oluştu' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Check auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get saved products
        const { data: products, error } = await supabase
            .from('trendyol_products')
            .select('*')
            .eq('user_id', user.id)
            .order('scraped_at', { ascending: false })
            .range(0, 9999); // Supabase varsayılan 1000 limitini aş

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ products: products || [] });
    } catch (error: any) {
        console.error('Get Trendyol products error:', error);
        return NextResponse.json(
            { error: error.message || 'Ürünler alınırken hata oluştu' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Check auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Delete all products for this user
        const { error } = await supabase
            .from('trendyol_products')
            .delete()
            .eq('user_id', user.id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Tüm ürünler silindi' });
    } catch (error: any) {
        console.error('Delete Trendyol products error:', error);
        return NextResponse.json(
            { error: error.message || 'Ürünler silinirken hata oluştu' },
            { status: 500 }
        );
    }
}
