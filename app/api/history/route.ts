import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch telegram logs
        const { data: telegramLogs, error: telegramError } = await supabase
            .from('telegram_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('sent_at', { ascending: false })
            .limit(200)

        if (telegramError) throw telegramError

        // Fetch instagram sent items
        const { data: instagramLogs, error: instagramError } = await supabase
            .from('instagram_sent_items')
            .select('*')
            .eq('user_id', user.id)
            .order('sent_at', { ascending: false })
            .limit(200)

        if (instagramError) throw instagramError

        // Normalize and merge
        const telegramEntries = (telegramLogs || []).map((log: any) => ({
            id: log.id,
            source: 'telegram' as const,
            product_name: log.product_name,
            detail: log.product_slug,
            stock_count: log.stock_count,
            status: log.status || 'success',
            sent_at: log.sent_at,
        }))

        const instagramEntries = (instagramLogs || []).map((log: any) => ({
            id: log.id,
            source: 'instagram' as const,
            product_name: log.urun_ismi || log.product_id,
            detail: log.post_id || log.urun_grup_id || '',
            stock_count: null,
            status: 'success' as const,
            sent_at: log.sent_at,
        }))

        // Merge and sort by date descending
        const allLogs = [...telegramEntries, ...instagramEntries]
            .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
            .slice(0, 200)

        return NextResponse.json({
            logs: allLogs,
            counts: {
                total: allLogs.length,
                telegram: telegramEntries.length,
                instagram: instagramEntries.length,
            }
        })
    } catch (error: any) {
        console.error('Get history error:', error)
        return NextResponse.json(
            { error: error.message || 'Geçmiş alınırken hata oluştu' },
            { status: 500 }
        )
    }
}
