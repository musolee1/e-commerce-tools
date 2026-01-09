import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Check auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user settings
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('trendyol_brand_slug, replace_genel_markalar')
            .eq('user_id', user.id)
            .single();

        if (settingsError || !settings?.trendyol_brand_slug) {
            return NextResponse.json(
                { error: 'Marka slug ayarlanmamış' },
                { status: 400 }
            );
        }

        if (!settings.replace_genel_markalar) {
            return NextResponse.json(
                { error: 'genel-markalar değiştirme ayarı kapalı' },
                { status: 400 }
            );
        }

        // Get all products with genel-markalar in link
        const { data: products, error: fetchError } = await supabase
            .from('trendyol_products')
            .select('id, product_link')
            .eq('user_id', user.id)
            .like('product_link', '%/genel-markalar/%');

        if (fetchError) {
            throw fetchError;
        }

        if (!products || products.length === 0) {
            return NextResponse.json({
                success: true,
                updated: 0,
                message: 'Güncellenecek ürün bulunamadı'
            });
        }

        // Update each product
        let updated = 0;
        for (const product of products) {
            const newLink = product.product_link.replace(
                '/genel-markalar/',
                `/${settings.trendyol_brand_slug}/`
            );

            const { error: updateError } = await supabase
                .from('trendyol_products')
                .update({ product_link: newLink })
                .eq('id', product.id);

            if (!updateError) {
                updated++;
            }
        }

        return NextResponse.json({
            success: true,
            updated,
            total: products.length,
            message: `${updated} ürün linki güncellendi`
        });
    } catch (error: any) {
        console.error('Update links error:', error);
        return NextResponse.json(
            { error: error.message || 'Linkler güncellenirken hata oluştu' },
            { status: 500 }
        );
    }
}
