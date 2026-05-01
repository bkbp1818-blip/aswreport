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
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Loader2, CalendarDays } from 'lucide-react'
import { generateYears } from '@/lib/calculations'

interface Holiday {
  id: number
  name: string
  date: string
  isActive: boolean
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
  // Convert ISO date to YYYY-MM-DD for input[type=date]
  const d = new Date(dateStr)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function HolidaysPage() {
  const years = generateYears()
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()))
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formName, setFormName] = useState('')
  const [formDate, setFormDate] = useState('')

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

  useEffect(() => {
    loadHolidays()
  }, [loadHolidays])

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

  const activeHolidays = holidays.filter(h => h.isActive)
  const inactiveHolidays = holidays.filter(h => !h.isActive)

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-[#333] md:text-2xl">วันหยุดราชการ</h1>
          <p className="text-sm text-[#666] md:text-base">
            จัดการรายการวันหยุดราชการ เพื่อใช้ในการคำนวณค่าแรงวันหยุดชดเชย
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#84A59D]" />
            วันหยุดของปี {selectedYear}
          </CardTitle>
          <CardDescription>
            พบ {activeHolidays.length} วัน{inactiveHolidays.length > 0 && ` (ซ่อน ${inactiveHolidays.length} วัน)`}
          </CardDescription>
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReactivate(h)}
                      >
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
    </div>
  )
}
