'use client'

import { useState, useEffect } from 'react'
import { Package, ShoppingBag, ExternalLink, AlertCircle, Loader2, RefreshCw, Download, Link2, X } from 'lucide-react'
import ProductTable from '@/components/ProductTable'
import * as XLSX from 'exceljs'

interface TrendyolProduct {
    id: string
    product_name: string
    normal_price: string
    discounted_price: string
    product_link: string
}

interface SiteProduct {
    trendyolKey: string
    barcode: string
    sitePrice: number
    fetchedAt?: string
}

interface MatchResult {
    product_name: string
    trendyol_key: string
    barcode: string
    site_price: number
    trendyol_normal_price: number  // T.Normal fiyat
    new_price: number  // T.Normal'e %14.5 indirim uygulanmış fiyat
}

interface UpdateResult {
    product_name: string
    trendyol_key: string
    new_price: number
    success: boolean
    error?: string
}

export default function PriceComparePage() {
    const [trendyolProducts, setTrendyolProducts] = useState<TrendyolProduct[]>([])
    const [siteProducts, setSiteProducts] = useState<SiteProduct[]>([])
    const [loadingTrendyol, setLoadingTrendyol] = useState(false)
    const [loadingSite, setLoadingSite] = useState(false)
    const [matching, setMatching] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Match Results Popup State
    const [showMatchPopup, setShowMatchPopup] = useState(false)
    const [matchResults, setMatchResults] = useState<MatchResult[]>([])
    const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())
    const [updatingPrices, setUpdatingPrices] = useState(false)

    // Update Results State
    const [showUpdateResults, setShowUpdateResults] = useState(false)
    const [updateResults, setUpdateResults] = useState<UpdateResult[]>([])

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

            // Load Site products
            const siteRes = await fetch('/api/products/site')
            if (siteRes.ok) {
                const data = await siteRes.json()
                setSiteProducts(data.products || [])
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

    const fetchSiteProducts = async () => {
        setLoadingSite(true)
        setError(null)

        try {
            const response = await fetch('/api/products/site', {
                method: 'POST',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Site ürünleri çekilemedi')
            }

            setSiteProducts(data.products || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoadingSite(false)
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

    const clearSiteProducts = async () => {
        try {
            const response = await fetch('/api/products/site', {
                method: 'DELETE',
            })

            if (response.ok) {
                setSiteProducts([])
            } else {
                const data = await response.json()
                setError(data.error || 'Ürünler silinemedi')
            }
        } catch (err: any) {
            setError(err.message)
        }
    }

    const handleMatchCompare = async () => {
        setMatching(true)
        setError(null)

        try {
            const response = await fetch('/api/match-compare', {
                method: 'POST',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Eşleştirme hatası')
            }

            setMatchResults(data.data || [])
            setSelectedProducts(new Set())
            setShowMatchPopup(true)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setMatching(false)
        }
    }

    const toggleSelectAll = () => {
        if (selectedProducts.size === matchResults.length) {
            setSelectedProducts(new Set())
        } else {
            setSelectedProducts(new Set(matchResults.map((_, idx) => idx)))
        }
    }

    const toggleProductSelection = (index: number) => {
        const newSelected = new Set(selectedProducts)
        if (newSelected.has(index)) {
            newSelected.delete(index)
        } else {
            newSelected.add(index)
        }
        setSelectedProducts(newSelected)
    }

    const handleBulkUpdate = async () => {
        if (selectedProducts.size === 0) {
            setError('Lütfen en az bir ürün seçin')
            return
        }

        setUpdatingPrices(true)
        setError(null)

        try {
            const results: UpdateResult[] = []

            // Tüm seçili ürünleri işle
            const selectedItems = Array.from(selectedProducts).map(idx => matchResults[idx])

            for (const product of selectedItems) {
                try {
                    const response = await fetch('/api/update-site-price', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            TrendyolKey: product.trendyol_key,
                            NewSitePrice: product.new_price,
                        }),
                    })

                    const responseData = await response.json()

                    if (response.ok) {
                        results.push({
                            product_name: product.product_name,
                            trendyol_key: product.trendyol_key,
                            new_price: product.new_price,
                            success: true,
                        })
                    } else {
                        results.push({
                            product_name: product.product_name,
                            trendyol_key: product.trendyol_key,
                            new_price: product.new_price,
                            success: false,
                            error: responseData.error || `HTTP ${response.status}`,
                        })
                    }
                } catch (err: any) {
                    results.push({
                        product_name: product.product_name,
                        trendyol_key: product.trendyol_key,
                        new_price: product.new_price,
                        success: false,
                        error: `Network error: ${err.message || 'Bağlantı hatası'}`,
                    })
                }
            }

            setUpdateResults(results)
            setShowUpdateResults(true)
            setSelectedProducts(new Set())
        } catch (err: any) {
            setError(err.message)
        } finally {
            setUpdatingPrices(false)
        }
    }

    const exportMatchToExcel = async () => {
        const workbook = new XLSX.Workbook()
        const worksheet = workbook.addWorksheet('Fiyat Karşılaştırma')

        worksheet.columns = [
            { header: 'Ürün İsmi', key: 'product_name', width: 50 },
            { header: 'Trendyol Barkod', key: 'trendyol_key', width: 20 },
            { header: 'Site Barkod', key: 'barcode', width: 20 },
            { header: 'Site Fiyat', key: 'site_price', width: 15 },
            { header: 'Yeni Fiyat', key: 'new_price', width: 15 },
            { header: 'Trendyol Normal', key: 'trendyol_normal_price', width: 18 },
        ]

        matchResults.forEach((row) => {
            const excelRow = worksheet.addRow(row)
            excelRow.getCell('site_price').numFmt = '#,##0.00'
            excelRow.getCell('new_price').numFmt = '#,##0.00'
            excelRow.getCell('trendyol_normal_price').numFmt = '#,##0.00'
        })

        // Header styling
        const headerRow = worksheet.getRow(1)
        headerRow.font = { bold: true }

        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'fiyat_karsilastirma.xlsx'
        a.click()
        URL.revokeObjectURL(url)
    }

    const exportTrendyolToExcel = async () => {
        const workbook = new XLSX.Workbook()
        const worksheet = workbook.addWorksheet('Trendyol Ürünleri')

        worksheet.columns = [
            { header: 'Ürün Adı', key: 'product_name', width: 50 },
            { header: 'Normal Fiyat', key: 'normal_price', width: 15 },
            { header: 'İndirimli Fiyat', key: 'discounted_price', width: 15 },
            { header: 'Link', key: 'product_link', width: 60 },
        ]

        trendyolProducts.forEach((product) => {
            worksheet.addRow({
                product_name: product.product_name,
                normal_price: product.normal_price,
                discounted_price: product.discounted_price,
                product_link: product.product_link,
            })
        })

        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'trendyol_urunler.xlsx'
        a.click()
        URL.revokeObjectURL(url)
    }

    const exportSiteToExcel = async () => {
        const workbook = new XLSX.Workbook()
        const worksheet = workbook.addWorksheet('Site Ürünleri')

        worksheet.columns = [
            { header: 'Trendyol Key', key: 'trendyolKey', width: 20 },
            { header: 'Barkod', key: 'barcode', width: 20 },
            { header: 'Site Fiyat', key: 'sitePrice', width: 15 },
        ]

        siteProducts.forEach((product) => {
            const row = worksheet.addRow({
                trendyolKey: product.trendyolKey,
                barcode: product.barcode,
                sitePrice: product.sitePrice,
            })
            row.getCell('sitePrice').numFmt = '#,##0.00'
        })

        // Header styling
        const headerRow = worksheet.getRow(1)
        headerRow.font = { bold: true }

        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'site_urunler.xlsx'
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

    const siteColumns = [
        { key: 'trendyolKey', label: 'Trendyol Key' },
        { key: 'barcode', label: 'Barkod' },
        {
            key: 'sitePrice',
            label: 'Site Fiyat',
            render: (value: number) => `${(value || 0).toFixed(2)} TL`
        },
    ]

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Fiyat Karşılaştır</h1>
                <p className="text-slate-600">
                    Trendyol ve site ürünlerinizi görüntüleyin ve karşılaştırın
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

            {/* Match Button */}
            <div className="mb-6">
                <button
                    onClick={handleMatchCompare}
                    disabled={matching}
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
                            <span>EŞLEŞTİR VE GÖRÜNTÜLE</span>
                        </>
                    )}
                </button>
                <p className="text-xs text-slate-500 mt-2">
                    Trendyol ve Site ürünlerini eşleştirip karşılaştırmalı tablo oluşturur
                </p>
            </div>

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

                {/* Site Products */}
                <ProductTable
                    title="Site Ürünleriniz"
                    data={siteProducts}
                    columns={siteColumns}
                    loading={loadingSite}
                    onFetch={fetchSiteProducts}
                    onExport={exportSiteToExcel}
                    onClear={clearSiteProducts}
                    fetchButtonText="Yenile"
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
                                <h2 className="text-xl font-bold text-white">Fiyat Karşılaştırma</h2>
                                <p className="text-emerald-100 text-sm mt-1">
                                    {matchResults.length} ürün eşleştirildi • {selectedProducts.size} seçili
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleBulkUpdate}
                                    disabled={selectedProducts.size === 0 || updatingPrices}
                                    className="flex items-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {updatingPrices ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Güncelleniyor...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-4 h-4" />
                                            Fiyatları Güncelle ({selectedProducts.size})
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={exportMatchToExcel}
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

                        {/* Popup Content */}
                        <div className="flex-1 overflow-auto p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="px-3 py-3 text-center w-12">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProducts.size === matchResults.length && matchResults.length > 0}
                                                    onChange={toggleSelectAll}
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Ürün İsmi</th>
                                            <th className="px-4 py-3 text-left font-semibold text-orange-600 w-36">Trendyol Barkod</th>
                                            <th className="px-4 py-3 text-left font-semibold text-blue-700 w-36">Site Barkod</th>
                                            <th className="px-4 py-3 text-right font-semibold text-blue-700 w-28">Site Fiyat</th>
                                            <th className="px-4 py-3 text-right font-semibold text-emerald-600 w-28">Yeni Fiyat</th>
                                            <th className="px-4 py-3 text-right font-semibold text-orange-600 w-28">T. Normal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {matchResults.map((row, idx) => (
                                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                <td className="px-3 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProducts.has(idx)}
                                                        onChange={() => toggleProductSelection(idx)}
                                                        className="w-4 h-4 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">{row.product_name}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-700">{row.trendyol_key}</td>
                                                <td className="px-4 py-3 text-slate-700 text-sm">{row.barcode}</td>
                                                <td className="px-4 py-3 text-right text-slate-700 font-medium whitespace-nowrap">
                                                    {(row.site_price || 0).toFixed(2)} TL
                                                </td>
                                                <td className="px-4 py-3 text-right text-emerald-600 font-bold whitespace-nowrap">
                                                    {(row.new_price || 0).toFixed(2)} TL
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-700 font-medium whitespace-nowrap">
                                                    {(row.trendyol_normal_price || 0).toFixed(2)} TL
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

            {/* Update Results Popup */}
            {showUpdateResults && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                        {/* Results Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600">
                            <div>
                                <h2 className="text-xl font-bold text-white">Güncelleme Sonuçları</h2>
                                <p className="text-blue-100 text-sm mt-1">
                                    {updateResults.filter(r => r.success).length} başarılı • {updateResults.filter(r => !r.success).length} başarısız
                                </p>
                            </div>
                            <button
                                onClick={() => setShowUpdateResults(false)}
                                className="text-white/80 hover:text-white p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Results Content */}
                        <div className="flex-1 overflow-auto p-6">
                            <div className="space-y-3">
                                {updateResults.map((result, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-4 rounded-lg border-2 ${result.success
                                            ? 'bg-emerald-50 border-emerald-200'
                                            : 'bg-red-50 border-red-200'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 mt-0.5">
                                                {result.success ? (
                                                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-semibold text-sm ${result.success ? 'text-emerald-900' : 'text-red-900'}`}>
                                                    {result.product_name}
                                                </p>
                                                <p className={`text-xs font-mono mt-1 ${result.success ? 'text-emerald-700' : 'text-red-700'}`}>
                                                    Barkod: {result.trendyol_key} • Yeni Fiyat: {result.new_price.toFixed(2)} TL
                                                </p>
                                                {!result.success && result.error && (
                                                    <p className="text-xs text-red-600 mt-2 bg-red-100 p-2 rounded">
                                                        <strong>Hata:</strong> {result.error}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
