'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const SidebarContext = createContext({ collapsed: false, setCollapsed: (value: boolean) => { } })

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
            {children}
        </SidebarContext.Provider>
    )
}

export function useSidebar() {
    return useContext(SidebarContext)
}
