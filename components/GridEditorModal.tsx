'use client'

import React, { useState, useRef, useCallback, useEffect, memo } from 'react'
import { LayoutGrid, Type, Download, X, RotateCcw, Loader2, Send, Palette, GripVertical } from 'lucide-react'

/* ───── Types ───── */

interface PhotoItem {
    id: string
    src: string
    name: string
    offsetX: number
    offsetY: number
}

interface TextOverlay {
    text: string
    fontSize: number
    color: string
    fontFamily: string
    hasShadow: boolean
    x: number
    y: number
    bgColor: string
    bgOpacity: number
}

interface BorderSettings {
    color: string
    width: number
    radius: number
}

type GridLayout = '2-horizontal' | '2-vertical' | '4-grid'

interface GridEditorModalProps {
    isOpen: boolean
    onClose: () => void
    productImages: string[]
    productName: string
    onImageReady: (publicUrl: string) => void
}

/* ───── Constants ───── */

const GRID_LAYOUTS: { id: GridLayout; label: string; desc: string; count: number }[] = [
    { id: '2-horizontal', label: '▬▬', desc: '2 Yatay', count: 2 },
    { id: '2-vertical', label: '▮▮', desc: '2 Dikey', count: 2 },
    { id: '4-grid', label: '⊞', desc: '4 Grid', count: 4 },
]

const FONT_FAMILIES = ['Arial', 'Georgia', 'Impact', 'Verdana', 'Courier New']

const BORDER_COLORS = [
    '#FFFFFF', '#000000', '#1a1a2e', '#FF3B30', '#FF9500',
    '#FFCC00', '#34C759', '#007AFF', '#AF52DE', '#FF2D55',
]

const TEXT_COLORS = [
    '#FFFFFF', '#000000', '#FF3B30', '#FF9500', '#FFCC00',
    '#34C759', '#007AFF', '#AF52DE', '#FF2D55', '#5856D6',
]

/* ───── Helpers ───── */

function getCells(layout: GridLayout, size: number, gap: number) {
    const cells: { x: number; y: number; w: number; h: number }[] = []
    if (layout === '2-horizontal') {
        const ch = (size - gap) / 2
        cells.push({ x: gap / 2, y: gap / 2, w: size - gap, h: ch - gap / 2 })
        cells.push({ x: gap / 2, y: ch + gap / 2, w: size - gap, h: ch - gap / 2 })
    } else if (layout === '2-vertical') {
        const cw = (size - gap) / 2
        cells.push({ x: gap / 2, y: gap / 2, w: cw - gap / 2, h: size - gap })
        cells.push({ x: cw + gap / 2, y: gap / 2, w: cw - gap / 2, h: size - gap })
    } else {
        const cw = (size - gap) / 2, ch = (size - gap) / 2
        cells.push({ x: gap / 2, y: gap / 2, w: cw - gap / 2, h: ch - gap / 2 })
        cells.push({ x: cw + gap / 2, y: gap / 2, w: cw - gap / 2, h: ch - gap / 2 })
        cells.push({ x: gap / 2, y: ch + gap / 2, w: cw - gap / 2, h: ch - gap / 2 })
        cells.push({ x: cw + gap / 2, y: ch + gap / 2, w: cw - gap / 2, h: ch - gap / 2 })
    }
    return cells
}

/* ───── Component ───── */

