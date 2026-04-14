import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { postToInstagram } from '@/lib/instagram-api';

export const maxDuration = 60; // Varsayılan 10/15 saniyelik Vercel sınırını maksimum 60 saniyeye çıkardık.

/**
 * Cron endpoint for processing scheduled Instagram posts.
 * Called by Vercel Cron every minute.
 * Uses service role key to bypass RLS (no user session in cron context).
 */
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use service role to bypass RLS
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            console.error('[Cron] SUPABASE_SERVICE_ROLE_KEY is not set');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createSupabaseAdmin(supabaseUrl, supabaseServiceKey);

        // Find all pending posts that are due
        const now = new Date().toISOString();
        const { data: duePosts, error: fetchError } = await supabase
            .from('instagram_scheduled_posts')
            .select('*')
            .eq('status', 'pending')
            .lte('scheduled_at', now)
            .order('scheduled_at', { ascending: true })
            .limit(2); // Vercel timeout olmaması için tek seferde (dakikada) en fazla 2 görev işleyelim

        if (fetchError) {
            console.error('[Cron] Error fetching due posts:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch due posts' }, { status: 500 });
        }

        if (!duePosts || duePosts.length === 0) {
            return NextResponse.json({ message: 'No posts due', processed: 0 });
        }

        console.log(`[Cron] Found ${duePosts.length} due post(s)`);

        // Çift paylaşımı önlemek için (Lock Mechanism): İşleme başlamadan önce bu postların 
        // tarihini geçici olarak +5 dakika ileri atıyoruz. Böylece cron-job veya Vercel timeout 
        // yiyip 30 saniye sonra tekrar tetiklenirse, aynı postu bir daha pending görmeyecek.
        const postIds = duePosts.map(p => p.id);
        const lockTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        await supabase
            .from('instagram_scheduled_posts')
            .update({ scheduled_at: lockTime })
            .in('id', postIds);

        const results: Array<{ id: string; status: string; error?: string }> = [];

        for (const post of duePosts) {
            try {
                // Get user's Instagram credentials
                const { data: settings, error: settingsError } = await supabase
                    .from('user_settings')
                    .select('instagram_access_token, instagram_account_id')
                    .eq('user_id', post.user_id)
                    .single();

                if (settingsError || !settings?.instagram_access_token || !settings?.instagram_account_id) {
                    throw new Error('Instagram ayarları bulunamadı');
                }

                const imageUrls = post.image_urls as string[];

                // Post to Instagram
                const result = await postToInstagram(
                    settings.instagram_account_id,
                    settings.instagram_access_token,
                    imageUrls,
                    post.caption || undefined,
                    post.location_id || undefined,
                    post.post_type || 'post'
                );

                // Mark as sent
                await supabase
                    .from('instagram_scheduled_posts')
                    .update({
                        status: 'sent',
                        post_id: result.postId || null,
                    })
                    .eq('id', post.id);

                // Also mark in sent_items if product_id exists
                if (post.product_id) {
                    await supabase
                        .from('instagram_sent_items')
                        .upsert({
                            user_id: post.user_id,
                            product_id: post.product_id,
                            urun_grup_id: post.urun_grup_id,
                            urun_ismi: post.urun_ismi,
                            post_id: result.postId,
                            sent_at: new Date().toISOString(),
                        }, {
                            onConflict: 'user_id,product_id'
                        });
                }

                console.log(`[Cron] Successfully posted scheduled post ${post.id}`);
                results.push({ id: post.id, status: 'sent' });

            } catch (err: any) {
                console.error(`[Cron] Error posting scheduled post ${post.id}:`, err.message);

                // Mark as failed
                await supabase
                    .from('instagram_scheduled_posts')
                    .update({
                        status: 'failed',
                        error_message: err.message || 'Bilinmeyen hata',
                    })
                    .eq('id', post.id);

                results.push({ id: post.id, status: 'failed', error: err.message });
            }
        }

        return NextResponse.json({
            message: `Processed ${results.length} post(s)`,
            processed: results.length,
            results,
        });

    } catch (error: any) {
        console.error('[Cron] Unexpected error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
