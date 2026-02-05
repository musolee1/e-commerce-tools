'use client'

import { useState, useEffect, useRef } from 'react'
import { Settings as SettingsIcon, Save, Loader2, CheckCircle2, AlertCircle, Upload, FileSpreadsheet, Trash2 } from 'lucide-react'

export default function SettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Eşleştirme dosyası state
    const [matchingCount, setMatchingCount] = useState(0)
    const [uploadingFile, setUploadingFile] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [settings, setSettings] = useState({
        telegram_bot_token: '',
        telegram_chat_id: '',
        site_url: '',
        site_products_api_url: '',
        site_update_price_api_url: '',
        trendyol_target_url: '',
        trendyol_brand_slug: '',
        replace_genel_markalar: false,
        ikas_client_id: '',
        ikas_client_secret: '',
        ikas_store_name: '',
    })

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const response = await fetch('/api/user-settings')
            const data = await response.json()

            if (response.ok) {
                setSettings({
                    telegram_bot_token: data.telegram_bot_token || '',
                    telegram_chat_id: data.telegram_chat_id || '',
                    site_url: data.site_url || '',
                    site_products_api_url: data.site_products_api_url || '',
                    site_update_price_api_url: data.site_update_price_api_url || '',
                    trendyol_target_url: data.trendyol_target_url || '',
                    trendyol_brand_slug: data.trendyol_brand_slug || '',
                    replace_genel_markalar: data.replace_genel_markalar || false,
                    ikas_client_id: data.ikas_client_id || '',
                    ikas_client_secret: data.ikas_client_secret || '',
                    ikas_store_name: data.ikas_store_name || '',
                })
            }
        } catch (err: any) {
            setError('Ayarlar yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    // Eşleştirme verisi sayısını yükle
    const loadMatchingCount = async () => {
        try {
            const response = await fetch('/api/matching')
            const data = await response.json()
            if (response.ok) {
                setMatchingCount(data.count || 0)
            }
        } catch (err) {
            console.error('Matching count error:', err)
        }
    }

    useEffect(() => {
        loadMatchingCount()
    }, [])

    // Excel dosyası yükle
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingFile(true)
        setError(null)
        setSuccess(null)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/matching', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (response.ok) {
                setSuccess(`✅ ${data.count} satır başarıyla yüklendi!`)
                setMatchingCount(data.count)
                setTimeout(() => setSuccess(null), 3000)
            } else {
                setError(data.error || 'Dosya yüklenemedi')
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setUploadingFile(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    // Eşleştirme verilerini sil
    const deleteMatchingData = async () => {
        if (!confirm('Tüm eşleştirme verilerini silmek istediğinize emin misiniz?')) return

        try {
            const response = await fetch('/api/matching', { method: 'DELETE' })
            if (response.ok) {
                setMatchingCount(0)
                setSuccess('Eşleştirme verileri silindi')
                setTimeout(() => setSuccess(null), 3000)
            }
        } catch (err: any) {
            setError(err.message)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                        <SettingsIcon className="w-5 h-5 text-violet-600" />
                    </div>
                    Ayarlar
                </h1>
                <p className="text-slate-600">
                    Telegram bot bilgilerinizi ve site ayarlarınızı buradan yönetin
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

            {/* Settings Form */}
            <form onSubmit={handleSave}>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 space-y-6">
                    {/* Telegram Bot Token */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Telegram Bot Token
                        </label>
                        <input
                            type="text"
                            value={settings.telegram_bot_token}
                            onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono text-sm"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            @BotFather'dan aldığınız bot token'ınızı girin
                        </p>
                    </div>

                    {/* Telegram Chat ID */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Telegram Chat ID
                        </label>
                        <input
                            type="text"
                            value={settings.telegram_chat_id}
                            onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                            placeholder="-1001234567890"
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono text-sm"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            Kanal veya grubunuzun chat ID'sini girin (genellikle - ile başlar)
                        </p>
                    </div>

                    {/* Site URL */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Site URL
                        </label>
                        <input
                            type="url"
                            value={settings.site_url}
                            onChange={(e) => setSettings({ ...settings, site_url: e.target.value })}
                            placeholder="https://markanız.com/"
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            Ürün linklerinde kullanılacak site URL'i
                        </p>
                    </div>

                    {/* Site Products API URL */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Site Ürünleri API URL <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="url"
                            value={settings.site_products_api_url}
                            onChange={(e) => setSettings({ ...settings, site_products_api_url: e.target.value })}
                            placeholder="https://siteniz.com/api/GetProducts"
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            Site ürünlerini çekmek için kullanılacak API adresi (Fiyat Karşılaştır sayfası için)
                        </p>
                    </div>

                    {/* Site Update Price API URL */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Site Fiyat Güncelleme API URL <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="url"
                            value={settings.site_update_price_api_url}
                            onChange={(e) => setSettings({ ...settings, site_update_price_api_url: e.target.value })}
                            placeholder="https://siteniz.com/api/UpdatePrice"
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            Site fiyatlarını güncellemek için kullanılacak API adresi
                        </p>
                    </div>
                </div>

                {/* Trendyol Settings */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 space-y-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="text-2xl">🛍️</span>
                        Trendyol Ayarları
                    </h2>

                    {/* Trendyol Target URL */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Trendyol Ürünler Linki
                        </label>
                        <input
                            type="url"
                            value={settings.trendyol_target_url}
                            onChange={(e) => setSettings({ ...settings, trendyol_target_url: e.target.value })}
                            placeholder="https://www.trendyol.com/sr"
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            Ürünlerini çekmek istediğiniz Trendyol sayfasının URL'i
                        </p>
                    </div>

                    {/* Trendyol Brand Slug */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Trendyol Marka Slug
                        </label>
                        <input
                            type="text"
                            value={settings.trendyol_brand_slug}
                            onChange={(e) => setSettings({ ...settings, trendyol_brand_slug: e.target.value })}
                            placeholder="markanız"
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            Ürün linklerinde kullanılacak marka adı (örn: markanız)
                        </p>
                    </div>

                    {/* Replace genel-markalar Checkbox */}
                    <div className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="replace_genel_markalar"
                            checked={settings.replace_genel_markalar}
                            onChange={(e) => setSettings({ ...settings, replace_genel_markalar: e.target.checked })}
                            className="mt-1 w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-2 focus:ring-violet-500"
                        />
                        <div>
                            <label htmlFor="replace_genel_markalar" className="text-sm font-semibold text-slate-700 cursor-pointer">
                                Linklerde "genel-markalar" var mı?
                            </label>
                            <p className="text-xs text-slate-500 mt-1">
                                Aktif edilirse, ürün linklerindeki "genel-markalar" ifadesi yukarıdaki marka slug'ı ile değiştirilir
                            </p>
                        </div>
                    </div>
                </div>

                {/* İKAS Settings */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 space-y-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="text-2xl">🏪</span>
                        İKAS Ayarları
                    </h2>

                    {/* İKAS Store Name */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            İKAS Mağaza Adı
                        </label>
                        <input
                            type="text"
                            value={settings.ikas_store_name}
                            onChange={(e) => setSettings({ ...settings, ikas_store_name: e.target.value })}
                            placeholder="markanız"
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            İKAS mağaza adınız (https://magazaadi.myikas.com)
                        </p>
                    </div>

                    {/* İKAS Client ID */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            İKAS Client ID
                        </label>
                        <input
                            type="text"
                            value={settings.ikas_client_id}
                            onChange={(e) => setSettings({ ...settings, ikas_client_id: e.target.value })}
                            placeholder="0a34563-3456y5432wergh-32345"
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono text-sm"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            İKAS API'den aldığınız Client ID
                        </p>
                    </div>

                    {/* İKAS Client Secret */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            İKAS Client Secret
                        </label>
                        <input
                            type="password"
                            value={settings.ikas_client_secret}
                            onChange={(e) => setSettings({ ...settings, ikas_client_secret: e.target.value })}
                            placeholder="s_ZertdD..."
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono text-sm"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            İKAS API'den aldığınız Client Secret (gizli tutulur)
                        </p>
                    </div>
                </div>

                {/* Eşleştirme Dosyası */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 space-y-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="text-2xl">📎</span>
                        Eşleştirme Dosyası
                    </h2>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <FileSpreadsheet className="w-8 h-8 text-green-600" />
                                <div>
                                    <p className="font-semibold text-slate-900">
                                        {matchingCount > 0 ? `${matchingCount} satır yüklü` : 'Dosya yüklenmedi'}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Excel formatı: Trendyol Link | Barkod
                                    </p>
                                </div>
                            </div>
                            {matchingCount > 0 && (
                                <button
                                    type="button"
                                    onClick={deleteMatchingData}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Verileri Sil"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".xlsx,.xls"
                            className="hidden"
                            id="matching-file-input"
                        />
                        <label
                            htmlFor="matching-file-input"
                            className={`flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer transition-colors ${uploadingFile ? 'bg-slate-100 cursor-not-allowed' : 'hover:border-violet-400 hover:bg-violet-50'}`}
                        >
                            {uploadingFile ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
                                    <span className="text-slate-600">Yükleniyor...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5 text-violet-600" />
                                    <span className="text-slate-600">Excel Dosyası Yükle (.xlsx)</span>
                                </>
                            )}
                        </label>
                    </div>
                </div>

                {/* Save Button */}
                <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-violet-500/30"
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Kaydediliyor...</span>
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            <span>Kaydet</span>
                        </>
                    )}
                </button>
            </form>

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    💡 Bilgi
                </h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Bu ayarlar sadece sizin için geçerlidir</li>
                    <li>Boş bırakırsanız, sistem varsayılan environment değişkenlerini kullanır</li>
                    <li>Ayarlarınız güvenli bir şekilde veritabanında saklanır</li>
                </ul>
            </div>
        </div>
    )
}
