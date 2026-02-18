'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

// ==========================================
// Types
// ==========================================

interface GroupedProduct {
    id: string
    urun_grup_id: string
    urun_ismi: string
    varyant_degerler: string
    resim_urlleri: string
    toplam_stok: number
    stok_kodu: string
    uploaded_at: string
    previously_sent?: boolean
}

interface DataCacheContextType {
    // Grouped Products (shared by Telegram Bot + Instagram)
    groupedProducts: GroupedProduct[]
    groupedProductsLoaded: boolean
    loadingGroupedProducts: boolean
    loadGroupedProducts: (force?: boolean) => Promise<GroupedProduct[]>
    setGroupedProducts: React.Dispatch<React.SetStateAction<GroupedProduct[]>>
    clearGroupedProducts: () => void

    // Instagram Sent Items
    sentItems: Set<string>
    sentItemsLoaded: boolean
    loadSentItems: (force?: boolean) => Promise<Set<string>>
    addSentItem: (id: string) => void

    // User Settings
    userSettings: Record<string, any> | null
    userSettingsLoaded: boolean
    loadingUserSettings: boolean
    loadUserSettings: (force?: boolean) => Promise<Record<string, any> | null>
    updateUserSettings: (updates: Record<string, any>) => void
}

const DataCacheContext = createContext<DataCacheContextType | null>(null)

export function useDataCache() {
    const context = useContext(DataCacheContext)
    if (!context) {
        throw new Error('useDataCache must be used within a DataCacheProvider')
    }
    return context
}

export function DataCacheProvider({ children }: { children: React.ReactNode }) {
    // ==========================================
    // Grouped Products
    // ==========================================
    const [groupedProducts, setGroupedProducts] = useState<GroupedProduct[]>([])
    const [groupedProductsLoaded, setGroupedProductsLoaded] = useState(false)
    const [loadingGroupedProducts, setLoadingGroupedProducts] = useState(false)
    const groupedProductsFetchingRef = useRef(false)

    const loadGroupedProducts = useCallback(async (force = false): Promise<GroupedProduct[]> => {
        // Return cached data if available and not forced
        if (groupedProductsLoaded && !force) {
            return groupedProducts
        }

        // Prevent duplicate concurrent fetches
        if (groupedProductsFetchingRef.current) {
            return groupedProducts
        }

        groupedProductsFetchingRef.current = true
        setLoadingGroupedProducts(true)

        try {
            const response = await fetch('/api/ikas-grouped-products')
            if (response.ok) {
                const data = await response.json()
                const products = data.products || []
                setGroupedProducts(products)
                setGroupedProductsLoaded(true)
                return products
            }
        } catch (err) {
            console.error('Error loading grouped products:', err)
        } finally {
            setLoadingGroupedProducts(false)
            groupedProductsFetchingRef.current = false
        }

        return groupedProducts
    }, [groupedProducts, groupedProductsLoaded])

    const clearGroupedProducts = useCallback(() => {
        setGroupedProducts([])
        setGroupedProductsLoaded(false)
    }, [])

    // ==========================================
    // Instagram Sent Items
    // ==========================================
    const [sentItems, setSentItems] = useState<Set<string>>(new Set())
    const [sentItemsLoaded, setSentItemsLoaded] = useState(false)
    const sentItemsFetchingRef = useRef(false)

    const loadSentItems = useCallback(async (force = false): Promise<Set<string>> => {
        if (sentItemsLoaded && !force) {
            return sentItems
        }

        if (sentItemsFetchingRef.current) {
            return sentItems
        }

        sentItemsFetchingRef.current = true

        try {
            const response = await fetch('/api/instagram/sent-items')
            if (response.ok) {
                const data = await response.json()
                const items = new Set<string>(data.sentItemIds || [])
                setSentItems(items)
                setSentItemsLoaded(true)
                return items
            }
        } catch (err) {
            console.error('Error loading sent items:', err)
        } finally {
            sentItemsFetchingRef.current = false
        }

        return sentItems
    }, [sentItems, sentItemsLoaded])

    const addSentItem = useCallback((id: string) => {
        setSentItems(prev => new Set([...prev, id]))
    }, [])

    // ==========================================
    // User Settings
    // ==========================================
    const [userSettings, setUserSettings] = useState<Record<string, any> | null>(null)
    const [userSettingsLoaded, setUserSettingsLoaded] = useState(false)
    const [loadingUserSettings, setLoadingUserSettings] = useState(false)
    const userSettingsFetchingRef = useRef(false)

    const loadUserSettings = useCallback(async (force = false): Promise<Record<string, any> | null> => {
        if (userSettingsLoaded && !force) {
            return userSettings
        }

        if (userSettingsFetchingRef.current) {
            return userSettings
        }

        userSettingsFetchingRef.current = true
        setLoadingUserSettings(true)

        try {
            const response = await fetch('/api/user-settings')
            if (response.ok) {
                const data = await response.json()
                setUserSettings(data)
                setUserSettingsLoaded(true)
                return data
            }
        } catch (err) {
            console.error('Error loading user settings:', err)
        } finally {
            setLoadingUserSettings(false)
            userSettingsFetchingRef.current = false
        }

        return userSettings
    }, [userSettings, userSettingsLoaded])

    const updateUserSettings = useCallback((updates: Record<string, any>) => {
        setUserSettings(prev => prev ? { ...prev, ...updates } : updates)
    }, [])

    return (
        <DataCacheContext.Provider value={{
            groupedProducts,
            groupedProductsLoaded,
            loadingGroupedProducts,
            loadGroupedProducts,
            setGroupedProducts,
            clearGroupedProducts,

            sentItems,
            sentItemsLoaded,
            loadSentItems,
            addSentItem,

            userSettings,
            userSettingsLoaded,
            loadingUserSettings,
            loadUserSettings,
            updateUserSettings,
        }}>
            {children}
        </DataCacheContext.Provider>
    )
}
