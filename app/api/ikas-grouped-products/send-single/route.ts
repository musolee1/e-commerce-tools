import { NextRequest, NextResponse } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'
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

const MAX_RETRIES = 3
const BASE_DELAY = 3000 // 3 seconds base delay

// Exponential backoff delay calculation
function getRetryDelay(attempt: number): number {
    return BASE_DELAY * Math.pow(2, attempt) + Math.random() * 1000
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { product }: { product: GroupedProduct } = await request.json()

        if (!product) {
            return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 400 })
        }

        // Get user settings
        const { data: settings } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single()

        const BOT_TOKEN = settings?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN
        const CHAT_ID = settings?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID

        if (!BOT_TOKEN || !CHAT_ID) {
            return NextResponse.json(
                { error: 'Telegram bot ayarları yapılmamış. Lütfen Ayarlar sayfasından bot token ve chat ID girin.' },
                { status: 400 }
            )
        }

        const bot = new TelegramBot(BOT_TOKEN)
        let lastError: any = null

        // Retry loop with exponential backoff
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const labelStockCode = settings?.label_stock_code || 'Stok Kodu'
                const labelSizeRange = settings?.label_size_range || 'Beden Aralığı'
                const labelWhatsapp = settings?.label_whatsapp || 'Whatsapp'

                const contactPhone = settings?.contact_phone ? `\n📞 ${settings.contact_phone}` : ''
                const contactWhatsapp = settings?.contact_whatsapp ? `\n${labelWhatsapp}: ${settings.contact_whatsapp}` : ''

                // Prepare message in the requested format
                const message = `${product.urun_ismi}
${labelStockCode}: ${product.stok_kodu}
${labelSizeRange}: ${product.varyant_degerler}${contactPhone}${contactWhatsapp}`

                // Process image URLs - split by ; or ,
                const urlList = product.resim_urlleri
                    .split(/[;,]/) // Split by semicolon OR comma
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
                            signal: AbortSignal.timeout(15000), // Increased timeout
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
                    await bot.sendMediaGroup(CHAT_ID, mediaGroup)
                } else {
                    // Send just the text message if no images
                    await bot.sendMessage(CHAT_ID, message)
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

                return NextResponse.json({
                    success: true,
                    productId: product.id,
                    productName: product.urun_ismi,
                    attempt: attempt + 1
                })

            } catch (sendError: any) {
                lastError = sendError
                console.error(`Attempt ${attempt + 1} failed for ${product.urun_ismi}:`, sendError)

                // Check if it's a rate limit error (429)
                if (sendError.code === 'ETELEGRAM' && sendError.response?.statusCode === 429) {
                    const retryAfter = sendError.response?.body?.parameters?.retry_after || 30
                    console.log(`Rate limited. Waiting ${retryAfter} seconds...`)
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
                } else if (attempt < MAX_RETRIES - 1) {
                    // Wait with exponential backoff before retry
                    const delay = getRetryDelay(attempt)
                    console.log(`Waiting ${delay}ms before retry...`)
                    await new Promise(resolve => setTimeout(resolve, delay))
                }
            }
        }

        // All retries failed
        console.error(`All retries failed for ${product.urun_ismi}:`, lastError)

        // Log failed send
        await supabase.from('telegram_logs').insert({
            user_id: user.id,
            product_name: product.urun_ismi,
            product_slug: product.urun_grup_id,
            stock_count: product.toplam_stok,
            status: 'failed',
        })

        return NextResponse.json({
            success: false,
            productId: product.id,
            productName: product.urun_ismi,
            error: lastError?.message || 'Gönderim başarısız oldu'
        })

    } catch (error: any) {
        console.error('Telegram send error:', error)
        return NextResponse.json(
            { error: error.message || 'Gönderim hatası' },
            { status: 500 }
        )
    }
}
