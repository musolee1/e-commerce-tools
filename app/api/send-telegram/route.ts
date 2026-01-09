import { NextRequest } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'
import { createClient } from '@/lib/supabase/server'

// Site URL is now fetched from user settings only - no default fallback

interface Product {
    İsim: string
    'Stok:Merter Depo': number
    Slug: string
    'Resim URL': string
}

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const supabase = await createClient()

                // Get authenticated user
                const { data: { user }, error: authError } = await supabase.auth.getUser()

                if (authError || !user) {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: 'Unauthorized' })}\n\n`)
                    )
                    controller.close()
                    return
                }

                const { products }: { products: Product[] } = await request.json()

                if (!products || products.length === 0) {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: 'Ürün bulunamadı' })}\n\n`)
                    )
                    controller.close()
                    return
                }

                // Get user settings
                const { data: settings } = await supabase
                    .from('user_settings')
                    .select('telegram_bot_token, telegram_chat_id, site_url')
                    .eq('user_id', user.id)
                    .single()

                // Use user settings or fall back to environment variables
                const BOT_TOKEN = settings?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN
                const CHAT_ID = settings?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID
                const SITE_URL = settings?.site_url

                if (!BOT_TOKEN || !CHAT_ID) {
                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({ error: 'Telegram bot ayarları yapılmamış. Lütfen Ayarlar sayfasından bot token ve chat ID girin.' })}\n\n`
                        )
                    )
                    controller.close()
                    return
                }

                const bot = new TelegramBot(BOT_TOKEN)

                for (let i = 0; i < products.length; i++) {
                    const product = products[i]
                    const progress = Math.round(((i + 1) / products.length) * 100)
                    let status: 'success' | 'failed' = 'success'

                    try {
                        // Process product
                        const rawUrls = product['Resim URL']
                        const urlList = rawUrls
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

                        // Prepare slug
                        let slug = product.Slug
                        const fullLink = slug.startsWith('/')
                            ? `${SITE_URL}${slug.slice(1)}`
                            : `${SITE_URL}${slug}`

                        // Prepare message
                        const message = `✨ **${product.İsim}**\n📦 Stok: ${product['Stok:Merter Depo']}\n\n🔗 [Ürüne Git](${fullLink})`

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
                                            parse_mode: 'Markdown',
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
                            status = 'failed'
                        }

                        // Log to database
                        await supabase.from('telegram_logs').insert({
                            user_id: user.id,
                            product_name: product.İsim,
                            product_slug: product.Slug,
                            stock_count: product['Stok:Merter Depo'],
                            status,
                        })

                        // Send progress update
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ progress, current: i + 1, total: products.length })}\n\n`)
                        )

                        // Wait 2 seconds between sends to avoid rate limiting
                        if (i < products.length - 1) {
                            await new Promise((resolve) => setTimeout(resolve, 2000))
                        }
                    } catch (productError: any) {
                        console.error(`Error sending product ${product.İsim}:`, productError)

                        // Log failed send
                        await supabase.from('telegram_logs').insert({
                            user_id: user.id,
                            product_name: product.İsim,
                            product_slug: product.Slug,
                            stock_count: product['Stok:Merter Depo'],
                            status: 'failed',
                        })

                        controller.enqueue(
                            encoder.encode(
                                `data: ${JSON.stringify({ warning: `Ürün gönderilemedi: ${product.İsim}` })}\n\n`
                            )
                        )
                    }
                }

                // Success
                controller.enqueue(
                    encoder.encode(
                        `data: ${JSON.stringify({
                            success: true,
                            message: `${products.length} ürün başarıyla gönderildi!`,
                            fileUrl: '/api/download-updated-excel',
                        })}\n\n`
                    )
                )
                controller.close()
            } catch (error: any) {
                console.error('Telegram send error:', error)
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ error: error.message || 'Gönderim hatası' })}\n\n`)
                )
                controller.close()
            }
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    })
}
