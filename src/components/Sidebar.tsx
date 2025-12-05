'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Receipt,
  Settings,
  FileDown,
  Building2,
  Menu,
  X,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'กรอกข้อมูล', href: '/transactions', icon: Receipt },
  { name: 'ตั้งค่า', href: '/settings', icon: Settings },
  { name: 'ดาวน์โหลดรายงาน', href: '/reports', icon: FileDown },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between bg-[#84A59D] px-4 text-white md:hidden">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-[#F6BD60]" />
          <span className="font-bold">ASW Report</span>
        </div>
        <button
          onClick={toggleMenu}
          className="rounded-lg p-2 hover:bg-white/10"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar - Desktop & Mobile Drawer */}
      <div
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-[#84A59D] text-white transition-transform duration-300 md:relative md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-[#6b8a84] px-6">
          <Building2 className="h-8 w-8 text-[#F6BD60]" />
          <div>
            <h1 className="text-lg font-bold">ASW Report</h1>
            <p className="text-xs text-white/70">ระบบบัญชีรายรับ-รายจ่าย</p>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={closeMenu}
            className="ml-auto rounded-lg p-1 hover:bg-white/10 md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMenu}
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
    </>
  )
}
