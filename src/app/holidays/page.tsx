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

// แสดงวันที่ ISO (YYYY-MM-DD) เป็น "วัน DD/MM/YYYY"
function formatPendingDate(dateStr: string): string {
  const d = new Date(dateStr)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

interface PendingEmployee {
  id: string
  name: string
  salary: number
  pendingCount: number
  pendingTotal: number
}

interface PendingRecord {
  id: string
  holidayName: string
  holidayDate: string
  workDate: string
  daysEarned: number
  amountToPay: number
}

interface PendingDetailResponse {
  employee: { id: string; name: string; salary: number; dailyRate: number }
  records: PendingRecord[]
  summary: { totalRecords: number; totalAmount: number }
}

type PaymentMethod = 'promptpay' | 'cash' | 'transfer'

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  promptpay: 'PromptPay',
  cash: 'เงินสด',
  transfer: 'โอนเงิน',
}

// DOM toast แทน window.alert (browser อาจระงับ alert ใน iframe/multiple-alert)
function notify(msg: string, variant: 'success' | 'error' = 'error') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const div = document.createElement('div')
  div.textContent = msg
  div.setAttribute('role', 'alert')
  const bg = variant === 'success' ? '#16a34a' : '#dc2626'
  div.style.cssText = [
    'position:fixed', 'top:1rem', 'right:1rem', 'z-index:9999',
    `background:${bg}`, 'color:#fff',
    'padding:0.75rem 1rem', 'border-radius:0.5rem',
    'box-shadow:0 4px 12px rgba(0,0,0,0.15)',
    'font-size:0.875rem', 'max-width:24rem', 'line-height:1.4',
    'transition:opacity 0.3s ease-out',
  ].join(';')
  document.body.appendChild(div)
  setTimeout(() => {
    div.style.opacity = '0'
    setTimeout(() => div.remove(), 300)
  }, 4000)
}

