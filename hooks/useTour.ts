'use client'

import { useState, useEffect } from 'react'

const TOUR_COMPLETED_KEY = 'onboarding_tour_completed'

export function useTour() {
    const [showTour, setShowTour] = useState(false)

    useEffect(() => {
        // İlk girişte tur göster
        const completed = localStorage.getItem(TOUR_COMPLETED_KEY)
        if (!completed) {
            // Kısa bir gecikme ile tur başlat
            const timer = setTimeout(() => setShowTour(true), 1000)
            return () => clearTimeout(timer)
        }
    }, [])

    const startTour = () => setShowTour(true)

    const closeTour = () => setShowTour(false)

    const completeTour = () => {
        localStorage.setItem(TOUR_COMPLETED_KEY, 'true')
        setShowTour(false)
    }

    const resetTour = () => {
        localStorage.removeItem(TOUR_COMPLETED_KEY)
    }

    return {
        showTour,
        startTour,
        closeTour,
        completeTour,
        resetTour,
    }
}

// Tur adımları tanımları
export const dashboardTourSteps = [
    {
        target: '[data-tour="nav-products"]',
        title: '📦 Ürün Yönetimi',
        content: 'Trendyol ve İKAS ürünlerinizi bu sayfadan görüntüleyebilir, çekebilir ve yönetebilirsiniz.',
        placement: 'right' as const,
    },
    {
        target: '[data-tour="nav-settings"]',
        title: '⚙️ Ayarlar',
        content: 'Telegram bot, Trendyol ve İKAS API bilgilerinizi bu sayfadan ayarlayabilirsiniz.',
        placement: 'right' as const,
    },
    {
        target: '[data-tour="nav-history"]',
        title: '📜 Geçmiş',
        content: 'Telegram\'a gönderilen mesajların geçmişini buradan takip edebilirsiniz.',
        placement: 'right' as const,
    },
]

export const productsTourSteps = [
    {
        target: '[data-tour="match-button"]',
        title: '🔗 Eşleştir & İndir',
        content: 'Eşleştirme dosyasındaki barkodları İKAS ürünleriyle eşleştirip Excel olarak indirir.',
        placement: 'bottom' as const,
    },
    {
        target: '[data-tour="trendyol-fetch"]',
        title: '🛍️ Trendyol Ürünleri',
        content: 'Trendyol mağazanızdaki ürünleri çekmek için bu butonu kullanın.',
        placement: 'bottom' as const,
    },
    {
        target: '[data-tour="ikas-fetch"]',
        title: '🏪 İKAS Ürünleri',
        content: 'İKAS mağazanızdaki tüm ürün ve varyantları çekmek için bu butonu kullanın.',
        placement: 'bottom' as const,
    },
]

export const settingsTourSteps = [
    {
        target: '[data-tour="telegram-settings"]',
        title: '🤖 Telegram Ayarları',
        content: 'Bot token ve chat ID bilgilerinizi girerek Telegram entegrasyonunu yapın.',
        placement: 'bottom' as const,
    },
    {
        target: '[data-tour="trendyol-settings"]',
        title: '🛍️ Trendyol Ayarları',
        content: 'Ürün çekmek istediğiniz Trendyol URL ve marka ayarlarını buradan yapın.',
        placement: 'bottom' as const,
    },
    {
        target: '[data-tour="ikas-settings"]',
        title: '🏪 İKAS Ayarları',
        content: 'İKAS API bağlantısı için Client ID ve Secret bilgilerinizi girin.',
        placement: 'bottom' as const,
    },
    {
        target: '[data-tour="matching-file"]',
        title: '📎 Eşleştirme Dosyası',
        content: 'Trendyol-İKAS eşleştirmesi için Excel dosyasını buradan yükleyin.',
        placement: 'top' as const,
    },
]
