'use client'

import { useSidebar } from './SidebarContext'
import { useEffect, useState } from 'react'

export default function DashboardContent({ children }: { children: React.ReactNode }) {
    const { collapsed } = useSidebar()
    const [marginLeft, setMarginLeft] = useState('16rem')

    useEffect(() => {
        setMarginLeft(collapsed ? '5rem' : '16rem')
    }, [collapsed])

    return (
        <>
            {/* Desktop */}
            <main
                className="hidden lg:block transition-all duration-300"
                style={{ marginLeft }}
            >
                <div className="p-6">
                    {children}
                </div>
            </main>

            {/* Mobile */}
            <main className="lg:hidden">
                <div className="p-6">
                    {children}
                </div>
            </main>
        </>
    )
}
