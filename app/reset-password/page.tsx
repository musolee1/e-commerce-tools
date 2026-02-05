'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ShoppingBag, Eye, EyeOff, Check, X, ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { validatePasswordStrength, getPasswordStrengthLabel } from '@/lib/security/password'

function ResetPasswordContent() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [passwordValidation, setPasswordValidation] = useState(validatePasswordStrength(''))
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    // Check for auth state change (user coming from reset link)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                // User clicked the reset link and is now in password recovery mode
            }
        })

        return () => subscription.unsubscribe()
    }, [supabase.auth])

    // Update password validation on change
    useEffect(() => {
        setPasswordValidation(validatePasswordStrength(password))
    }, [password])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!passwordValidation.isValid) {
            setError('Şifre gereksinimleri karşılanmıyor')
            return
        }

        if (password !== confirmPassword) {
            setError('Şifreler eşleşmiyor')
            return
        }

        try {
            setLoading(true)

            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) throw error

            setSuccess(true)

            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push('/login?message=password_reset_success')
            }, 3000)
        } catch (err: any) {
            setError(err.message || 'Şifre güncellenirken bir hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    const strengthLabel = getPasswordStrengthLabel(passwordValidation.score)

    if (success) {
        return (
            <div className="min-h-screen w-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 text-center">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-emerald-600" />
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Şifre Güncellendi!
                        </h2>

                        <p className="text-gray-600 mb-4">
                            Şifreniz başarıyla değiştirildi. Giriş sayfasına yönlendiriliyorsunuz...
                        </p>

                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                    </div>
                </div>
            </div>
        )
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
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Yeni Şifre Belirleyin
                        </h2>
                        <p className="text-gray-600 text-sm">
                            Güçlü bir şifre seçin
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Yeni Şifre
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
                            disabled={loading || !passwordValidation.isValid || password !== confirmPassword}
                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                            ) : (
                                'Şifreyi Güncelle'
                            )}
                        </button>
                    </form>
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

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    )
}
