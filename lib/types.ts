export interface TelegramLog {
    id: string
    user_id: string
    product_name: string
    product_slug: string
    stock_count: number
    sent_at: string
    status: 'success' | 'failed'
}

export interface UserSettings {
    id: string
    user_id: string
    telegram_bot_token: string | null
    telegram_chat_id: string | null
    site_url: string
    created_at: string
    updated_at: string
}
