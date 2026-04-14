import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { postToInstagram } from '@/lib/instagram-api';

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
        const { imageUrls, caption, locationId, postType } = body;

        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return NextResponse.json({ error: 'En az bir görsel URL gereklidir.' }, { status: 400 });
        }

        if (imageUrls.length > 10) {
            return NextResponse.json({ error: 'Maksimum 10 görsel yükleyebilirsiniz.' }, { status: 400 });
        }

        const result = await postToInstagram(
            settings.instagram_account_id,
            settings.instagram_access_token,
            imageUrls,
            caption,
            locationId,
            postType
        );

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Instagram post error:', error);
        return NextResponse.json({
            error: error.message || 'Bilinmeyen bir hata oluştu'
        }, { status: 500 });
    }
}
