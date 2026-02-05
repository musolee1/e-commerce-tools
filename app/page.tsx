'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    Send, ShoppingBag, TrendingUp, Shield, Zap,
    CheckCircle2, ArrowRight, ChevronDown, Star, Users, Package, BarChart3
} from 'lucide-react'

export default function LandingPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: ''
    })
    const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormStatus('sending')

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (response.ok) {
                setFormStatus('success')
                setFormData({ name: '', email: '', phone: '', message: '' })
            } else {
                setFormStatus('error')
            }
        } catch {
            setFormStatus('error')
        }
    }

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50 shadow-sm">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">
                        <button onClick={() => scrollToSection('hero')} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <ShoppingBag className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-slate-900">Pazar Yöneticim</span>
                        </button>

                        <div className="hidden md:flex items-center gap-6">
                            <button onClick={() => scrollToSection('telegram')} className="text-slate-600 hover:text-emerald-600 transition-colors">Telegram Bot</button>
                            <button onClick={() => scrollToSection('features')} className="text-slate-600 hover:text-emerald-600 transition-colors">Özellikler</button>
                            <button onClick={() => scrollToSection('contact')} className="text-slate-600 hover:text-emerald-600 transition-colors">İletişim</button>
                        </div>

                        <div className="flex items-center gap-3">
                            <Link
                                href="/login"
                                className="px-4 py-2 text-slate-700 hover:text-emerald-600 font-medium transition-colors"
                            >
                                Giriş Yap
                            </Link>
                            <Link
                                href="/register"
                                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/30"
                            >
                                Ücretsiz Başla
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section id="hero" className="pt-32 pb-20 px-4 sm:px-6">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-6">
                            <Zap className="w-4 h-4" />
                            E-Ticaret Yönetiminde Yeni Nesil Çözüm
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
                            Pazar Yöneticim ile <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Pazarlama Devrimi</span>
                        </h1>

                        <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
                            Ürünlerinizi tek tuşla binlerce potansiyel müşteriye ulaştırın.
                            Excel'den Telegram'a, saniyeler içinde profesyonel ürün paylaşımları.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                            <Link
                                href="/register"
                                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-lg rounded-2xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-xl shadow-emerald-500/30"
                            >
                                Hemen Başla
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <button
                                onClick={() => scrollToSection('features')}
                                className="flex items-center gap-2 px-8 py-4 bg-white text-slate-700 font-semibold text-lg rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                            >
                                Daha Fazla Bilgi
                                <ChevronDown className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                            {[
                                { icon: Users, value: '5,000+', label: 'Aktif Kullanıcı' },
                                { icon: Package, value: '1M+', label: 'Ürün Paylaşımı' },
                                { icon: TrendingUp, value: '%300', label: 'Satış Artışı' },
                                { icon: Zap, value: '24/7', label: 'Otomatik Çalışma' },
                            ].map((stat, idx) => (
                                <div key={idx} className="bg-white/70 backdrop-blur rounded-2xl p-5 border border-slate-200/50 shadow-sm">
                                    <stat.icon className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                                    <div className="text-sm text-slate-500">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem Section */}
            <section className="py-20 px-4 sm:px-6 bg-gradient-to-b from-slate-900 to-slate-800">
                <div className="container mx-auto max-w-6xl text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                        E-Ticarette Hâlâ Eski Yöntemlerle Mi Çalışıyorsunuz?
                    </h2>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12">
                        Rakipleriniz her gün binlerce müşteriye ulaşırken siz manuel paylaşımlarla zaman kaybetmeye devam mı edeceksiniz?
                    </p>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                title: '⏰ Saatler Harcıyorsunuz',
                                desc: 'Her ürünü tek tek paylaşmak, resim düzenlemek, açıklama yazmak... Günde 3-4 saat mi? Daha fazlası mı?'
                            },
                            {
                                title: '😤 Fırsatları Kaçırıyorsunuz',
                                desc: 'Stok güncelleme, fiyat değişikliği, yeni ürün duyurusu... Hızlı hareket edemediğiniz için satışlar rakiplere gidiyor.'
                            },
                            {
                                title: '📉 Pazarlama Maliyetleri Artıyor',
                                desc: 'Facebook, Instagram reklamları artık çok pahalı. Her tıklama için ödeme yapmaktan yoruldunuz mu?'
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10">
                                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                                <p className="text-slate-300">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Solution Section - Telegram Bot */}
            <section id="telegram" className="py-20 px-4 sm:px-6">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 text-sky-700 rounded-full text-sm font-medium mb-6">
                            <Send className="w-4 h-4" />
                            Telegram Bot Entegrasyonu
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                            Telegram Bot ile <span className="text-sky-600">Pazarlama Gücünüzü</span> Katlayın
                        </h2>
                        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                            Dünya genelinde 800 milyon aktif kullanıcıya sahip Telegram, e-ticaret pazarlamasının yeni gücü.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left: Telegram Phone Mockup */}
                        <div className="relative">
                            <div className="bg-gradient-to-br from-sky-400 to-blue-500 rounded-3xl p-8 shadow-2xl shadow-sky-500/30">
                                <div className="bg-slate-900 rounded-2xl p-4">
                                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-700">
                                        <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center">
                                            <ShoppingBag className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="text-white font-semibold">Pazar Yöneticim Bot</div>
                                            <div className="text-slate-400 text-sm">12,500 üye</div>
                                        </div>
                                    </div>

                                    {/* Sample Message */}
                                    <div className="space-y-3">
                                        <div className="bg-sky-600 rounded-2xl rounded-tl-none p-4 max-w-xs">
                                            <div className="text-white text-sm mb-2">🔥 YENİ ÜRÜN!</div>
                                            <div className="text-white font-semibold mb-1">Kış Koleksiyonu Mont</div>
                                            <div className="text-sky-100 text-sm mb-2">Bedenler: S, M, L, XL</div>
                                            <div className="text-white font-bold">₺899 → ₺699</div>
                                            <div className="text-sky-200 text-xs mt-2">Stok: 45 adet</div>
                                        </div>
                                        <div className="text-slate-500 text-xs text-right">14:32 ✓✓</div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Stats */}
                            <div className="absolute -right-4 -top-4 bg-white rounded-xl p-4 shadow-lg border border-slate-200">
                                <div className="text-2xl font-bold text-emerald-600">+%540</div>
                                <div className="text-sm text-slate-500">Etkileşim Oranı</div>
                            </div>
                            <div className="absolute -left-4 -bottom-4 bg-white rounded-xl p-4 shadow-lg border border-slate-200">
                                <div className="text-2xl font-bold text-sky-600">30 saniye</div>
                                <div className="text-sm text-slate-500">Paylaşım Süresi</div>
                            </div>
                        </div>

                        {/* Right: Features */}
                        <div className="space-y-6">
                            <h3 className="text-2xl font-bold text-slate-900">Neden Telegram Bot?</h3>

                            {[
                                {
                                    icon: Zap,
                                    title: 'Anında Ulaşım',
                                    desc: 'Paylaşımlarınız saniyeler içinde binlerce kişiye aynı anda ulaşır. Push notification ile kaçırılma ihtimali yok!'
                                },
                                {
                                    icon: TrendingUp,
                                    title: '%98 Açılma Oranı',
                                    desc: 'E-posta pazarlamasının 10 katı etkili! Telegram mesajları neredeyse her zaman okunuyor.'
                                },
                                {
                                    icon: Shield,
                                    title: 'Ücretsiz & Limitsiz',
                                    desc: 'Facebook reklamları gibi tıklama başı ödeme yok. İstediğiniz kadar paylaşım, sıfır maliyet.'
                                },
                                {
                                    icon: Users,
                                    title: 'Sadık Müşteri Kitlesi',
                                    desc: 'Kanalınıza katılan kullanıcılar zaten ürünlerinizle ilgileniyor. Hedeflenmiş, kaliteli trafik!'
                                }
                            ].map((item, idx) => (
                                <div key={idx} className="flex gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-sky-300 hover:shadow-lg transition-all">
                                    <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <item.icon className="w-6 h-6 text-sky-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900 mb-1">{item.title}</h4>
                                        <p className="text-slate-600 text-sm">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 px-4 sm:px-6 bg-slate-50">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                            Güçlü Özellikler, Basit Kullanım
                        </h2>
                        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                            Tek platform üzerinden tüm e-ticaret operasyonlarınızı yönetin
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Package,
                                title: 'Excel\'den Otomatik Yükleme',
                                desc: 'Ürün listenizi Excel\'den yükleyin, sistem otomatik olarak gruplandırıp hazırlasın.'
                            },
                            {
                                icon: Send,
                                title: 'Tek Tuşla Telegram Paylaşımı',
                                desc: 'Seçtiğiniz ürünleri tek tıkla Telegram kanalınıza profesyonel formatta gönderin.'
                            },
                            {
                                icon: TrendingUp,
                                title: 'Trendyol Fiyat Takibi',
                                desc: 'Trendyol\'dan anlık fiyat çekin, tek tıkla e-ticaret sitenizi güncelleyin.'
                            },
                            {
                                icon: BarChart3,
                                title: 'Otomatik Fiyat Güncelleme',
                                desc: 'Rakip fiyatlarını karşılaştırın, sitenizin fiyatlarını tek tuşla optimize edin.'
                            },
                            {
                                icon: Shield,
                                title: 'İkas Entegrasyonu',
                                desc: 'İkas altyapılı siteler için tam entegrasyon. Stok, fiyat ve ürün bilgisi senkronizasyonu.'
                            },
                            {
                                icon: Zap,
                                title: 'Şirkete Özel Otomasyonlar',
                                desc: 'İhtiyacınıza göre özel otomasyon çözümleri geliştiriyoruz. İletişime geçin!'
                            }
                        ].map((feature, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-xl transition-all group">
                                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <feature.icon className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                                <p className="text-slate-600">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section id="benefits" className="py-20 px-4 sm:px-6">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                            Pazar Yöneticim ile Kazanacaklarınız
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {[
                            { title: 'Günde 3+ Saat Zaman Kazanın', desc: 'Manuel paylaşım işlemlerinden kurtulun, işinizi büyütmeye odaklanın.' },
                            { title: 'Pazarlama Maliyetlerini %90 Azaltın', desc: 'Reklam vermeden binlerce potansiyel müşteriye organik ulaşım sağlayın.' },
                            { title: 'Satışlarınızı %300 Artırın', desc: 'Doğrudan ulaşım ve yüksek etkileşim oranları ile dönüşüm oranlarınızı katlayın.' },
                            { title: 'Rakiplerden Bir Adım Önde Olun', desc: 'Hızlı hareket edin, yeni ürünleri ve fırsatları anında duyurun.' },
                            { title: '7/24 Otomatik Çalışma', desc: 'Siz uyurken bile sisteminiz çalışmaya devam eder.' },
                            { title: 'Profesyonel Görünüm', desc: 'Otomatik formatlama ile her paylaşımınız profesyonel ve tutarlı görünsün.' }
                        ].map((benefit, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
                                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{benefit.title}</h3>
                                    <p className="text-slate-600">{benefit.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-20 px-4 sm:px-6 bg-gradient-to-b from-emerald-600 to-teal-700">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            Kullanıcılarımız Ne Diyor?
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                name: 'Ahmet Y.',
                                business: 'Tekstil Mağazası',
                                text: 'Telegram kanalımız 3 ayda 8.000 üyeye ulaştı. Artık reklam vermiyorum, satışlarım 4 katına çıktı!'
                            },
                            {
                                name: 'Elif K.',
                                business: 'Online Butik',
                                text: 'Günde 4 saat Excel\'le uğraşıyordum. Şimdi 10 dakikada 50 ürün paylaşıyorum. Muhteşem!'
                            },
                            {
                                name: 'Mehmet S.',
                                business: 'Elektronik Dükkanı',
                                text: 'Fiyat karşılaştırma özelliği sayesinde rakiplerden her zaman bir adım öndeyim.'
                            }
                        ].map((testimonial, idx) => (
                            <div key={idx} className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
                                <div className="flex items-center gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                                    ))}
                                </div>
                                <p className="text-white mb-4">"{testimonial.text}"</p>
                                <div>
                                    <div className="font-semibold text-white">{testimonial.name}</div>
                                    <div className="text-emerald-200 text-sm">{testimonial.business}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 sm:px-6">
                <div className="container mx-auto max-w-4xl text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                        Rakipleriniz Zaten Başladı.<br />Siz Ne Bekliyorsunuz?
                    </h2>
                    <p className="text-xl text-slate-600 mb-8">
                        Her geçen gün kaçırdığınız bir fırsat demek. Şimdi ücretsiz başlayın ve farkı görün!
                    </p>
                    <Link
                        href="/register"
                        className="inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xl rounded-2xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-xl shadow-emerald-500/30"
                    >
                        Ücretsiz Hesap Oluştur
                        <ArrowRight className="w-6 h-6" />
                    </Link>
                </div>
            </section>

            {/* Trendyol Integration Section */}
            <section className="py-20 px-4 sm:px-6 bg-gradient-to-b from-orange-500 to-orange-600">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-full text-sm font-medium mb-6">
                                <TrendingUp className="w-4 h-4" />
                                Trendyol Entegrasyonu
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                                Trendyol'dan Fiyat Çekin, <br />Tek Tıkla Sitenizi Güncelleyin
                            </h2>
                            <p className="text-xl text-orange-100 mb-8">
                                Trendyol fiyatlarınızı anlık takip edin. Tek bir tıklama ile
                                e-ticaret sitenizin tüm fiyatlarını ve ürün bilgilerini güncelleyin.
                            </p>
                            <div className="space-y-4">
                                {[
                                    'Trendyol ürün fiyatlarını anlık olarak çekin',
                                    'Fiyat karşılaştırma ile rekabetçi kalın',
                                    'Tek tıkla site fiyatlarınızı güncelleyin',
                                    'Stok ve ürün bilgisi senkronizasyonu',
                                    'İkas entegrasyonu ile tam uyum'
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-white" />
                                        <span className="text-white">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20">
                            <div className="text-center">
                                <div className="text-6xl font-bold text-white mb-2">%14.5</div>
                                <div className="text-orange-100 text-lg mb-6">Otomatik İndirim Hesaplama</div>
                                <div className="space-y-4 text-left">
                                    <div className="bg-white/10 rounded-xl p-4">
                                        <div className="text-orange-200 text-sm">Trendyol Fiyatı</div>
                                        <div className="text-white text-2xl font-bold">₺1,250.00</div>
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <ArrowRight className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl p-4">
                                        <div className="text-emerald-200 text-sm">Hesaplanan Site Fiyatı</div>
                                        <div className="text-white text-2xl font-bold">₺1,068.75</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Custom Automation Section */}
            <section className="py-20 px-4 sm:px-6">
                <div className="container mx-auto max-w-4xl text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-6">
                        <Zap className="w-4 h-4" />
                        Özel Çözümler
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                        Şirketinize Özel Otomasyonlar Geliştiriyoruz
                    </h2>
                    <p className="text-xl text-slate-600 mb-8">
                        <strong>İkas</strong>, <strong>Trendyol</strong>, <strong>Telegram</strong> ve daha fazlası...
                        İhtiyacınıza göre özel otomasyon çözümleri üretiyoruz.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 mb-8">
                        {['İkas', 'Trendyol', 'Telegram', 'Excel', 'N11', 'Hepsiburada'].map((platform, idx) => (
                            <div key={idx} className="px-6 py-3 bg-gradient-to-r from-slate-100 to-slate-50 rounded-full border border-slate-200 font-semibold text-slate-700">
                                {platform}
                            </div>
                        ))}
                    </div>
                    <p className="text-lg text-slate-500">
                        Aklınızdaki bir otomasyon fikri mi var? Hemen aşağıdaki formu doldurun, size özel çözüm üretelim!
                    </p>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-20 px-4 sm:px-6 bg-slate-50">
                <div className="container mx-auto max-w-2xl">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                            Bizimle İletişime Geçin
                        </h2>
                        <p className="text-lg text-slate-600">
                            Sorularınız mı var? Özel bir otomasyon mu istiyorsunuz?
                            Formu doldurun, size en kısa sürede dönüş yapalım.
                        </p>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-200">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Adınız</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    placeholder="Adınızı girin"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">E-posta</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    placeholder="ornek@email.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Telefon (Opsiyonel)</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    placeholder="05XX XXX XX XX"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Mesajınız</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                                    placeholder="Mesajınızı yazın..."
                                />
                            </div>

                            {formStatus === 'success' && (
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
                                    ✓ Mesajınız başarıyla gönderildi! En kısa sürede size dönüş yapacağız.
                                </div>
                            )}
                            {formStatus === 'error' && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                                    Bir hata oluştu. Lütfen tekrar deneyin.
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={formStatus === 'sending'}
                                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                            >
                                {formStatus === 'sending' ? 'Gönderiliyor...' : 'Mesaj Gönder'}
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 sm:px-6 bg-slate-900">
                <div className="container mx-auto max-w-6xl">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                                <ShoppingBag className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">Pazar Yöneticim</span>
                        </div>
                        <div className="text-slate-400 text-sm">
                            © {new Date().getFullYear()} Pazar Yöneticim. Tüm hakları saklıdır.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
