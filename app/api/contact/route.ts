import { NextResponse } from 'next/server'

const CONTACT_EMAIL = 'mustafabayramoglu29@gmail.com'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, email, phone, message } = body

        // Validate required fields
        if (!name || !email || !message) {
            return NextResponse.json(
                { error: 'İsim, e-posta ve mesaj alanları zorunludur' },
                { status: 400 }
            )
        }

        // Format the email content
        const emailContent = `
Yeni İletişim Formu Mesajı - Pazar Yöneticim

Gönderen Bilgileri:
---------------------
İsim: ${name}
E-posta: ${email}
Telefon: ${phone || 'Belirtilmedi'}

Mesaj:
---------------------
${message}

---------------------
Bu mesaj Pazar Yöneticim web sitesinden gönderilmiştir.
Tarih: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
`

        // Check if Resend API key is available
        const resendApiKey = process.env.RESEND_API_KEY

        if (resendApiKey) {
            // Send email using Resend API
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'Pazar Yöneticim <onboarding@resend.dev>',
                    to: [CONTACT_EMAIL],
                    subject: `Yeni İletişim: ${name} - Pazar Yöneticim`,
                    text: emailContent,
                    reply_to: email
                })
            })

            if (!response.ok) {
                const error = await response.json()
                console.error('Resend API error:', error)
                throw new Error('E-posta gönderilemedi')
            }

            console.log('Email sent successfully via Resend')
        } else {
            // Log the contact request if no email service is configured
            console.log('='.repeat(50))
            console.log('NEW CONTACT FORM SUBMISSION')
            console.log('='.repeat(50))
            console.log(emailContent)
            console.log('='.repeat(50))
            console.log(`NOTE: RESEND_API_KEY not configured. Email would be sent to: ${CONTACT_EMAIL}`)
        }

        return NextResponse.json({
            success: true,
            message: 'Mesajınız başarıyla gönderildi!'
        })

    } catch (error: any) {
        console.error('Contact form error:', error)
        return NextResponse.json(
            { error: 'Mesaj gönderilemedi. Lütfen tekrar deneyin.' },
            { status: 500 }
        )
    }
}
