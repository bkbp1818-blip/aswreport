'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Receipt,
  Settings,
  FileDown,
  Building2,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'กรอกข้อมูล', href: '/transactions', icon: Receipt },
  { name: 'ตั้งค่า', href: '/settings', icon: Settings },
  { name: 'ดาวน์โหลดรายงาน', href: '/reports', icon: FileDown },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-[#84A59D] text-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-[#6b8a84] px-6">
        <Building2 className="h-8 w-8 text-[#F6BD60]" />
        <div>
          <h1 className="text-lg font-bold">ASW Report</h1>
          <p className="text-xs text-white/70">ระบบบัญชีรายรับ-รายจ่าย</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'text-[#F6BD60]')} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#6b8a84] p-4">
        <p className="text-xs text-white/60">
          ARUN SA WAD
          <br />
          Property Management
        </p>
      </div>
    </div>
  )
}
