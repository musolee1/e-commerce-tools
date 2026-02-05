'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ShoppingBag, Mail, RefreshCw, ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function VerifyEmailContent() {
    const [email, setEmail] = useState('')
    const [resending, setResending] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const searchParams = useSearchParams()
    const supabase = createClient()

    useEffect(() => {
        const emailParam = searchParams.get('email')
        if (emailParam) {
            setEmail(emailParam)
        }
    }, [searchParams])

    // Cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [resendCooldown])

    const handleResendEmail = async () => {
        if (resendCooldown > 0 || !email) return

        try {
            setResending(true)
            setMessage(null)

            const { error } = await supabase.auth.resend({
                type: 'signup',
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/confirm`,
                },
            })

            if (error) throw error

            setMessage({ type: 'success', text: 'Doğrulama emaili tekrar gönderildi!' })
            setResendCooldown(60) // 60 second cooldown
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Email gönderilirken bir hata oluştu' })
        } finally {
            setResending(false)
        }
    }

    return (
        <div className="min-h-screen w-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
            {/* Background Pattern */}
            <div className="fixed inset-0 opacity-30 pointer-events-none">
                <div className="absolute top-20 left-20 w-64 h-64 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                <div className="absolute bottom-20 right-20 w-64 h-64 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <ShoppingBag className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-gray-900">Pazar Yöneticim</span>
                </div>

                {/* Verify Email Card */}
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 text-center">
                    {/* Email Icon */}
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-8 h-8 text-emerald-600" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Email Adresinizi Doğrulayın
                    </h2>

                    <p className="text-gray-600 mb-4">
                        <span className="font-medium text-emerald-600">{email || 'email adresinize'}</span>
                        {' '}bir doğrulama linki gönderdik.
                    </p>

                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6">
                        <div className="flex items-start gap-3 text-left">
                            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-emerald-800">
                                <p className="font-medium mb-1">Sonraki adımlar:</p>
                                <ol className="list-decimal list-inside space-y-1 text-emerald-700">
                                    <li>Email gelen kutunuzu kontrol edin</li>
                                    <li>Spam klasörünü de kontrol etmeyi unutmayın</li>
                                    <li>Email'deki doğrulama linkine tıklayın</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Resend Button */}
                    <button
                        onClick={handleResendEmail}
                        disabled={resending || resendCooldown > 0 || !email}
                        className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-xl transition-all duration-200 border-2 border-gray-200 hover:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {resending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <RefreshCw className="w-5 h-5" />
                        )}
                        <span>
                            {resendCooldown > 0
                                ? `${resendCooldown} saniye sonra tekrar dene`
                                : 'Email\'i Tekrar Gönder'
                            }
                        </span>
                    </button>

                    {/* Message */}
                    {message && (
                        <div className={`mt-4 p-3 rounded-xl text-sm ${message.type === 'success'
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {/* Change Email */}
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <p className="text-gray-500 text-sm mb-3">
                            Yanlış email mi girdiniz?
                        </p>
                        <Link
                            href="/register"
                            className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                        >
                            Farklı bir email ile kayıt ol
                        </Link>
                    </div>
                </div>

                {/* Back to Login */}
                <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 mt-6 text-sm transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Giriş sayfasına dön
                </Link>
            </div>

            <style jsx>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 7s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
            `}</style>
        </div>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    )
}
