'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, Users, Receipt } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAccess } from '@/contexts/AccessContext'

export default function AccessPage() {
  const { role, isLoading, clearRole } = useAccess()
  const [cleared, setCleared] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  // ล้าง role เมื่อมาถึงหน้านี้ (เพื่อให้เลือกใหม่ได้)
  useEffect(() => {
    if (!isLoading && role && !cleared) {
      clearRole()
      setCleared(true)
    }
  }, [isLoading, role, clearRole, cleared])

  // อัปเดตเวลาทุกวินาที
  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // ฟอร์แมตวันที่เป็นภาษาไทย (ปี ค.ศ.)
  const formatDateTime = (date: Date) => {
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

    const dayName = days[date.getDay()]
    const day = date.getDate()
    const month = months[date.getMonth()]
    const year = date.getFullYear() // ปี ค.ศ.
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')

    return {
      date: `วัน${dayName}ที่ ${day} ${month} ${year}`,
      time: `${hours}:${minutes}:${seconds}`
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7EDE2]">
        <p className="text-slate-500">กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7EDE2] p-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="flex items-center gap-3 rounded-full bg-[#84A59D] p-4">
          <Building2 className="h-12 w-12 text-[#F6BD60]" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-800">ARUN SA WAD</h1>
        <p className="text-slate-500">Monthly Report System</p>

        {/* แสดงวันเวลา */}
        {currentTime && (
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-600">{formatDateTime(currentTime).date}</p>
            <p className="text-2xl font-bold text-[#84A59D]">{formatDateTime(currentTime).time}</p>
          </div>
        )}
      </div>

      {/* เลือกประเภทผู้ใช้ */}
      <div className="w-full max-w-md space-y-4">
        <h2 className="text-center text-lg font-medium text-slate-700">
          เลือกประเภทผู้ใช้งาน
        </h2>

        <div className="grid gap-4">
          {/* Partner Link */}
          <Link href="/access/partner">
            <Card className="cursor-pointer transition-all hover:border-[#84A59D] hover:shadow-lg">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="rounded-full bg-[#84A59D] p-3">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">หุ้นส่วน</CardTitle>
                  <CardDescription>
                    เข้าถึงได้ทุกหน้า - Dashboard, รายงาน, ตั้งค่า
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* Staff Link */}
          <Link href="/access/staff">
            <Card className="cursor-pointer transition-all hover:border-[#F28482] hover:shadow-lg">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="rounded-full bg-[#F28482] p-3">
                  <Receipt className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">พนักงาน</CardTitle>
                  <CardDescription>
                    เข้าถึงหน้ากรอกข้อมูลรายรับ-รายจ่าย
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-sm text-slate-400">
        ARUN SA WAD Property Management
      </p>
    </div>
  )
}
