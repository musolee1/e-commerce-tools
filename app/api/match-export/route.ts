import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'exceljs';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// POST - Match ve Excel export
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Eşleştirme verilerini al
        const { data: matchingData, error: matchError } = await supabase
            .from('matching_data')
            .select('trendyol_link, ikas_barcode')
            .eq('user_id', user.id);

        if (matchError || !matchingData || matchingData.length === 0) {
            return NextResponse.json({ error: 'Eşleştirme verisi bulunamadı' }, { status: 400 });
        }

        // 2. İKAS ürünlerini al
        const { data: ikasProducts, error: ikasError } = await supabase
            .from('ikas_products')
            .select('product_id, variant_id, product_name, sku, barcode, normal_price, discounted_price')
            .eq('user_id', user.id);

        if (ikasError || !ikasProducts || ikasProducts.length === 0) {
            return NextResponse.json({ error: 'İKAS ürünleri bulunamadı' }, { status: 400 });
        }

        // 3. Barkod → Product ID eşleştirmesi yap
        const barcodeToProductId = new Map<string, string>();
        for (const product of ikasProducts) {
            if (product.barcode) {
                barcodeToProductId.set(product.barcode, product.product_id);
            }
        }

        // 4. Matching data'daki barkodlardan Product ID'leri bul
        const matchedProductIds = new Set<string>();
        const trendyolLinkByProductId = new Map<string, string>();

        for (const match of matchingData) {
            const productId = barcodeToProductId.get(match.ikas_barcode);
            if (productId) {
                matchedProductIds.add(productId);
                trendyolLinkByProductId.set(productId, match.trendyol_link);
            }
        }

        if (matchedProductIds.size === 0) {
            return NextResponse.json({ error: 'Eşleşen ürün bulunamadı' }, { status: 400 });
        }

        // 5. Eşleşen Product ID'lerin TÜM varyantlarını bul
        const exportData: any[] = [];
        for (const product of ikasProducts) {
            if (matchedProductIds.has(product.product_id)) {
                exportData.push({
                    trendyol_link: trendyolLinkByProductId.get(product.product_id) || '',
                    product_id: product.product_id,
                    variant_id: product.variant_id,
                    product_name: product.product_name,
                    sku: product.sku,
                    barcode: product.barcode,
                    normal_price: product.normal_price,
                    discounted_price: product.discounted_price,
                });
            }
        }

        // 6. Excel oluştur
        const workbook = new XLSX.Workbook();
        const worksheet = workbook.addWorksheet('Eşleşen Ürünler');

        worksheet.columns = [
            { header: 'Trendyol Link', key: 'trendyol_link', width: 50 },
            { header: 'Product ID', key: 'product_id', width: 36 },
            { header: 'Variant ID', key: 'variant_id', width: 36 },
            { header: 'Ürün Adı', key: 'product_name', width: 40 },
            { header: 'SKU', key: 'sku', width: 20 },
            { header: 'Barkod', key: 'barcode', width: 20 },
            { header: 'Normal Fiyat', key: 'normal_price', width: 15 },
            { header: 'İndirimli Fiyat', key: 'discounted_price', width: 15 },
        ];

        exportData.forEach(row => worksheet.addRow(row));

        // Header styling
        worksheet.getRow(1).font = { bold: true };

        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename=eslesen_urunler.xlsx',
            },
        });
    } catch (error: any) {
        console.error('Match export error:', error);
        return NextResponse.json(
            { error: error.message || 'Export sırasında hata oluştu' },
            { status: 500 }
        );
    }
}
