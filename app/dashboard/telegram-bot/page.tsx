'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Upload, Send, Package, AlertCircle, CheckCircle2, Loader2, Database, Trash2, Image, RefreshCw, History, XCircle, CheckSquare, Square, Filter, Eye, EyeOff } from 'lucide-react'

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

interface SendProgress {
    current: number
    total: number
    successCount: number
    failCount: number
    currentProduct: string
    isActive: boolean
}

const MAX_MESSAGE_LIMIT = 30 // Fixed limit due to Telegram rate limiting
const DELAY_BETWEEN_SENDS = 4000 // 4 seconds between each product

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
    const [progress, setProgress] = useState<SendProgress>({
        current: 0,
        total: 0,
        successCount: 0,
        failCount: 0,
        currentProduct: '',
        isActive: false
    })
    const abortControllerRef = useRef<AbortController | null>(null)

    // Fixed message limit (Telegram rate limiting)
    const messageLimit = MAX_MESSAGE_LIMIT

    // Filter states
    const [hidePreviouslySent, setHidePreviouslySent] = useState(false)

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
        let products = groupedProducts

        // Filter by previously sent
        if (hidePreviouslySent) {
            products = products.filter(p => !p.previously_sent)
        }

        // Filter by search query
        if (debouncedQuery) {
            const query = debouncedQuery.toLowerCase()
            products = products.filter(product =>
                product.urun_ismi.toLowerCase().includes(query) ||
                product.stok_kodu?.toLowerCase().includes(query)
            )
        }

        return products
    }, [groupedProducts, debouncedQuery, hidePreviouslySent])

    // Count of previously sent products
    const previouslySentCount = useMemo(() => {
        return groupedProducts.filter(p => p.previously_sent).length
    }, [groupedProducts])

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
                // Check message limit
                if (newSelected.size >= messageLimit) {
                    return prev // Don't add more
                }
                newSelected.add(id)
            }
            return newSelected
        })
    }, [messageLimit])

    const selectAll = useCallback(() => {
        setSelectedIds(prev => {
            if (prev.size === Math.min(filteredProducts.length, messageLimit)) {
                return new Set()
            } else {
                // Select up to messageLimit
                const idsToSelect = filteredProducts.slice(0, messageLimit).map(p => p.id)
                return new Set(idsToSelect)
            }
        })
    }, [filteredProducts, messageLimit])

    // Cancel sending
    const cancelSending = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        setSending(false)
        setProgress(prev => ({ ...prev, isActive: false }))
    }, [])

    // Send to Telegram - Individual product sending
    const handleSendToTelegram = async () => {
        if (selectedIds.size === 0) {
            setError('Lütfen göndermek istediğiniz ürünleri seçin')
            return
        }

        const productsToSend = groupedProducts.filter(p => selectedIds.has(p.id))

        if (productsToSend.length > messageLimit) {
            setError(`Maksimum ${messageLimit} ürün seçebilirsiniz`)
            return
        }

        setSending(true)
        setError(null)
        setSuccess(null)

        abortControllerRef.current = new AbortController()

        setProgress({
            current: 0,
            total: productsToSend.length,
            successCount: 0,
            failCount: 0,
            currentProduct: '',
            isActive: true
        })

        let successCount = 0
        let failCount = 0
        const sentProductIds: string[] = []

        for (let i = 0; i < productsToSend.length; i++) {
            // Check if cancelled
            if (abortControllerRef.current?.signal.aborted) {
                break
            }

            const product = productsToSend[i]

            setProgress(prev => ({
                ...prev,
                current: i + 1,
                currentProduct: product.urun_ismi
            }))

            try {
                const response = await fetch('/api/ikas-grouped-products/send-single', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product }),
                    signal: abortControllerRef.current?.signal
                })

                const data = await response.json()

                if (data.success) {
                    successCount++
                    sentProductIds.push(product.id)
                    setProgress(prev => ({ ...prev, successCount }))
                } else {
                    failCount++
                    setProgress(prev => ({ ...prev, failCount }))
                }
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    break
                }
                failCount++
                setProgress(prev => ({ ...prev, failCount }))
                console.error(`Error sending ${product.urun_ismi}:`, err)
            }

            // Wait between sends (except for last one)
            if (i < productsToSend.length - 1 && !abortControllerRef.current?.signal.aborted) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_SENDS))
            }
        }

        // Update UI
        setGroupedProducts(prev => prev.filter(p => !sentProductIds.includes(p.id)))
        setSelectedIds(new Set())

        if (successCount > 0 || failCount > 0) {
            setSuccess(`${successCount} ürün başarıyla gönderildi${failCount > 0 ? `, ${failCount} ürün gönderilemedi` : ''}`)
        }

        loadHistory()
        setSending(false)
        setProgress(prev => ({ ...prev, isActive: false }))
        abortControllerRef.current = null
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

    // Progress percentage
    const progressPercentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header with Telegram branding */}
            <div className="mb-8 flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-sky-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/30">
                    <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Telegram Gönderilerim
                    </h1>
                    <p className="text-slate-600">
                        Excel dosyalarınızı yükleyin, ürünleri seçin ve Telegram kanalınıza gönderin
                    </p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'products'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    <Database className="w-4 h-4" />
                    Ürünler
                </button>
                <button
                    onClick={() => { setActiveTab('history'); loadHistory(); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'history'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
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

            {success && !progress.isActive && (
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

            {/* Progress Bar */}
            {progress.isActive && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Gönderiliyor...</h3>
                                <p className="text-sm text-slate-500 truncate max-w-md">{progress.currentProduct}</p>
                            </div>
                        </div>
                        <button
                            onClick={cancelSending}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                        >
                            <XCircle className="w-4 h-4" />
                            İptal Et
                        </button>
                    </div>

                    {/* Progress bar */}
                    <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-teal-600 transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                            <span className="text-slate-600">
                                <span className="font-semibold text-slate-900">{progress.current}</span> / {progress.total}
                            </span>
                            <span className="text-green-600">
                                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                                {progress.successCount} başarılı
                            </span>
                            {progress.failCount > 0 && (
                                <span className="text-red-600">
                                    <XCircle className="w-4 h-4 inline mr-1" />
                                    {progress.failCount} başarısız
                                </span>
                            )}
                        </div>
                        <span className="font-semibold text-violet-600">{progressPercentage}%</span>
                    </div>
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

                    {/* Products Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <Package className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Kayıtlı Ürünler</h2>
                                    <p className="text-sm text-slate-500">
                                        {filteredProducts.length} ürün gösteriliyor
                                        {hidePreviouslySent && ` (${previouslySentCount} gizli)`}
                                    </p>
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

                        {/* Action Bar */}
                        {groupedProducts.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 p-4 bg-slate-50 rounded-xl">
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Select All */}
                                    <button
                                        onClick={selectAll}
                                        disabled={sending}
                                        className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg transition-colors border border-slate-200 disabled:opacity-50 text-sm"
                                    >
                                        {selectedIds.size === Math.min(filteredProducts.length, messageLimit) && filteredProducts.length > 0 ? (
                                            <CheckSquare className="w-4 h-4" />
                                        ) : (
                                            <Square className="w-4 h-4" />
                                        )}
                                        {selectedIds.size === Math.min(filteredProducts.length, messageLimit) && filteredProducts.length > 0 ? 'Seçimi Kaldır' : `Tümünü Seç`}
                                    </button>

                                    {/* Filter: Hide previously sent */}
                                    {previouslySentCount > 0 && (
                                        <button
                                            onClick={() => setHidePreviouslySent(!hidePreviouslySent)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${hidePreviouslySent
                                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                                                }`}
                                        >
                                            {hidePreviouslySent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            {hidePreviouslySent ? 'Gönderilenleri Göster' : `Gönderilenleri Gizle (${previouslySentCount})`}
                                        </button>
                                    )}

                                    <span className="text-sm text-slate-600">
                                        <strong>{selectedIds.size}</strong> ürün seçildi
                                    </span>
                                </div>

                                <button
                                    onClick={handleSendToTelegram}
                                    disabled={sending || selectedIds.size === 0}
                                    className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-500/30"
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Gönderiliyor...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Telegram'a Gönder ({selectedIds.size})
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Search Input */}
                        {groupedProducts.length > 0 && (
                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="Ürün adı veya stok kodu ara..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                />
                            </div>
                        )}

                        {loadingGrouped ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
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
                        ) : filteredProducts.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Filter className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900 mb-2">
                                    Filtreye uygun ürün bulunamadı
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Arama kriterlerinizi veya filtreleri değiştirin
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 w-12">
                                                <button onClick={selectAll} className="hover:text-emerald-600" disabled={sending}>
                                                    {selectedIds.size === Math.min(filteredProducts.length, messageLimit) && filteredProducts.length > 0 ? (
                                                        <CheckSquare className="w-5 h-5 text-emerald-600" />
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
                                                        ? 'bg-emerald-50 hover:bg-emerald-100'
                                                        : 'hover:bg-slate-50'
                                                    }`}
                                                onClick={() => !sending && toggleSelect(product.id)}
                                            >
                                                <td className="py-3 px-4">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); !sending && toggleSelect(product.id); }}
                                                        className="hover:text-emerald-600"
                                                        disabled={sending}
                                                    >
                                                        {selectedIds.has(product.id) ? (
                                                            <CheckSquare className="w-5 h-5 text-emerald-600" />
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
                                                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700"
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
