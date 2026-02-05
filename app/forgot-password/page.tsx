'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ShoppingBag, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { isValidEmail } from '@/lib/security/password'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [cooldown, setCooldown] = useState(0)
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!isValidEmail(email)) {
            setError('Geçerli bir email adresi giriniz')
            return
        }

        if (cooldown > 0) {
            setError(`Lütfen ${cooldown} saniye bekleyiniz`)
            return
        }

        try {
            setLoading(true)

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (error) throw error

            setSubmitted(true)
            setCooldown(60)

            // Start cooldown timer
            const timer = setInterval(() => {
                setCooldown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        } catch (err: any) {
            setError(err.message || 'Şifre sıfırlama linki gönderilirken bir hata oluştu')
        } finally {
            setLoading(false)
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

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
                    {submitted ? (
                        // Success State
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-emerald-600" />
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Email Gönderildi!
                            </h2>

                            <p className="text-gray-600 mb-6">
                                <span className="font-medium text-emerald-600">{email}</span>
                                {' '}adresine şifre sıfırlama linki gönderdik.
                            </p>

                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6 text-left">
                                <p className="text-sm text-emerald-800">
                                    Email'inizi kontrol edin ve linke tıklayarak yeni şifrenizi belirleyin.
                                    Spam klasörünü de kontrol etmeyi unutmayın.
                                </p>
                            </div>

                            {cooldown > 0 && (
                                <p className="text-gray-500 text-sm mb-4">
                                    Tekrar göndermek için {cooldown} saniye bekleyin
                                </p>
                            )}

                            <button
                                onClick={() => setSubmitted(false)}
                                disabled={cooldown > 0}
                                className="text-emerald-600 hover:text-emerald-700 font-medium text-sm disabled:opacity-50"
                            >
                                Farklı bir email dene
                            </button>
                        </div>
                    ) : (
                        // Form State
                        <>
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Mail className="w-8 h-8 text-emerald-600" />
                                </div>

                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    Şifremi Unuttum
                                </h2>
                                <p className="text-gray-600 text-sm">
                                    Email adresinizi girin, şifre sıfırlama linki gönderelim
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Email Adresi
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:outline-none transition-colors"
                                        placeholder="ornek@email.com"
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !email}
                                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    ) : (
                                        'Sıfırlama Linki Gönder'
                                    )}
                                </button>
                            </form>
                        </>
                    )}
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
