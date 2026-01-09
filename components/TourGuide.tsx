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

    // Calculate tooltip position
    const getTooltipStyle = () => {
        if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

        const placement = step.placement || 'bottom'
        const padding = 16

        switch (placement) {
            case 'top':
                return {
                    top: targetRect.top - padding,
                    left: targetRect.left + targetRect.width / 2,
                    transform: 'translate(-50%, -100%)',
                }
            case 'bottom':
                return {
                    top: targetRect.bottom + padding,
                    left: targetRect.left + targetRect.width / 2,
                    transform: 'translate(-50%, 0)',
                }
            case 'left':
                return {
                    top: targetRect.top + targetRect.height / 2,
                    left: targetRect.left - padding,
                    transform: 'translate(-100%, -50%)',
                }
            case 'right':
                return {
                    top: targetRect.top + targetRect.height / 2,
                    left: targetRect.right + padding,
                    transform: 'translate(0, -50%)',
                }
            default:
                return {
                    top: targetRect.bottom + padding,
                    left: targetRect.left + targetRect.width / 2,
                    transform: 'translate(-50%, 0)',
                }
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
                        className="absolute border-2 border-violet-500 rounded-lg pointer-events-none animate-pulse"
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
                className="fixed z-[9999] bg-white rounded-2xl shadow-2xl p-6 max-w-sm"
                style={getTooltipStyle()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Progress */}
                <div className="flex gap-1 mb-4">
                    {steps.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1 flex-1 rounded-full transition-colors ${idx <= currentStep ? 'bg-violet-600' : 'bg-slate-200'
                                }`}
                        />
                    ))}
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-600 text-sm mb-6">{step.content}</p>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={handlePrev}
                        disabled={isFirst}
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Geri</span>
                    </button>

                    <span className="text-sm text-slate-400">
                        {currentStep + 1} / {steps.length}
                    </span>

                    <button
                        onClick={handleNext}
                        className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                        <span>{isLast ? 'Bitir' : 'İleri'}</span>
                        {!isLast && <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </>
    )
}
