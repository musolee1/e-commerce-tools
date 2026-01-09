import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('telegram_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('sent_at', { ascending: false })
            .limit(100)

        if (error) throw error

        return NextResponse.json({ logs: data || [] })
    } catch (error: any) {
        console.error('Get logs error:', error)
        return NextResponse.json(
            { error: error.message || 'Loglar alınırken hata oluştu' },
            { status: 500 }
        )
    }
}
