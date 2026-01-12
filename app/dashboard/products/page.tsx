'use client'

import { useState, useEffect } from 'react'
import { Package, ShoppingBag, ExternalLink, AlertCircle, Link2, Loader2, X, Download, Upload } from 'lucide-react'
import ProductTable from '@/components/ProductTable'
import * as XLSX from 'exceljs'

interface TrendyolProduct {
    id: string
    product_name: string
    normal_price: string
    discounted_price: string
    product_link: string
}

interface IkasProduct {
    id: string
    product_id: string
    variant_id: string
    product_name: string
    sku: string
    barcode: string
    normal_price: number
    discounted_price: number
}

interface MatchResult {
    product_id: string
    variant_id: string
    barcode: string
    new_price: number
    ikas_normal_price: number
    ikas_discounted_price: number
    ikas_buy_price: number
    trendyol_discounted_price: number
}

export default function ProductsPage() {
    const [trendyolProducts, setTrendyolProducts] = useState<TrendyolProduct[]>([])
    const [ikasProducts, setIkasProducts] = useState<IkasProduct[]>([])
    const [loadingTrendyol, setLoadingTrendyol] = useState(false)
    const [loadingIkas, setLoadingIkas] = useState(false)
    const [matching, setMatching] = useState(false)
    const [pushing, setPushing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Match Results Popup State
    const [showMatchPopup, setShowMatchPopup] = useState(false)
    const [matchResults, setMatchResults] = useState<MatchResult[]>([])

    // Load saved products on mount
    useEffect(() => {
        loadSavedProducts()
    }, [])

    const loadSavedProducts = async () => {
        try {
            // Load Trendyol products
            const trendyolRes = await fetch('/api/products/trendyol')
            if (trendyolRes.ok) {
                const data = await trendyolRes.json()
                setTrendyolProducts(data.products || [])
            }

            // Load İKAS products
            const ikasRes = await fetch('/api/products/ikas/list')
            if (ikasRes.ok) {
                const data = await ikasRes.json()
                setIkasProducts(data.products || [])
            }
        } catch (err) {
            console.error('Error loading saved products:', err)
        }
    }

    const fetchTrendyolProducts = async () => {
        setLoadingTrendyol(true)
        setError(null)

        try {
            const response = await fetch('/api/products/trendyol', {
                method: 'POST',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Trendyol ürünleri çekilemedi')
            }

            setTrendyolProducts(data.products || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoadingTrendyol(false)
        }
    }

    const fetchIkasProducts = async () => {
        setLoadingIkas(true)
        setError(null)

        try {
            const response = await fetch('/api/products/ikas/list', {
                method: 'POST',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'İKAS ürünleri çekilemedi')
            }

            setIkasProducts(data.products || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoadingIkas(false)
        }
    }

    const clearTrendyolProducts = async () => {
        try {
            const response = await fetch('/api/products/trendyol', {
                method: 'DELETE',
            })

            if (response.ok) {
                setTrendyolProducts([])
            } else {
                const data = await response.json()
                setError(data.error || 'Ürünler silinemedi')
            }
        } catch (err: any) {
            setError(err.message)
        }
    }

    const clearIkasProducts = async () => {
        try {
            const response = await fetch('/api/products/ikas/list', {
                method: 'DELETE',
            })

            if (response.ok) {
                setIkasProducts([])
            } else {
                const data = await response.json()
                setError(data.error || 'Ürünler silinemedi')
            }
        } catch (err: any) {
            setError(err.message)
        }
    }

    // MATCH'LE - Eşleştirme ve Popup'ta göster
    const handleMatchExport = async () => {
        setMatching(true)
        setError(null)
        setSuccessMessage(null)

        try {
            const response = await fetch('/api/match-export', {
                method: 'POST',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Eşleştirme hatası')
            }

            // Popup'ta göster
            setMatchResults(data.data || [])
            setShowMatchPopup(true)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setMatching(false)
        }
    }

    // İKAS'a fiyatları gönder
    const handlePushToIkas = async () => {
        if (matchResults.length === 0) return

        setPushing(true)
        setError(null)
        setSuccessMessage(null)

        try {
            const prices = matchResults.map(row => ({
                product_id: row.product_id,
                variant_id: row.variant_id,
                sell_price: row.ikas_normal_price,
                discount_price: row.new_price,
                buy_price: row.ikas_buy_price,
            }))

            const response = await fetch('/api/ikas-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prices }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'İKAS güncelleme hatası')
            }

            setSuccessMessage(data.message || `${data.updated} ürün güncellendi`)

            // Popup'ı kapat (isteğe bağlı)
            // setShowMatchPopup(false)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setPushing(false)
        }
    }

    // Excel'e export et
    const exportMatchResultsToExcel = async () => {
        const workbook = new XLSX.Workbook()
        const worksheet = workbook.addWorksheet('Aksiyon Listesi')

        worksheet.columns = [
            { header: 'Product ID', key: 'product_id', width: 36 },
            { header: 'Variant ID', key: 'variant_id', width: 36 },
            { header: 'Barkod', key: 'barcode', width: 18 },
            { header: 'Yeni Fiyat', key: 'new_price', width: 18 },
            { header: 'İKAS Normal Fiyat', key: 'ikas_normal_price', width: 18 },
            { header: 'İKAS İnd. Fiyat', key: 'ikas_discounted_price', width: 18 },
            { header: 'İKAS Alış Fiyatı', key: 'ikas_buy_price', width: 18 },
            { header: 'Trendyol İnd. Fiyat', key: 'trendyol_discounted_price', width: 20 },
        ]

        matchResults.forEach((row) => {
            const excelRow = worksheet.addRow(row)
            excelRow.getCell('new_price').numFmt = '#,##0.00'
            excelRow.getCell('ikas_normal_price').numFmt = '#,##0.00'
            excelRow.getCell('ikas_discounted_price').numFmt = '#,##0.00'
            excelRow.getCell('ikas_buy_price').numFmt = '#,##0.00'
            excelRow.getCell('trendyol_discounted_price').numFmt = '#,##0.00'
        })

        // Header styling
        const headerRow = worksheet.getRow(1)
        headerRow.font = { bold: true }

        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'aksiyon_listesi.xlsx'
        a.click()
        URL.revokeObjectURL(url)
    }

    const exportTrendyolToExcel = async () => {
        const workbook = new XLSX.Workbook()
        const worksheet = workbook.addWorksheet('Trendyol Ürünleri')

        // Add headers
        worksheet.columns = [
            { header: 'Ürün Adı', key: 'product_name', width: 50 },
            { header: 'Normal Fiyat', key: 'normal_price', width: 15 },
            { header: 'İndirimli Fiyat', key: 'discounted_price', width: 15 },
            { header: 'Link', key: 'product_link', width: 60 },
        ]

        // Add data
        trendyolProducts.forEach((product) => {
            worksheet.addRow({
                product_name: product.product_name,
                normal_price: product.normal_price,
                discounted_price: product.discounted_price,
                product_link: product.product_link,
            })
        })

        // Download
        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'trendyol_urunler.xlsx'
        a.click()
        URL.revokeObjectURL(url)
    }

    const exportIkasToExcel = async () => {
        const workbook = new XLSX.Workbook()
        const worksheet = workbook.addWorksheet('İKAS Ürünleri')

        // Add headers
        worksheet.columns = [
            { header: 'Product ID', key: 'productId', width: 36 },
            { header: 'Variant ID', key: 'variantId', width: 36 },
            { header: 'Ürün Adı', key: 'productName', width: 40 },
            { header: 'SKU', key: 'sku', width: 20 },
            { header: 'Barkod', key: 'barcode', width: 20 },
            { header: 'Normal Fiyat', key: 'normalPrice', width: 15 },
            { header: 'İndirimli Fiyat', key: 'discountedPrice', width: 15 },
        ]

        // Add data
        ikasProducts.forEach((product: any) => {
            worksheet.addRow({
                productId: product.productId,
                variantId: product.variantId,
                productName: product.productName,
                sku: product.sku,
                barcode: product.barcode,
                normalPrice: product.normalPrice || 0,
                discountedPrice: product.discountedPrice || 0,
            })
        })

        // Download
        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'ikas_urunler.xlsx'
        a.click()
        URL.revokeObjectURL(url)
    }

    const trendyolColumns = [
        { key: 'product_name', label: 'Ürün Adı' },
        { key: 'normal_price', label: 'Normal Fiyat' },
        { key: 'discounted_price', label: 'İndirimli Fiyat' },
        {
            key: 'product_link',
            label: 'Link',
            render: (value: string) => (
                <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-violet-600 hover:text-violet-700 hover:underline"
                >
                    <ExternalLink className="w-4 h-4" />
                    Aç
                </a>
            ),
        },
    ]

    const ikasColumns = [
        { key: 'productId', label: 'Product ID' },
        { key: 'variantId', label: 'Variant ID' },
        { key: 'productName', label: 'Ürün Adı' },
        { key: 'sku', label: 'SKU' },
        { key: 'barcode', label: 'Barkod' },
        {
            key: 'normalPrice',
            label: 'Normal Fiyat',
            render: (value: number) => `${(value || 0).toFixed(2)} TL`
        },
        {
            key: 'discountedPrice',
            label: 'İndirimli Fiyat',
            render: (value: number) => `${(value || 0).toFixed(2)} TL`
        },
    ]

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Ürün Yönetimi</h1>
                <p className="text-slate-600">
                    Trendyol ve İKAS ürünlerinizi görüntüleyin ve yönetin
                </p>
            </div>

            {/* MATCH'LE Button */}
            <div className="mb-6">
                <button
                    onClick={handleMatchExport}
                    disabled={matching}
                    data-tour="match-button"
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30"
                >
                    {matching ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Eşleştiriliyor...</span>
                        </>
                    ) : (
                        <>
                            <Link2 className="w-5 h-5" />
                            <span>MATCH'LE & GÖRÜNTÜLE</span>
                        </>
                    )}
                </button>
                <p className="text-xs text-slate-500 mt-2">
                    Eşleştirme dosyasındaki barkodları İKAS ürünleriyle eşleştirip popup'ta gösterir
                </p>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-900">Hata</p>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Success Alert */}
            {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-green-900">Başarılı</p>
                        <p className="text-sm text-green-700 mt-1">{successMessage}</p>
                    </div>
                </div>
            )}

            {/* Product Tables - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trendyol Products */}
                <ProductTable
                    title="Trendyol Ürünleri"
                    data={trendyolProducts}
                    columns={trendyolColumns}
                    loading={loadingTrendyol}
                    onFetch={fetchTrendyolProducts}
                    onExport={exportTrendyolToExcel}
                    onClear={clearTrendyolProducts}
                    fetchButtonText="Ürünleri Çek"
                    icon={<ShoppingBag className="w-6 h-6 text-orange-600" />}
                />

                {/* İKAS Products */}
                <ProductTable
                    title="İKAS Ürünleriniz"
                    data={ikasProducts}
                    columns={ikasColumns}
                    loading={loadingIkas}
                    onFetch={fetchIkasProducts}
                    onExport={exportIkasToExcel}
                    onClear={clearIkasProducts}
                    fetchButtonText="Ürünleri Yükle"
                    icon={<Package className="w-6 h-6 text-blue-600" />}
                />
            </div>

            {/* Match Results Popup */}
            {showMatchPopup && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Popup Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-600">
                            <div>
                                <h2 className="text-xl font-bold text-white">Eşleşen Ürünler</h2>
                                <p className="text-emerald-100 text-sm mt-1">
                                    {matchResults.length} ürün aksiyon gerektiriyor
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handlePushToIkas}
                                    disabled={pushing}
                                    className="flex items-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-lg transition-colors font-semibold disabled:opacity-50"
                                >
                                    {pushing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Gönderiliyor...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4" />
                                            İKAS'a Gönder
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={exportMatchResultsToExcel}
                                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Excel İndir
                                </button>
                                <button
                                    onClick={() => setShowMatchPopup(false)}
                                    className="text-white/80 hover:text-white p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Error/Success in popup */}
                        {(error || successMessage) && (
                            <div className={`mx-6 mt-4 p-3 rounded-lg ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {error || successMessage}
                            </div>
                        )}

                        {/* Popup Content */}
                        <div className="flex-1 overflow-auto p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Product ID</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Variant ID</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Barkod</th>
                                            <th className="px-4 py-3 text-right font-semibold text-slate-700">Yeni Fiyat</th>
                                            <th className="px-4 py-3 text-right font-semibold text-slate-700">İKAS Normal</th>
                                            <th className="px-4 py-3 text-right font-semibold text-slate-700">İKAS İnd.</th>
                                            <th className="px-4 py-3 text-right font-semibold text-slate-700">İKAS Alış</th>
                                            <th className="px-4 py-3 text-right font-semibold text-slate-700">Trendyol İnd.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {matchResults.map((row, idx) => (
                                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.product_id}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.variant_id}</td>
                                                <td className="px-4 py-3 text-slate-800">{row.barcode}</td>
                                                <td className="px-4 py-3 text-right font-medium text-amber-600">
                                                    {(row.new_price || 0).toFixed(2)} TL
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-purple-600">
                                                    {(row.ikas_normal_price || 0).toFixed(2)} TL
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-blue-600">
                                                    {(row.ikas_discounted_price || 0).toFixed(2)} TL
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-green-600">
                                                    {(row.ikas_buy_price || 0).toFixed(2)} TL
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-orange-600">
                                                    {(row.trendyol_discounted_price || 0).toFixed(2)} TL
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