const GridEditorModal = memo(function GridEditorModal({
    isOpen, onClose, productImages, productName, onImageReady,
}: GridEditorModalProps) {
    /* State */
    const [photos, setPhotos] = useState<PhotoItem[]>([])
    const [allPhotos, setAllPhotos] = useState<PhotoItem[]>([]) // ALL available images
    const [gridLayout, setGridLayout] = useState<GridLayout>('4-grid')
    const [border, setBorder] = useState<BorderSettings>({ color: '#FFFFFF', width: 8, radius: 0 })
    const [textOverlay, setTextOverlay] = useState<TextOverlay>({
        text: '', fontSize: 48, color: '#FFFFFF', fontFamily: 'Arial',
        hasShadow: true, x: 0.5, y: 0.85, bgColor: '#000000', bgOpacity: 0,
    })
    const [addTextCell, setAddTextCell] = useState(false)
    const [showTextPanel, setShowTextPanel] = useState(false)
    const [showBorderPanel, setShowBorderPanel] = useState(false)

    const [isUploading, setIsUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({})

    // Drag from image list to cell
    const [dragSourcePhoto, setDragSourcePhoto] = useState<PhotoItem | null>(null)
    const [dragOverCell, setDragOverCell] = useState<number | null>(null)

    // Pan state
    const [isPanning, setIsPanning] = useState(false)
    const [panCellIdx, setPanCellIdx] = useState<number | null>(null)
    const lastPanPos = useRef({ x: 0, y: 0 })

    /* Refs */
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const rafRef = useRef<number>(0)

    const maxPhotos = GRID_LAYOUTS.find(l => l.id === gridLayout)?.count || 4

    /* ───── Init ───── */
    useEffect(() => {
        if (isOpen && productImages.length > 0) {
            const items: PhotoItem[] = productImages.map((url, i) => ({
                id: `img-${Date.now()}-${i}`, src: url, name: `Görsel ${i + 1}`,
                offsetX: 0, offsetY: 0,
            }))
            setAllPhotos(items)
            // Only put the first N into the grid
            const layout = productImages.length <= 2 ? '2-horizontal' : '4-grid'
            const count = layout === '4-grid' ? 4 : 2
            setPhotos(items.slice(0, count))
            setGridLayout(layout)
        }
    }, [isOpen, productImages])

    useEffect(() => {
        if (!isOpen) {
            setPhotos([])
            setAllPhotos([])
            setTextOverlay({
                text: '', fontSize: 48, color: '#FFFFFF', fontFamily: 'Arial',
                hasShadow: true, x: 0.5, y: 0.85, bgColor: '#000000', bgOpacity: 0
            })
            setBorder({ color: '#FFFFFF', width: 8, radius: 0 })
            setShowTextPanel(false)
            setShowBorderPanel(false)
            setAddTextCell(false)
            setLoadedImages({})
            setUploadError(null)
            setDragSourcePhoto(null)
            setDragOverCell(null)
        }
    }, [isOpen])

    /* ───── Load images ───── */
    useEffect(() => {
        // Load ALL photos (allPhotos), not just grid photos
        const allToLoad = [...allPhotos]
        if (allToLoad.length === 0) { setLoadedImages({}); return }
        const newLoaded: Record<string, HTMLImageElement> = {}
        let loadCount = 0
        allToLoad.forEach(photo => {
            if (loadedImages[photo.id]?.src === photo.src) {
                newLoaded[photo.id] = loadedImages[photo.id]
                loadCount++
                if (loadCount === allToLoad.length) setLoadedImages(newLoaded)
                return
            }
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => { newLoaded[photo.id] = img; loadCount++; if (loadCount === allToLoad.length) setLoadedImages({ ...newLoaded }) }
            img.onerror = () => { loadCount++; if (loadCount === allToLoad.length) setLoadedImages({ ...newLoaded }) }
            img.src = photo.src
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allPhotos.map(p => p.src).join(',')])

    /* ───── Draw Canvas ───── */
    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const size = 1080
        canvas.width = size
        canvas.height = size

        const gap = border.width
        const r = border.radius

        ctx.fillStyle = border.color
        ctx.fillRect(0, 0, size, size)

        const cells = getCells(gridLayout, size, gap)
        const activePhotos = photos.slice(0, maxPhotos)

        const roundRect = (x: number, y: number, w: number, h: number, rad: number) => {
            ctx.beginPath()
            ctx.moveTo(x + rad, y)
            ctx.lineTo(x + w - rad, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rad)
            ctx.lineTo(x + w, y + h - rad); ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h)
            ctx.lineTo(x + rad, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rad)
            ctx.lineTo(x, y + rad); ctx.quadraticCurveTo(x, y, x + rad, y)
            ctx.closePath()
        }

        cells.forEach((cell, i) => {
            const photo = activePhotos[i]
            const img = photo ? loadedImages[photo.id] : null

            if (img) {
                const imgR = img.naturalWidth / img.naturalHeight
                const cellR = cell.w / cell.h
                let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight
                if (imgR > cellR) {
                    sw = img.naturalHeight * cellR
                    sx = (img.naturalWidth - sw) / 2
                } else {
                    sh = img.naturalWidth / cellR
                    sy = (img.naturalHeight - sh) / 2
                }

                const maxOffX = (img.naturalWidth - sw) / 2
                const maxOffY = (img.naturalHeight - sh) / 2
                sx += photo.offsetX * maxOffX
                sy += photo.offsetY * maxOffY
                sx = Math.max(0, Math.min(sx, img.naturalWidth - sw))
                sy = Math.max(0, Math.min(sy, img.naturalHeight - sh))

                ctx.save()
                roundRect(cell.x, cell.y, cell.w, cell.h, r)
                ctx.clip()
                ctx.drawImage(img, sx, sy, sw, sh, cell.x, cell.y, cell.w, cell.h)

                // Highlight drop target
                if (dragOverCell === i) {
                    ctx.fillStyle = 'rgba(16, 185, 129, 0.3)'
                    ctx.fillRect(cell.x, cell.y, cell.w, cell.h)
                    ctx.strokeStyle = '#10b981'
                    ctx.lineWidth = 6
                    ctx.strokeRect(cell.x + 3, cell.y + 3, cell.w - 6, cell.h - 6)
                }
                ctx.restore()
            } else if (addTextCell && i === cells.length - 1 && !photo) {
                ctx.save()
                roundRect(cell.x, cell.y, cell.w, cell.h, r)
                ctx.clip()
                ctx.fillStyle = textOverlay.bgOpacity > 0
                    ? `rgba(${parseInt(textOverlay.bgColor.slice(1, 3), 16)},${parseInt(textOverlay.bgColor.slice(3, 5), 16)},${parseInt(textOverlay.bgColor.slice(5, 7), 16)},${textOverlay.bgOpacity})`
                    : '#1a1a2e'
                ctx.fillRect(cell.x, cell.y, cell.w, cell.h)
                ctx.restore()

                if (textOverlay.text.trim()) {
                    drawTextInCell(ctx, textOverlay, cell)
                } else {
                    ctx.save()
                    ctx.fillStyle = 'rgba(255,255,255,0.2)'
                    ctx.font = '24px Arial'
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    ctx.fillText('Yazı Alanı', cell.x + cell.w / 2, cell.y + cell.h / 2)
                    ctx.restore()
                }
            } else {
                ctx.save()
                roundRect(cell.x, cell.y, cell.w, cell.h, r)
                ctx.clip()
                ctx.fillStyle = 'rgba(26,26,46,0.8)'
                ctx.fillRect(cell.x, cell.y, cell.w, cell.h)

                // Highlight drop target on empty cell
                if (dragOverCell === i) {
                    ctx.fillStyle = 'rgba(16, 185, 129, 0.3)'
                    ctx.fillRect(cell.x, cell.y, cell.w, cell.h)
                    ctx.strokeStyle = '#10b981'
                    ctx.lineWidth = 6
                    ctx.strokeRect(cell.x + 3, cell.y + 3, cell.w - 6, cell.h - 6)
                }

                ctx.restore()
                ctx.fillStyle = 'rgba(255,255,255,0.2)'
                ctx.font = '24px Arial'
                ctx.textAlign = 'center'
                ctx.fillText(`${i + 1}`, cell.x + cell.w / 2, cell.y + cell.h / 2 + 8)
            }
        })

        // Free-floating text
        if (!addTextCell && textOverlay.text.trim()) {
            ctx.save()
            ctx.font = `bold ${textOverlay.fontSize}px ${textOverlay.fontFamily}`
            ctx.fillStyle = textOverlay.color
            ctx.textAlign = 'center'

            if (textOverlay.hasShadow) {
                ctx.shadowColor = 'rgba(0,0,0,0.7)'
                ctx.shadowBlur = 12
                ctx.shadowOffsetX = 2
                ctx.shadowOffsetY = 2
            }

            const tx = textOverlay.x * size
            const ty = textOverlay.y * size

            const words = textOverlay.text.split(' ')
            const lines: string[] = []
            let cur = ''
            words.forEach(w => {
                const test = cur ? `${cur} ${w}` : w
                if (ctx.measureText(test).width > size * 0.85 && cur) { lines.push(cur); cur = w }
                else cur = test
            })
            if (cur) lines.push(cur)

            const lh = textOverlay.fontSize * 1.3
            const th = lines.length * lh

            if (textOverlay.bgOpacity > 0) {
                const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width))
                ctx.save()
                ctx.shadowColor = 'transparent'
                ctx.fillStyle = `rgba(${parseInt(textOverlay.bgColor.slice(1, 3), 16)},${parseInt(textOverlay.bgColor.slice(3, 5), 16)},${parseInt(textOverlay.bgColor.slice(5, 7), 16)},${textOverlay.bgOpacity})`
                roundRect(tx - maxWidth / 2 - 20, ty - th / 2 - 10, maxWidth + 40, th + 20, 12)
                ctx.fill()
                ctx.restore()
            }

            lines.forEach((line, i) => ctx.fillText(line, tx, ty - th / 2 + textOverlay.fontSize + i * lh))
            ctx.restore()
        }
    }, [photos, gridLayout, textOverlay, loadedImages, maxPhotos, border, dragOverCell, addTextCell])

    function drawTextInCell(ctx: CanvasRenderingContext2D, text: TextOverlay, cell: { x: number; y: number; w: number; h: number }) {
        ctx.save()
        ctx.font = `bold ${text.fontSize}px ${text.fontFamily}`
        ctx.fillStyle = text.color
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        if (text.hasShadow) {
            ctx.shadowColor = 'rgba(0,0,0,0.7)'
            ctx.shadowBlur = 12
            ctx.shadowOffsetX = 2
            ctx.shadowOffsetY = 2
        }

        const tx = cell.x + text.x * cell.w
        const ty = cell.y + text.y * cell.h

        const words = text.text.split(' ')
        const lines: string[] = []
        let cur = ''
        words.forEach(w => {
            const test = cur ? `${cur} ${w}` : w
            if (ctx.measureText(test).width > cell.w * 0.85 && cur) { lines.push(cur); cur = w }
            else cur = test
        })
        if (cur) lines.push(cur)

        const lh = text.fontSize * 1.3
        const th = lines.length * lh
        lines.forEach((line, i) => ctx.fillText(line, tx, ty - th / 2 + text.fontSize / 2 + i * lh))
        ctx.restore()
    }

    // Redraw with rAF
    useEffect(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(drawCanvas)
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    }, [drawCanvas])

    /* ───── Canvas interaction: pan images within cells ───── */
    const getCanvasCoords = useCallback((e: React.MouseEvent) => {
        const canvas = canvasRef.current
        const wrapper = wrapperRef.current
        if (!canvas || !wrapper) return { cx: 0, cy: 0 }
        const rect = wrapper.getBoundingClientRect()
        const scale = 1080 / rect.width
        return { cx: (e.clientX - rect.left) * scale, cy: (e.clientY - rect.top) * scale }
    }, [])

    const findCell = useCallback((cx: number, cy: number) => {
        const cells = getCells(gridLayout, 1080, border.width)
        return cells.findIndex(c => cx >= c.x && cx <= c.x + c.w && cy >= c.y && cy <= c.y + c.h)
    }, [gridLayout, border.width])

    // Pan: mouse down on canvas starts panning the image in that cell
    const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
        const { cx, cy } = getCanvasCoords(e)
        const cellIdx = findCell(cx, cy)
        if (cellIdx === -1 || cellIdx >= photos.length) return

        setIsPanning(true)
        setPanCellIdx(cellIdx)
        lastPanPos.current = { x: cx, y: cy }
    }, [getCanvasCoords, findCell, photos.length])

    const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanning || panCellIdx === null) return
        const { cx, cy } = getCanvasCoords(e)
        const dx = cx - lastPanPos.current.x
        const dy = cy - lastPanPos.current.y

        setPhotos(prev => {
            const list = [...prev]
            const photo = list[panCellIdx]
            if (!photo) return prev
            const sensitivity = 0.003
            list[panCellIdx] = {
                ...photo,
                offsetX: Math.max(-1, Math.min(1, photo.offsetX + dx * sensitivity)),
                offsetY: Math.max(-1, Math.min(1, photo.offsetY + dy * sensitivity)),
            }
            return list
        })

        lastPanPos.current = { x: cx, y: cy }
    }, [getCanvasCoords, isPanning, panCellIdx])

    const handleCanvasMouseUp = useCallback(() => {
        setIsPanning(false)
        setPanCellIdx(null)
    }, [])

    /* ───── Drag & Drop from image list to canvas cells ───── */
    const handleDragStart = useCallback((photo: PhotoItem) => {
        setDragSourcePhoto(photo)
    }, [])

    const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        const rect = wrapperRef.current?.getBoundingClientRect()
        if (!rect) return
        const scale = 1080 / rect.width
        const cx = (e.clientX - rect.left) * scale
        const cy = (e.clientY - rect.top) * scale
        const cellIdx = findCell(cx, cy)
        setDragOverCell(cellIdx >= 0 ? cellIdx : null)
    }, [findCell])

    const handleCanvasDragLeave = useCallback(() => {
        setDragOverCell(null)
    }, [])

    const handleCanvasDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOverCell(null)
        if (!dragSourcePhoto) return

        const rect = wrapperRef.current?.getBoundingClientRect()
        if (!rect) return
        const scale = 1080 / rect.width
        const cx = (e.clientX - rect.left) * scale
        const cy = (e.clientY - rect.top) * scale
        const cellIdx = findCell(cx, cy)
        if (cellIdx < 0 || cellIdx >= maxPhotos) return

        // Place the dragged photo into this cell slot
        setPhotos(prev => {
            const list = [...prev]
            // Ensure list is long enough
            while (list.length <= cellIdx) {
                list.push({ id: `empty-${Date.now()}-${list.length}`, src: '', name: '', offsetX: 0, offsetY: 0 })
            }
            // Place the photo (with reset offset)
            list[cellIdx] = { ...dragSourcePhoto, offsetX: 0, offsetY: 0 }
            return list
        })

        setDragSourcePhoto(null)
    }, [dragSourcePhoto, findCell, maxPhotos])

    /* ───── Actions ───── */
    const handleUseImage = useCallback(async () => {
        const canvas = canvasRef.current
        if (!canvas) return
        setIsUploading(true)
        setUploadError(null)
        try {
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas blob oluşturulamadı')), 'image/png')
            })
            const formData = new FormData()
            formData.append('file', blob, `grid-${Date.now()}.png`)
            const res = await fetch('/api/upload-image', { method: 'POST', body: formData })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Yükleme hatası')
            onImageReady(data.publicUrl)
            onClose()
        } catch (err: any) {
            setUploadError(err.message || 'Bilinmeyen hata')
        } finally {
            setIsUploading(false)
        }
    }, [onImageReady, onClose])

    const handleDownload = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const link = document.createElement('a')
        link.download = `grid-${Date.now()}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
    }, [])

    const resetEditor = useCallback(() => {
        const items: PhotoItem[] = productImages.map((url, i) => ({
            id: `img-${Date.now()}-${i}`, src: url, name: `Görsel ${i + 1}`,
            offsetX: 0, offsetY: 0,
        }))
        setAllPhotos(items)
        setPhotos(items.slice(0, maxPhotos))
        setTextOverlay({
            text: '', fontSize: 48, color: '#FFFFFF', fontFamily: 'Arial',
            hasShadow: true, x: 0.5, y: 0.85, bgColor: '#000000', bgOpacity: 0
        })
        setBorder({ color: '#FFFFFF', width: 8, radius: 0 })
        setShowTextPanel(false)
        setAddTextCell(false)
        setUploadError(null)
    }, [productImages, maxPhotos])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <LayoutGrid className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">Grid Editör</h2>
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">{productName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={resetEditor}
                            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-stone-50 transition-colors">
                            <RotateCcw className="w-3 h-3" /> Sıfırla
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-stone-50 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Body: responsive flex layout */}
                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
                    {/* Left: Image list (single column, scrollable) + controls */}
                    <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col overflow-hidden">
                        {/* Grid Layout Selector */}
                        <div className="px-4 pt-3 pb-2">
                            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Layout</h3>
                            <div className="grid grid-cols-3 gap-1.5">
                                {GRID_LAYOUTS.map(layout => (
                                    <button key={layout.id} onClick={() => {
                                        setGridLayout(layout.id)
                                        // Adjust photos array length when switching layout
                                        const newCount = layout.count
                                        setPhotos(prev => {
                                            if (prev.length > newCount) return prev.slice(0, newCount)
                                            return prev
                                        })
                                    }}
                                        className={`p-1.5 rounded-lg border-2 transition-all text-center ${gridLayout === layout.id
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                        <span className="text-sm block">{layout.label}</span>
                                        <span className="text-[9px] font-medium">{layout.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Collapsible: Border */}
                        <div className="px-4 py-2">
                            <button onClick={() => setShowBorderPanel(!showBorderPanel)}
                                className="w-full flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                <span className="flex items-center gap-1"><Palette className="w-3 h-3 text-emerald-500" />Çerçeve</span>
                                <span className={`transition-transform text-[9px] ${showBorderPanel ? 'rotate-180' : ''}`}>▼</span>
                            </button>
                            {showBorderPanel && (
                                <div className="mt-2 space-y-2">
                                    <div>
                                        <label className="text-[10px] text-slate-400">Kalınlık: {border.width}px</label>
                                        <input type="range" min="0" max="40" value={border.width}
                                            onChange={e => setBorder(p => ({ ...p, width: +e.target.value }))}
                                            className="w-full accent-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-400">Köşe: {border.radius}px</label>
                                        <input type="range" min="0" max="40" value={border.radius}
                                            onChange={e => setBorder(p => ({ ...p, radius: +e.target.value }))}
                                            className="w-full accent-emerald-500" />
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {BORDER_COLORS.map(c => (
                                            <button key={c} onClick={() => setBorder(p => ({ ...p, color: c }))}
                                                className={`w-5 h-5 rounded-full border-2 transition-all ${border.color === c ? 'border-emerald-500 scale-110' : 'border-slate-200'}`}
                                                style={{ backgroundColor: c }} />
                                        ))}
                                        <label className="w-5 h-5 rounded-full border-2 border-slate-200 overflow-hidden cursor-pointer relative"
                                            style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}>
                                            <input type="color" value={border.color}
                                                onChange={e => setBorder(p => ({ ...p, color: e.target.value }))}
                                                className="absolute inset-0 opacity-0 cursor-pointer" />
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Collapsible: Text */}
                        <div className="px-4 py-2">
                            <button onClick={() => setShowTextPanel(!showTextPanel)}
                                className="w-full flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                <span className="flex items-center gap-1"><Type className="w-3 h-3 text-emerald-500" />Yazı</span>
                                <span className={`transition-transform text-[9px] ${showTextPanel ? 'rotate-180' : ''}`}>▼</span>
                            </button>

                            {showTextPanel && (
                                <div className="mt-2 space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={addTextCell}
                                            onChange={e => setAddTextCell(e.target.checked)}
                                            className="accent-emerald-500 w-3.5 h-3.5" />
                                        <span className="text-[11px] text-slate-600">Yazı Hücresi</span>
                                    </label>

                                    <textarea value={textOverlay.text}
                                        onChange={e => setTextOverlay(p => ({ ...p, text: e.target.value }))}
                                        placeholder="Yazınızı girin..." rows={2}
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none" />

                                    <select value={textOverlay.fontFamily}
                                        onChange={e => setTextOverlay(p => ({ ...p, fontFamily: e.target.value }))}
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400">
                                        {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>

                                    <div>
                                        <label className="text-[10px] text-slate-400">Boyut: {textOverlay.fontSize}px</label>
                                        <input type="range" min="16" max="120" value={textOverlay.fontSize}
                                            onChange={e => setTextOverlay(p => ({ ...p, fontSize: +e.target.value }))}
                                            className="w-full accent-emerald-500" />
                                    </div>

                                    <div className="flex flex-wrap gap-1.5">
                                        {TEXT_COLORS.map(c => (
                                            <button key={c} onClick={() => setTextOverlay(p => ({ ...p, color: c }))}
                                                className={`w-4 h-4 rounded-full border-2 transition-all ${textOverlay.color === c ? 'border-emerald-500 scale-110' : 'border-slate-200'}`}
                                                style={{ backgroundColor: c }} />
                                        ))}
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-400">Arka Plan: {Math.round(textOverlay.bgOpacity * 100)}%</label>
                                        <input type="range" min="0" max="100" value={textOverlay.bgOpacity * 100}
                                            onChange={e => setTextOverlay(p => ({ ...p, bgOpacity: +e.target.value / 100 }))}
                                            className="w-full accent-emerald-500" />
                                    </div>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={textOverlay.hasShadow}
                                            onChange={e => setTextOverlay(p => ({ ...p, hasShadow: e.target.checked }))}
                                            className="accent-emerald-500 w-3.5 h-3.5" />
                                        <span className="text-[11px] text-slate-600">Gölge</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* ALL images list — single column, scrollable, drag source */}
                        <div className="flex-1 overflow-y-auto px-4 pb-3 min-h-0">
                            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 sticky top-0 bg-white pt-1 pb-1">
                                Tüm Görseller <span className="text-slate-300">({allPhotos.length})</span>
                            </h3>
                            <p className="text-[9px] text-slate-400 mb-2">Görseli sürükleyip grid&apos;e bırakın</p>
                            <div className="space-y-2">
                                {allPhotos.map((photo, index) => (
                                    <div
                                        key={photo.id}
                                        draggable
                                        onDragStart={() => handleDragStart(photo)}
                                        onDragEnd={() => setDragSourcePhoto(null)}
                                        className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group"
                                    >
                                        <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-emerald-400 flex-shrink-0" />
                                        <img src={photo.src} alt="" className="w-14 h-14 rounded object-cover flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[11px] text-slate-600 block truncate">{index + 1}. {photo.name}</span>
                                            {/* Show if this photo is currently in the grid */}
                                            {photos.some(p => p.src === photo.src) && (
                                                <span className="text-[9px] text-emerald-500 font-medium">Grid&apos;de</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Canvas Preview */}
                    <div className="flex-1 p-4 flex flex-col items-center justify-center bg-stone-50 min-h-[300px] overflow-auto">
                        <div className="w-full max-w-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] text-slate-400 font-medium">
                                    Sürükle = Kaydır &middot; Görselleri soldan sürükle
                                </span>
                            </div>
                            <div
                                ref={wrapperRef}
                                className="relative w-full rounded-xl overflow-hidden shadow-lg"
                                style={{ paddingBottom: '100%' }}
                                onDragOver={handleCanvasDragOver}
                                onDragLeave={handleCanvasDragLeave}
                                onDrop={handleCanvasDrop}
                            >
                                <canvas
                                    ref={canvasRef}
                                    className="absolute inset-0 w-full h-full cursor-move"
                                    onMouseDown={handleCanvasMouseDown}
                                    onMouseMove={handleCanvasMouseMove}
                                    onMouseUp={handleCanvasMouseUp}
                                    onMouseLeave={handleCanvasMouseUp}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center gap-3">
                    {uploadError && <p className="text-xs text-red-600 flex-1">{uploadError}</p>}
                    <div className="flex-1" />
                    <button onClick={handleDownload} disabled={photos.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-stone-200 disabled:opacity-40 transition-all">
                        <Download className="w-4 h-4" /> İndir
                    </button>
                    <button onClick={handleUseImage} disabled={photos.length === 0 || isUploading}
                        className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-all">
                        {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...</>
                            : <><Send className="w-4 h-4" /> Instagram&apos;a Gönder</>}
                    </button>
                </div>
            </div>
        </div>
    )
})

export default GridEditorModal
