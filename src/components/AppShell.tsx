'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { AccessProvider } from '@/contexts/AccessContext'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // หน้า access ไม่แสดง sidebar
  const isAccessPage = pathname?.startsWith('/access')

  if (isAccessPage) {
    return (
      <AccessProvider>
        {children}
      </AccessProvider>
    )
  }

  return (
    <AccessProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-[#F7EDE2] p-4 pt-18 md:p-6 md:pt-6">
          {children}
        </main>
      </div>
    </AccessProvider>
  )
}
