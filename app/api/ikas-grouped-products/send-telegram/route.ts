import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

interface GroupedProduct {
    id: string
    urun_grup_id: string
    urun_ismi: string
    varyant_degerler: string
    resim_urlleri: string
    toplam_stok: number
    stok_kodu: string
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { products }: { products: GroupedProduct[] } = await request.json()

        if (!products || products.length === 0) {
            return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 400 })
        }

        // Get user settings
        const { data: settings } = await supabase
            .from('user_settings')
            .select('telegram_bot_token, telegram_chat_id')
            .eq('user_id', user.id)
            .single()

        let BOT_TOKEN = (settings?.telegram_bot_token || '').replace(/\s+/g, '').replace('TELEGRAM_BOT_TOKEN=', '')
        if (!BOT_TOKEN || BOT_TOKEN.length < 40) {
            BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').replace(/\s+/g, '')
        }

        let CHAT_ID = (settings?.telegram_chat_id || '').replace(/\s+/g, '').replace('TELEGRAM_CHAT_ID=', '')
        if (!CHAT_ID || CHAT_ID === 'undefined') {
            CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').replace(/\s+/g, '')
        }

        if (!BOT_TOKEN || !CHAT_ID) {
            return NextResponse.json(
                { error: 'Telegram bot ayarları yapılmamış. Lütfen .env.local dosyasını kontrol edin.' },
                { status: 400 }
            )
        }


        const results: { success: boolean; productId: string; productName: string }[] = []
        const batchId = new Date().toISOString() // Group identifier for batch sends

        for (const product of products) {
            try {
                // Prepare message in the requested format
                const message = `${product.urun_ismi}
Stok Kodu: ${product.stok_kodu}
Beden Aralığı: ${product.varyant_degerler}
📞 +90 553 407 26 66
Whatsapp: https://wa.me/905534072666`

                // Process image URLs
                const urlList = product.resim_urlleri
                    .split(';')
                    .map((url) => url.trim())
                    .filter((url) => url)
                    .slice(0, 10)

                const cleanUrls = urlList.map((url) => {
                    let cleanUrl = url
                    if (!cleanUrl.startsWith('http')) {
                        cleanUrl = 'https://' + cleanUrl
                    }
                    return cleanUrl.replace(/ /g, '%20')
                })

                // Download images and create media group
                const mediaGroup: any[] = []

                for (const imgUrl of cleanUrls) {
                    try {
                        const response = await fetch(imgUrl, {
                            signal: AbortSignal.timeout(10000),
                        })

                        if (response.ok) {
                            const arrayBuffer = await response.arrayBuffer()
                            const buffer = Buffer.from(arrayBuffer)

                            if (mediaGroup.length === 0) {
                                mediaGroup.push({
                                    type: 'photo',
                                    media: buffer,
                                    caption: message,
                                })
                            } else {
                                mediaGroup.push({
                                    type: 'photo',
                                    media: buffer,
                                })
                            }
                        }
                    } catch (imgError) {
                        console.error(`Image download error: ${imgUrl}`, imgError)
                    }
                }

                // Send to Telegram
                if (mediaGroup.length > 0) {
                    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`;
                    const formData = new FormData();
                    formData.append('chat_id', CHAT_ID);
                    
                    const media: any[] = [];
                    for (let i = 0; i < mediaGroup.length; i++) {
                        const filename = `image${i}.jpg`;
                        const blob = new Blob([mediaGroup[i].media], { type: 'image/jpeg' });
                        formData.append(filename, blob, filename);
                        
                        media.push({
                            type: 'photo',
                            media: `attach://${filename}`,
                            ...(i === 0 ? { caption: mediaGroup[i].caption || message, parse_mode: 'Markdown' } : {})
                        });
                    }
                    
                    formData.append('media', JSON.stringify(media));
                    
                    const response = await fetch(url, {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.description || `HTTP Error ${response.status}`);
                    }
                } else {
                    // Send just the text message if no images
                    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: CHAT_ID,
                            text: message,
                            parse_mode: 'Markdown'
                        })
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.description || `HTTP Error ${response.status}`);
                    }
                }

                // Log to database
                await supabase.from('telegram_logs').insert({
                    user_id: user.id,
                    product_name: product.urun_ismi,
                    product_slug: product.urun_grup_id,
                    stock_count: product.toplam_stok,
                    status: 'success',
                })

                // Delete from grouped products table
                await supabase
                    .from('ikas_grouped_products')
                    .delete()
                    .eq('id', product.id)

                results.push({
                    success: true,
                    productId: product.id,
                    productName: product.urun_ismi
                })

                // Wait 2 seconds between sends to avoid rate limiting
                await new Promise((resolve) => setTimeout(resolve, 2000))

            } catch (productError: any) {
                console.error(`Error sending product ${product.urun_ismi}:`, productError)

                // Log failed send
                await supabase.from('telegram_logs').insert({
                    user_id: user.id,
                    product_name: product.urun_ismi,
                    product_slug: product.urun_grup_id,
                    stock_count: product.toplam_stok,
                    status: 'failed',
                })

                results.push({
                    success: false,
                    productId: product.id,
                    productName: product.urun_ismi
                })
            }
        }

        const successCount = results.filter(r => r.success).length
        const failCount = results.filter(r => !r.success).length

        return NextResponse.json({
            success: true,
            message: `${successCount} ürün başarıyla gönderildi${failCount > 0 ? `, ${failCount} ürün gönderilemedi` : ''}`,
            results,
            successCount,
            failCount
        })

    } catch (error: any) {
        console.error('Telegram send error:', error)
        return NextResponse.json(
            { error: error.message || 'Gönderim hatası' },
            { status: 500 }
        )
    }
}
