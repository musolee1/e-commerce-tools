'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface TourStep {
    target: string // CSS selector
    title: string
    content: string
    placement?: 'top' | 'bottom' | 'left' | 'right'
}

interface TourGuideProps {
    steps: TourStep[]
    isOpen: boolean
    onClose: () => void
    onComplete: () => void
}

export default function TourGuide({ steps, isOpen, onClose, onComplete }: TourGuideProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const updateTargetRect = useCallback(() => {
        if (!isOpen || !steps[currentStep]) return

        const target = document.querySelector(steps[currentStep].target)
        if (target) {
            const rect = target.getBoundingClientRect()
            setTargetRect(rect)

            // Scroll target into view
            target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else {
            setTargetRect(null)
        }
    }, [isOpen, currentStep, steps])

    useEffect(() => {
        updateTargetRect()
        window.addEventListener('resize', updateTargetRect)
        return () => window.removeEventListener('resize', updateTargetRect)
    }, [updateTargetRect])

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    if (!isOpen) return null

    const step = steps[currentStep]
    const isLast = currentStep === steps.length - 1
    const isFirst = currentStep === 0

    const handleNext = () => {
        if (isLast) {
            onComplete()
        } else {
            setCurrentStep(prev => prev + 1)
        }
    }

    const handlePrev = () => {
        if (!isFirst) {
            setCurrentStep(prev => prev - 1)
        }
    }

    // Calculate tooltip position with edge detection
    const getTooltipStyle = (): React.CSSProperties => {
        // Mobile: center the tooltip
        if (isMobile) {
            return {
                position: 'fixed',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100vw - 32px)',
                maxWidth: '360px',
            }
        }

        if (!targetRect) {
            return {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            }
        }

        const placement = step.placement || 'bottom'
        const padding = 16
        const tooltipWidth = 320
        const tooltipHeight = 180
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        let top: number
        let left: number
        let transform = ''

        switch (placement) {
            case 'top':
                top = targetRect.top - padding - tooltipHeight
                left = targetRect.left + targetRect.width / 2
                transform = 'translateX(-50%)'
                break
            case 'bottom':
                top = targetRect.bottom + padding
                left = targetRect.left + targetRect.width / 2
                transform = 'translateX(-50%)'
                break
            case 'left':
                top = targetRect.top + targetRect.height / 2
                left = targetRect.left - padding - tooltipWidth
                transform = 'translateY(-50%)'
                break
            case 'right':
                top = targetRect.top + targetRect.height / 2
                left = targetRect.right + padding
                transform = 'translateY(-50%)'
                break
            default:
                top = targetRect.bottom + padding
                left = targetRect.left + targetRect.width / 2
                transform = 'translateX(-50%)'
        }

        // Edge detection - keep tooltip within viewport
        if (left < padding) left = padding
        if (left + tooltipWidth > viewportWidth - padding) {
            left = viewportWidth - tooltipWidth - padding
            transform = ''
        }
        if (top < padding) top = padding
        if (top + tooltipHeight > viewportHeight - padding) {
            top = viewportHeight - tooltipHeight - padding
        }

        return {
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
            transform,
        }
    }

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 z-[9998]">
                {/* Dark overlay with spotlight hole */}
                <svg className="absolute inset-0 w-full h-full">
                    <defs>
                        <mask id="spotlight">
                            <rect x="0" y="0" width="100%" height="100%" fill="white" />
                            {targetRect && (
                                <rect
                                    x={targetRect.left - 8}
                                    y={targetRect.top - 8}
                                    width={targetRect.width + 16}
                                    height={targetRect.height + 16}
                                    rx="8"
                                    fill="black"
                                />
                            )}
                        </mask>
                    </defs>
                    <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="rgba(0,0,0,0.7)"
                        mask="url(#spotlight)"
                    />
                </svg>

                {/* Highlight border */}
                {targetRect && (
                    <div
                        className="absolute border-2 border-emerald-500 rounded-lg pointer-events-none animate-pulse"
                        style={{
                            top: targetRect.top - 8,
                            left: targetRect.left - 8,
                            width: targetRect.width + 16,
                            height: targetRect.height + 16,
                        }}
                    />
                )}
            </div>

            {/* Tooltip */}
            <div
                className="fixed z-[9999] bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-[calc(100vw-32px)] sm:w-auto sm:max-w-sm"
                style={getTooltipStyle()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 sm:top-3 sm:right-3 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Progress */}
                <div className="flex gap-1 mb-3 sm:mb-4 pr-6">
                    {steps.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1 flex-1 rounded-full transition-colors ${idx <= currentStep ? 'bg-emerald-600' : 'bg-slate-200'
                                }`}
                        />
                    ))}
                </div>

                {/* Content */}
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1 sm:mb-2">{step.title}</h3>
                <p className="text-slate-600 text-xs sm:text-sm mb-4 sm:mb-6">{step.content}</p>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={handlePrev}
                        disabled={isFirst}
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Geri</span>
                    </button>

                    <span className="text-xs sm:text-sm text-slate-400">
                        {currentStep + 1} / {steps.length}
                    </span>

                    <button
                        onClick={handleNext}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm"
                    >
                        <span>{isLast ? 'Bitir' : 'İleri'}</span>
                        {!isLast && <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </>
    )
}

