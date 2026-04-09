import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch user's scheduled posts (pending only by default)
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'pending';

        let query = supabase
            .from('instagram_scheduled_posts')
            .select('*')
            .eq('user_id', user.id)
            .order('scheduled_at', { ascending: true });

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching scheduled posts:', error);
            return NextResponse.json({ error: 'Planlı gönderiler alınamadı' }, { status: 500 });
        }

        return NextResponse.json({ scheduledPosts: data || [] });
    } catch (error: any) {
        console.error('Scheduled posts GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Create a new scheduled post
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { imageUrls, caption, locationId, productId, urunGrupId, urunIsmi, productName, scheduledAt } = body;

        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return NextResponse.json({ error: 'En az bir görsel URL gereklidir.' }, { status: 400 });
        }

        if (imageUrls.length > 10) {
            return NextResponse.json({ error: 'Maksimum 10 görsel yükleyebilirsiniz.' }, { status: 400 });
        }

        if (!scheduledAt) {
            return NextResponse.json({ error: 'Planlama zamanı gereklidir.' }, { status: 400 });
        }

        const scheduledDate = new Date(scheduledAt);
        if (scheduledDate <= new Date()) {
            return NextResponse.json({ error: 'Planlama zamanı gelecekte olmalıdır.' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('instagram_scheduled_posts')
            .insert({
                user_id: user.id,
                image_urls: imageUrls,
                caption: caption || '',
                location_id: locationId || null,
                product_id: productId || null,
                urun_grup_id: urunGrupId || null,
                urun_ismi: urunIsmi || null,
                product_name: productName || 'Manuel Post',
                scheduled_at: scheduledDate.toISOString(),
                status: 'pending',
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating scheduled post:', error);
            return NextResponse.json({ error: 'Planlı gönderi oluşturulamadı' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            scheduledPost: data,
            message: `Post ${scheduledDate.toLocaleString('tr-TR')} için planlandı!`
        });
    } catch (error: any) {
        console.error('Scheduled posts POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Cancel a scheduled post
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const postId = searchParams.get('id');

        if (!postId) {
            return NextResponse.json({ error: 'Post ID gereklidir.' }, { status: 400 });
        }

        // Only allow deleting pending posts
        const { error } = await supabase
            .from('instagram_scheduled_posts')
            .delete()
            .eq('id', postId)
            .eq('user_id', user.id)
            .eq('status', 'pending');

        if (error) {
            console.error('Error deleting scheduled post:', error);
            return NextResponse.json({ error: 'Planlı gönderi iptal edilemedi' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Planlı gönderi iptal edildi.' });
    } catch (error: any) {
        console.error('Scheduled posts DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
