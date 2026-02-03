'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Upload, Send, Package, AlertCircle, CheckCircle2, Loader2, Database, Trash2, Image, RefreshCw, History, XCircle, CheckSquare, Square } from 'lucide-react'

interface GroupedProduct {
    id: string
    urun_grup_id: string
    urun_ismi: string
    varyant_degerler: string
    resim_urlleri: string
    toplam_stok: number
    stok_kodu: string
    uploaded_at: string
    previously_sent?: boolean
}

interface TelegramLog {
    id: string
    product_name: string
    product_slug: string
    stock_count: number
    status: 'success' | 'failed'
    sent_at: string
}

export default function TelegramBotPage() {
    // Tab state
    const [activeTab, setActiveTab] = useState<'products' | 'history'>('products')

    // Grouped products states
    const [groupedProducts, setGroupedProducts] = useState<GroupedProduct[]>([])
    const [loadingGrouped, setLoadingGrouped] = useState(false)
    const [uploadingGrouped, setUploadingGrouped] = useState(false)

    // Selection states
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Sending states
    const [sending, setSending] = useState(false)

    // History states
    const [historyLogs, setHistoryLogs] = useState<TelegramLog[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    // General states
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedQuery, setDebouncedQuery] = useState('')

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Memoized filtered products
    const filteredProducts = useMemo(() => {
        if (!debouncedQuery) return groupedProducts
        const query = debouncedQuery.toLowerCase()
        return groupedProducts.filter(product =>
            product.urun_ismi.toLowerCase().includes(query) ||
            product.stok_kodu?.toLowerCase().includes(query)
        )
    }, [groupedProducts, debouncedQuery])

    // Load data on mount
    useEffect(() => {
        loadGroupedProducts()
        loadHistory()
    }, [])

    const loadGroupedProducts = useCallback(async () => {
        setLoadingGrouped(true)
        try {
            const response = await fetch('/api/ikas-grouped-products')
            if (response.ok) {
                const data = await response.json()
                setGroupedProducts(data.products || [])
            }
        } catch (err) {
            console.error('Error loading grouped products:', err)
        } finally {
            setLoadingGrouped(false)
        }
    }, [])

    const loadHistory = useCallback(async () => {
        setLoadingHistory(true)
        try {
            const response = await fetch('/api/telegram-logs')
            if (response.ok) {
                const data = await response.json()
                setHistoryLogs(data.logs || [])
            }
        } catch (err) {
            console.error('Error loading history:', err)
        } finally {
            setLoadingHistory(false)
        }
    }, [])

    const handleGroupedFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        setUploadingGrouped(true)
        setError(null)
        setSuccess(null)

        try {
            const formData = new FormData()
            formData.append('file', selectedFile)

            const response = await fetch('/api/ikas-grouped-products/upload', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Dosya işlenirken hata oluştu')
            }

            setSuccess(`${data.totalRows} satır işlendi, ${data.groupedCount} ürün grubu veritabanına kaydedildi!`)
            loadGroupedProducts()
            setSelectedIds(new Set()) // Clear selections
        } catch (err: any) {
            setError(err.message)
        } finally {
            setUploadingGrouped(false)
            e.target.value = ''
        }
    }

    const clearGroupedProducts = async () => {
        if (!confirm('Tüm kayıtlı ürünleri silmek istediğinize emin misiniz?')) return

        try {
            const response = await fetch('/api/ikas-grouped-products', {
                method: 'DELETE',
            })

            if (response.ok) {
                setGroupedProducts([])
                setSelectedIds(new Set())
                setSuccess('Tüm ürünler silindi')
            } else {
                const data = await response.json()
                setError(data.error || 'Ürünler silinemedi')
            }
        } catch (err: any) {
            setError(err.message)
        }
    }

    // Selection handlers
    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const newSelected = new Set(prev)
            if (newSelected.has(id)) {
                newSelected.delete(id)
            } else {
                newSelected.add(id)
            }
            return newSelected
        })
    }, [])

    const selectAll = useCallback(() => {
        setSelectedIds(prev => {
            if (prev.size === filteredProducts.length) {
                return new Set()
            } else {
                return new Set(filteredProducts.map(p => p.id))
            }
        })
    }, [filteredProducts])

    // Send to Telegram
    const handleSendToTelegram = async () => {
        if (selectedIds.size === 0) {
            setError('Lütfen göndermek istediğiniz ürünleri seçin')
            return
        }

        setSending(true)
        setError(null)
        setSuccess(null)

        try {
            const productsToSend = groupedProducts.filter(p => selectedIds.has(p.id))

            const response = await fetch('/api/ikas-grouped-products/send-telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products: productsToSend }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Gönderim hatası')
            }

            setSuccess(data.message)

            // Remove sent products from list
            const sentIds = new Set(data.results.filter((r: any) => r.success).map((r: any) => r.productId))
            setGroupedProducts(prev => prev.filter(p => !sentIds.has(p.id)))
            setSelectedIds(new Set())

            // Refresh history
            loadHistory()

        } catch (err: any) {
            setError(err.message)
        } finally {
            setSending(false)
        }
    }

    // Format date for history
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return new Intl.DateTimeFormat('tr-TR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date)
    }

    // Group history logs by time (within 5 minutes = same batch)
    const groupHistoryByBatch = () => {
        const groups: { date: string; logs: TelegramLog[] }[] = []
        let currentGroup: TelegramLog[] = []
        let lastTime: Date | null = null

        const sortedLogs = [...historyLogs].sort((a, b) =>
            new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
        )

        for (const log of sortedLogs) {
            const logTime = new Date(log.sent_at)

            if (lastTime && (lastTime.getTime() - logTime.getTime()) < 5 * 60 * 1000) {
                // Within 5 minutes, same batch
                currentGroup.push(log)
            } else {
                // New batch
                if (currentGroup.length > 0) {
                    groups.push({
                        date: formatDate(currentGroup[0].sent_at),
                        logs: currentGroup
                    })
                }
                currentGroup = [log]
            }
            lastTime = logTime
        }

        if (currentGroup.length > 0) {
            groups.push({
                date: formatDate(currentGroup[0].sent_at),
                logs: currentGroup
            })
        }

        return groups
    }

    const historyGroups = groupHistoryByBatch()

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    Telegram Bot Yönetimi
                </h1>
                <p className="text-slate-600">
                    Excel dosyalarınızı yükleyin, ürünleri seçin ve Telegram kanalınıza gönderin
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'products'
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    <Database className="w-4 h-4" />
                    Ürünler
                </button>
                <button
                    onClick={() => { setActiveTab('history'); loadHistory(); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'history'
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    <History className="w-4 h-4" />
                    Geçmiş
                </button>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-red-900">Hata</p>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">Başarılı</p>
                        <p className="text-sm text-green-700 mt-1">{success}</p>
                    </div>
                    <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600">
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* PRODUCTS TAB */}
            {activeTab === 'products' && (
                <>
                    {/* Upload Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <Database className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Excel'i Veritabanına Kaydet</h2>
                                <p className="text-sm text-slate-500">Yeni format Excel dosyasını yükleyin</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex-1">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleGroupedFileUpload}
                                    disabled={uploadingGrouped || sending}
                                    className="block w-full text-sm text-slate-500
                                        file:mr-4 file:py-3 file:px-6
                                        file:rounded-xl file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-gradient-to-r file:from-emerald-600 file:to-teal-600
                                        file:text-white
                                        hover:file:from-emerald-700 hover:file:to-teal-700
                                        file:cursor-pointer
                                        file:transition-all
                                        cursor-pointer
                                        disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </label>

                            {groupedProducts.length > 0 && (
                                <button
                                    onClick={clearGroupedProducts}
                                    disabled={sending}
                                    className="flex items-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Temizle
                                </button>
                            )}
                        </div>

                        {uploadingGrouped && (
                            <div className="mt-4 flex items-center gap-2 text-emerald-600">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Dosya işleniyor ve veritabanına kaydediliyor...</span>
                            </div>
                        )}
                    </div>

                    {/* Send to Telegram Button */}
                    {groupedProducts.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={selectAll}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                                    >
                                        {selectedIds.size === groupedProducts.length ? (
                                            <CheckSquare className="w-4 h-4" />
                                        ) : (
                                            <Square className="w-4 h-4" />
                                        )}
                                        {selectedIds.size === groupedProducts.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                                    </button>
                                    <span className="text-sm text-slate-600">
                                        {selectedIds.size} ürün seçildi
                                    </span>
                                </div>

                                <button
                                    onClick={handleSendToTelegram}
                                    disabled={sending || selectedIds.size === 0}
                                    className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/30"
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Gönderiliyor...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Telegram'a Gönder ({selectedIds.size})
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Products Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                                    <Package className="w-5 h-5 text-violet-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Kayıtlı Ürünler</h2>
                                    <p className="text-sm text-slate-500">{groupedProducts.length} ürün grubu veritabanında</p>
                                </div>
                            </div>

                            <button
                                onClick={loadGroupedProducts}
                                disabled={loadingGrouped}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${loadingGrouped ? 'animate-spin' : ''}`} />
                                Yenile
                            </button>
                        </div>

                        {/* Search Input */}
                        {groupedProducts.length > 0 && (
                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="Ürün adı veya stok kodu ara..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                />
                            </div>
                        )}

                        {loadingGrouped ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                            </div>
                        ) : groupedProducts.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Database className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900 mb-2">
                                    Henüz kayıtlı ürün yok
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Excel dosyanızı yukarıdan yükleyerek başlayın
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 w-12">
                                                <button onClick={selectAll} className="hover:text-violet-600">
                                                    {selectedIds.size === filteredProducts.length && filteredProducts.length > 0 ? (
                                                        <CheckSquare className="w-5 h-5 text-violet-600" />
                                                    ) : (
                                                        <Square className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Stok Kodu</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Ürün İsmi</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Varyantlar</th>
                                            <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Toplam Stok</th>
                                            <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Resimler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.map((product) => (
                                            <tr
                                                key={product.id}
                                                className={`border-b border-slate-100 transition-colors cursor-pointer ${product.previously_sent
                                                    ? 'bg-red-50 hover:bg-red-100'
                                                    : selectedIds.has(product.id)
                                                        ? 'bg-violet-50 hover:bg-violet-100'
                                                        : 'hover:bg-slate-50'
                                                    }`}
                                                onClick={() => toggleSelect(product.id)}
                                            >
                                                <td className="py-3 px-4">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleSelect(product.id); }}
                                                        className="hover:text-violet-600"
                                                    >
                                                        {selectedIds.has(product.id) ? (
                                                            <CheckSquare className="w-5 h-5 text-violet-600" />
                                                        ) : (
                                                            <Square className="w-5 h-5 text-slate-400" />
                                                        )}
                                                    </button>
                                                </td>
                                                <td className={`py-3 px-4 text-sm font-mono ${product.previously_sent ? 'text-red-600' : 'text-slate-600'}`}>{product.stok_kodu}</td>
                                                <td className="py-3 px-4 text-sm text-slate-900">
                                                    <div className="flex items-center gap-2">
                                                        {product.urun_ismi}
                                                        {product.previously_sent && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                                                Gönderildi
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {product.varyant_degerler.split(', ').filter(v => v).map((variant, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-violet-100 text-violet-700"
                                                            >
                                                                {variant}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                        {product.toplam_stok}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {product.resim_urlleri && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                                            <Image className="w-3 h-3" />
                                                            {product.resim_urlleri.split(';').filter(u => u).length}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <History className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Gönderim Geçmişi</h2>
                                <p className="text-sm text-slate-500">{historyLogs.length} toplam gönderim</p>
                            </div>
                        </div>

                        <button
                            onClick={loadHistory}
                            disabled={loadingHistory}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                            Yenile
                        </button>
                    </div>

                    {/* Stats */}
                    {historyLogs.length > 0 && (
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-50 rounded-xl p-4">
                                <p className="text-2xl font-bold text-blue-700">{historyLogs.length}</p>
                                <p className="text-sm text-blue-600">Toplam Gönderim</p>
                            </div>
                            <div className="bg-green-50 rounded-xl p-4">
                                <p className="text-2xl font-bold text-green-700">
                                    {historyLogs.filter(l => l.status === 'success').length}
                                </p>
                                <p className="text-sm text-green-600">Başarılı</p>
                            </div>
                            <div className="bg-red-50 rounded-xl p-4">
                                <p className="text-2xl font-bold text-red-700">
                                    {historyLogs.filter(l => l.status === 'failed').length}
                                </p>
                                <p className="text-sm text-red-600">Başarısız</p>
                            </div>
                        </div>
                    )}

                    {loadingHistory ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                        </div>
                    ) : historyGroups.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <History className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-2">
                                Henüz gönderim yapılmadı
                            </h3>
                            <p className="text-sm text-slate-500">
                                Telegram'a ürün göndermeye başladığınızda geçmiş burada görünecek
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {historyGroups.map((group, groupIdx) => (
                                <div key={groupIdx} className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-700">
                                                {group.date}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {group.logs.length} ürün
                                            </span>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {group.logs.map((log) => (
                                            <div key={log.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{log.product_name}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{log.product_slug}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-slate-500">Stok: {log.stock_count}</span>
                                                    {log.status === 'success' ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Başarılı
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                            <XCircle className="w-3 h-3" />
                                                            Başarısız
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
