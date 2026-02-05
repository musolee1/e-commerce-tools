'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ShoppingBag, Eye, EyeOff, Check, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { validatePasswordStrength, getPasswordStrengthLabel, isValidEmail } from '@/lib/security/password'

export default function RegisterPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [emailError, setEmailError] = useState<string | null>(null)
    const [passwordValidation, setPasswordValidation] = useState(validatePasswordStrength(''))
    const router = useRouter()
    const supabase = createClient()

    // Update password validation on change
    useEffect(() => {
        setPasswordValidation(validatePasswordStrength(password))
    }, [password])

    // Check email availability with debounce
    useEffect(() => {
        if (!email || !isValidEmail(email)) {
            setEmailError(null)
            return
        }

        const timer = setTimeout(async () => {
            try {
                const response = await fetch('/api/auth/check-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                })

                const data = await response.json()

                if (data.exists) {
                    if (data.provider === 'google') {
                        setEmailError('Bu email Google hesabı ile kayıtlı. Lütfen Google ile giriş yapın.')
                    } else {
                        setEmailError('Bu email zaten kayıtlı. Giriş yapmayı deneyin.')
                    }
                } else {
                    setEmailError(null)
                }
            } catch {
                // Ignore errors, this is just a convenience check
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [email])

    const handleGoogleSignUp = async () => {
        try {
            setGoogleLoading(true)
            setError(null)

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })

            if (error) throw error
        } catch (err: any) {
            setError(err.message || 'Google ile kayıt yapılırken bir hata oluştu')
            setGoogleLoading(false)
        }
    }

    const handleEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Validation
        if (!isValidEmail(email)) {
            setError('Geçerli bir email adresi giriniz')
            return
        }

        if (!passwordValidation.isValid) {
            setError('Şifre gereksinimleri karşılanmıyor')
            return
        }

        if (password !== confirmPassword) {
            setError('Şifreler eşleşmiyor')
            return
        }

        if (emailError) {
            setError(emailError)
            return
        }

        try {
            setLoading(true)

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/confirm`,
                },
            })

            if (error) throw error

            // Redirect to verify email page
            router.push(`/verify-email?email=${encodeURIComponent(email)}`)
        } catch (err: any) {
            setError(err.message || 'Kayıt yapılırken bir hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    const strengthLabel = getPasswordStrengthLabel(passwordValidation.score)

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

                {/* Register Card */}
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Hesap Oluşturun 🚀
                        </h2>
                        <p className="text-gray-600 text-sm">
                            E-ticaret yönetim panelinize başlayın
                        </p>
                    </div>

                    {/* Google Sign Up */}
                    <button
                        onClick={handleGoogleSignUp}
                        disabled={googleLoading || loading}
                        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-6 rounded-xl transition-all duration-200 border-2 border-gray-200 hover:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md mb-4"
                    >
                        {googleLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        <span>Google ile Kayıt Ol</span>
                    </button>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-gray-500">veya email ile</span>
                        </div>
                    </div>

                    {/* Email Form */}
                    <form onSubmit={handleEmailSignUp} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Email Adresi
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`w-full px-4 py-3 rounded-xl border-2 ${emailError ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500'
                                    } focus:outline-none transition-colors`}
                                placeholder="ornek@email.com"
                                required
                                disabled={loading}
                            />
                            {emailError && (
                                <p className="text-red-500 text-xs mt-1">{emailError}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Şifre
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:outline-none transition-colors pr-12"
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {/* Password Strength */}
                            {password && (
                                <div className="mt-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${strengthLabel.color}`}
                                                style={{ width: `${(passwordValidation.score / 4) * 100}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs font-medium ${strengthLabel.color.replace('bg-', 'text-')}`}>
                                            {strengthLabel.label}
                                        </span>
                                    </div>

                                    {/* Password Requirements */}
                                    <div className="space-y-1 mt-2">
                                        {[
                                            { check: password.length >= 8, text: 'En az 8 karakter' },
                                            { check: /[A-Z]/.test(password), text: 'Büyük harf' },
                                            { check: /[a-z]/.test(password), text: 'Küçük harf' },
                                            { check: /[0-9]/.test(password), text: 'Rakam' },
                                            { check: /[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/`~]/.test(password), text: 'Özel karakter' },
                                        ].map((req, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5 text-xs">
                                                {req.check ? (
                                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                ) : (
                                                    <X className="w-3.5 h-3.5 text-gray-300" />
                                                )}
                                                <span className={req.check ? 'text-emerald-600' : 'text-gray-400'}>
                                                    {req.text}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Şifre Tekrar
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border-2 ${confirmPassword && password !== confirmPassword
                                        ? 'border-red-300 focus:border-red-500'
                                        : confirmPassword && password === confirmPassword
                                            ? 'border-emerald-300 focus:border-emerald-500'
                                            : 'border-gray-200 focus:border-emerald-500'
                                        } focus:outline-none transition-colors pr-12`}
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {confirmPassword && password !== confirmPassword && (
                                <p className="text-red-500 text-xs mt-1">Şifreler eşleşmiyor</p>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !passwordValidation.isValid || password !== confirmPassword || !!emailError}
                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                            ) : (
                                'Kayıt Ol'
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <div className="text-center mt-6">
                        <p className="text-gray-600 text-sm">
                            Zaten hesabınız var mı?{' '}
                            <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                                Giriş Yapın
                            </Link>
                        </p>
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
