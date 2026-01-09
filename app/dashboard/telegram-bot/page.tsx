'use client'

import { useState } from 'react'
import { Upload, Send, Download, Package, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface Product {
    İsim: string
    'Stok:Merter Depo': number
    Slug: string
    'Resim URL': string
}

export default function TelegramBotPage() {
    const [file, setFile] = useState<File | null>(null)
    const [products, setProducts] = useState<Product[]>([])
    const [selectedCount, setSelectedCount] = useState(3)
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [updatedFileUrl, setUpdatedFileUrl] = useState<string | null>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        setFile(selectedFile)
        setError(null)
        setSuccess(null)
        setUpdatedFileUrl(null)
        setLoading(true)

        try {
            const formData = new FormData()
            formData.append('file', selectedFile)

            const response = await fetch('/api/process-excel', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Dosya işlenirken hata oluştu')
            }

            setProducts(data.products)
            setSuccess(`${data.totalProducts} ürün yüklendi, ${data.productsInStock} stoklu ürün bulundu!`)
        } catch (err: any) {
            setError(err.message)
            setProducts([])
        } finally {
            setLoading(false)
        }
    }

    const handleSendToTelegram = async () => {
        if (products.length === 0) return

        setSending(true)
        setError(null)
        setSuccess(null)
        setProgress(0)

        try {
            const productsToSend = products.slice(0, selectedCount)

            const response = await fetch('/api/send-telegram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ products: productsToSend }),
            })

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) throw new Error('Stream okuma hatası')

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split('\n')

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(6))

                        if (data.progress !== undefined) {
                            setProgress(data.progress)
                        }

                        if (data.error) {
                            throw new Error(data.error)
                        }

                        if (data.success) {
                            setSuccess(data.message)
                            setUpdatedFileUrl(data.fileUrl)
                            // Refresh product list
                            setProducts(prev => prev.slice(selectedCount))
                        }
                    }
                }
            }
        } catch (err: any) {
            setError(err.message || 'Gönderim sırasında hata oluştu')
        } finally {
            setSending(false)
            setProgress(0)
        }
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    Telegram Bot Yönetimi
                </h1>
                <p className="text-slate-600">
                    Excel dosyanızı yükleyin, stoklu ürünleri seçin ve Telegram kanalınıza gönderin
                </p>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                        <Upload className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Excel Dosyası Yükle</h2>
                        <p className="text-sm text-slate-500">ikas-urunler.xlsx dosyanızı seçin</p>
                    </div>
                </div>

                <label className="block">
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        disabled={loading || sending}
                        className="block w-full text-sm text-slate-500
              file:mr-4 file:py-3 file:px-6
              file:rounded-xl file:border-0
              file:text-sm file:font-semibold
              file:bg-gradient-to-r file:from-violet-600 file:to-indigo-600
              file:text-white
              hover:file:bg-gradient-to-r hover:file:from-violet-700 hover:file:to-indigo-700
              file:cursor-pointer
              file:transition-all
              cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </label>

                {loading && (
                    <div className="mt-4 flex items-center gap-2 text-violet-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Dosya işleniyor...</span>
                    </div>
                )}
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-red-900">Hata</p>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">Başarılı</p>
                        <p className="text-sm text-green-700 mt-1">{success}</p>
                    </div>
                </div>
            )}

            {/* Products Table */}
            {products.length > 0 && (
                <>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                    <Package className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Stoklu Ürünler</h2>
                                    <p className="text-sm text-slate-500">{products.length} ürün bulundu</p>
                                </div>
                            </div>
                        </div>

                        {/* Selection Slider */}
                        <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                            <label className="block text-sm font-medium text-slate-700 mb-3">
                                Kaç ürün gönderilsin? <span className="text-violet-600 font-bold">{selectedCount}</span>
                            </label>
                            <input
                                type="range"
                                min="1"
                                max={Math.min(products.length, 10)}
                                value={selectedCount}
                                onChange={(e) => setSelectedCount(Number(e.target.value))}
                                disabled={sending}
                                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-2">
                                <span>1</span>
                                <span>{Math.min(products.length, 10)}</span>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Ürün Adı</th>
                                        <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Stok</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Slug</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.slice(0, selectedCount).map((product, index) => (
                                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-4 text-sm text-slate-900">{product.İsim}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    {product['Stok:Merter Depo']}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-600 font-mono text-xs truncate max-w-xs">
                                                {product.Slug}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Send Button */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <button
                            onClick={handleSendToTelegram}
                            disabled={sending || products.length === 0}
                            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-violet-500/30"
                        >
                            {sending ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Gönderiliyor... {progress}%</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    <span>Telegram'a Gönder ({selectedCount} ürün)</span>
                                </>
                            )}
                        </button>

                        {sending && (
                            <div className="mt-4 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Download Updated File */}
                    {updatedFileUrl && (
                        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-6">
                            <div className="flex items-start gap-3">
                                <Download className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-amber-900 mb-2">
                                        Güncellenmiş Excel dosyanızı indirin
                                    </p>
                                    <p className="text-sm text-amber-700 mb-4">
                                        Gönderilen ürünler dosyadan kaldırıldı
                                    </p>
                                    <a
                                        href={updatedFileUrl}
                                        download="ikas-urunler_GUNCEL.xlsx"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Excel'i İndir
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Empty State */}
            {!file && products.length === 0 && !loading && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                        Başlamak için Excel dosyanızı yükleyin
                    </h3>
                    <p className="text-sm text-slate-500">
                        ikas-urunler.xlsx dosyanızı yukarıdan seçin
                    </p>
                </div>
            )}
        </div>
    )
}
