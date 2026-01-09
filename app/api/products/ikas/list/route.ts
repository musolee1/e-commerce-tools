import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getIkasToken, fetchAllIkasProducts } from '@/lib/ikas/client';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// POST - Çek ve Supabase'e kaydet
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: settings } = await supabase
            .from('user_settings')
            .select('ikas_client_id, ikas_client_secret, ikas_store_name')
            .eq('user_id', user.id)
            .single();

        if (!settings?.ikas_client_id || !settings?.ikas_client_secret) {
            return NextResponse.json({ error: 'İKAS ayarları eksik' }, { status: 400 });
        }

        const accessToken = await getIkasToken(
            settings.ikas_store_name,
            settings.ikas_client_id,
            settings.ikas_client_secret
        );

        const products = await fetchAllIkasProducts(accessToken);

        // Supabase'e kaydet - önce eski verileri sil
        if (products.length > 0) {
            await supabase
                .from('ikas_products')
                .delete()
                .eq('user_id', user.id);

            // Yeni verileri ekle
            const insertData = products.map(p => ({
                user_id: user.id,
                product_id: p.productId,
                variant_id: p.variantId,
                product_name: p.productName,
                sku: p.sku,
                barcode: p.barcode,
                normal_price: p.normalPrice,
                discounted_price: p.discountedPrice,
                fetched_at: new Date().toISOString(),
            }));

            const { error: insertError } = await supabase
                .from('ikas_products')
                .insert(insertData);

            if (insertError) {
                console.error('Insert error:', insertError);
            }
        }

        return NextResponse.json({
            success: true,
            count: products.length,
            products, // Frontend için camelCase döndür
        });
    } catch (error: any) {
        console.error('İKAS fetch error:', error);
        return NextResponse.json(
            { error: error.message || 'İKAS ürünleri alınırken hata oluştu' },
            { status: 500 }
        );
    }
}

// GET - Supabase'den oku
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: products, error } = await supabase
            .from('ikas_products')
            .select('*')
            .eq('user_id', user.id)
            .order('variant_id', { ascending: true })
            .range(0, 9999); // ✅ Supabase varsayılan 1000 limitini aş

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // camelCase'e çevir
        const formattedProducts = (products || []).map(p => ({
            productId: p.product_id,
            variantId: p.variant_id,
            productName: p.product_name,
            sku: p.sku,
            barcode: p.barcode,
            normalPrice: p.normal_price,
            discountedPrice: p.discounted_price,
        }));

        return NextResponse.json({ products: formattedProducts });
    } catch (error: any) {
        console.error('Get İKAS products error:', error);
        return NextResponse.json(
            { error: error.message || 'Ürünler alınırken hata oluştu' },
            { status: 500 }
        );
    }
}

// DELETE - Tüm verileri sil
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { error } = await supabase
            .from('ikas_products')
            .delete()
            .eq('user_id', user.id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Tüm ürünler silindi' });
    } catch (error: any) {
        console.error('Delete İKAS products error:', error);
        return NextResponse.json(
            { error: error.message || 'Ürünler silinirken hata oluştu' },
            { status: 500 }
        );
    }
}
