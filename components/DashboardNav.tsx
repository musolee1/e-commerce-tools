'use client'

import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, Send, History, Settings, Package, HelpCircle, ShoppingBag, Menu, X } from 'lucide-react'
import Link from 'next/link'
import TourGuide from './TourGuide'
import { useTour, dashboardTourSteps } from '@/hooks/useTour'
import { useState } from 'react'

interface DashboardNavProps {
    user: User
}

export default function DashboardNav({ user }: DashboardNavProps) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()
    const { showTour, startTour, closeTour, completeTour } = useTour()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const navItems = [
        { name: 'Telegram Bot', path: '/dashboard/telegram-bot', icon: Send, tourId: 'nav-telegram' },
        { name: 'Fiyat Karşılaştır', path: '/dashboard/price-compare', icon: Package, tourId: 'nav-price-compare' },
        { name: 'Geçmiş', path: '/dashboard/history', icon: History, tourId: 'nav-history' },
        { name: 'Ayarlar', path: '/dashboard/settings', icon: Settings, tourId: 'nav-settings' },
    ]

    return (
        <>
            <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm sticky top-0 z-50">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        {/* Logo & Brand */}
                        <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div className="hidden xs:block">
                                <h1 className="text-base sm:text-lg font-bold text-slate-900">Pazar Yöneticim</h1>
                                <p className="text-xs text-slate-500 hidden sm:block">E-Ticaret Yönetim Paneli</p>
                            </div>
                        </Link>

                        {/* Navigation Tabs - Desktop */}
                        <div className="hidden md:flex items-center gap-1 lg:gap-2">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.path
                                return (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        data-tour={item.tourId}
                                        className={`flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${isActive
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="hidden lg:inline">{item.name}</span>
                                    </Link>
                                )
                            })}
                        </div>

                        {/* Right Section */}
                        <div className="flex items-center gap-2 sm:gap-4">
                            {/* Tour Button - Desktop */}
                            <button
                                onClick={startTour}
                                className="hidden sm:block p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Tur Başlat"
                            >
                                <HelpCircle className="w-5 h-5" />
                            </button>

                            {/* User Info - Desktop */}
                            <div className="hidden md:flex items-center gap-3">
                                {user.user_metadata?.avatar_url && (
                                    <img
                                        src={user.user_metadata.avatar_url}
                                        alt="Profile"
                                        className="w-8 h-8 rounded-full border-2 border-emerald-100"
                                    />
                                )}
                                <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate">
                                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                                </span>
                            </div>

                            {/* Logout - Desktop */}
                            <button
                                onClick={handleLogout}
                                className="hidden md:flex items-center gap-2 px-3 lg:px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden lg:inline">Çıkış</span>
                            </button>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                {mobileMenuOpen ? (
                                    <X className="w-5 h-5" />
                                ) : (
                                    <Menu className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-slate-200 bg-white">
                        <div className="container mx-auto px-4 py-3 space-y-1">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.path
                                return (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {item.name}
                                    </Link>
                                )
                            })}
                            <div className="border-t border-slate-100 pt-3 mt-3">
                                <div className="flex items-center gap-3 px-4 py-2">
                                    {user.user_metadata?.avatar_url && (
                                        <img
                                            src={user.user_metadata.avatar_url}
                                            alt="Profile"
                                            className="w-8 h-8 rounded-full border-2 border-emerald-100"
                                        />
                                    )}
                                    <span className="text-sm font-medium text-slate-700">
                                        {user.user_metadata?.full_name || user.email?.split('@')[0]}
                                    </span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Çıkış Yap
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Tour Guide */}
            <TourGuide
                steps={dashboardTourSteps}
                isOpen={showTour}
                onClose={closeTour}
                onComplete={completeTour}
            />
        </>
    )
}
