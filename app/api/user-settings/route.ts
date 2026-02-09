import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error
        }

        // If no settings exist, return empty values
        if (!data) {
            return NextResponse.json({
                telegram_bot_token: null,
                telegram_chat_id: null,
                site_url: null,
                site_products_api_url: null,
                site_update_price_api_url: null,
                trendyol_target_url: null,
                trendyol_brand_slug: null,
                replace_genel_markalar: false,
                ikas_client_id: null,
                ikas_client_secret: null,
                ikas_store_name: null,
                ikas_excel_mapping: null,
            })
        }

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Get settings error:', error)
        return NextResponse.json(
            { error: error.message || 'Settings alınırken hata oluştu' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            telegram_bot_token,
            telegram_chat_id,
            site_url,
            site_products_api_url,
            site_update_price_api_url,
            trendyol_target_url,
            trendyol_brand_slug,
            replace_genel_markalar,
            ikas_client_id,
            ikas_client_secret,
            ikas_store_name,
            ikas_excel_mapping,
            contact_phone,
            contact_whatsapp,
            label_stock_code,
            label_size_range,
            label_whatsapp,
        } = body

        // Check if settings exist
        const { data: existing } = await supabase
            .from('user_settings')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (existing) {
            // Update existing settings
            const { data, error } = await supabase
                .from('user_settings')
                .update({
                    telegram_bot_token,
                    telegram_chat_id,
                    site_url,
                    site_products_api_url,
                    site_update_price_api_url,
                    trendyol_target_url,
                    trendyol_brand_slug,
                    replace_genel_markalar,
                    ikas_client_id,
                    ikas_client_secret,
                    ikas_store_name,
                    ikas_excel_mapping,
                    contact_phone,
                    contact_whatsapp,
                    label_stock_code,
                    label_size_range,
                    label_whatsapp,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id)
                .select()
                .single()

            if (error) throw error
            return NextResponse.json(data)
        } else {
            // Insert new settings
            const { data, error } = await supabase
                .from('user_settings')
                .insert({
                    user_id: user.id,
                    telegram_bot_token,
                    telegram_chat_id,
                    site_url,
                    site_products_api_url,
                    site_update_price_api_url,
                    trendyol_target_url,
                    trendyol_brand_slug,
                    replace_genel_markalar,
                    ikas_client_id,
                    ikas_client_secret,
                    ikas_store_name,
                    ikas_excel_mapping,
                    contact_phone,
                    contact_whatsapp,
                    label_stock_code,
                    label_size_range,
                    label_whatsapp,
                })
                .select()
                .single()

            if (error) throw error
            return NextResponse.json(data)
        }
    } catch (error: any) {
        console.error('Save settings error:', error)
        return NextResponse.json(
            { error: error.message || 'Settings kaydedilirken hata oluştu' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()

        // Filter out undefined/null values to perform partial update
        const updates: any = { updated_at: new Date().toISOString() }

        // Allow updating specific fields
        const allowedFields = [
            'telegram_bot_token', 'telegram_chat_id', 'site_url',
            'site_products_api_url', 'site_update_price_api_url',
            'trendyol_target_url', 'trendyol_brand_slug', 'replace_genel_markalar',
            'ikas_client_id', 'ikas_client_secret', 'ikas_store_name',
            'ikas_excel_mapping', 'contact_phone', 'contact_whatsapp',
            'label_stock_code', 'label_size_range', 'label_whatsapp'
        ]

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field]
            }
        }

        if (Object.keys(updates).length <= 1) { // Only updated_at
            return NextResponse.json({ message: 'No changes detected' })
        }

        const { data, error } = await supabase
            .from('user_settings')
            .update(updates)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Patch settings error:', error)
        return NextResponse.json(
            { error: error.message || 'Settings güncellenirken hata oluştu' },
            { status: 500 }
        )
    }
}