// แปลง error code จาก leave-bay → ข้อความที่ user เข้าใจ
function describePayError(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'ALREADY_PAID':
      return 'รายการนี้จ่ายไปแล้ว — กรุณาเปิด Dialog ใหม่'
    case 'RECORD_NOT_FOUND':
      return 'หารายการไม่พบ — ข้อมูลอาจถูกแก้ไข กรุณาเปิด Dialog ใหม่'
    case 'RECORD_EXPIRED':
      return 'รายการหมดอายุการเบิกแล้ว'
    default:
      return fallback || 'บันทึกไม่สำเร็จ'
  }
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

  // Pay dialog state — ดึงข้อมูลจาก leave-bay ผ่าน proxy
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [payLoadingEmployees, setPayLoadingEmployees] = useState(false)
  const [payLoadingRecords, setPayLoadingRecords] = useState(false)
  const [paySaving, setPaySaving] = useState(false)
  const [payEmployees, setPayEmployees] = useState<PendingEmployee[]>([])
  const [paySelectedEmployeeId, setPaySelectedEmployeeId] = useState<string | null>(null)
  const [payRecords, setPayRecords] = useState<PendingRecord[]>([])
  const [paySelectedRecordIds, setPaySelectedRecordIds] = useState<Set<string>>(new Set())
  const [payPaidByName, setPayPaidByName] = useState<string>('')
  const [payPaymentMethod, setPayPaymentMethod] = useState<PaymentMethod>('promptpay')
  const [payPaymentReference, setPayPaymentReference] = useState<string>('')

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

  // ========== Holiday Compensation — ใช้ leave-bay เป็น source of truth ==========
  const loadPayEmployees = useCallback(async () => {
    setPayLoadingEmployees(true)
    try {
      const res = await fetch('/api/holidays/employees-with-pending')
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/access'
          return
        }
        const err = await res.json().catch(() => ({}))
        notify(err.error || 'ดึงรายชื่อพนักงานไม่สำเร็จ')
        setPayEmployees([])
        return
      }
      const data = await res.json()
      setPayEmployees(Array.isArray(data) ? (data as PendingEmployee[]) : [])
    } catch (e) {
      console.error('loadPayEmployees error', e)
      notify('ไม่สามารถเชื่อมต่อ leave-bay ได้ ลองใหม่')
      setPayEmployees([])
    } finally {
      setPayLoadingEmployees(false)
    }
  }, [])

  const loadPayRecords = useCallback(async (employeeId: string) => {
    setPayLoadingRecords(true)
    setPayRecords([])
    setPaySelectedRecordIds(new Set())
    try {
      const res = await fetch(`/api/holidays/pending/${encodeURIComponent(employeeId)}`)
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/access'
          return
        }
        const err = await res.json().catch(() => ({}))
        notify(err.error || 'ดึงรายการค้างจ่ายไม่สำเร็จ')
        return
      }
      const data = (await res.json()) as PendingDetailResponse
      const records = Array.isArray(data?.records) ? data.records : []
      setPayRecords(records)
      setPaySelectedRecordIds(new Set(records.map(r => r.id)))
    } catch (e) {
      console.error('loadPayRecords error', e)
      notify('ไม่สามารถเชื่อมต่อ leave-bay ได้ ลองใหม่')
    } finally {
      setPayLoadingRecords(false)
    }
  }, [])

  const openPayDialog = async () => {
    setPaySelectedEmployeeId(null)
    setPayRecords([])
    setPaySelectedRecordIds(new Set())
    setPayPaidByName('')
    setPayPaymentMethod('promptpay')
    setPayPaymentReference('')
    setPayDialogOpen(true)
    await loadPayEmployees()
  }

  const handleSelectPayEmployee = async (employeeId: string) => {
    setPaySelectedEmployeeId(employeeId)
    await loadPayRecords(employeeId)
  }

  const togglePayRecord = (id: string) => {
    setPaySelectedRecordIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const togglePayAllRecords = () => {
    if (payRecords.length === 0) return
    if (paySelectedRecordIds.size === payRecords.length) {
      setPaySelectedRecordIds(new Set())
    } else {
      setPaySelectedRecordIds(new Set(payRecords.map(r => r.id)))
    }
  }

  const paySelectedEmployee = payEmployees.find(e => e.id === paySelectedEmployeeId) || null
  const paySelectedRecords = payRecords.filter(r => paySelectedRecordIds.has(r.id))
  const payTotalSelected = paySelectedRecords.reduce((s, r) => s + (Number(r.amountToPay) || 0), 0)
  const payAllChecked = payRecords.length > 0 && paySelectedRecordIds.size === payRecords.length
  const payCanSubmit =
    !!paySelectedEmployeeId &&
    paySelectedRecords.length > 0 &&
    payPaidByName.trim().length > 0 &&
    !paySaving

  const handlePayConfirm = async () => {
    if (!paySelectedEmployee) {
      notify('กรุณาเลือกพนักงาน')
      return
    }
    if (paySelectedRecords.length === 0) {
      notify('กรุณาเลือกอย่างน้อย 1 รายการ')
      return
    }
    const paidBy = payPaidByName.trim()
    if (!paidBy) {
      notify('กรุณากรอกชื่อผู้อนุมัติ')
      return
    }

    const confirmMsg = `ยืนยันจ่าย ${paySelectedRecords.length} รายการ ยอด ${formatNumber(payTotalSelected)} บาท ให้ ${paySelectedEmployee.name}?`
    if (!confirm(confirmMsg)) return

    setPaySaving(true)
    try {
      const body: {
        recordIds: string[]
        paidByName: string
        paymentMethod: PaymentMethod
        paymentReference?: string
      } = {
        recordIds: paySelectedRecords.map(r => r.id),
        paidByName: paidBy,
        paymentMethod: payPaymentMethod,
      }
      const ref = payPaymentReference.trim()
      if (ref) body.paymentReference = ref

      const res = await fetch('/api/holidays/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({} as Record<string, unknown>))
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/access'
          return
        }
        const code = typeof (data as { code?: unknown }).code === 'string'
          ? ((data as { code: string }).code)
          : undefined
        const errMsg = typeof (data as { error?: unknown }).error === 'string'
          ? ((data as { error: string }).error)
          : 'บันทึกไม่สำเร็จ'
        notify(describePayError(code, errMsg))
        return
      }

      const paidCount = typeof (data as { paidCount?: unknown }).paidCount === 'number'
        ? (data as { paidCount: number }).paidCount
        : paySelectedRecords.length
      const totalAmount = typeof (data as { totalAmount?: unknown }).totalAmount === 'number'
        ? (data as { totalAmount: number }).totalAmount
        : payTotalSelected
      notify(`จ่ายสำเร็จ ${paidCount} รายการ ยอดรวม ${formatNumber(totalAmount)} บาท`, 'success')

      // refresh: dropdown employees + records ของคนปัจจุบัน (ถ้ายังเหลือ)
      const currentEmpId = paySelectedEmployeeId
      await loadPayEmployees()
      if (currentEmpId) {
        try {
          const updatedRes = await fetch('/api/holidays/employees-with-pending')
          const updated = (await updatedRes.json()) as PendingEmployee[] | { error?: string }
          if (Array.isArray(updated) && updated.find(e => e.id === currentEmpId)) {
            await loadPayRecords(currentEmpId)
          } else {
            setPaySelectedEmployeeId(null)
            setPayRecords([])
            setPaySelectedRecordIds(new Set())
          }
        } catch {
          // ignore — dropdown ก็อัปเดตแล้ว
        }
      }
    } catch (e) {
      console.error('handlePayConfirm error', e)
      notify('เกิดข้อผิดพลาดในการบันทึก')
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

      {/* Dialog: จ่ายค่าแรงวันหยุดชดเชย (ดึงจาก leave-bay) */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#F28482]">จ่ายค่าแรงวันหยุดชดเชย</DialogTitle>
            <DialogDescription>
              เลือกพนักงาน → ติ๊กรายการที่ต้องการจ่าย → กรอกข้อมูลผู้อนุมัติและกดยืนยัน
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* เลือกพนักงาน */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-medium">เลือกพนักงาน</Label>
              {payLoadingEmployees ? (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังโหลดรายชื่อพนักงาน...
                </div>
              ) : payEmployees.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-2">
                  ไม่มีรายการค้างจ่ายในระบบ
                </p>
              ) : (
                <Select
                  value={paySelectedEmployeeId ?? ''}
                  onValueChange={(v) => { if (v) handleSelectPayEmployee(v) }}
                >
                  <SelectTrigger className="h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="-- เลือกพนักงาน --" />
                  </SelectTrigger>
                  <SelectContent>
                    {payEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} — {emp.pendingCount} วัน, {formatNumber(emp.pendingTotal)} บาท
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* ตารางรายการของพนักงานที่เลือก */}
            {paySelectedEmployeeId && (
              payLoadingRecords ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#F28482]" />
                </div>
              ) : payRecords.length === 0 ? (
                <p className="text-xs text-gray-500 italic text-center py-4">
                  ไม่มีรายการค้างจ่ายสำหรับพนักงานคนนี้
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="w-[44px] px-2">
                            <Checkbox
                              checked={payAllChecked}
                              onCheckedChange={togglePayAllRecords}
                              aria-label="เลือกทั้งหมด"
                            />
                          </TableHead>
                          <TableHead className="px-2 text-xs whitespace-nowrap">วันที่</TableHead>
                          <TableHead className="px-2 text-xs">ชื่อวันหยุด</TableHead>
                          <TableHead className="text-right px-2 text-xs whitespace-nowrap">ยอดเงิน</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payRecords.map((rec) => {
                          const checked = paySelectedRecordIds.has(rec.id)
                          return (
                            <TableRow key={rec.id} className={checked ? '' : 'opacity-60'}>
                              <TableCell className="px-2 py-1.5">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => togglePayRecord(rec.id)}
                                  aria-label={`เลือก ${rec.holidayName}`}
                                />
                              </TableCell>
                              <TableCell className="px-2 py-1.5 text-xs whitespace-nowrap">
                                {formatPendingDate(rec.workDate)}
                              </TableCell>
                              <TableCell className="px-2 py-1.5 text-xs">
                                {rec.holidayName}
                              </TableCell>
                              <TableCell className="text-right px-2 py-1.5 text-xs whitespace-nowrap font-medium text-[#F28482]">
                                {formatNumber(rec.amountToPay)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={3} className="px-2 text-xs font-semibold">
                            ยอดรวม ({paySelectedRecords.length}/{payRecords.length} รายการ)
                          </TableCell>
                          <TableCell className="text-right px-2 text-xs font-bold text-[#F28482] whitespace-nowrap">
                            {formatNumber(payTotalSelected)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>

                  {/* ช่องกรอกข้อมูลการจ่าย */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs sm:text-sm font-medium">
                        ชื่อผู้อนุมัติ <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={payPaidByName}
                        onChange={(e) => setPayPaidByName(e.target.value)}
                        placeholder="เช่น คุณก้อง"
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs sm:text-sm font-medium">วิธีจ่าย</Label>
                      <Select
                        value={payPaymentMethod}
                        onValueChange={(v) => setPayPaymentMethod(v as PaymentMethod)}
                      >
                        <SelectTrigger className="h-9 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="promptpay">{PAYMENT_METHOD_LABEL.promptpay}</SelectItem>
                          <SelectItem value="cash">{PAYMENT_METHOD_LABEL.cash}</SelectItem>
                          <SelectItem value="transfer">{PAYMENT_METHOD_LABEL.transfer}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs sm:text-sm font-medium">
                        เลขอ้างอิง <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
                      </Label>
                      <Input
                        value={payPaymentReference}
                        onChange={(e) => setPayPaymentReference(e.target.value)}
                        placeholder="เลขสลิป / ref ของธนาคาร"
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] sm:text-[11px] text-gray-500 italic border-l-2 border-amber-400 pl-2">
                    หมายเหตุ: ระบบจะบันทึกการจ่ายลง leave-bay — รายการที่จ่ายแล้วจะไม่กลับมาแสดงในที่นี้
                  </p>
                </div>
              )
            )}
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-1.5 sm:gap-2">
            <Button variant="outline" onClick={() => setPayDialogOpen(false)} disabled={paySaving} className="w-full sm:w-auto">
              ยกเลิก
            </Button>
            <Button
              onClick={handlePayConfirm}
              disabled={!payCanSubmit}
              className="w-full sm:w-auto bg-[#F28482] hover:bg-[#d76b69]"
            >
              {paySaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              ยืนยันการจ่ายเงิน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
