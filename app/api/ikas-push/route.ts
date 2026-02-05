import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 300; // 5 dakika - çok ürün güncellenebilir
export const dynamic = 'force-dynamic';

interface PriceUpdate {
    product_id: string;
    variant_id: string;
    sell_price: number;
    discount_price: number;
    buy_price: number;
}

// İKAS'tan token al
async function getIkasToken(storeName: string, clientId: string, clientSecret: string): Promise<string> {
    const url = `https://${storeName}.myikas.com/api/admin/oauth/token`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`İKAS Auth hatası: ${response.status} - ${text}`);
    }

    const data = await response.json();
    return data.access_token;
}

// İKAS'a fiyat güncelleme gönder (batch)
async function pushPricesToIkas(token: string, prices: PriceUpdate[]): Promise<{ success: number; failed: number; errors: string[] }> {
    const url = 'https://api.myikas.com/api/v1/admin/graphql';

    const mutation = `
    mutation SaveVariantPrices($input: SaveVariantPricesInput!) {
      saveVariantPrices(input: $input)
    }
    `;

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Batch olarak gönder (her seferde 50 ürün)
    const BATCH_SIZE = 50;

    for (let i = 0; i < prices.length; i += BATCH_SIZE) {
        const batch = prices.slice(i, i + BATCH_SIZE);

        const variantPriceInputs = batch.map(p => ({
            productId: p.product_id,
            variantId: p.variant_id,
            price: {
                sellPrice: p.sell_price,
                discountPrice: p.discount_price,
                buyPrice: p.buy_price,
            }
        }));

        const variables = {
            input: {
                priceListId: null,
                variantPriceInputs,
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ query: mutation, variables }),
            });

            const result = await response.json();

            if (result?.data?.saveVariantPrices === true) {
                success += batch.length;
                console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} ürün güncellendi`);
            } else if (result?.errors) {
                failed += batch.length;
                errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.errors[0]?.message || 'Bilinmeyen hata'}`);
                console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} hatası:`, result.errors);
            }
        } catch (err: any) {
            failed += batch.length;
            errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err.message}`);
            console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} exception:`, err);
        }

        // Rate limiting - her batch arasında küçük bekleme
        await new Promise(r => setTimeout(r, 200));
    }

    return { success, failed, errors };
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Request body'den fiyat listesini al
        const { prices } = await request.json() as { prices: PriceUpdate[] };

        if (!prices || !Array.isArray(prices) || prices.length === 0) {
            return NextResponse.json({ error: 'Geçerli fiyat verisi bulunamadı' }, { status: 400 });
        }

        console.log(`🚀 ${prices.length} ürün için İKAS fiyat güncellemesi başlatılıyor...`);

        // Kullanıcının İKAS ayarlarını al
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('ikas_client_id, ikas_client_secret, ikas_store_name')
            .eq('user_id', user.id)
            .single();

        if (settingsError || !settings?.ikas_client_id || !settings?.ikas_client_secret || !settings?.ikas_store_name) {
            return NextResponse.json({ error: 'İKAS ayarları eksik. Lütfen Ayarlar sayfasından İKAS mağaza adı, Client ID ve Client Secret bilgilerinizi girin.' }, { status: 400 });
        }

        // İKAS token al
        const token = await getIkasToken(
            settings.ikas_store_name,
            settings.ikas_client_id,
            settings.ikas_client_secret
        );

        // Fiyatları İKAS'a gönder
        const result = await pushPricesToIkas(token, prices);

        console.log(`✅ İKAS güncelleme tamamlandı: ${result.success} başarılı, ${result.failed} başarısız`);

        return NextResponse.json({
            success: true,
            updated: result.success,
            failed: result.failed,
            errors: result.errors,
            message: `${result.success} ürün başarıyla güncellendi${result.failed > 0 ? `, ${result.failed} ürün başarısız` : ''}`,
        });
    } catch (error: any) {
        console.error('İKAS price push error:', error);
        return NextResponse.json(
            { error: error.message || 'Fiyat güncellemesi sırasında hata oluştu' },
            { status: 500 }
        );
    }
}
