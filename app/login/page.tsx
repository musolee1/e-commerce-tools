'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ShoppingBag, TrendingUp, BarChart3, Zap } from 'lucide-react'

export default function LoginPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const handleGoogleLogin = async () => {
        try {
            setLoading(true)
            setError(null)

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })

            if (error) throw error
        } catch (err: any) {
            setError(err.message || 'Giriş yapılırken bir hata oluştu')
            setLoading(false)
        }
    }

    const features = [
        {
            icon: ShoppingBag,
            title: 'Çoklu Pazar Yönetimi',
            description: 'Trendyol, İkas ve daha fazlasını tek panelden yönetin'
        },
        {
            icon: TrendingUp,
            title: 'Fiyat Takibi',
            description: 'Rakip fiyatlarını takip edin, otomatik güncelleyin'
        },
        {
            icon: BarChart3,
            title: 'Stok Senkronizasyonu',
            description: 'Tüm platformlarda stok bilgilerinizi senkronize edin'
        },
        {
            icon: Zap,
            title: 'Telegram Entegrasyonu',
            description: 'Ürünlerinizi anında Telegram kanallarına gönderin'
        }
    ]

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Branding & Features */}
            <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-12 flex-col justify-between relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                    <div className="absolute bottom-20 right-20 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                    <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
                </div>

                {/* Content */}
                <div className="relative z-10">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <ShoppingBag className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">Pazar Yöneticim</span>
                    </div>

                    {/* Hero Text */}
                    <div className="max-w-lg">
                        <h1 className="text-4xl xl:text-5xl font-bold text-gray-900 leading-tight mb-6">
                            E-Ticaret Operasyonlarınızı
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600"> Tek Panelden</span> Yönetin
                        </h1>
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Trendyol, İkas ve diğer platformlardaki ürünlerinizi tek bir yerden kontrol edin.
                            Fiyat karşılaştırma, stok takibi ve Telegram entegrasyonu ile işinizi kolaylaştırın.
                        </p>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="relative z-10 grid grid-cols-2 gap-6 mt-12">
                    {features.map((feature, index) => (
                        <div key={index} className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white/80 shadow-sm">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mb-3 shadow-md shadow-emerald-500/20">
                                <feature.icon className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                            <p className="text-sm text-gray-600">{feature.description}</p>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="relative z-10 text-sm text-gray-500 mt-8">
                    © 2024 Pazar Yöneticim. Tüm hakları saklıdır.
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <ShoppingBag className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">Pazar Yöneticim</span>
                    </div>

                    {/* Login Card */}
                    <div className="text-center lg:text-left mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">
                            Hoş Geldiniz 👋
                        </h2>
                        <p className="text-gray-600">
                            Hesabınıza giriş yaparak yönetim paneline erişin
                        </p>
                    </div>

                    {/* Login Button */}
                    <div className="space-y-4">
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-6 rounded-xl transition-all duration-200 border-2 border-gray-200 hover:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            )}
                            <span>Google ile Giriş Yap</span>
                        </button>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="my-8 flex items-center gap-4">
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="text-sm text-gray-500">veya</span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                    </div>

                    {/* Info */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                        <p className="text-sm text-emerald-800">
                            <strong>Yeni misiniz?</strong> Google hesabınızla ilk kez giriş yaptığınızda otomatik olarak hesabınız oluşturulacaktır.
                        </p>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-gray-500 text-xs mt-8">
                        Giriş yaparak <a href="#" className="text-emerald-600 hover:underline">kullanım koşullarını</a> ve <a href="#" className="text-emerald-600 hover:underline">gizlilik politikasını</a> kabul etmiş olursunuz.
                    </p>
                </div>
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
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>
        </div>
    )
}
