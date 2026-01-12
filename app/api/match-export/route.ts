import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// TR Fiyat formatını sayıya çevir (4.617,50 TL -> 4617.50)
function parseTRPrice(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '' || value === '-') {
        return 0;
    }

    // Zaten sayı ise direkt döndür
    if (typeof value === 'number') {
        return value;
    }

    let s = String(value).replace('TL', '').trim();

    // Mantık:
    // 1. Eğer virgül varsa: nokta binlik ayraç, virgül ondalık
    // 2. Eğer sadece nokta varsa: nokta binlik ayraç
    if (s.includes(',')) {
        s = s.replace(/\./g, ''); // Binlik noktalarını sil
        s = s.replace(',', '.'); // Ondalık virgülünü noktaya çevir
    } else {
        s = s.replace(/\./g, ''); // Binlik noktalarını sil
    }

    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
}

// POST - Match ve Excel export
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Eşleştirme verilerini al (Trendyol link ↔ İKAS barkod)
        const { data: matchingData, error: matchError } = await supabase
            .from('matching_data')
            .select('trendyol_link, ikas_barcode')
            .eq('user_id', user.id)
            .range(0, 9999); // Supabase varsayılan 1000 limitini aş

        if (matchError || !matchingData || matchingData.length === 0) {
            return NextResponse.json({ error: 'Eşleştirme verisi bulunamadı. Önce Settings sayfasından eşleştirme dosyası yükleyin.' }, { status: 400 });
        }

        console.log(`📊 Eşleştirme verisi: ${matchingData.length} satır`);

        // 2. İKAS ürünlerini al
        const { data: ikasProducts, error: ikasError } = await supabase
            .from('ikas_products')
            .select('product_id, variant_id, product_name, sku, barcode, normal_price, discounted_price, buy_price')
            .eq('user_id', user.id)
            .range(0, 9999); // Supabase varsayılan 1000 limitini aş

        if (ikasError || !ikasProducts || ikasProducts.length === 0) {
            return NextResponse.json({ error: 'İKAS ürünleri bulunamadı. Önce Ürünler sayfasından İKAS ürünlerini çekin.' }, { status: 400 });
        }

        console.log(`📦 İKAS ürünleri: ${ikasProducts.length} varyant`);

        // 3. Trendyol ürünlerini al
        const { data: trendyolProducts, error: trendyolError } = await supabase
            .from('trendyol_products')
            .select('product_name, normal_price, discounted_price, product_link')
            .eq('user_id', user.id)
            .range(0, 9999); // Supabase varsayılan 1000 limitini aş

        if (trendyolError || !trendyolProducts || trendyolProducts.length === 0) {
            return NextResponse.json({ error: 'Trendyol ürünleri bulunamadı. Önce Ürünler sayfasından Trendyol ürünlerini çekin.' }, { status: 400 });
        }

        console.log(`🛒 Trendyol ürünleri: ${trendyolProducts.length} ürün`);

        // 4. Trendyol link → Ürün bilgileri eşleştirmesi için Map oluştur
        const trendyolMap = new Map<string, {
            name: string;
            normalPrice: number;
            discountedPrice: number;
        }>();
        for (const tp of trendyolProducts) {
            trendyolMap.set(tp.product_link, {
                name: tp.product_name || '',
                normalPrice: parseTRPrice(tp.normal_price),
                discountedPrice: parseTRPrice(tp.discounted_price),
            });
        }

        // 5. Barkod → Product ID eşleştirmesi yap
        const barcodeToProductId = new Map<string, string>();
        for (const product of ikasProducts) {
            if (product.barcode) {
                barcodeToProductId.set(product.barcode, product.product_id);
            }
        }

        // 6. Matching data'daki barkodlardan Product ID'leri ve Trendyol linklerini bul
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
            return NextResponse.json({
                error: 'Eşleşen ürün bulunamadı. Eşleştirme dosyasındaki barkodlar İKAS ürünlerinde mevcut değil.'
            }, { status: 400 });
        }

        // 7. Eşleşen Product ID'lerin TÜM varyantlarını bul ve filtrele
        const exportData: any[] = [];

        for (const product of ikasProducts) {
            if (matchedProductIds.has(product.product_id)) {
                const trendyolLink = trendyolLinkByProductId.get(product.product_id) || '';
                const trendyolData = trendyolMap.get(trendyolLink);

                if (!trendyolData) continue;

                const trendyolNormalPrice = trendyolData.normalPrice;
                const trendyolDiscountedPrice = trendyolData.discountedPrice;
                const ikasNormalPrice = Number(product.normal_price) || 0;
                const ikasDiscountedPrice = Number(product.discounted_price) || 0;
                const ikasBuyPrice = Number(product.buy_price) || 0;

                // Yeni Fiyat: Trendyol İndirimli Fiyatın %10 indirimli hali
                const newPrice = trendyolDiscountedPrice * 0.90;

                // FİLTRE 1: Yeni Fiyat 0 TL olanları atla
                if (newPrice === 0) continue;

                // FİLTRE 2: SADECE Yeni Fiyat < İkas İndirimli Fiyat olanları tut
                // Bu, Trendyol fiyatı İkas'tan ucuz olanları gösterir (aksiyon alınması gereken ürünler)
                if (newPrice < ikasDiscountedPrice) {
                    exportData.push({
                        product_id: product.product_id,
                        variant_id: product.variant_id,
                        barcode: product.barcode,
                        new_price: newPrice,
                        ikas_normal_price: ikasNormalPrice,
                        ikas_discounted_price: ikasDiscountedPrice,
                        ikas_buy_price: ikasBuyPrice,
                        trendyol_discounted_price: trendyolDiscountedPrice,
                    });
                }
            }
        }

        if (exportData.length === 0) {
            return NextResponse.json({
                error: 'Fiyat karşılaştırması sonucu aksiyon alınması gereken ürün bulunamadı. Tüm İkas fiyatları Trendyol fiyatlarından düşük veya eşit.'
            }, { status: 400 });
        }

        console.log(`✅ Eşleşen ve aksiyon gerektiren ürün sayısı: ${exportData.length}`);

        // JSON olarak döndür (popup'ta gösterilecek)
        return NextResponse.json({
            success: true,
            count: exportData.length,
            data: exportData,
        });
    } catch (error: any) {
        console.error('Match export error:', error);
        return NextResponse.json(
            { error: error.message || 'Export sırasında hata oluştu' },
            { status: 500 }
        );
    }
}
