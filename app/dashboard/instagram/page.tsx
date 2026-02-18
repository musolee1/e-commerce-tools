'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Instagram, Send, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, Plus, X, Package, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Hash } from 'lucide-react'
import { useSending } from '@/components/SendingContext'
import { useDataCache } from '@/components/DataCacheContext'

interface GroupedProduct {
    id: string
    urun_grup_id: string
    urun_ismi: string
    varyant_degerler: string
    resim_urlleri: string
    toplam_stok: number
    stok_kodu: string
    uploaded_at: string
}

export default function InstagramPage() {
    const { addToQueue, isProcessing, currentJob, queue } = useSending()
    const {
        groupedProducts, loadingGroupedProducts: loadingProducts,
        loadGroupedProducts: loadGroupedProductsCache,
        sentItems, loadSentItems: loadSentItemsCache, addSentItem,
        userSettings, loadUserSettings,
    } = useDataCache()

    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Product selection
    const [selectedProduct, setSelectedProduct] = useState<GroupedProduct | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // Form fields
    const [imageUrls, setImageUrls] = useState<string[]>([''])
    const [caption, setCaption] = useState('')
    const [hashtags, setHashtags] = useState('#yeniürün #kampanya #indirim')

    // Backend-only fields (no UI, kept for API calls)
    const [locationId, setLocationId] = useState('')

    // UI states
    const [urlsExpanded, setUrlsExpanded] = useState(false)
    const [previewIndex, setPreviewIndex] = useState(0)

    // Load on mount (from cache — instant if already loaded)
    useEffect(() => {
        loadGroupedProductsCache()
        loadSentItemsCache()
        loadUserSettings().then(settings => {
            if (settings?.instagram_location_id) {
                setLocationId(settings.instagram_location_id)
            }
        })
    }, [])

    // Filter products by search
    const filteredProducts = useMemo(() => {
        if (!searchQuery) return groupedProducts
        const query = searchQuery.toLowerCase()
        return groupedProducts.filter(p =>
            p.urun_ismi.toLowerCase().includes(query) ||
            p.stok_kodu?.toLowerCase().includes(query)
        )
    }, [groupedProducts, searchQuery])

    // Handle product selection
    const handleProductSelect = (product: GroupedProduct) => {
        setSelectedProduct(product)

        // Parse image URLs
        let images: string[] = []
        if (product.resim_urlleri) {
            const imageString = product.resim_urlleri.trim()
            if (imageString.includes(';')) {
                images = imageString.split(';').map(url => url.trim()).filter(url => url && url.startsWith('http'))
            } else if (imageString.includes(',')) {
                images = imageString.split(',').map(url => url.trim()).filter(url => url && url.startsWith('http'))
            } else {
                const urlMatches = imageString.match(/https?:\/\/[^\s;,]+/g)
                images = urlMatches ? urlMatches.map(url => url.trim()) : []
            }
        }

        setImageUrls(images.length > 0 ? images : [''])
        setPreviewIndex(0)
        setUrlsExpanded(false)

        // Generate caption (Telegram style - no stock count)
        const variants = product.varyant_degerler || ''
        const sku = product.stok_kodu || ''

        const captionText = `${product.urun_ismi}\n${sku ? `🔖 Stok Kodu: ${sku}\n` : ''}${variants ? `📦 ${variants}\n` : ''}`
        setCaption(captionText)
    }

    const addImageUrl = () => {
        if (imageUrls.length < 10) {
            setImageUrls([...imageUrls, ''])
        }
    }

    const removeImageUrl = (index: number) => {
        setImageUrls(imageUrls.filter((_, i) => i !== index))
    }

    const updateImageUrl = (index: number, value: string) => {
        const newUrls = [...imageUrls]
        newUrls[index] = value
        setImageUrls(newUrls)
    }

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault()

        const validUrls = imageUrls.filter(url => url.trim() !== '')

        if (validUrls.length === 0) {
            setError('En az bir görsel URL gereklidir')
            return
        }

        setError(null)
        setSuccess(null)

        // Combine caption + hashtags
        const fullCaption = `${caption.trim()}\n\n${hashtags.trim()}`.trim()

        // Add to background queue instead of posting directly
        addToQueue({
            id: crypto.randomUUID(),
            type: 'instagram',
            productName: selectedProduct?.urun_ismi || 'Manuel Post',
            imageUrls: validUrls,
            caption: fullCaption || '',
            locationId: locationId || undefined,
            productId: selectedProduct?.id,
            urunGrupId: selectedProduct?.urun_grup_id,
            urunIsmi: selectedProduct?.urun_ismi,
        })

        // Mark as sent locally immediately
        if (selectedProduct) {
            addSentItem(selectedProduct.id)
        }

        setSuccess('Gönderim kuyruğuna eklendi! Arka planda gönderilecek.')

        // Reset form
        setSelectedProduct(null)
        setImageUrls([''])
        setCaption('')
        setPreviewIndex(0)

        setTimeout(() => setSuccess(null), 4000)
    }

    const validImageCount = imageUrls.filter(url => url.trim() !== '').length
    const validImages = imageUrls.filter(url => url.trim() !== '')

    // Get first image for product cards
    const getProductImage = (product: GroupedProduct) => {
        if (!product.resim_urlleri) return null
        const imageString = product.resim_urlleri.trim()
        if (imageString.includes(';')) {
            return imageString.split(';')[0]?.trim()
        } else if (imageString.includes(',')) {
            return imageString.split(',')[0]?.trim()
        }
        const match = imageString.match(/https?:\/\/[^\s;,]+/)
        return match ? match[0] : null
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                            <Instagram className="w-6 h-6 text-white" />
                        </div>
                        Instagram Post
                    </h1>
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Product Selection */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Product List Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-slate-600" />
                                <h2 className="text-lg font-semibold text-slate-900">Ürünler</h2>
                                <span className="text-sm text-slate-500">({filteredProducts.length})</span>
                            </div>
                            <button
                                onClick={() => { loadGroupedProductsCache(true); loadSentItemsCache(true); }}
                                disabled={loadingProducts}
                                className="p-2 text-slate-600 hover:bg-white rounded-lg transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${loadingProducts ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {/* Search */}
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Ürün ara..."
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                        />

                        {/* Product List */}
                        <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                            {filteredProducts.map((product) => {
                                const productImage = getProductImage(product)
                                const isSent = sentItems.has(product.id)
                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => handleProductSelect(product)}
                                        className={`w-full text-left p-3 rounded-xl border transition-all relative ${selectedProduct?.id === product.id
                                            ? 'border-violet-500 ring-2 ring-violet-100 bg-white'
                                            : isSent
                                                ? 'border-blue-200 bg-blue-50 hover:shadow-md'
                                                : 'border-slate-200 bg-white hover:shadow-md hover:border-violet-200'
                                            }`}
                                    >
                                        {/* Sent Badge */}
                                        {isSent && (
                                            <div className="absolute top-2 right-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                                                Gönderildi
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            {/* Product Image */}
                                            {productImage && (
                                                <img
                                                    src={productImage}
                                                    alt={product.urun_ismi}
                                                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none'
                                                    }}
                                                />
                                            )}

                                            {/* Product Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 line-clamp-2">{product.urun_ismi}</p>
                                                {product.stok_kodu && (
                                                    <p className="text-xs text-slate-500 mt-1">SKU: {product.stok_kodu}</p>
                                                )}
                                                <p className="text-xs text-emerald-600 mt-1 font-medium">Stok: {product.toplam_stok}</p>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Right: Post Form & Preview */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Post Form */}
                        <form onSubmit={handlePost} className="space-y-6">
                            {/* Image URLs - Collapsible */}
                            <div className="bg-white rounded-xl p-6 border border-slate-200">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-sm font-semibold text-slate-900">
                                        Görsel URL&apos;leri <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-xs text-slate-500">
                                        {validImageCount}/10 görsel
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {/* First URL always visible */}
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="url"
                                                value={imageUrls[0] || ''}
                                                onChange={(e) => updateImageUrl(0, e.target.value)}
                                                placeholder="Görsel 1 URL"
                                                className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                                            />
                                        </div>
                                        {imageUrls.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeImageUrl(0)}
                                                className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Additional URLs - Collapsible */}
                                    {imageUrls.length > 1 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setUrlsExpanded(!urlsExpanded)}
                                                className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium w-full"
                                            >
                                                {urlsExpanded ? (
                                                    <ChevronUp className="w-4 h-4" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4" />
                                                )}
                                                {urlsExpanded ? 'URL\'leri Gizle' : `${imageUrls.length - 1} görsel daha`}
                                            </button>

                                            {urlsExpanded && (
                                                <div className="space-y-3">
                                                    {imageUrls.slice(1).map((url, i) => {
                                                        const index = i + 1
                                                        return (
                                                            <div key={index} className="flex gap-2">
                                                                <div className="relative flex-1">
                                                                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                                    <input
                                                                        type="url"
                                                                        value={url}
                                                                        onChange={(e) => updateImageUrl(index, e.target.value)}
                                                                        placeholder={`Görsel ${index + 1} URL`}
                                                                        className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                                                                    />
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeImageUrl(index)}
                                                                    className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                                >
                                                                    <X className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {imageUrls.length < 10 && (
                                    <button
                                        type="button"
                                        onClick={addImageUrl}
                                        className="mt-3 flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Görsel Ekle (Carousel için)
                                    </button>
                                )}
                            </div>

                            {/* Instagram-Style Preview */}
                            {validImageCount > 0 && (
                                <div className="bg-white rounded-xl p-6 border border-slate-200">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                                        Instagram Önizleme
                                    </p>

                                    {/* Instagram Post Card */}
                                    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                        {/* Post Header */}
                                        <div className="flex items-center gap-3 p-3 border-b border-slate-100">
                                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full"></div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold">Mağazanız</p>
                                            </div>
                                        </div>

                                        {/* Carousel Images */}
                                        <div className="relative aspect-square bg-slate-100">
                                            <img
                                                src={validImages[previewIndex]}
                                                alt={`Preview ${previewIndex + 1}`}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x400?text=Görsel+Yüklenemedi'
                                                }}
                                            />

                                            {/* Carousel Controls */}
                                            {validImageCount > 1 && (
                                                <>
                                                    {previewIndex > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewIndex(previewIndex - 1)}
                                                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                                                        >
                                                            <ChevronLeft className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                    {previewIndex < validImageCount - 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewIndex(previewIndex + 1)}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                                                        >
                                                            <ChevronRight className="w-5 h-5" />
                                                        </button>
                                                    )}

                                                    {/* Dots Indicator */}
                                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                                        {validImages.map((_, index) => (
                                                            <div
                                                                key={index}
                                                                className={`w-1.5 h-1.5 rounded-full transition-all ${index === previewIndex ? 'bg-white w-2' : 'bg-white/50'
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Post Footer */}
                                        <div className="p-3">
                                            {(caption || hashtags) && (
                                                <p className="text-sm text-slate-800 whitespace-pre-wrap line-clamp-4">
                                                    <span className="font-semibold">Mağazanız</span> {caption.trim()}{hashtags ? `\n\n${hashtags}` : ''}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Caption */}
                            <div className="bg-white rounded-xl p-6 border border-slate-200">
                                <label className="block text-sm font-semibold text-slate-900 mb-3">
                                    Açıklama
                                </label>
                                <textarea
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    placeholder="Ürün açıklaması..."
                                    rows={5}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm resize-none"
                                />
                            </div>

                            {/* Hashtags */}
                            <div className="bg-white rounded-xl p-6 border border-slate-200">
                                <label className="block text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <Hash className="w-4 h-4 text-violet-500" />
                                    Hashtag&apos;ler
                                </label>
                                <input
                                    type="text"
                                    value={hashtags}
                                    onChange={(e) => setHashtags(e.target.value)}
                                    placeholder="#yeniürün #kampanya #indirim"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    Hashtag&apos;ler açıklamanın altına eklenir
                                </p>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || validImageCount === 0 || (isProcessing && queue.length > 3)}
                                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-pink-500/30"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Gönderiliyor...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        <span>Kuyruğa Ekle{isProcessing ? ` (${queue.length + 1} kuyrukta)` : ''}</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
