'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { CheckCircle2, XCircle, Loader2, Instagram, X } from 'lucide-react'

// Job types
interface InstagramJob {
    id: string
    type: 'instagram'
    productName: string
    imageUrls: string[]
    caption: string
    locationId?: string
    // Used to mark as sent after success
    productId?: string
    urunGrupId?: string
    urunIsmi?: string
}

type SendingJob = InstagramJob // Extensible for Telegram in the future

interface JobResult {
    jobId: string
    productName: string
    type: 'instagram'
    status: 'success' | 'failed'
    message: string
    postId?: string
}

interface SendingContextType {
    addToQueue: (job: SendingJob) => void
    isProcessing: boolean
    queue: SendingJob[]
    currentJob: SendingJob | null
    results: JobResult[]
    clearResults: () => void
}

const SendingContext = createContext<SendingContextType | null>(null)

export function useSending() {
    const context = useContext(SendingContext)
    if (!context) {
        throw new Error('useSending must be used within a SendingProvider')
    }
    return context
}

export function SendingProvider({ children }: { children: React.ReactNode }) {
    const [queue, setQueue] = useState<SendingJob[]>([])
    const [currentJob, setCurrentJob] = useState<SendingJob | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [results, setResults] = useState<JobResult[]>([])
    const [showIndicator, setShowIndicator] = useState(false)
    const processingRef = useRef(false)

    const addToQueue = useCallback((job: SendingJob) => {
        setQueue(prev => [...prev, job])
        setShowIndicator(true)
    }, [])

    const clearResults = useCallback(() => {
        setResults([])
        if (!isProcessing && queue.length === 0) {
            setShowIndicator(false)
        }
    }, [isProcessing, queue.length])

    // Process queue
    useEffect(() => {
        if (queue.length === 0 || processingRef.current) return

        const processNext = async () => {
            processingRef.current = true
            setIsProcessing(true)

            const [nextJob, ...remaining] = queue
            setQueue(remaining)
            setCurrentJob(nextJob)

            try {
                // Call the Instagram post API
                const response = await fetch('/api/instagram/post', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageUrls: nextJob.imageUrls,
                        caption: nextJob.caption,
                        locationId: nextJob.locationId || undefined,
                    }),
                })

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.error || 'Post atılamadı')
                }

                // Mark as sent
                if (nextJob.productId) {
                    try {
                        await fetch('/api/instagram/sent-items', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                productId: nextJob.productId,
                                urunGrupId: nextJob.urunGrupId,
                                urunIsmi: nextJob.urunIsmi,
                                postId: data.postId,
                            }),
                        })
                    } catch (err) {
                        console.error('Error marking as sent:', err)
                    }
                }

                setResults(prev => [...prev, {
                    jobId: nextJob.id,
                    productName: nextJob.productName,
                    type: 'instagram',
                    status: 'success',
                    message: data.message || 'Başarıyla gönderildi!',
                    postId: data.postId,
                }])
            } catch (err: any) {
                console.error('Sending error:', err)
                setResults(prev => [...prev, {
                    jobId: nextJob.id,
                    productName: nextJob.productName,
                    type: 'instagram',
                    status: 'failed',
                    message: err.message || 'Bilinmeyen hata',
                }])
            } finally {
                setCurrentJob(null)
                processingRef.current = false
                setIsProcessing(false)
            }
        }

        processNext()
    }, [queue])

    return (
        <SendingContext.Provider value={{ addToQueue, isProcessing, queue, currentJob, results, clearResults }}>
            {children}

            {/* Floating Progress Indicator */}
            {showIndicator && (
                <div className="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600">
                        <div className="flex items-center gap-2 text-white">
                            <Instagram className="w-4 h-4" />
                            <span className="text-sm font-semibold">Instagram Gönderimi</span>
                        </div>
                        {!isProcessing && queue.length === 0 && (
                            <button
                                onClick={() => { setShowIndicator(false); setResults([]) }}
                                className="text-white/70 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="max-h-60 overflow-y-auto">
                        {/* Current job */}
                        {currentJob && (
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                                <Loader2 className="w-4 h-4 text-pink-600 animate-spin flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-900 truncate">{currentJob.productName}</p>
                                    <p className="text-xs text-slate-500">
                                        Gönderiliyor... {currentJob.imageUrls.length} görsel
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Queued items */}
                        {queue.map((job, i) => (
                            <div key={job.id} className="px-4 py-2.5 border-b border-slate-50 flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                    <span className="text-[10px] text-slate-500 font-medium">{i + 1}</span>
                                </div>
                                <p className="text-sm text-slate-600 truncate">{job.productName}</p>
                            </div>
                        ))}

                        {/* Results (most recent first) */}
                        {[...results].reverse().map((result) => (
                            <div key={result.jobId} className="px-4 py-2.5 border-b border-slate-50 flex items-center gap-3">
                                {result.status === 'success' ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-slate-700 truncate">{result.productName}</p>
                                    {result.status === 'failed' && (
                                        <p className="text-xs text-red-500 truncate">{result.message}</p>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Empty state */}
                        {!currentJob && queue.length === 0 && results.length === 0 && (
                            <div className="px-4 py-6 text-center text-sm text-slate-500">
                                Kuyrukta gönderi yok
                            </div>
                        )}
                    </div>

                    {/* Footer summary */}
                    {(results.length > 0 || queue.length > 0) && (
                        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                                {results.filter(r => r.status === 'success').length} başarılı
                                {results.filter(r => r.status === 'failed').length > 0 &&
                                    `, ${results.filter(r => r.status === 'failed').length} başarısız`
                                }
                                {queue.length > 0 && `, ${queue.length} kuyrukta`}
                            </span>
                            {!isProcessing && queue.length === 0 && results.length > 0 && (
                                <button
                                    onClick={clearResults}
                                    className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                                >
                                    Temizle
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </SendingContext.Provider>
    )
}
