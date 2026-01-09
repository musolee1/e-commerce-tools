'use client'

import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, Send, History, Settings, Package, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import TourGuide from './TourGuide'
import { useTour, dashboardTourSteps } from '@/hooks/useTour'

interface DashboardNavProps {
    user: User
}

export default function DashboardNav({ user }: DashboardNavProps) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()
    const { showTour, startTour, closeTour, completeTour } = useTour()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const navItems = [
        { name: 'Telegram Bot', path: '/dashboard/telegram-bot', icon: Send, tourId: 'nav-telegram' },
        { name: 'Ürünler', path: '/dashboard/products', icon: Package, tourId: 'nav-products' },
        { name: 'Geçmiş', path: '/dashboard/history', icon: History, tourId: 'nav-history' },
        { name: 'Ayarlar', path: '/dashboard/settings', icon: Settings, tourId: 'nav-settings' },
    ]

    return (
        <>
            <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm sticky top-0 z-50">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo & Brand */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Send className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900">E-Commerce Tools</h1>
                                <p className="text-xs text-slate-500">Telegram Yönetim</p>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="hidden md:flex items-center gap-2">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.path
                                return (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        data-tour={item.tourId}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                            ? 'bg-violet-100 text-violet-700'
                                            : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {item.name}
                                    </Link>
                                )
                            })}
                        </div>

                        {/* User Section */}
                        <div className="flex items-center gap-4">
                            {/* Tour Button */}
                            <button
                                onClick={startTour}
                                className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                                title="Tur Başlat"
                            >
                                <HelpCircle className="w-5 h-5" />
                            </button>

                            <div className="hidden md:flex items-center gap-3">
                                {user.user_metadata?.avatar_url && (
                                    <img
                                        src={user.user_metadata.avatar_url}
                                        alt="Profile"
                                        className="w-8 h-8 rounded-full border-2 border-violet-100"
                                    />
                                )}
                                <span className="text-sm font-medium text-slate-700">
                                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden md:inline">Çıkış</span>
                            </button>
                        </div>
                    </div>
                </div>
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
