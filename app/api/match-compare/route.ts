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

interface MatchResult {
    product_name: string;
    trendyol_key: string;
    barcode: string;
    site_price: number;
    trendyol_normal_price: number;
    new_price: number;
}

// POST - Match Trendyol + Site Products
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Eşleştirme verilerini al (Trendyol link ↔ Barcode)
        const { data: matchingData, error: matchError } = await supabase
            .from('matching_data')
            .select('trendyol_link, ikas_barcode')
            .eq('user_id', user.id)
            .range(0, 9999);

        if (matchError || !matchingData || matchingData.length === 0) {
            return NextResponse.json({
                error: 'Eşleştirme verisi bulunamadı. Önce Settings sayfasından eşleştirme dosyası yükleyin.'
            }, { status: 400 });
        }

        // 2. Trendyol ürünlerini al - SADECE NORMAL FİYAT
        const { data: trendyolProducts, error: trendyolError } = await supabase
            .from('trendyol_products')
            .select('product_name, normal_price, product_link')
            .eq('user_id', user.id)
            .range(0, 9999);

        if (trendyolError || !trendyolProducts || trendyolProducts.length === 0) {
            return NextResponse.json({
                error: 'Trendyol ürünleri bulunamadı. Önce Fiyat Karşılaştır sayfasından Trendyol ürünlerini çekin.'
            }, { status: 400 });
        }

        // 3. Site ürünlerini al
        const { data: siteProducts, error: siteError } = await supabase
            .from('site_products')
            .select('trendyol_key, barcode, site_price')
            .eq('user_id', user.id)
            .range(0, 9999);

        if (siteError || !siteProducts || siteProducts.length === 0) {
            return NextResponse.json({
                error: 'Site ürünleri bulunamadı. Önce Fiyat Karşılaştır sayfasından Site ürünlerini yükleyin.'
            }, { status: 400 });
        }

        // 4. Trendyol link → Ürün bilgileri Map'i (SADECE NORMAL FİYAT)
        const trendyolMap = new Map<string, {
            name: string;
            normalPrice: number;
        }>();

        for (const tp of trendyolProducts) {
            trendyolMap.set(tp.product_link, {
                name: tp.product_name || '',
                normalPrice: parseTRPrice(tp.normal_price),
            });
        }

        // 5. Site Products: TrendyolKey → Product info Map'i
        // NOT: trendyol_key aslında Trendyol barkodudur, matching_data.ikas_barcode ile eşleşir
        const siteProductsMap = new Map<string, {
            siteBarcode: string;
            sitePrice: number;
        }>();

        for (const sp of siteProducts) {
            // trendyol_key ile map'e ekle (bu Trendyol barkodu)
            if (sp.trendyol_key) {
                siteProductsMap.set(sp.trendyol_key, {
                    siteBarcode: sp.barcode,
                    sitePrice: Number(sp.site_price) || 0,
                });
            }
        }

        // 6. Matching: Her matching data satırı için eşleştirme yap
        const matchResults: MatchResult[] = [];

        for (const match of matchingData) {
            const trendyolBarcode = match.ikas_barcode;
            const trendyolLink = match.trendyol_link;

            // Trendyol bilgilerini al
            const trendyolData = trendyolMap.get(trendyolLink);
            if (!trendyolData) continue;

            // Site ürün bilgilerini al
            const siteData = siteProductsMap.get(trendyolBarcode);
            if (!siteData) continue;

            // Fiyat karşılaştırması: Site Fiyat > (T.Normal'in %5 indirimli hali)
            const sitePriceNum = siteData.sitePrice;
            const trendyolNormalNum = trendyolData.normalPrice;
            const trendyolWith5Discount = trendyolNormalNum * 0.95; // T.Normal - %5

            // Site fiyatı T.Normal'in %5 indirimli halinden ucuz veya eşitse, listeye ekleme
            if (sitePriceNum <= trendyolWith5Discount) continue;

            // Yeni Fiyat: T.Normal'e %14.5 indirim uygula
            const newPrice = trendyolNormalNum * (1 - 0.145);

            // Eşleşme başarılı ve site fiyatı pahalı - sonuç dizisine ekle
            matchResults.push({
                product_name: trendyolData.name,
                trendyol_key: trendyolBarcode,
                barcode: siteData.siteBarcode,
                site_price: sitePriceNum,
                trendyol_normal_price: trendyolNormalNum,
                new_price: newPrice,
            });
        }

        if (matchResults.length === 0) {
            return NextResponse.json({
                error: 'Eşleşen ürün bulunamadı. Matching data\'daki barkodlar Site ürünlerinde veya Trendyol linklerine karşılık gelmiyor.'
            }, { status: 400 });
        }

        // Sonuçları döndür
        return NextResponse.json({
            success: true,
            count: matchResults.length,
            data: matchResults,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Eşleştirme sırasında hata oluştu' },
            { status: 500 }
        );
    }
}
