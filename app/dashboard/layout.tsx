import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardSidebar from '@/components/DashboardSidebar'
import { SidebarProvider } from '@/components/SidebarContext'
import { SendingProvider } from '@/components/SendingContext'
import { DataCacheProvider } from '@/components/DataCacheContext'
import DashboardContent from '@/components/DashboardContent'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <SidebarProvider>
            <SendingProvider>
                <DataCacheProvider>
                    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
                        <DashboardSidebar user={user} />
                        <DashboardContent>
                            {children}
                        </DashboardContent>
                    </div>
                </DataCacheProvider>
            </SendingProvider>
        </SidebarProvider>
    )
}

