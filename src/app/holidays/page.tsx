'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Pencil, Trash2, Loader2, CalendarDays, Wallet } from 'lucide-react'
import { generateYears, getAvailableMonths } from '@/lib/calculations'
import { formatNumber, getMonthName } from '@/lib/utils'

interface Holiday {
  id: number
  name: string
  date: string
  isActive: boolean
}

interface SalaryEntry {
  salary: number
  sourceMonth: number | null
  sourceYear: number | null
  isCarriedForward: boolean
}

interface HcEmployee {
  id: number
  firstName: string
  lastName: string
  nickname: string | null
  position: string
  defaultSalary: number
  // salaries[1..12] ของปีที่ระบุ — มาจาก endpoint
  salaries: Record<number, SalaryEntry>
}

interface HcItem {
  groupId: string
  description: string
  amount: number          // ยอดต่ออาคาร
  totalAmount: number     // ยอดรวมทุกอาคาร
  month: number
  year: number
  createdAt: string
  buildingIds: number[]
  recordIds: number[]
}

interface HcDescriptionPayload {
  v: number
  employeeName: string
  employeeId?: number
  holidayIds?: number[]
  days: number
  buildingCount: number
  totalAllBuildings: number
  perBuilding: number
  items: { date: string; name: string; salary: number; amount: number }[]
}

function parseHcDescription(s: string): HcDescriptionPayload | null {
  try {
    const obj = JSON.parse(s)
    if (obj && typeof obj === 'object' && Array.isArray(obj.items) && obj.employeeName) {
      return obj as HcDescriptionPayload
    }
    return null
  } catch {
    return null
  }
}

const THAI_DAY_NAMES = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const THAI_MONTH_NAMES = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
]

function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr)
  const dayName = THAI_DAY_NAMES[d.getUTCDay()]
  const day = d.getUTCDate()
  const month = THAI_MONTH_NAMES[d.getUTCMonth()]
  const year = d.getUTCFullYear()
  return `${dayName} ${day} ${month} ${year}`
}

