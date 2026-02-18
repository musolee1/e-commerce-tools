import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GRAPH_API_VERSION = 'v18.0';
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 2000; // 2s, 4s, 8s
const INTER_ITEM_DELAY = 3000; // 3s between carousel item uploads
const STATUS_POLL_INTERVAL = 3000; // 3s between status checks
const STATUS_POLL_TIMEOUT = 90000; // 90s max wait for media processing

// Retry wrapper for transient Instagram API errors
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    label: string,
    retries = MAX_RETRIES
): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, options);
            const data = await response.json();

            // If it's a transient error and we have retries left, retry
            if (data.error) {
                const isTransient = data.error.is_transient ||
                    data.error.code === 2 ||
                    data.error.message?.includes('unexpected') ||
                    data.error.message?.includes('retry');

                if (isTransient && attempt < retries) {
                    const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
                    console.log(`[${label}] Transient error on attempt ${attempt}/${retries}, retrying in ${delay}ms...`);
                    console.log(`[${label}] Error:`, data.error.message);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
            }

            return data;
        } catch (err: any) {
            if (attempt < retries) {
                const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
                console.log(`[${label}] Network error on attempt ${attempt}/${retries}, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw err;
        }
    }
}

// Poll media status until FINISHED or timeout
async function waitForMediaReady(
    mediaId: string,
    accessToken: string,
    label: string
): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < STATUS_POLL_TIMEOUT) {
        try {
            const response = await fetch(
                `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}?fields=status_code,status&access_token=${accessToken}`
            );
            const data = await response.json();

            if (data.status_code === 'FINISHED') {
                console.log(`[${label}] Media ready (FINISHED)`);
                return;
            }

            if (data.status_code === 'ERROR') {
                throw new Error(`Media processing failed: ${data.status || 'Unknown error'}`);
            }

            console.log(`[${label}] Media status: ${data.status_code || 'IN_PROGRESS'}, waiting...`);
        } catch (err: any) {
            // If the status check itself fails, just continue polling
            console.log(`[${label}] Status check error (continuing):`, err.message);
        }

        await new Promise(resolve => setTimeout(resolve, STATUS_POLL_INTERVAL));
    }

    // Timeout — try publishing anyway, Instagram might accept it
    console.log(`[${label}] Status poll timeout after ${STATUS_POLL_TIMEOUT / 1000}s, attempting publish anyway`);
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('instagram_access_token, instagram_account_id')
            .eq('user_id', user.id)
            .single();

        if (settingsError || !settings?.instagram_access_token || !settings?.instagram_account_id) {
            return NextResponse.json({
                error: 'Instagram ayarları bulunamadı. Lütfen Settings sayfasından Instagram bilgilerinizi girin.'
            }, { status: 400 });
        }

        const body = await request.json();
        const { imageUrls, caption, userTags, locationId } = body;

        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return NextResponse.json({ error: 'En az bir görsel URL gereklidir.' }, { status: 400 });
        }

        if (imageUrls.length > 10) {
            return NextResponse.json({ error: 'Maksimum 10 görsel yükleyebilirsiniz.' }, { status: 400 });
        }

        const accessToken = settings.instagram_access_token;
        const igAccountId = settings.instagram_account_id;

        if (imageUrls.length === 1) {
            return await createSinglePost(igAccountId, accessToken, imageUrls[0], caption, userTags, locationId);
        }

        return await createCarouselPost(igAccountId, accessToken, imageUrls, caption, userTags);

    } catch (error: any) {
        console.error('Instagram post error:', error);
        return NextResponse.json({
            error: error.message || 'Bilinmeyen bir hata oluştu'
        }, { status: 500 });
    }
}

// Single image post
async function createSinglePost(
    igAccountId: string,
    accessToken: string,
    imageUrl: string,
    caption?: string,
    userTags?: Array<{ username: string, x: number, y: number }>,
    locationId?: string
) {
    const containerParams: any = {
        image_url: imageUrl,
        access_token: accessToken,
    };

    if (caption) containerParams.caption = caption;
    if (locationId) containerParams.location_id = locationId;

    if (userTags && userTags.length > 0) {
        containerParams.user_tags = JSON.stringify(
            userTags.map(tag => ({ username: tag.username, x: tag.x, y: tag.y }))
        );
    }

    // Step 1: Create media container
    const containerData = await fetchWithRetry(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${igAccountId}/media`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(containerParams),
        },
        'Single:Container'
    );

    if (containerData.error) {
        throw new Error(`Instagram hatası: ${containerData.error.message}`);
    }

    const creationId = containerData.id;

    // Step 2: Wait for media to be ready
    await waitForMediaReady(creationId, accessToken, 'Single:Status');

    // Step 3: Publish
    const publishData = await fetchWithRetry(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${igAccountId}/media_publish`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
        },
        'Single:Publish'
    );

    if (publishData.error) {
        throw new Error(`Yayınlama hatası: ${publishData.error.message}`);
    }

    return NextResponse.json({
        success: true,
        postId: publishData.id,
        message: 'Instagram\'a başarıyla post atıldı!'
    });
}

// Carousel post (2-10 images)
async function createCarouselPost(
    igAccountId: string,
    accessToken: string,
    imageUrls: string[],
    caption?: string,
    userTags?: Array<{ username: string, x: number, y: number }>
) {
    // Step 1: Create media containers for each image
    const childrenIds: string[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        const label = `Carousel:Item${i + 1}/${imageUrls.length}`;

        // Delay between items (not before the first one)
        if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, INTER_ITEM_DELAY));
        }

        console.log(`[${label}] Creating:`, imageUrl);

        const itemData = await fetchWithRetry(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/${igAccountId}/media`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_url: imageUrl,
                    is_carousel_item: true,
                    access_token: accessToken,
                }),
            },
            label
        );

        if (itemData.error) {
            throw new Error(
                `Görsel ${i + 1} yüklenirken hata: ${itemData.error.message || 'Bilinmeyen hata'}. ` +
                `Lütfen görselin geçerli ve erişilebilir olduğundan emin olun.`
            );
        }

        if (!itemData.id) {
            throw new Error(`Görsel ${i + 1} için ID alınamadı.`);
        }

        console.log(`[${label}] Created:`, itemData.id);
        childrenIds.push(itemData.id);
    }

    // Step 2: Wait for ALL carousel items to be processed
    console.log('Waiting for all carousel items to be processed...');
    for (let i = 0; i < childrenIds.length; i++) {
        await waitForMediaReady(
            childrenIds[i],
            accessToken,
            `Carousel:ItemStatus${i + 1}`
        );
    }

    // Step 3: Create carousel container
    const carouselParams: any = {
        media_type: 'CAROUSEL',
        children: childrenIds.join(','),
        access_token: accessToken,
    };

    if (caption) carouselParams.caption = caption;

    console.log('Creating carousel container with', childrenIds.length, 'children');

    const carouselData = await fetchWithRetry(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${igAccountId}/media`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(carouselParams),
        },
        'Carousel:Container'
    );

    if (carouselData.error) {
        throw new Error(
            `Carousel oluşturma hatası: ${carouselData.error.message || 'Bilinmeyen hata'}`
        );
    }

    if (!carouselData.id) {
        throw new Error('Carousel container ID alınamadı.');
    }

    console.log('Carousel container created:', carouselData.id);

    // Step 4: Wait for carousel container to be ready
    await waitForMediaReady(carouselData.id, accessToken, 'Carousel:ContainerStatus');

    // Step 5: Publish carousel
    const publishData = await fetchWithRetry(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${igAccountId}/media_publish`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creation_id: carouselData.id,
                access_token: accessToken,
            }),
        },
        'Carousel:Publish'
    );

    if (publishData.error) {
        throw new Error(`Yayınlama hatası: ${publishData.error.message}`);
    }

    return NextResponse.json({
        success: true,
        postId: publishData.id,
        message: `${imageUrls.length} görselli carousel başarıyla yayınlandı!`
    });
}
