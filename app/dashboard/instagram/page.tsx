'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Instagram, Send, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, Plus, X, Package, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Hash, LayoutGrid, Eye, EyeOff, ExternalLink, Paintbrush, Clock, Calendar, Trash2 } from 'lucide-react'
import GridEditorModal from '@/components/GridEditorModal'
import { useSending } from '@/components/SendingContext'
import { useDataCache } from '@/components/DataCacheContext'
import Link from 'next/link'

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

const WATERMARK_COLORS = [
    { label: 'Siyah', value: 'rgba(0,0,0,0.7)' },
    { label: 'Koyu Yeşil', value: 'rgba(5,46,22,0.8)' },
    { label: 'Koyu Mavi', value: 'rgba(15,23,42,0.75)' },
    { label: 'Bordo', value: 'rgba(127,29,29,0.75)' },
    { label: 'Mor', value: 'rgba(59,7,100,0.75)' },
]

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
    const [hideSent, setHideSent] = useState(false)
    const [postType, setPostType] = useState<'post' | 'story'>('post')

    // Form fields
    const [imageUrls, setImageUrls] = useState<string[]>([''])
    const [caption, setCaption] = useState('')
    const [hashtags, setHashtags] = useState('#yeniürün #kampanya #indirim')

    // Watermark
    const [watermarkEnabled, setWatermarkEnabled] = useState(false)
    const [watermarkText, setWatermarkText] = useState('Ürünler toptandır')
    const [watermarkColor, setWatermarkColor] = useState(WATERMARK_COLORS[0].value)

    // Backend-only fields (no UI, kept for API calls)
    const [locationId, setLocationId] = useState('')

    // UI states
    const [urlsExpanded, setUrlsExpanded] = useState(false)
    const [previewIndex, setPreviewIndex] = useState(0)

    // Collapsible sections
    const [productsExpanded, setProductsExpanded] = useState(true)
    const [imageUrlsCardExpanded, setImageUrlsCardExpanded] = useState(true)
    const [captionExpanded, setCaptionExpanded] = useState(true)

    // Grid Editor
    const [gridEditorEnabled, setGridEditorEnabled] = useState(false)
    const [gridEditorOpen, setGridEditorOpen] = useState(false)
    const [gridEditorImages, setGridEditorImages] = useState<string[]>([])

    // Scheduling
    const [showScheduler, setShowScheduler] = useState(false)
    const [scheduleDate, setScheduleDate] = useState('')
    const [scheduleTime, setScheduleTime] = useState('')
    const [scheduledPosts, setScheduledPosts] = useState<any[]>([])
    const [loadingScheduledPosts, setLoadingScheduledPosts] = useState(false)
    const [schedulingPost, setSchedulingPost] = useState(false)

    // Carousel scroll ref
    const carouselRef = useRef<HTMLDivElement>(null)
    const schedulerRef = useRef<HTMLDivElement>(null)

    // Watermark canvas ref
    const watermarkCanvasRef = useRef<HTMLCanvasElement>(null)

    // Load scheduled posts
    const loadScheduledPosts = useCallback(async () => {
        setLoadingScheduledPosts(true)
        try {
            const res = await fetch('/api/instagram/schedule')
            if (res.ok) {
                const data = await res.json()
                setScheduledPosts(data.scheduledPosts || [])
            }
        } catch (err) {
            console.error('Error loading scheduled posts:', err)
        } finally {
            setLoadingScheduledPosts(false)
        }
    }, [])

    // Cancel scheduled post
    const cancelScheduledPost = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/instagram/schedule?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                setScheduledPosts(prev => prev.filter(p => p.id !== id))
            }
        } catch (err) {
            console.error('Error cancelling scheduled post:', err)
        }
    }, [])

    // Close scheduler popover on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (schedulerRef.current && !schedulerRef.current.contains(e.target as Node)) {
                setShowScheduler(false)
            }
        }
        if (showScheduler) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showScheduler])

    // Load on mount (from cache — instant if already loaded)
    useEffect(() => {
        loadGroupedProductsCache()
        loadSentItemsCache()
        loadScheduledPosts()
        loadUserSettings().then(settings => {
            if (settings?.instagram_location_id) {
                setLocationId(settings.instagram_location_id)
            }
        })
    }, [])

    // Filter products by search and sent status
    const filteredProducts = useMemo(() => {
        let products = groupedProducts
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            products = products.filter(p =>
                p.urun_ismi.toLowerCase().includes(query) ||
                p.stok_kodu?.toLowerCase().includes(query)
            )
        }
        if (hideSent) {
            products = products.filter(p => !sentItems.has(p.id))
        }
        return products
    }, [groupedProducts, searchQuery, hideSent, sentItems])

    // Parse image URLs from product
    const parseProductImages = useCallback((product: GroupedProduct): string[] => {
        if (!product.resim_urlleri) return []
        const imageString = product.resim_urlleri.trim()
        if (imageString.includes(';')) {
            return imageString.split(';').map(url => url.trim()).filter(url => url && url.startsWith('http'))
        } else if (imageString.includes(',')) {
            return imageString.split(',').map(url => url.trim()).filter(url => url && url.startsWith('http'))
        }
        const urlMatches = imageString.match(/https?:\/\/[^\s;,]+/g)
        return urlMatches ? urlMatches.map(url => url.trim()) : []
    }, [])

    // Handle product selection — DON'T auto-open grid editor
    const handleProductSelect = (product: GroupedProduct) => {
        setSelectedProduct(product)

        const images = parseProductImages(product)

        setImageUrls(images.length > 0 ? images : [''])
        setPreviewIndex(0)
        setUrlsExpanded(false)

        // Generate caption (Telegram style - no stock count)
        const variants = product.varyant_degerler || ''
        const sku = product.stok_kodu || ''
        const captionText = `${product.urun_ismi}\n${sku ? `🔖 Stok Kodu: ${sku}\n` : ''}${variants ? `📦 ${variants}\n` : ''}`
        setCaption(captionText)

        // Reset grid editor images (don't open automatically)
        if (gridEditorEnabled) {
            setGridEditorImages(images)
        }
    }

    // Handle grid editor result
    const handleGridImageReady = useCallback((publicUrl: string) => {
        setImageUrls([publicUrl])
        setPreviewIndex(0)
    }, [])

    const addImageUrl = () => {
        if (imageUrls.length < 10) {
            setImageUrls([...imageUrls, ''])
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setLoading(true)
        setError(null)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const uploadRes = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData,
            })
            const uploadData = await uploadRes.json()

            if (!uploadRes.ok) {
                throw new Error(uploadData.error || 'Görsel yüklenemedi')
            }

            const newUrl = uploadData.publicUrl

            // Prepend new image to the urls and select it
            const newUrls = [newUrl, ...imageUrls.filter(u => u.trim() !== '')]
            setImageUrls(newUrls.length > 0 ? newUrls : [''])
            setPreviewIndex(0)

        } catch (err: any) {
            setError('Görsel yüklenirken hata oluştu: ' + (err.message || 'Bilinmeyen hata'))
        } finally {
            setLoading(false)
            // Reset input
            e.target.value = ''
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

    // Watermark: render text on canvas overlay for posting
    const applyWatermarkToImage = useCallback(async (imageUrl: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = img.naturalWidth
                canvas.height = img.naturalHeight
                const ctx = canvas.getContext('2d')
                if (!ctx) { resolve(imageUrl); return }

                ctx.drawImage(img, 0, 0)

                // Draw strip at bottom
                const stripHeight = Math.max(40, img.naturalHeight * 0.06)
                ctx.fillStyle = watermarkColor
                ctx.fillRect(0, img.naturalHeight - stripHeight, img.naturalWidth, stripHeight)

                // Draw text
                const fontSize = Math.max(16, stripHeight * 0.55)
                ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
                ctx.fillStyle = '#FFFFFF'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(watermarkText, img.naturalWidth / 2, img.naturalHeight - stripHeight / 2)

                resolve(canvas.toDataURL('image/jpeg', 0.95))
            }
            img.onerror = () => resolve(imageUrl)
            img.src = imageUrl
        })
    }, [watermarkText, watermarkColor])

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault()

        const validUrls = postType === 'story' 
            ? [validImages[previewIndex]].filter(url => url && url.trim() !== '')
            : imageUrls.filter(url => url.trim() !== '')

        if (validUrls.length === 0) {
            setError('En az bir görsel URL gereklidir')
            return
        }

        setError(null)
        setSuccess(null)

        // If watermark is enabled, apply it and upload watermarked images
        let finalUrls = validUrls
        if (watermarkEnabled && watermarkText) {
            setLoading(true)
            try {
                finalUrls = await Promise.all(validUrls.map(async (url) => {
                    // Apply watermark on canvas → returns base64 data URL
                    const watermarkedDataUrl = await applyWatermarkToImage(url)

                    // If watermark failed (returned original URL), skip upload
                    if (watermarkedDataUrl === url) return url

                    // Convert base64 data URL to Blob
                    const res = await fetch(watermarkedDataUrl)
                    const blob = await res.blob()

                    // Upload to Supabase Storage via existing API
                    const formData = new FormData()
                    formData.append('file', blob, `watermarked-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`)

                    const uploadRes = await fetch('/api/upload-image', {
                        method: 'POST',
                        body: formData,
                    })
                    const uploadData = await uploadRes.json()

                    if (!uploadRes.ok) {
                        throw new Error(uploadData.error || 'Watermark görsel yüklenemedi')
                    }

                    return uploadData.publicUrl
                }))
            } catch (err: any) {
                setError('Watermark uygulanırken hata: ' + (err.message || 'Bilinmeyen hata'))
                setLoading(false)
                return
            }
            setLoading(false)
        }

        // Combine caption + hashtags
        const fullCaption = `${caption.trim()}\n\n${hashtags.trim()}`.trim()

        // Add to background queue instead of posting directly
        addToQueue({
            id: crypto.randomUUID(),
            type: 'instagram',
            productName: selectedProduct?.urun_ismi || 'Manuel Post',
            imageUrls: finalUrls,
            caption: postType === 'story' ? '' : (fullCaption || ''),
            locationId: locationId || undefined,
            postType,
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

    const handleSchedulePost = async () => {
        const validUrls = postType === 'story' 
            ? [validImages[previewIndex]].filter(url => url && url.trim() !== '')
            : imageUrls.filter(url => url.trim() !== '')

        if (validUrls.length === 0) {
            setError('En az bir görsel URL gereklidir')
            return
        }

        if (!scheduleDate || !scheduleTime) {
            setError('Lütfen tarih ve saat seçin')
            return
        }

        const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`)
        if (scheduledAt <= new Date()) {
            setError('Planlama zamanı gelecekte olmalıdır')
            return
        }

        setError(null)
        setSchedulingPost(true)

        // If watermark is enabled, apply it and upload watermarked images
        let finalUrls = validUrls
        if (watermarkEnabled && watermarkText) {
            try {
                finalUrls = await Promise.all(validUrls.map(async (url) => {
                    const watermarkedDataUrl = await applyWatermarkToImage(url)
                    if (watermarkedDataUrl === url) return url
                    const res = await fetch(watermarkedDataUrl)
                    const blob = await res.blob()
                    const formData = new FormData()
                    formData.append('file', blob, `watermarked-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`)
                    const uploadRes = await fetch('/api/upload-image', { method: 'POST', body: formData })
                    const uploadData = await uploadRes.json()
                    if (!uploadRes.ok) throw new Error(uploadData.error || 'Watermark görsel yüklenemedi')
                    return uploadData.publicUrl
                }))
            } catch (err: any) {
                setError('Watermark uygulanırken hata: ' + (err.message || 'Bilinmeyen hata'))
                setSchedulingPost(false)
                return
            }
        }

        const fullCaption = `${caption.trim()}\n\n${hashtags.trim()}`.trim()

        try {
            const res = await fetch('/api/instagram/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrls: finalUrls,
                    caption: postType === 'story' ? '' : (fullCaption || ''),
                    locationId: locationId || undefined,
                    postType,
                    productId: selectedProduct?.id,
                    urunGrupId: selectedProduct?.urun_grup_id,
                    urunIsmi: selectedProduct?.urun_ismi,
                    productName: selectedProduct?.urun_ismi || 'Manuel Post',
                    scheduledAt: scheduledAt.toISOString(),
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Planlama başarısız')

            if (selectedProduct) addSentItem(selectedProduct.id)

            setSuccess(data.message || 'Post planlandı!')
            setShowScheduler(false)
            setScheduleDate('')
            setScheduleTime('')
            setSelectedProduct(null)
            setImageUrls([''])
            setCaption('')
            setPreviewIndex(0)
            loadScheduledPosts()
        } catch (err: any) {
            setError(err.message || 'Planlama sırasında hata oluştu')
        } finally {
            setSchedulingPost(false)
        }
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

    // Carousel scroll helpers
    const scrollCarousel = (direction: 'left' | 'right') => {
        if (carouselRef.current) {
            const scrollAmount = 220
            carouselRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            })
        }
    }

    return (
        <div className="min-h-screen bg-stone-50">
            <div className="w-full max-w-full px-6 py-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Instagram className="w-6 h-6 text-slate-700" />
                        <h1 className="text-2xl font-semibold text-slate-900">Instagram Post</h1>
                    </div>

                    {/* Grid Editor Toggle */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setGridEditorEnabled(!gridEditorEnabled)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${gridEditorEnabled
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'text-slate-500 border border-slate-200 hover:bg-white'
                                }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Grid
                            <div className={`w-8 h-4.5 rounded-full transition-all relative ${gridEditorEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}>
                                <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-all ${gridEditorEnabled ? 'left-[16px]' : 'left-0.5'
                                    }`} />
                            </div>
                        </button>

                        {gridEditorEnabled && selectedProduct && (
                            <button
                                onClick={() => {
                                    const images = parseProductImages(selectedProduct)
                                    setGridEditorImages(images)
                                    setGridEditorOpen(true)
                                }}
                                className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                            >
                                Editörü Aç
                            </button>
                        )}
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-6 flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-emerald-700">{success}</p>
                    </div>
                )}

                {/* ====== PRODUCTS SECTION (top, collapsible) ====== */}
                <div className="mb-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div
                        onClick={() => setProductsExpanded(!productsExpanded)}
                        role="button"
                        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-stone-50 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-2.5">
                            <Package className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-semibold text-slate-800">Ürünler</span>
                            <span className="text-xs text-slate-400">({filteredProducts.length})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Hide sent toggle */}
                            <div
                                onClick={(e) => { e.stopPropagation(); setHideSent(!hideSent) }}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${hideSent ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {hideSent ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                {hideSent ? 'Gizli' : 'Gönderilenleri gizle'}
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); loadGroupedProductsCache(true); loadSentItemsCache(true); }}
                                disabled={loadingProducts}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loadingProducts ? 'animate-spin' : ''}`} />
                            </button>

                            {productsExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                    </div>

                    {productsExpanded && (
                        <div className="px-5 py-4 border-t border-slate-100">
                            {/* Info: Where products come from */}
                            <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
                                <span>Ürünler Telegram Bot sayfasından yüklenir.</span>
                                <Link href="/dashboard/telegram-bot" className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                                    Ürün Yükle <ExternalLink className="w-3 h-3" />
                                </Link>
                            </div>

                            {/* Search */}
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Ürün ara..."
                                className="w-full px-3 py-2 bg-stone-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 text-sm mb-3"
                            />

                            {/* Horizontal Carousel */}
                            <div className="relative">
                                {filteredProducts.length > 4 && (
                                    <>
                                        <button
                                            onClick={() => scrollCarousel('left')}
                                            className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-emerald-50 transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                                        </button>
                                        <button
                                            onClick={() => scrollCarousel('right')}
                                            className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-emerald-50 transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4 text-slate-600" />
                                        </button>
                                    </>
                                )}

                                <div
                                    ref={carouselRef}
                                    className="flex gap-3 overflow-x-auto pb-2"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    {filteredProducts.map((product) => {
                                        const productImage = getProductImage(product)
                                        const isSent = sentItems.has(product.id)
                                        const isSelected = selectedProduct?.id === product.id
                                        return (
                                            <button
                                                key={product.id}
                                                onClick={() => handleProductSelect(product)}
                                                className={`flex-shrink-0 w-[180px] text-left rounded-lg border transition-all relative group ${isSelected
                                                    ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/30'
                                                    : isSent
                                                        ? 'border-slate-200 bg-stone-50 opacity-60 hover:opacity-100'
                                                        : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm'
                                                    }`}
                                            >
                                                {/* Product Image */}
                                                {productImage ? (
                                                    <div className="relative">
                                                        <img
                                                            src={productImage}
                                                            alt={product.urun_ismi}
                                                            className="w-full h-28 object-cover rounded-t-lg"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none'
                                                            }}
                                                        />
                                                        {isSent && (
                                                            <div className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                                                                Gönderildi
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-28 bg-stone-100 rounded-t-lg flex items-center justify-center relative">
                                                        <ImageIcon className="w-6 h-6 text-slate-300" />
                                                        {isSent && (
                                                            <div className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                                                                Gönderildi
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Product Info */}
                                                <div className="p-2.5">
                                                    <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-tight">{product.urun_ismi}</p>
                                                    {product.stok_kodu && (
                                                        <p className="text-[10px] text-slate-400 mt-1">{product.stok_kodu}</p>
                                                    )}
                                                </div>
                                            </button>
                                        )
                                    })}

                                    {filteredProducts.length === 0 && (
                                        <div className="w-full py-8 text-center text-sm text-slate-400">
                                            {loadingProducts ? 'Yükleniyor...' : 'Ürün bulunamadı'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ====== POST FORM ====== */}
                <form onSubmit={handlePost} className="space-y-6">

                    {/* Mode Selection Tabs */}
                    <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex shadow-sm">
                        <button
                            type="button"
                            onClick={() => setPostType('post')}
                            className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all ${
                                postType === 'post' 
                                    ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100' 
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-stone-50 border border-transparent'
                            }`}
                        >
                            Gönderi (Post)
                        </button>
                        <button
                            type="button"
                            onClick={() => setPostType('story')}
                            className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all ${
                                postType === 'story' 
                                    ? 'bg-violet-50 text-violet-700 shadow-sm border border-violet-100' 
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-stone-50 border border-transparent'
                            }`}
                        >
                            Hikaye (Story)
                        </button>
                    </div>

                    {/* ====== WATERMARK SETTINGS ====== */}
                    {validImageCount > 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Paintbrush className="w-4 h-4 text-emerald-600" />
                                    <span className="text-sm font-semibold text-slate-800">Watermark</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                                    className={`w-9 h-5 rounded-full transition-all relative ${watermarkEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${watermarkEnabled ? 'left-[18px]' : 'left-0.5'}`} />
                                </button>
                            </div>

                            {watermarkEnabled && (
                                <div className="mt-3 space-y-3">
                                    <input
                                        type="text"
                                        value={watermarkText}
                                        onChange={(e) => setWatermarkText(e.target.value)}
                                        placeholder="Watermark yazısı..."
                                        className="w-full px-3 py-2 bg-stone-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 text-sm"
                                    />
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">Şerit rengi:</span>
                                        <div className="flex gap-1.5">
                                            {WATERMARK_COLORS.map((c) => (
                                                <button
                                                    type="button"
                                                    key={c.value}
                                                    onClick={() => setWatermarkColor(c.value)}
                                                    className={`w-6 h-6 rounded-full border-2 transition-all ${watermarkColor === c.value ? 'border-emerald-500 scale-110' : 'border-slate-200'}`}
                                                    style={{ backgroundColor: c.value }}
                                                    title={c.label}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ====== INSTAGRAM PREVIEW (middle) ====== */}
                    {validImageCount > 0 && (
                        <div className="flex flex-col items-center">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3 self-start">
                                Önizleme
                            </p>

                            {/* Instagram Post Card — minimal */}
                            <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg overflow-hidden">
                                {/* Post Header */}
                                <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-100">
                                    <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center">
                                        <Instagram className="w-3.5 h-3.5 text-emerald-600" />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-700">Mağazanız</p>
                                </div>

                                {/* Carousel Images */}
                                <div className={`relative bg-stone-100 ${postType === 'story' ? 'aspect-[9/16]' : 'aspect-square'}`}>
                                    <img
                                        src={validImages[previewIndex]}
                                        alt={`Preview ${previewIndex + 1}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x400?text=Görsel+Yüklenemedi'
                                        }}
                                    />

                                    {/* Watermark overlay on preview */}
                                    {watermarkEnabled && watermarkText && (
                                        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center py-2"
                                            style={{ backgroundColor: watermarkColor }}>
                                            <span className="text-white text-xs font-semibold tracking-wide">{watermarkText}</span>
                                        </div>
                                    )}

                                    {/* Carousel Controls */}
                                    {validImageCount > 1 && (
                                        <>
                                            {previewIndex > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewIndex(previewIndex - 1)}
                                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </button>
                                            )}
                                            {previewIndex < validImageCount - 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewIndex(previewIndex + 1)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            )}

                                            {/* Dots Indicator */}
                                            <div className={`absolute ${watermarkEnabled && watermarkText ? 'bottom-10' : 'bottom-2.5'} left-1/2 -translate-x-1/2 flex gap-1`}>
                                                {validImages.map((_, index) => (
                                                    <div
                                                        key={index}
                                                        className={`w-1.5 h-1.5 rounded-full transition-all ${index === previewIndex ? 'bg-white' : 'bg-white/40'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Post Footer */}
                                {postType === 'post' && (
                                    <div className="px-3 py-2.5">
                                        {(caption || hashtags) && (
                                            <p className="text-xs text-slate-700 whitespace-pre-wrap line-clamp-3">
                                                <span className="font-semibold">Mağazanız</span> {caption.trim()}{hashtags ? `\n\n${hashtags}` : ''}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ====== IMAGE URLS (collapsible card) ====== */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setImageUrlsCardExpanded(!imageUrlsCardExpanded)}
                            className="w-full flex items-center justify-between px-5 py-3 hover:bg-stone-50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm font-semibold text-slate-800">Görsel URL&apos;leri</span>
                                <span className="text-xs text-slate-400">{validImageCount}/10</span>
                            </div>
                            {imageUrlsCardExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </button>

                        {imageUrlsCardExpanded && (
                            <div className="px-5 py-4 space-y-3 border-t border-slate-100">
                                {/* Upload manual image */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex-1 h-px bg-slate-100"></div>
                                    <div className="relative">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={handleImageUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            title="Bilgisayardan görsel seç"
                                        />
                                        <button type="button" className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 bg-violet-50 px-3 py-1.5 rounded-full border border-violet-100 hover:bg-violet-100 transition-colors">
                                            <Plus className="w-3.5 h-3.5" />
                                            Cihazdan Yükle
                                        </button>
                                    </div>
                                    <div className="flex-1 h-px bg-slate-100"></div>
                                </div>

                                {postType === 'story' && (
                                    <div className="bg-blue-50 text-blue-700 p-2 text-xs rounded border border-blue-100 mb-2">
                                        Story modunda sadece <b>Önizleme</b> ekranında gördüğünüz görsel (1 adet) gönderilecektir. Görseller arasında geçiş yaparak göndermek istediğiniz görseli seçebilirsiniz.
                                    </div>
                                )}

                                {/* First URL always visible */}
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={imageUrls[0] || ''}
                                        onChange={(e) => updateImageUrl(0, e.target.value)}
                                        placeholder="Görsel 1 URL"
                                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 text-sm"
                                    />
                                    {imageUrls.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeImageUrl(0)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Additional URLs - Collapsible */}
                                {imageUrls.length > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setUrlsExpanded(!urlsExpanded)}
                                            className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium w-full"
                                        >
                                            {urlsExpanded ? (
                                                <ChevronUp className="w-3 h-3" />
                                            ) : (
                                                <ChevronDown className="w-3 h-3" />
                                            )}
                                            {urlsExpanded ? 'Gizle' : `${imageUrls.length - 1} görsel daha`}
                                        </button>

                                        {urlsExpanded && (
                                            <div className="space-y-2">
                                                {imageUrls.slice(1).map((url, i) => {
                                                    const index = i + 1
                                                    return (
                                                        <div key={index} className="flex gap-2">
                                                            <input
                                                                type="url"
                                                                value={url}
                                                                onChange={(e) => updateImageUrl(index, e.target.value)}
                                                                placeholder={`Görsel ${index + 1} URL`}
                                                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 text-sm"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeImageUrl(index)}
                                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}

                                {imageUrls.length < 10 && (
                                    <button
                                        type="button"
                                        onClick={addImageUrl}
                                        className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Görsel Ekle
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ====== CAPTION & HASHTAGS (collapsible card) ====== */}
                    {postType === 'post' && (
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                            <button
                            type="button"
                            onClick={() => setCaptionExpanded(!captionExpanded)}
                            className="w-full flex items-center justify-between px-5 py-3 hover:bg-stone-50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Hash className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm font-semibold text-slate-800">Açıklama &amp; Hashtag</span>
                            </div>
                            {captionExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </button>

                        {captionExpanded && (
                            <div className="px-5 py-4 space-y-4 border-t border-slate-100">
                                {/* Caption */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Açıklama</label>
                                    <textarea
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        placeholder="Ürün açıklaması..."
                                        rows={4}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 text-sm resize-none"
                                    />
                                </div>

                                {/* Hashtags */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Hashtag&apos;ler</label>
                                    <input
                                        type="text"
                                        value={hashtags}
                                        onChange={(e) => setHashtags(e.target.value)}
                                        placeholder="#yeniürün #kampanya #indirim"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 text-sm"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Açıklamanın altına eklenir</p>
                                </div>
                            </div>
                        )}
                    </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        {/* Instant Send */}
                        <button
                            type="submit"
                            disabled={loading || validImageCount === 0 || (isProcessing && queue.length > 3)}
                            className="flex-1 flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3.5 px-6 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Gönderiliyor...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    <span>Kuyruğa Ekle{isProcessing ? ` (${queue.length + 1} kuyrukta)` : ''}</span>
                                </>
                            )}
                        </button>

                        {/* Schedule Button */}
                        <div className="relative" ref={schedulerRef}>
                            <button
                                type="button"
                                disabled={loading || validImageCount === 0}
                                onClick={() => setShowScheduler(!showScheduler)}
                                className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium py-3.5 px-5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Clock className="w-4 h-4" />
                                <span>Planla</span>
                            </button>

                            {/* Scheduling Popover */}
                            {showScheduler && (
                                <div className="absolute bottom-full right-0 mb-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Calendar className="w-4 h-4 text-violet-600" />
                                        <span className="text-sm font-semibold text-slate-800">Gönderim Planla</span>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Tarih</label>
                                            <input
                                                type="date"
                                                value={scheduleDate}
                                                onChange={(e) => setScheduleDate(e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Saat</label>
                                            <input
                                                type="time"
                                                value={scheduleTime}
                                                onChange={(e) => setScheduleTime(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400 text-sm"
                                            />
                                        </div>

                                        {scheduleDate && scheduleTime && (
                                            <p className="text-xs text-violet-600 font-medium">
                                                📅 {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('tr-TR', {
                                                    day: 'numeric', month: 'long', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        )}

                                        <button
                                            type="button"
                                            disabled={!scheduleDate || !scheduleTime || schedulingPost}
                                            onClick={handleSchedulePost}
                                            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                                        >
                                            {schedulingPost ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    <span>Planlanıyor...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>Planla</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </form>

                {/* ====== SCHEDULED POSTS LIST ====== */}
                {(scheduledPosts.length > 0 || loadingScheduledPosts) && (
                    <div className="mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <Clock className="w-4 h-4 text-violet-600" />
                                <span className="text-sm font-semibold text-slate-800">Planlanan Gönderiler</span>
                                <span className="text-xs text-slate-400">({scheduledPosts.length})</span>
                            </div>
                            <button
                                onClick={loadScheduledPosts}
                                disabled={loadingScheduledPosts}
                                className="p-1.5 text-slate-400 hover:text-violet-600 rounded-md hover:bg-violet-50 transition-colors"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loadingScheduledPosts ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="divide-y divide-slate-50">
                            {scheduledPosts.map((post) => (
                                <div key={post.id} className="px-5 py-3 flex items-center justify-between group hover:bg-stone-50 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        {/* Thumbnail */}
                                        {post.image_urls && post.image_urls[0] && (
                                            <img
                                                src={post.image_urls[0]}
                                                alt=""
                                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-100"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                            />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-800 truncate">{post.product_name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Calendar className="w-3 h-3 text-violet-500" />
                                                <p className="text-xs text-violet-600 font-medium">
                                                    {new Date(post.scheduled_at).toLocaleString('tr-TR', {
                                                        day: 'numeric', month: 'short',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </p>
                                                <span className="text-xs text-slate-300">•</span>
                                                <span className="text-xs text-slate-400">
                                                    {(post.image_urls as string[])?.length || 0} görsel
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => cancelScheduledPost(post.id)}
                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                        title="İptal et"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Grid Editor Modal */}
                <GridEditorModal
                    isOpen={gridEditorOpen}
                    onClose={() => setGridEditorOpen(false)}
                    productImages={gridEditorImages}
                    productName={selectedProduct?.urun_ismi || ''}
                    onImageReady={handleGridImageReady}
                />
            </div>
        </div>
    )
}
