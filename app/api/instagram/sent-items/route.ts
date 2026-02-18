import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch user's sent items
export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('instagram_sent_items')
            .select('product_id')
            .eq('user_id', user.id)

        if (error) {
            console.error('Error fetching sent items:', error)
            return NextResponse.json({ error: 'Failed to fetch sent items' }, { status: 500 })
        }

        return NextResponse.json({
            sentItemIds: data?.map(item => item.product_id) || []
        })
    } catch (error: any) {
        console.error('Sent items GET error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST - Mark item as sent
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { productId, urunGrupId, urunIsmi, postId } = body

        if (!productId) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
        }

        const { error } = await supabase
            .from('instagram_sent_items')
            .upsert({
                user_id: user.id,
                product_id: productId,
                urun_grup_id: urunGrupId,
                urun_ismi: urunIsmi,
                post_id: postId,
                sent_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,product_id'
            })

        if (error) {
            console.error('Error saving sent item:', error)
            return NextResponse.json({ error: 'Failed to save sent item' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Sent items POST error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
