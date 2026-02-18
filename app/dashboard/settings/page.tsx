'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Settings as SettingsIcon, Save, Loader2, CheckCircle2, AlertCircle, Send, Instagram, Package, TrendingUp, Upload, Trash2, FileSpreadsheet } from 'lucide-react'
import { useDataCache } from '@/components/DataCacheContext'

type TabType = 'telegram' | 'instagram' | 'ikas' | 'trendyol'

export default function SettingsPage() {
    const { userSettings: cachedSettings, loadUserSettings, updateUserSettings: updateSettingsCache } = useDataCache()
    const [activeTab, setActiveTab] = useState<TabType>('telegram')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [matchingCount, setMatchingCount] = useState<number>(0)
    const [uploadingMatching, setUploadingMatching] = useState(false)
    const [deletingMatching, setDeletingMatching] = useState(false)
    const matchingFileRef = useRef<HTMLInputElement>(null)

    const [settings, setSettings] = useState({
        // Telegram
        telegram_bot_token: '',
        telegram_chat_id: '',
        contact_phone: '',
        contact_whatsapp: '',
        label_stock_code: 'Stok Kodu',
        label_size_range: 'Beden Aralığı',
        label_whatsapp: 'Whatsapp',

        // Instagram
        instagram_access_token: '',
        instagram_account_id: '',
        instagram_location_id: '',

        // IKAS
        ikas_client_id: '',
        ikas_client_secret: '',
        ikas_store_name: '',
        site_url: '',
        site_products_api_url: '',
        site_update_price_api_url: '',
        ikas_excel_mapping: null as any,

        // Trendyol
        trendyol_target_url: '',
        trendyol_brand_slug: '',
        replace_genel_markalar: false,
    })

    const populateSettings = (data: Record<string, any>) => {
        setSettings({
            telegram_bot_token: data.telegram_bot_token || '',
            telegram_chat_id: data.telegram_chat_id || '',
            contact_phone: data.contact_phone || '',
            contact_whatsapp: data.contact_whatsapp || '',
            label_stock_code: data.label_stock_code || 'Stok Kodu',
            label_size_range: data.label_size_range || 'Beden Aralığı',
            label_whatsapp: data.label_whatsapp || 'Whatsapp',
            instagram_access_token: data.instagram_access_token || '',
            instagram_account_id: data.instagram_account_id || '',
            instagram_location_id: data.instagram_location_id || '',
            ikas_client_id: data.ikas_client_id || '',
            ikas_client_secret: data.ikas_client_secret || '',
            ikas_store_name: data.ikas_store_name || '',
            site_url: data.site_url || '',
            site_products_api_url: data.site_products_api_url || '',
            site_update_price_api_url: data.site_update_price_api_url || '',
            ikas_excel_mapping: data.ikas_excel_mapping || null,
            trendyol_target_url: data.trendyol_target_url || '',
            trendyol_brand_slug: data.trendyol_brand_slug || '',
            replace_genel_markalar: data.replace_genel_markalar || false,
        })
    }

    useEffect(() => {
        loadSettingsFromCache()
        loadMatchingCount()
    }, [])

    const loadSettingsFromCache = async () => {
        try {
            // Try cache first (instant if already loaded)
            const cached = await loadUserSettings()
            if (cached) {
                populateSettings(cached)
            }
        } catch (err: any) {
            setError('Ayarlar yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    const loadMatchingCount = async () => {
        try {
            const response = await fetch('/api/matching')
            const data = await response.json()
            if (response.ok) {
                setMatchingCount(data.count || 0)
            }
        } catch { }
    }

    const handleMatchingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingMatching(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/matching', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Dosya yüklenemedi')
            }

            setSuccess(`${data.count} barkod eşleştirmesi başarıyla yüklendi!`)
            setTimeout(() => setSuccess(null), 3000)
            setMatchingCount(data.count)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setUploadingMatching(false)
            if (matchingFileRef.current) matchingFileRef.current.value = ''
        }
    }

    const handleMatchingDelete = async () => {
        if (!confirm('Tüm barkod eşleştirme verilerini silmek istediğinize emin misiniz?')) return

        setDeletingMatching(true)
        setError(null)

        try {
            const response = await fetch('/api/matching', { method: 'DELETE' })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Veriler silinemedi')
            }

            setSuccess('Barkod eşleştirme verileri silindi')
            setTimeout(() => setSuccess(null), 3000)
            setMatchingCount(0)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setDeletingMatching(false)
        }
    }

    const handleResetExcelMapping = async () => {
        if (!confirm('Excel şablon eşleştirmesini sıfırlamak istediğinize emin misiniz?')) return

        try {
            const response = await fetch('/api/user-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ikas_excel_mapping: null }),
            })

            if (!response.ok) throw new Error('Sıfırlama başarısız')

            setSettings(prev => ({ ...prev, ikas_excel_mapping: null }))
            setSuccess('Excel şablon eşleştirmesi sıfırlandı')
            setTimeout(() => setSuccess(null), 3000)
        } catch (err: any) {
            setError(err.message)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const response = await fetch('/api/user-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ayarlar kaydedilemedi')
            }

            setSuccess('Ayarlar başarıyla kaydedildi!')
            setTimeout(() => setSuccess(null), 3000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const tabs = [
        { id: 'telegram' as TabType, name: 'Telegram', icon: Send },
        { id: 'instagram' as TabType, name: 'Instagram', icon: Instagram },
        { id: 'ikas' as TabType, name: 'IKAS', icon: Package },
        { id: 'trendyol' as TabType, name: 'Trendyol', icon: TrendingUp },
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                        <SettingsIcon className="w-6 h-6 text-white" />
                    </div>
                    Ayarlar
                </h1>
                <p className="text-slate-600">
                    Uygulama ayarlarınızı yönetin
                </p>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-900">Hata</p>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-green-900">{success}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left: Tabs */}
                <div className="lg:col-span-1">
                    <div className="space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                        ? 'bg-white text-emerald-700 shadow-sm'
                                        : 'text-slate-600 hover:bg-white/50'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {tab.name}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Right: Settings Form */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        {/* Telegram Settings */}
                        {activeTab === 'telegram' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-900 mb-4">Telegram Bot Ayarları</h2>
                                    <p className="text-sm text-slate-600 mb-6">
                                        Telegram bot'unuzu yapılandırın
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Bot Token
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.telegram_bot_token}
                                        onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                                        placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Chat ID
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.telegram_chat_id}
                                        onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                                        placeholder="-1001234567890"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                </div>

                                <hr className="border-slate-200" />

                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 mb-4">İçerik Ayarları</h3>
                                    <p className="text-xs text-slate-500 mb-4">Telegram mesajlarında görünecek etiket ve iletişim bilgilerini özelleştirin</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Stok Kodu Etiketi
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.label_stock_code}
                                            onChange={(e) => setSettings({ ...settings, label_stock_code: e.target.value })}
                                            placeholder="Stok Kodu"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Beden Aralığı Etiketi
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.label_size_range}
                                            onChange={(e) => setSettings({ ...settings, label_size_range: e.target.value })}
                                            placeholder="Beden Aralığı"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            WhatsApp Etiketi
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.label_whatsapp}
                                            onChange={(e) => setSettings({ ...settings, label_whatsapp: e.target.value })}
                                            placeholder="Whatsapp"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            WhatsApp Numarası
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.contact_whatsapp}
                                            onChange={(e) => setSettings({ ...settings, contact_whatsapp: e.target.value })}
                                            placeholder="https://wa.me/905XXXXXXXXX"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Telefon Numarası
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.contact_phone}
                                        onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                                        placeholder="+90 553 XXX XX XX"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <p className="text-sm text-blue-900 font-medium mb-2">📝 Mesaj Önizleme</p>
                                    <pre className="text-xs text-blue-800 whitespace-pre-wrap font-mono">{`Ürün İsmi
${settings.label_stock_code}: ABC123
${settings.label_size_range}: S-M-L-XL${settings.contact_phone ? `\n📞 ${settings.contact_phone}` : ''}${settings.contact_whatsapp ? `\n${settings.label_whatsapp}: ${settings.contact_whatsapp}` : ''}`}</pre>
                                </div>
                            </div>
                        )}

                        {/* Instagram Settings */}
                        {activeTab === 'instagram' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-900 mb-4">Instagram API Ayarları</h2>
                                    <p className="text-sm text-slate-600 mb-6">
                                        Instagram hesabınızı bağlayın
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Access Token
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.instagram_access_token}
                                        onChange={(e) => setSettings({ ...settings, instagram_access_token: e.target.value })}
                                        placeholder="Instagram Graph API Access Token"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Account ID
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.instagram_account_id}
                                        onChange={(e) => setSettings({ ...settings, instagram_account_id: e.target.value })}
                                        placeholder="Instagram Business Account ID"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Varsayılan Konum ID (Opsiyonel)
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.instagram_location_id}
                                        onChange={(e) => setSettings({ ...settings, instagram_location_id: e.target.value })}
                                        placeholder="Facebook Location ID"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">
                                        Tüm postlarda varsayılan olarak kullanılacak konum ID'si
                                    </p>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <p className="text-sm text-blue-900 font-medium mb-2">💡 Nasıl Bulunur?</p>
                                    <p className="text-xs text-blue-800">
                                        Facebook Graph API Explorer'da location arayarak veya mevcut bir Facebook Page Location ID'sini kullanabilirsiniz. Bu alan opsiyoneldir.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* IKAS Settings */}
                        {activeTab === 'ikas' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-900 mb-4">IKAS Entegrasyonu</h2>
                                    <p className="text-sm text-slate-600 mb-6">
                                        IKAS mağazanızı bağlayın
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Client ID
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.ikas_client_id}
                                        onChange={(e) => setSettings({ ...settings, ikas_client_id: e.target.value })}
                                        placeholder="IKAS Client ID"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Client Secret
                                    </label>
                                    <input
                                        type="password"
                                        value={settings.ikas_client_secret}
                                        onChange={(e) => setSettings({ ...settings, ikas_client_secret: e.target.value })}
                                        placeholder="IKAS Client Secret"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Store Name
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.ikas_store_name}
                                        onChange={(e) => setSettings({ ...settings, ikas_store_name: e.target.value })}
                                        placeholder="mystore"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">
                                        Mağaza URL'inizdeki isim (örn: mystore.myikas.com)
                                    </p>
                                </div>

                                <hr className="border-slate-200" />

                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Site API Ayarları</h3>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Site URL
                                    </label>
                                    <input
                                        type="url"
                                        value={settings.site_url}
                                        onChange={(e) => setSettings({ ...settings, site_url: e.target.value })}
                                        placeholder="https://swassonline.com/"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Site Ürünleri API URL <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="url"
                                        value={settings.site_products_api_url}
                                        onChange={(e) => setSettings({ ...settings, site_products_api_url: e.target.value })}
                                        placeholder="https://example.com/api/products"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">
                                        Site ürünlerini çekmek için kullanılan API endpoint
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Site Fiyat Güncelleme API URL <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="url"
                                        value={settings.site_update_price_api_url}
                                        onChange={(e) => setSettings({ ...settings, site_update_price_api_url: e.target.value })}
                                        placeholder="https://example.com/api/update-price"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">
                                        Fiyat karşılaştırma sonrası fiyat güncellemesi için kullanılan API endpoint
                                    </p>
                                </div>

                                <hr className="border-slate-200" />

                                {/* Excel Şablon Ayarı */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Excel Şablon Ayarı</h3>
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                                                <div>
                                                    <p className="text-sm font-medium text-slate-700">
                                                        {settings.ikas_excel_mapping ? 'Şablon eşleştirmesi mevcut' : 'Şablon eşleştirmesi yok'}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {settings.ikas_excel_mapping
                                                            ? 'Excel yükleme sırasında otomatik kolon eşleştirmesi kullanılacak'
                                                            : 'İlk Excel yüklemede otomatik eşleştirme oluşturulacak'}
                                                    </p>
                                                </div>
                                            </div>
                                            {settings.ikas_excel_mapping && (
                                                <button
                                                    type="button"
                                                    onClick={handleResetExcelMapping}
                                                    className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                                >
                                                    Sıfırla
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Barkod Eşleştirme Dosyası */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Barkod Eşleştirme Dosyası</h3>
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                                                <div>
                                                    <p className="text-sm font-medium text-slate-700">
                                                        {matchingCount > 0
                                                            ? `${matchingCount} eşleştirme kayıtlı`
                                                            : 'Eşleştirme verisi yok'}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        Trendyol link → İkas barkod eşleştirmesi
                                                    </p>
                                                </div>
                                            </div>
                                            {matchingCount > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={handleMatchingDelete}
                                                    disabled={deletingMatching}
                                                    className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                                >
                                                    {deletingMatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    Sil
                                                </button>
                                            )}
                                        </div>
                                        <div>
                                            <input
                                                ref={matchingFileRef}
                                                type="file"
                                                accept=".xlsx,.xls"
                                                onChange={handleMatchingUpload}
                                                className="hidden"
                                                id="matching-file-upload"
                                            />
                                            <label
                                                htmlFor="matching-file-upload"
                                                className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm font-medium transition-colors cursor-pointer ${uploadingMatching
                                                    ? 'opacity-50 cursor-not-allowed bg-slate-100'
                                                    : 'hover:border-emerald-400 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700'
                                                    }`}
                                            >
                                                {uploadingMatching ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...</>
                                                ) : (
                                                    <><Upload className="w-4 h-4" /> Excel Dosyası Yükle (.xlsx)</>
                                                )}
                                            </label>
                                            <p className="text-xs text-slate-500 mt-2">
                                                Excel dosyasında &quot;Barkod&quot; ve &quot;Trendyol.com Linki&quot; kolonları bulunmalıdır
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Trendyol Settings */}
                        {activeTab === 'trendyol' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-900 mb-4">Trendyol Ayarları</h2>
                                    <p className="text-sm text-slate-600 mb-6">
                                        Trendyol fiyat karşılaştırma ayarları
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Hedef URL
                                    </label>
                                    <input
                                        type="url"
                                        value={settings.trendyol_target_url}
                                        onChange={(e) => setSettings({ ...settings, trendyol_target_url: e.target.value })}
                                        placeholder="https://www.trendyol.com/..."
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Marka Slug
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.trendyol_brand_slug}
                                        onChange={(e) => setSettings({ ...settings, trendyol_brand_slug: e.target.value })}
                                        placeholder="marka-adi"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="replace_genel_markalar"
                                        checked={settings.replace_genel_markalar}
                                        onChange={(e) => setSettings({ ...settings, replace_genel_markalar: e.target.checked })}
                                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                                    />
                                    <label htmlFor="replace_genel_markalar" className="text-sm font-medium text-slate-700">
                                        Genel markaları değiştir
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Save Button */}
                        <div className="mt-8 pt-6 border-t border-slate-200">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-emerald-500/30"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Kaydediliyor...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        <span>Ayarları Kaydet</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
