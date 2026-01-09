'use client'

import { useState, useEffect } from 'react'
import { Package, ShoppingBag, ExternalLink, AlertCircle, Link2, Loader2 } from 'lucide-react'
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

export default function ProductsPage() {
    const [trendyolProducts, setTrendyolProducts] = useState<TrendyolProduct[]>([])
    const [ikasProducts, setIkasProducts] = useState<IkasProduct[]>([])
    const [loadingTrendyol, setLoadingTrendyol] = useState(false)
    const [loadingIkas, setLoadingIkas] = useState(false)
    const [matching, setMatching] = useState(false)
    const [error, setError] = useState<string | null>(null)

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

    // MATCH'LE - Eşleştirme ve Excel export
    const handleMatchExport = async () => {
        setMatching(true)
        setError(null)

        try {
            const response = await fetch('/api/match-export', {
                method: 'POST',
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Eşleştirme hatası')
            }

            // Excel dosyasını indir
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'eslesen_urunler.xlsx'
            a.click()
            URL.revokeObjectURL(url)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setMatching(false)
        }
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
                            <span>MATCH'LE & EXCEL İNDİR</span>
                        </>
                    )}
                </button>
                <p className="text-xs text-slate-500 mt-2">
                    Eşleştirme dosyasındaki barkodları İKAS ürünleriyle eşleştirip Excel'e export eder
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
        </div>
    )
}