function toInputDate(dateStr: string): string {
  const d = new Date(dateStr)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function HolidaysPage() {
  const years = generateYears()
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState<string>(String(now.getFullYear()))
  const [hcMonth, setHcMonth] = useState<string>(String(now.getMonth() + 1))
  const [hcYear, setHcYear] = useState<string>(String(now.getFullYear()))

  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formName, setFormName] = useState('')
  const [formDate, setFormDate] = useState('')

  // Holiday Compensation state
  const [hcItems, setHcItems] = useState<HcItem[]>([])
  const [hcLoading, setHcLoading] = useState(true)
  const [hcDeletingGroupId, setHcDeletingGroupId] = useState<string | null>(null)

  // Pay dialog state
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [payLoadingDialog, setPayLoadingDialog] = useState(false)
  const [paySaving, setPaySaving] = useState(false)
  const [payEmployees, setPayEmployees] = useState<HcEmployee[]>([])
  const [payHolidays, setPayHolidays] = useState<Holiday[]>([])
  const [payEmployeeId, setPayEmployeeId] = useState<number | null>(null)
  const [paySelectedHolidayIds, setPaySelectedHolidayIds] = useState<number[]>([])
  const [payMonth, setPayMonth] = useState<string>(String(now.getMonth() + 1))
  const [payYear, setPayYear] = useState<string>(String(now.getFullYear()))
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)

  const loadHolidays = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/holidays?year=${selectedYear}`)
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/access'
          return
        }
        const err = await res.json().catch(() => ({}))
        alert(`ดึงข้อมูลไม่สำเร็จ: ${err.error || res.statusText}`)
        return
      }
      const data = await res.json()
      setHolidays(data)
    } catch (e) {
      console.error('loadHolidays error', e)
    } finally {
      setLoading(false)
    }
  }, [selectedYear])

  const loadHcItems = useCallback(async () => {
    setHcLoading(true)
    try {
      const res = await fetch(`/api/holiday-compensation?month=${hcMonth}&year=${hcYear}`)
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/access'
          return
        }
        const err = await res.json().catch(() => ({}))
        alert(`ดึงรายการจ่ายค่าแรงไม่สำเร็จ: ${err.error || res.statusText}`)
        return
      }
      const data = await res.json()
      setHcItems(data.items || [])
    } catch (e) {
      console.error('loadHcItems error', e)
    } finally {
      setHcLoading(false)
    }
  }, [hcMonth, hcYear])

  useEffect(() => { loadHolidays() }, [loadHolidays])
  useEffect(() => { loadHcItems() }, [loadHcItems])

  const openAddDialog = () => {
    setEditingId(null)
    setFormName('')
    setFormDate('')
    setDialogOpen(true)
  }

  const openEditDialog = (h: Holiday) => {
    setEditingId(h.id)
    setFormName(h.name)
    setFormDate(toInputDate(h.date))
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      alert('กรุณากรอกชื่อวันหยุด')
      return
    }
    if (!formDate) {
      alert('กรุณาเลือกวันที่')
      return
    }
    setSaving(true)
    try {
      const res = editingId
        ? await fetch(`/api/holidays/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: formName.trim(), date: formDate }),
          })
        : await fetch('/api/holidays', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: formName.trim(), date: formDate }),
          })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`บันทึกไม่สำเร็จ: ${err.error || res.statusText}`)
        return
      }
      setDialogOpen(false)
      await loadHolidays()
    } catch (e) {
      console.error('handleSave error', e)
      alert('เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (h: Holiday) => {
    if (!confirm(`ยืนยันการลบ "${h.name}" (${formatThaiDate(h.date)}) ?\n\nหมายเหตุ: ระบบจะซ่อนวันหยุดนี้แต่ประวัติเก่ายังคงอยู่`)) return
    setDeletingId(h.id)
    try {
      const res = await fetch(`/api/holidays/${h.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`ลบไม่สำเร็จ: ${err.error || res.statusText}`)
        return
      }
      await loadHolidays()
    } catch (e) {
      console.error('handleDelete error', e)
      alert('เกิดข้อผิดพลาดในการลบ')
    } finally {
      setDeletingId(null)
    }
  }

  const handleReactivate = async (h: Holiday) => {
    try {
      const res = await fetch(`/api/holidays/${h.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`เปิดใช้งานไม่สำเร็จ: ${err.error || res.statusText}`)
        return
      }
      await loadHolidays()
    } catch (e) {
      console.error('handleReactivate error', e)
    }
  }

  // ========== Holiday Compensation ==========
  const loadDialogData = useCallback(async (yearStr: string): Promise<{ holidays: Holiday[] } | null> => {
    setPayLoadingDialog(true)
    try {
      const [empRes, hRes] = await Promise.all([
        fetch(`/api/holiday-compensation/eligible-employees?year=${yearStr}`),
        fetch(`/api/holidays?year=${yearStr}`),
      ])
      const empData = await empRes.json()
      const hData = await hRes.json()
      const allHolidays = (Array.isArray(hData) ? hData : []) as Holiday[]
      // สำหรับ display ใน Dialog แสดงเฉพาะ active
      // แต่ตอน edit อาจต้อง match กับ inactive ด้วย → return ทั้งหมด
      setPayEmployees(empData.employees || [])
      setPayHolidays(allHolidays.filter(h => h.isActive))
      return { holidays: allHolidays }
    } catch (e) {
      console.error('loadDialogData error', e)
      alert('ดึงข้อมูลไม่สำเร็จ')
      return null
    } finally {
      setPayLoadingDialog(false)
    }
  }, [])

  const openPayDialog = async () => {
    setEditingGroupId(null)
    setPayEmployeeId(null)
    setPaySelectedHolidayIds([])
    setPayMonth(hcMonth)
    setPayYear(hcYear)
    setPayDialogOpen(true)
    await loadDialogData(hcYear)
  }

  const openEditPayDialog = async (item: HcItem) => {
    const parsed = parseHcDescription(item.description)
    if (!parsed || !parsed.employeeId) {
      alert('รายการนี้เป็นรูปแบบเก่าที่แก้ไขไม่ได้ — ลบและบันทึกใหม่แทน')
      return
    }
    setEditingGroupId(item.groupId)
    setPayEmployeeId(parsed.employeeId)
    setPaySelectedHolidayIds([])
    setPayMonth(String(item.month))
    setPayYear(String(item.year))
    setPayDialogOpen(true)

    // เริ่มโหลด: ใช้ปีของวันหยุดแรก (item.year อาจเป็นเดือนที่ลงรายจ่าย ไม่ใช่ปีของวันหยุด)
    const yearsInItems = new Set<number>()
    if (parsed.items && parsed.items.length > 0) {
      parsed.items.forEach(it => {
        const parts = it.date.split('/')
        if (parts.length === 3) {
          const y = parseInt(parts[2])
          if (!Number.isNaN(y)) yearsInItems.add(y)
        }
      })
    }
    if (yearsInItems.size === 0) yearsInItems.add(item.year)

    // โหลดของปีหลัก (ปี dropdown จะแสดงปีนี้) — ใช้ปีแรกของ items
    const primaryYear = Array.from(yearsInItems).sort()[0]
    setPayYear(String(primaryYear))
    const primaryRes = await loadDialogData(String(primaryYear))

    // ถ้ามี holidayIds ใน description → ใช้เลย
    if (parsed.holidayIds && parsed.holidayIds.length > 0) {
      setPaySelectedHolidayIds(parsed.holidayIds)
      return
    }

    // ถ้าไม่มี → derive จาก date matching ใน holidays
    // รวม holidays ของทุกปีที่ items อ้างถึง (ปกติปีเดียว — แต่อาจข้ามปี)
    const allHolidays: Holiday[] = []
    if (primaryRes) allHolidays.push(...primaryRes.holidays)
    const otherYears = Array.from(yearsInItems).filter(y => y !== primaryYear)
    for (const y of otherYears) {
      try {
        const hRes = await fetch(`/api/holidays?year=${y}`)
        const hData = await hRes.json()
        if (Array.isArray(hData)) allHolidays.push(...hData)
      } catch {
        // ignore
      }
    }

    const dateToId = new Map<string, number>()
    allHolidays.forEach(h => {
      const d = new Date(h.date)
      const dd = d.getUTCDate()
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      const yy = d.getUTCFullYear()
      dateToId.set(`${dd}/${mm}/${yy}`, h.id)
    })
    const ids = parsed.items
      .map(it => dateToId.get(it.date))
      .filter((x): x is number => typeof x === 'number')
    setPaySelectedHolidayIds(ids)

    if (ids.length < parsed.items.length) {
      console.warn(`Edit: matched ${ids.length}/${parsed.items.length} holidays — บางวันหยุดอาจถูกลบไปแล้ว`)
    }
  }

  const handlePayDialogClose = (open: boolean) => {
    setPayDialogOpen(open)
    if (!open) setEditingGroupId(null)
  }

  const togglePayHolidayId = (id: number) => {
    setPaySelectedHolidayIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const paySelectedEmployee = payEmployees.find(e => e.id === payEmployeeId)
  const payDays = paySelectedHolidayIds.length

  // คำนวณ per-holiday: แต่ละวันใช้ salary ของเดือนของวันหยุดนั้น
  const payPerHoliday = paySelectedHolidayIds.map(id => {
    const h = payHolidays.find(x => x.id === id)
    if (!h || !paySelectedEmployee) return null
    const d = new Date(h.date)
    const hm = d.getUTCMonth() + 1
    const entry = paySelectedEmployee.salaries[hm]
    const sal = entry?.salary || 0
    const amt = sal > 0 ? (sal / 30) * 2 : 0
    return {
      holidayId: id,
      name: h.name,
      day: d.getUTCDate(),
      month: hm,
      year: d.getUTCFullYear(),
      salary: sal,
      amount: amt,
      isCarriedForward: !!entry?.isCarriedForward,
      sourceMonth: entry?.sourceMonth ?? null,
      sourceYear: entry?.sourceYear ?? null,
    }
  }).filter((x): x is NonNullable<typeof x> => x !== null)

  const payTotalAllBuildings = payPerHoliday.reduce((s, x) => s + x.amount, 0)
  const payPerBuilding = payTotalAllBuildings / 3
  const payHasNoSalaryHoliday = payPerHoliday.some(x => x.salary <= 0)

  const handlePaySave = async () => {
    if (!payEmployeeId) {
      alert('กรุณาเลือกพนักงาน')
      return
    }
    if (paySelectedHolidayIds.length === 0) {
      alert('กรุณาเลือกวันหยุดอย่างน้อย 1 วัน')
      return
    }
    setPaySaving(true)
    try {
      // 1) สร้างรายการใหม่ก่อน (ถ้า fail ของเก่ายังอยู่)
      const res = await fetch('/api/holiday-compensation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: payEmployeeId,
          holidayIds: paySelectedHolidayIds,
          month: parseInt(payMonth),
          year: parseInt(payYear),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (res.status === 401) {
          alert('กรุณาเข้าสู่ระบบ')
          window.location.href = '/access'
          return
        }
        alert(`บันทึกไม่สำเร็จ: ${err.error || res.statusText}`)
        return
      }

      // 2) ถ้า edit → ลบ group เก่า
      if (editingGroupId) {
        const delRes = await fetch(`/api/holiday-compensation/${editingGroupId}`, { method: 'DELETE' })
        if (!delRes.ok) {
          alert('บันทึกรายการใหม่สำเร็จ แต่ลบรายการเก่าไม่สำเร็จ — กรุณาลบรายการเก่าด้วยตนเอง')
        }
      }

      // ถ้าเดือน/ปีที่ลงตรงกับ filter ปัจจุบัน → refresh
      if (payMonth === hcMonth && payYear === hcYear) {
        await loadHcItems()
      } else {
        // เปลี่ยน filter ให้ตรงกับที่บันทึก เพื่อให้เห็นรายการใหม่
        setHcMonth(payMonth)
        setHcYear(payYear)
      }
      setPayDialogOpen(false)
      setEditingGroupId(null)
    } catch (e) {
      console.error('handlePaySave error', e)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setPaySaving(false)
    }
  }

  const handleHcDelete = async (groupId: string) => {
    if (!confirm('ยืนยันการลบรายการนี้? (จะลบในทั้ง 3 อาคาร CT/YW/NANA พร้อมกัน)')) return
    setHcDeletingGroupId(groupId)
    try {
      const res = await fetch(`/api/holiday-compensation/${groupId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`ลบไม่สำเร็จ: ${err.error || res.statusText}`)
        return
      }
      await loadHcItems()
    } catch (e) {
      console.error('handleHcDelete error', e)
      alert('เกิดข้อผิดพลาดในการลบ')
    } finally {
      setHcDeletingGroupId(null)
    }
  }

  const activeHolidays = holidays.filter(h => h.isActive)
  const inactiveHolidays = holidays.filter(h => !h.isActive)

  const hcTotalAll = hcItems.reduce((s, x) => s + x.totalAmount, 0)
  const hcTotalPerBuilding = hcItems.reduce((s, x) => s + x.amount, 0)

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-[#333] md:text-2xl">วันหยุดราชการ</h1>
          <p className="text-sm text-[#666] md:text-base">
            จัดการรายการวันหยุดและบันทึกการจ่ายค่าแรงวันหยุดชดเชย (CT/YW/NANA)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Section 1: รายการวันหยุดราชการ */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-[#84A59D]" />
                รายการวันหยุดราชการ ปี {selectedYear}
              </CardTitle>
              <CardDescription>
                พบ {activeHolidays.length} วัน{inactiveHolidays.length > 0 && ` (ซ่อน ${inactiveHolidays.length} วัน)`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[110px] bg-white">
                  <SelectValue placeholder="ปี" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={openAddDialog} className="bg-[#84A59D] hover:bg-[#6b8a84]">
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มวันหยุด
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#84A59D]" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead className="text-right">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeHolidays.length === 0 && inactiveHolidays.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-[#666] py-6">
                      ยังไม่มีรายการวันหยุดของปีนี้
                    </TableCell>
                  </TableRow>
                )}
                {activeHolidays.map((h, idx) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell>{formatThaiDate(h.date)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-100"
                          onClick={() => openEditDialog(h)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600 hover:bg-red-100"
                          onClick={() => handleDelete(h)}
                          disabled={deletingId === h.id}
                        >
                          {deletingId === h.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {inactiveHolidays.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="bg-[#f5f5f5] text-xs font-medium text-[#666] py-2">
                      ── ซ่อน (Inactive) ──
                    </TableCell>
                  </TableRow>
                )}
                {inactiveHolidays.map((h) => (
                  <TableRow key={h.id} className="opacity-60">
                    <TableCell>—</TableCell>
                    <TableCell className="line-through">{h.name}</TableCell>
                    <TableCell className="line-through">{formatThaiDate(h.date)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => handleReactivate(h)}>
                        เปิดใช้งาน
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Section 2: การจ่ายค่าแรงวันหยุดชดเชย */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-[#F28482]" />
                จ่ายค่าแรงวันหยุดชดเชย — {getMonthName(parseInt(hcMonth))} {hcYear}
              </CardTitle>
              <CardDescription>
                หาร 3 อาคาร: CT, YW, NANA — สูตร: เงินเดือน ÷ 30 × วัน × 2
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={hcMonth} onValueChange={setHcMonth}>
                <SelectTrigger className="w-[120px] bg-white">
                  <SelectValue placeholder="เดือน" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableMonths(hcYear).map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={hcYear} onValueChange={setHcYear}>
                <SelectTrigger className="w-[90px] bg-white">
                  <SelectValue placeholder="ปี" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={openPayDialog} className="bg-[#F28482] hover:bg-[#d76b69]">
                <Plus className="mr-2 h-4 w-4" />
                จ่ายค่าแรง
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hcLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#F28482]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px] px-2 text-xs">#</TableHead>
                    <TableHead className="px-2 text-xs whitespace-nowrap">ชื่อพนักงาน</TableHead>
                    <TableHead className="px-2 text-xs">รายละเอียด</TableHead>
                    <TableHead className="text-right px-2 text-xs whitespace-nowrap">รวม</TableHead>
                    <TableHead className="text-right px-2 text-xs whitespace-nowrap">/ อาคาร</TableHead>
                    <TableHead className="w-[80px] px-2" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hcItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-[#666] py-6">
                        ยังไม่มีรายการจ่ายค่าแรงในเดือนนี้
                      </TableCell>
                    </TableRow>
                  ) : (
                    hcItems.map((item, idx) => {
                      const parsed = parseHcDescription(item.description)
                      return (
                        <TableRow key={item.groupId}>
                          <TableCell className="font-medium px-2 text-xs align-top pt-3">{idx + 1}</TableCell>
                          <TableCell className="px-2 text-xs font-semibold text-gray-800 align-top pt-3 whitespace-nowrap">
                            {parsed?.employeeName || '—'}
                          </TableCell>
                          <TableCell className="px-2 align-top pt-2.5">
                            {parsed ? (
                              <ul className="space-y-0.5">
                                {parsed.items.map((it, i) => (
                                  <li key={i} className="text-[11px] leading-snug text-gray-600 flex items-baseline gap-1.5">
                                    <span className="font-medium text-gray-700 whitespace-nowrap">{it.date}</span>
                                    <span className="text-gray-500">·</span>
                                    <span className="flex-1 truncate">{it.name}</span>
                                    <span className="text-gray-500 whitespace-nowrap">
                                      ฐาน {formatNumber(it.salary)} → <span className="font-medium text-[#F28482]">{formatNumber(it.amount)}</span>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-[11px] leading-relaxed text-gray-700 break-words">{item.description}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right px-2 text-xs font-medium text-[#F28482] align-top pt-3 whitespace-nowrap">
                            {formatNumber(item.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right px-2 text-xs font-medium text-[#84A59D] align-top pt-3 whitespace-nowrap">
                            {formatNumber(item.amount)}
                          </TableCell>
                          <TableCell className="text-right px-1 align-top pt-2">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-blue-600 hover:bg-blue-100 disabled:opacity-30"
                                disabled={!parsed || !parsed.employeeId}
                                onClick={() => openEditPayDialog(item)}
                                title={parsed && parsed.employeeId ? 'แก้ไข' : 'รายการเก่าแก้ไขไม่ได้'}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-600 hover:bg-red-100"
                                disabled={hcDeletingGroupId === item.groupId}
                                onClick={() => handleHcDelete(item.groupId)}
                                title="ลบ"
                              >
                                {hcDeletingGroupId === item.groupId ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
                {hcItems.length > 0 && (
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="px-2 text-xs font-semibold">รวม</TableCell>
                      <TableCell className="text-right px-2 text-xs font-bold text-[#F28482] whitespace-nowrap">{formatNumber(hcTotalAll)}</TableCell>
                      <TableCell className="text-right px-2 text-xs font-bold text-[#84A59D] whitespace-nowrap">{formatNumber(hcTotalPerBuilding)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Dialog: เพิ่ม/แก้ไขวันหยุด */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'แก้ไขวันหยุด' : 'เพิ่มวันหยุดใหม่'}</DialogTitle>
            <DialogDescription>
              กรอกชื่อและเลือกวันที่ของวันหยุดราชการ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="holiday-name">ชื่อวันหยุด</Label>
              <Input
                id="holiday-name"
                placeholder="เช่น วันสงกรานต์"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-date">วันที่</Label>
              <Input
                id="holiday-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#84A59D] hover:bg-[#6b8a84]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: จ่ายค่าแรงวันหยุดชดเชย */}
      <Dialog open={payDialogOpen} onOpenChange={handlePayDialogClose}>
        <DialogContent className="w-[95vw] max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#F28482]">
              {editingGroupId ? 'แก้ไขค่าแรงวันหยุดชดเชย' : 'จ่ายค่าแรงวันหยุดชดเชย'}
            </DialogTitle>
            <DialogDescription>
              {editingGroupId
                ? 'แก้ไขข้อมูล แล้วกดบันทึก — ระบบจะลบรายการเก่าและสร้างรายการใหม่ให้อัตโนมัติ'
                : 'เลือกพนักงาน วันหยุดที่ทำงาน และเดือนที่ต้องการลงรายการ'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* เดือน/ปี ที่จะลงรายการ */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-medium">ลงรายการรายจ่ายในเดือน</Label>
              <div className="flex gap-2">
                <Select value={payMonth} onValueChange={setPayMonth}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="เดือน" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableMonths(payYear).map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={payYear}
                  onValueChange={(v) => { setPayYear(v); loadDialogData(v) }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="ปี" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {payLoadingDialog ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#F28482]" />
              </div>
            ) : (
              <>
                {/* เลือกพนักงาน */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm font-medium">เลือกพนักงาน</Label>
                  <Select
                    value={payEmployeeId ? String(payEmployeeId) : ''}
                    onValueChange={(v) => setPayEmployeeId(v ? parseInt(v) : null)}
                  >
                    <SelectTrigger className="h-9 text-xs sm:text-sm">
                      <SelectValue placeholder="-- เลือกพนักงาน --" />
                    </SelectTrigger>
                    <SelectContent>
                      {payEmployees.map((emp) => {
                        const display = emp.nickname || `${emp.firstName} ${emp.lastName}`.trim()
                        const hasAnySalary = Object.values(emp.salaries).some(s => s.salary > 0) || emp.defaultSalary > 0
                        return (
                          <SelectItem key={emp.id} value={String(emp.id)} disabled={!hasAnySalary}>
                            {display}{!hasAnySalary && ' (ไม่มีเงินเดือนในระบบ)'}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-gray-500">
                    ระบบจะดึงเงินเดือนตามเดือนของวันหยุดที่เลือก (ถ้าเดือนนั้นไม่มี/เป็น 0 จะใช้เงินเดือนล่าสุดที่ &gt; 0)
                  </p>
                </div>

                {/* เลือกวันหยุด */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm font-medium">
                    เลือกวันหยุดราชการ ({payHolidays.length} วันในปี {payYear})
                  </Label>
                  <div className="border rounded-lg max-h-[200px] overflow-y-auto p-2 space-y-1 bg-slate-50">
                    {payHolidays.length === 0 ? (
                      <p className="text-center text-xs text-gray-500 py-4">
                        ยังไม่มีวันหยุดของปีนี้ — กดเพิ่มที่ Section ด้านบน
                      </p>
                    ) : (
                      payHolidays.map((h) => {
                        const d = new Date(h.date)
                        const dd = d.getUTCDate()
                        const mm = d.getUTCMonth() + 1
                        const yyyy = d.getUTCFullYear()
                        const checked = paySelectedHolidayIds.includes(h.id)
                        return (
                          <label
                            key={h.id}
                            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-white text-xs sm:text-sm ${checked ? 'bg-white border border-[#F28482]' : ''}`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => togglePayHolidayId(h.id)}
                            />
                            <span className="flex-1">{h.name}</span>
                            <span className="text-gray-500 text-[11px] sm:text-xs">{dd}/{mm}/{yyyy}</span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Preview การคำนวณ per-holiday */}
                {payEmployeeId && payDays > 0 && (
                  <div className="rounded-lg border border-[#F28482]/30 bg-[#F28482]/5 p-3 space-y-2">
                    <p className="text-[11px] sm:text-xs text-gray-600 font-medium">การคำนวณ (แต่ละวันใช้เงินเดือนของเดือนของวันหยุดนั้น):</p>
                    <div className="space-y-0.5">
                      {payPerHoliday.map((d) => (
                        <div key={d.holidayId} className="text-[11px] sm:text-xs flex items-center justify-between gap-2">
                          <span className="text-gray-700">
                            {d.day}/{d.month}/{d.year} — {d.name}
                            {d.isCarriedForward && d.sourceMonth && d.sourceYear && (
                              <span className="text-amber-600"> *</span>
                            )}
                          </span>
                          <span className="text-gray-700">
                            {d.salary > 0
                              ? <>ฐาน <span className="font-medium">{formatNumber(d.salary)}</span> ÷ 30 × 2 = <span className="font-bold text-[#F28482]">{formatNumber(d.amount)}</span></>
                              : <span className="text-red-600 font-medium">ไม่มีเงินเดือน</span>
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                    {payPerHoliday.some(d => d.isCarriedForward) && (
                      <p className="text-[10px] text-amber-600">* ใช้เงินเดือนล่าสุดที่ &gt; 0 ก่อนเดือนของวันหยุดนั้น</p>
                    )}
                    <div className="border-t border-[#F28482]/20 pt-1.5 space-y-0.5">
                      <p className="text-xs sm:text-sm">
                        รวม {payDays} วัน = <span className="font-bold text-[#F28482]">{formatNumber(payTotalAllBuildings)}</span> บาท
                      </p>
                      <p className="text-xs sm:text-sm">
                        ÷ 3 อาคาร = <span className="font-bold text-[#84A59D]">{formatNumber(payPerBuilding)}</span> บาท / อาคาร
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-[10px] sm:text-[11px] text-gray-500 italic border-l-2 border-amber-400 pl-2">
                  หมายเหตุ: ค่าแรงคำนวณจากเงินเดือน ณ ตอนบันทึก (snapshot)
                  หากแก้ไขเงินเดือนภายหลัง ต้องลบรายการเก่าและบันทึกใหม่
                </p>
              </>
            )}
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-1.5 sm:gap-2">
            <Button variant="outline" onClick={() => setPayDialogOpen(false)} disabled={paySaving} className="w-full sm:w-auto">
              ยกเลิก
            </Button>
            <Button
              onClick={handlePaySave}
              disabled={paySaving || payLoadingDialog || !payEmployeeId || paySelectedHolidayIds.length === 0 || payHasNoSalaryHoliday}
              className="w-full sm:w-auto bg-[#F28482] hover:bg-[#d76b69]"
            >
              {paySaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
