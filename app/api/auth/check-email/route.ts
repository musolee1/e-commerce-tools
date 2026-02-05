import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { authRateLimiter } from '@/lib/security/rate-limit'
import { isValidEmail } from '@/lib/security/password'

export async function POST(request: Request) {
    try {
        const { email } = await request.json()

        if (!email || !isValidEmail(email)) {
            return NextResponse.json(
                { error: 'Geçerli bir email adresi giriniz' },
                { status: 400 }
            )
        }

        // Rate limiting based on IP
        const ip = request.headers.get('x-forwarded-for') || 'unknown'
        const rateLimitResult = authRateLimiter.check(`check-email:${ip}`)

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: `Çok fazla istek. ${rateLimitResult.retryAfter} saniye sonra tekrar deneyin.` },
                { status: 429 }
            )
        }

        const supabase = await createClient()

        // Check if user exists with this email using admin API
        // Note: This requires service role key for security
        // For now, we'll try to get user identity providers
        const { data, error } = await supabase.rpc('check_user_exists', {
            user_email: email.toLowerCase()
        })

        if (error) {
            // If the function doesn't exist, we fall back to a safer approach
            // We can't directly check if a user exists without admin access
            // So we return a generic response
            console.log('check_user_exists function not available:', error.message)
            return NextResponse.json({
                exists: false,
                provider: null,
                message: 'Email kontrolü yapılamadı'
            })
        }

        return NextResponse.json({
            exists: !!data,
            provider: data?.provider || null,
        })
    } catch (error) {
        console.error('Check email error:', error)
        return NextResponse.json(
            { error: 'Email kontrolünde bir hata oluştu' },
            { status: 500 }
        )
    }
}
