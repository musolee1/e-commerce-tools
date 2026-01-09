import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getIkasToken } from '@/lib/ikas/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Check auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user settings
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('ikas_client_id, ikas_client_secret, ikas_store_name')
            .eq('user_id', user.id)
            .single();

        if (settingsError || !settings?.ikas_client_id || !settings?.ikas_client_secret) {
            return NextResponse.json(
                { error: 'İKAS ayarları eksik. Lütfen önce ayarlar sayfasından İKAS bilgilerinizi girin.' },
                { status: 400 }
            );
        }

        // Get access token
        const accessToken = await getIkasToken(
            settings.ikas_store_name || 'swassonline',
            settings.ikas_client_id,
            settings.ikas_client_secret
        );

        return NextResponse.json({
            success: true,
            accessToken,
        });
    } catch (error: any) {
        console.error('İKAS auth error:', error);
        return NextResponse.json(
            { error: error.message || 'İKAS authentication hatası' },
            { status: 500 }
        );
    }
}
