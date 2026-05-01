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

interface HcEmployee {
  id: number
  firstName: string
  lastName: string
  nickname: string | null
  position: string
  effectiveSalary: number
  isCarriedForward?: boolean
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
  const openPayDialog = async () => {
    setPayEmployeeId(null)
    setPaySelectedHolidayIds([])
    setPayMonth(hcMonth)
    setPayYear(hcYear)
    setPayDialogOpen(true)
    setPayLoadingDialog(true)
    try {
      const [empRes, hRes] = await Promise.all([
        fetch(`/api/employees/monthly-salary?month=${hcMonth}&year=${hcYear}`),
        fetch(`/api/holidays?year=${hcYear}`),
      ])
      const empData = await empRes.json()
      const hData = await hRes.json()
      const employeesList = (empData.employees || []).filter((e: { position: string }) => e.position !== 'PARTNER')
      setPayEmployees(employeesList)
      setPayHolidays((Array.isArray(hData) ? hData : []).filter((h: { isActive: boolean }) => h.isActive))
    } catch (e) {
      console.error('openPayDialog error', e)
      alert('ดึงข้อมูลไม่สำเร็จ')
    } finally {
      setPayLoadingDialog(false)
    }
  }

  // เมื่อเปลี่ยน เดือน/ปี ของ entry ใน Dialog → reload employees + holidays ของช่วงนั้น
  const reloadDialogData = useCallback(async (m: string, y: string) => {
    setPayLoadingDialog(true)
    try {
      const [empRes, hRes] = await Promise.all([
        fetch(`/api/employees/monthly-salary?month=${m}&year=${y}`),
        fetch(`/api/holidays?year=${y}`),
      ])
      const empData = await empRes.json()
      const hData = await hRes.json()
      setPayEmployees((empData.employees || []).filter((e: { position: string }) => e.position !== 'PARTNER'))
      setPayHolidays((Array.isArray(hData) ? hData : []).filter((h: { isActive: boolean }) => h.isActive))
    } catch (e) {
      console.error('reloadDialogData error', e)
    } finally {
      setPayLoadingDialog(false)
    }
  }, [])

  const togglePayHolidayId = (id: number) => {
    setPaySelectedHolidayIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const paySelectedEmployee = payEmployees.find(e => e.id === payEmployeeId)
  const payDays = paySelectedHolidayIds.length
  const payEffectiveSalary = paySelectedEmployee?.effectiveSalary || 0
  const payTotalAllBuildings = payEffectiveSalary > 0 && payDays > 0
    ? (payEffectiveSalary / 30) * payDays * 2
    : 0
  const payPerBuilding = payTotalAllBuildings / 3

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
      // ถ้าเดือน/ปีที่ลงตรงกับ filter ปัจจุบัน → refresh
      if (payMonth === hcMonth && payYear === hcYear) {
        await loadHcItems()
      } else {
        // เปลี่ยน filter ให้ตรงกับที่บันทึก เพื่อให้เห็นรายการใหม่
        setHcMonth(payMonth)
        setHcYear(payYear)
      }
      setPayDialogOpen(false)
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead className="text-right">รวมทุกอาคาร</TableHead>
                  <TableHead className="text-right">/ อาคาร</TableHead>
                  <TableHead className="text-right">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hcItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-[#666] py-6">
                      ยังไม่มีรายการจ่ายค่าแรงในเดือนนี้
                    </TableCell>
                  </TableRow>
                ) : (
                  hcItems.map((item, idx) => (
                    <TableRow key={item.groupId}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-gray-700">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-medium text-[#F28482]">
                        {formatNumber(item.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-medium text-[#84A59D]">
                        {formatNumber(item.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600 hover:bg-red-100"
                          disabled={hcDeletingGroupId === item.groupId}
                          onClick={() => handleHcDelete(item.groupId)}
                        >
                          {hcDeletingGroupId === item.groupId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {hcItems.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="font-semibold">รวม</TableCell>
                    <TableCell className="text-right font-bold text-[#F28482]">{formatNumber(hcTotalAll)}</TableCell>
                    <TableCell className="text-right font-bold text-[#84A59D]">{formatNumber(hcTotalPerBuilding)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          )}
        </CardContent>
      </Card>

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
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#F28482]">จ่ายค่าแรงวันหยุดชดเชย</DialogTitle>
            <DialogDescription>
              เลือกพนักงาน วันหยุดที่ทำงาน และเดือนที่ต้องการลงรายการ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* เดือน/ปี ที่จะลงรายการ */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-medium">ลงรายการในเดือน</Label>
              <div className="flex gap-2">
                <Select
                  value={payMonth}
                  onValueChange={(v) => { setPayMonth(v); reloadDialogData(v, payYear) }}
                >
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
                  onValueChange={(v) => { setPayYear(v); reloadDialogData(payMonth, v) }}
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
                        return (
                          <SelectItem key={emp.id} value={String(emp.id)}>
                            {display} (เงินเดือน {formatNumber(emp.effectiveSalary)}{emp.isCarriedForward ? ' *' : ''})
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {payEmployees.some(e => e.isCarriedForward) && (
                    <p className="text-[10px] text-gray-500">* คือเงินเดือนที่ดึงจากเดือนก่อนหน้า</p>
                  )}
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

                {/* Preview การคำนวณ */}
                {payEmployeeId && payDays > 0 && (
                  <div className="rounded-lg border border-[#F28482]/30 bg-[#F28482]/5 p-3 space-y-1">
                    <p className="text-[11px] sm:text-xs text-gray-600">การคำนวณ:</p>
                    <p className="text-xs sm:text-sm">
                      เงินเดือน <span className="font-bold">{formatNumber(payEffectiveSalary)}</span> ÷ 30 ×{' '}
                      <span className="font-bold">{payDays}</span> วัน × 2 ={' '}
                      <span className="font-bold text-[#F28482]">{formatNumber(payTotalAllBuildings)}</span> บาท
                    </p>
                    <p className="text-xs sm:text-sm">
                      ÷ 3 อาคาร = <span className="font-bold text-[#84A59D]">{formatNumber(payPerBuilding)}</span> บาท / อาคาร
                    </p>
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
              disabled={paySaving || payLoadingDialog || !payEmployeeId || paySelectedHolidayIds.length === 0}
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
