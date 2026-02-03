import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List all grouped products for the user with sent status
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
        }

        // Get grouped products
        const { data: products, error } = await supabase
            .from('ikas_grouped_products')
            .select('*')
            .eq('user_id', session.user.id)
            .order('uploaded_at', { ascending: false })

        if (error) {
            console.error('Fetch error:', error)
            return NextResponse.json({ error: 'Ürünler getirilemedi' }, { status: 500 })
        }

        // Get previously sent product slugs from telegram_logs
        const { data: sentLogs } = await supabase
            .from('telegram_logs')
            .select('product_slug')
            .eq('user_id', session.user.id)
            .eq('status', 'success')

        // Create a set of sent product slugs (stok_kodu or urun_grup_id)
        const sentSlugs = new Set(sentLogs?.map(log => log.product_slug) || [])

        // Mark products as previously sent
        const productsWithSentStatus = (products || []).map(product => ({
            ...product,
            previously_sent: sentSlugs.has(product.stok_kodu) || sentSlugs.has(product.urun_grup_id)
        }))

        return NextResponse.json({
            success: true,
            products: productsWithSentStatus
        })
    } catch (error: any) {
        console.error('Error fetching products:', error)
        return NextResponse.json(
            { error: error.message || 'Ürünler getirilemedi' },
            { status: 500 }
        )
    }
}

// DELETE - Clear all grouped products for the user
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
        }

        const { error } = await supabase
            .from('ikas_grouped_products')
            .delete()
            .eq('user_id', session.user.id)

        if (error) {
            console.error('Delete error:', error)
            return NextResponse.json({ error: 'Ürünler silinemedi' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Tüm ürünler silindi'
        })
    } catch (error: any) {
        console.error('Error deleting products:', error)
        return NextResponse.json(
            { error: error.message || 'Ürünler silinemedi' },
            { status: 500 }
        )
    }
}
