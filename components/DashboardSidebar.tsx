'use client'

import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, Send, Settings, Package, Instagram, ShoppingBag, ChevronLeft, ChevronRight, History } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useSidebar } from './SidebarContext'

interface DashboardSidebarProps {
    user: User
}

export default function DashboardSidebar({ user }: DashboardSidebarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()
    const { collapsed, setCollapsed } = useSidebar()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const navItems = [
        { name: 'Telegram Bot', path: '/dashboard/telegram-bot', icon: Send },
        { name: 'Instagram', path: '/dashboard/instagram', icon: Instagram },
        { name: 'Fiyat Karşılaştır', path: '/dashboard/price-compare', icon: Package },
        { name: 'Geçmiş', path: '/dashboard/history', icon: History },
    ]

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-slate-200 lg:transition-all lg:duration-300 ${collapsed ? 'lg:w-20' : 'lg:w-64'
                }`}>
                {/* Logo */}
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    {!collapsed && (
                        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <ShoppingBag className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900">Pazar Yöneticim</h1>
                                <p className="text-xs text-slate-500">E-Ticaret Paneli</p>
                            </div>
                        </Link>
                    )}
                    {collapsed && (
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mx-auto">
                            <ShoppingBag className="w-5 h-5 text-white" />
                        </div>
                    )}
                </div>

                {/* Toggle Button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm z-10"
                >
                    {collapsed ? (
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                    ) : (
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                    )}
                </button>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    } ${collapsed ? 'justify-center' : ''}`}
                                title={collapsed ? item.name : ''}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {!collapsed && <span>{item.name}</span>}
                            </Link>
                        )
                    })}
                </nav>

                {/* Bottom Section */}
                <div className="p-4 border-t border-slate-200 space-y-2">
                    {/* Settings */}
                    <Link
                        href="/dashboard/settings"
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${pathname === '/dashboard/settings'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'text-slate-600 hover:bg-slate-50'
                            } ${collapsed ? 'justify-center' : ''}`}
                        title={collapsed ? 'Ayarlar' : ''}
                    >
                        <Settings className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span>Ayarlar</span>}
                    </Link>

                    {/* User Info */}
                    {!collapsed && (
                        <div className="flex items-center gap-3 px-4 py-2">
                            {user.user_metadata?.avatar_url && (
                                <img
                                    src={user.user_metadata.avatar_url}
                                    alt="Profile"
                                    className="w-8 h-8 rounded-full border-2 border-emerald-100"
                                />
                            )}
                            <span className="text-sm font-medium text-slate-700 truncate flex-1">
                                {user.user_metadata?.full_name || user.email?.split('@')[0]}
                            </span>
                        </div>
                    )}

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors ${collapsed ? 'justify-center' : ''
                            }`}
                        title={collapsed ? 'Çıkış Yap' : ''}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span>Çıkış Yap</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile Top Bar */}
            <div className="lg:hidden sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-slate-900">Pazar Yöneticim</span>
                    </Link>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {mobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg">
                        <nav className="p-4 space-y-1">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.path
                                return (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${isActive
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {item.name}
                                    </Link>
                                )
                            })}
                            <Link
                                href="/dashboard/settings"
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${pathname === '/dashboard/settings'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Settings className="w-5 h-5" />
                                Ayarlar
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl"
                            >
                                <LogOut className="w-5 h-5" />
                                Çıkış Yap
                            </button>
                        </nav>
                    </div>
                )}
            </div>
        </>
    )
}
