import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const next = searchParams.get('next') ?? '/dashboard/telegram-bot'

    console.log('Email confirmation attempt:', { token_hash: token_hash?.substring(0, 10) + '...', type })

    if (token_hash && type) {
        const supabase = await createClient()

        const { data, error } = await supabase.auth.verifyOtp({
            type: type as 'signup' | 'recovery' | 'email',
            token_hash,
        })

        if (error) {
            console.error('Email verification error:', error.message, error.code)
        } else {
            console.log('Email verified successfully for:', data?.user?.email)
            // Email verified successfully, redirect to dashboard
            return NextResponse.redirect(`${origin}${next}`)
        }
    } else {
        console.error('Missing token_hash or type in URL params')
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=email_confirmation_failed`)
}
