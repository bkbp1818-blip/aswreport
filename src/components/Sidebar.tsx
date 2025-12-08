'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Receipt,
  Settings,
  FileDown,
  Building2,
  Menu,
  X,
  Users,
  UserCog,
  LogOut,
  Calendar,
  Clock,
} from 'lucide-react'
import { useAccess } from '@/contexts/AccessContext'

// Format วันที่และเวลาเป็นภาษาไทย
const formatDateTime = (date: Date) => {
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ]

  const dayName = days[date.getDay()]
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear() // ปี ค.ศ.

  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return {
    date: `${dayName} ${day} ${month} ${year}`,
    time: `${hours}:${minutes}`
  }
}

const allNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, partnerOnly: true },
  { name: 'กรอกข้อมูล', href: '/transactions', icon: Receipt, partnerOnly: false },
  { name: 'เงินเดือนพนักงาน', href: '/employees', icon: Users, partnerOnly: true },
  { name: 'จัดการผู้ใช้', href: '/users', icon: UserCog, partnerOnly: true },
  { name: 'ตั้งค่า', href: '/settings', icon: Settings, partnerOnly: true },
  { name: 'ดาวน์โหลดรายงาน', href: '/reports', icon: FileDown, partnerOnly: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const { role, user, isPartner, logout } = useAccess()

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  // อัพเดทเวลาทุกนาที
  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // อัพเดททุก 1 นาที

    return () => clearInterval(timer)
  }, [])

  const dateTime = currentTime ? formatDateTime(currentTime) : null

  // กรอง navigation ตาม role
  const navigation = allNavigation.filter(item => {
    if (isPartner) return true // Partner เห็นทุกเมนู
    return !item.partnerOnly // Staff เห็นเฉพาะเมนูที่ไม่ใช่ partnerOnly
  })

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between bg-[#84A59D] px-4 text-white md:hidden">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-[#F6BD60]" />
          <span className="text-sm font-bold">ARUN SA WAD</span>
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
            <h1 className="text-base font-bold leading-tight">ARUN SA WAD</h1>
            <p className="text-xs text-white/70">Monthly Report</p>
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
        <div className="border-t border-[#6b8a84] p-4 space-y-3">
          {/* แสดงวันเวลา */}
          {dateTime && (
            <div className="space-y-1 rounded-lg bg-white/10 p-2">
              <div className="flex items-center gap-2 text-xs text-white/90">
                <Calendar className="h-3.5 w-3.5" />
                {dateTime.date}
              </div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <Clock className="h-3.5 w-3.5" />
                {dateTime.time} น.
              </div>
            </div>
          )}

          {/* แสดงข้อมูล user */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full",
              isPartner ? "bg-[#F6BD60]" : "bg-[#F28482]"
            )} />
            <div className="flex flex-col">
              {user && (
                <span className="text-xs font-medium text-white">
                  {user.name}
                </span>
              )}
              <span className="text-[10px] text-white/60">
                {isPartner ? 'หุ้นส่วน' : 'พนักงาน'}
              </span>
            </div>
          </div>

          {/* ปุ่มออกจากระบบ */}
          <button
            onClick={() => {
              logout()
              closeMenu()
              window.location.href = '/access'
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </button>
        </div>
      </div>
    </>
  )
}
