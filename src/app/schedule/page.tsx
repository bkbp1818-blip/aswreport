'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarClock,
  CalendarOff,
  Printer,
  Clock,
  Trash2,
} from 'lucide-react'
import { useAccess } from '@/contexts/AccessContext'
import {
  SCHEDULE_MIN_DATE_ISO,
  MIN_WEEK_START,
  WEEKDAY_SHORT,
  WEEKDAY_FULL,
  addDaysISO,
  defaultWeekStart,
  formatThaiDate,
  formatThaiDateFull,
  formatHours,
} from './_ui-utils'

// ── ชนิดข้อมูลจาก /api/schedule/week ──
interface DayCell {
  date: string
  weekday: number
  source: 'entry' | 'template' | 'none'
  startTime: string | null
  endTime: string | null
  isDayOff: boolean
  note: string | null
  hours: number
  editable: boolean
}
interface WeekEmployee {
  id: number
  firstName: string
  lastName: string
  position: 'MAID' | 'MANAGER' | 'PARTNER'
  days: DayCell[]
  hoursPerWeek: number
  dayOffCount: number
}
interface WeekData {
  weekStart: string
  weekEnd: string
  isPastWeek: boolean
  days: { date: string; weekday: number; editable: boolean }[]
  employees: WeekEmployee[]
}

type PositionType = 'MAID' | 'MANAGER' | 'PARTNER'
const positionOrder: PositionType[] = ['PARTNER', 'MANAGER', 'MAID']
const positionLabels: Record<string, string> = { MAID: 'แม่บ้าน', MANAGER: 'ผู้จัดการ', PARTNER: 'หุ้นส่วน' }
const positionIcons: Record<string, string> = { MAID: '🧹', MANAGER: '👔', PARTNER: '🤝' }
const positionColors: Record<string, string> = { PARTNER: '#1d3557', MANAGER: '#457b9d', MAID: '#2a9d8f' }

interface TemplateRow {
  weekday: number
  startTime: string | null
  endTime: string | null
  isDayOff: boolean
}

export default function SchedulePage() {
  const { isViewer } = useAccess()
  const canEdit = !isViewer

  const [weekStart, setWeekStart] = useState<string>(defaultWeekStart())
  const [weekData, setWeekData] = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<'auth' | 'error' | null>(null)

  // dialog: แก้กะรายวัน
  const [cellDialog, setCellDialog] = useState<{ emp: WeekEmployee; cell: DayCell } | null>(null)
  const [cellMode, setCellMode] = useState<'work' | 'off'>('work')
  const [cellStart, setCellStart] = useState('09:00')
  const [cellEnd, setCellEnd] = useState('18:00')
  const [savingCell, setSavingCell] = useState(false)

  // dialog: แม่แบบกะประจำ
  const [tplDialog, setTplDialog] = useState<WeekEmployee | null>(null)
  const [tplRows, setTplRows] = useState<TemplateRow[]>([])
  const [tplLoading, setTplLoading] = useState(false)
  const [savingTpl, setSavingTpl] = useState(false)

  // dialog: ใส่วันหยุดอัตโนมัติ
  const [autoDialog, setAutoDialog] = useState(false)
  const [autoFrom, setAutoFrom] = useState('')
  const [autoTo, setAutoTo] = useState('')
  const [savingAuto, setSavingAuto] = useState(false)
  const [autoHolidays, setAutoHolidays] = useState<{ date: string; name: string }[]>([])
  const [autoPreviewLoading, setAutoPreviewLoading] = useState(false)

  const canGoPrev = weekStart > MIN_WEEK_START

  const loadWeek = useCallback(async (ws: string) => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/schedule/week?weekStart=${ws}`)
      if (res.ok) {
        setWeekData(await res.json())
      } else if (res.status === 401) {
        // ไม่ได้ login / session ไม่ถูกต้อง — อย่ากลืนเงียบ
        setWeekData(null)
        setLoadError('auth')
      } else {
        setWeekData(null)
        setLoadError('error')
      }
    } catch (e) {
      console.error('Error loading week schedule:', e)
      setWeekData(null)
      setLoadError('error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWeek(weekStart)
  }, [weekStart, loadWeek])

  const goPrev = () => {
    const prev = addDaysISO(weekStart, -7)
    if (prev >= MIN_WEEK_START) setWeekStart(prev)
  }
  const goNext = () => setWeekStart(addDaysISO(weekStart, 7))
  const goThisWeek = () => setWeekStart(defaultWeekStart())

  // ── เปิด dialog แก้กะรายวัน ──
  const openCell = (emp: WeekEmployee, cell: DayCell) => {
    if (!canEdit || !cell.editable) return
    setCellDialog({ emp, cell })
    if (cell.isDayOff) {
      setCellMode('off')
      setCellStart('09:00')
      setCellEnd('18:00')
    } else {
      setCellMode('work')
      setCellStart(cell.startTime || '09:00')
      setCellEnd(cell.endTime || '18:00')
    }
  }

  const saveCell = async () => {
    if (!cellDialog) return
    setSavingCell(true)
    try {
      const body =
        cellMode === 'off'
          ? { employeeId: cellDialog.emp.id, date: cellDialog.cell.date, isDayOff: true }
          : { employeeId: cellDialog.emp.id, date: cellDialog.cell.date, isDayOff: false, startTime: cellStart, endTime: cellEnd }
      const res = await fetch('/api/schedule/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'บันทึกไม่สำเร็จ')
        return
      }
      setCellDialog(null)
      await loadWeek(weekStart)
    } finally {
      setSavingCell(false)
    }
  }

  // ลบ override → กลับไปใช้แม่แบบ
  const clearCell = async () => {
    if (!cellDialog) return
    setSavingCell(true)
    try {
      const res = await fetch(
        `/api/schedule/entry?employeeId=${cellDialog.emp.id}&date=${cellDialog.cell.date}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'ลบไม่สำเร็จ')
        return
      }
      setCellDialog(null)
      await loadWeek(weekStart)
    } finally {
      setSavingCell(false)
    }
  }

  // ── เปิด dialog แม่แบบกะประจำ ──
  const openTemplate = async (emp: WeekEmployee) => {
    if (!canEdit) return
    setTplDialog(emp)
    setTplLoading(true)
    // เริ่มจากค่า default (ทำงานทุกวัน 09:00-18:00)
    const base: TemplateRow[] = Array.from({ length: 7 }, (_, w) => ({
      weekday: w,
      startTime: '09:00',
      endTime: '18:00',
      isDayOff: false,
    }))
    try {
      const res = await fetch(`/api/schedule/template?employeeId=${emp.id}`)
      if (res.ok) {
        const rows: TemplateRow[] = await res.json()
        for (const r of rows) {
          base[r.weekday] = {
            weekday: r.weekday,
            startTime: r.startTime || '09:00',
            endTime: r.endTime || '18:00',
            isDayOff: r.isDayOff,
          }
        }
      }
    } catch (e) {
      console.error('Error loading template:', e)
    } finally {
      setTplRows(base)
      setTplLoading(false)
    }
  }

  const saveTemplate = async () => {
    if (!tplDialog) return
    setSavingTpl(true)
    try {
      const rows = tplRows.map((r) =>
        r.isDayOff
          ? { weekday: r.weekday, isDayOff: true }
          : { weekday: r.weekday, isDayOff: false, startTime: r.startTime, endTime: r.endTime }
      )
      const res = await fetch('/api/schedule/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: tplDialog.id, rows }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'บันทึกแม่แบบไม่สำเร็จ')
        return
      }
      setTplDialog(null)
      await loadWeek(weekStart)
    } finally {
      setSavingTpl(false)
    }
  }

  // ── ใส่วันหยุดอัตโนมัติ ──
  const openAuto = () => {
    if (!canEdit || !weekData) return
    setAutoFrom(weekData.weekStart)
    setAutoTo(weekData.weekEnd)
    setAutoDialog(true)
  }

  // preview วันหยุดในช่วง (อ่านอย่างเดียว) — เรียกเมื่อเปิด dialog หรือเปลี่ยนช่วงวัน
  const previewAuto = useCallback(async (from: string, to: string) => {
    if (!from || !to) {
      setAutoHolidays([])
      return
    }
    setAutoPreviewLoading(true)
    try {
      const res = await fetch(`/api/schedule/auto-holiday?from=${from}&to=${to}`)
      if (res.ok) {
        const data = await res.json()
        setAutoHolidays(data.holidays || [])
      } else {
        setAutoHolidays([])
      }
    } catch {
      setAutoHolidays([])
    } finally {
      setAutoPreviewLoading(false)
    }
  }, [])

  useEffect(() => {
    if (autoDialog) previewAuto(autoFrom, autoTo)
  }, [autoDialog, autoFrom, autoTo, previewAuto])

  const applyAuto = async () => {
    setSavingAuto(true)
    try {
      const res = await fetch('/api/schedule/auto-holiday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: autoFrom, to: autoTo }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || 'ใส่วันหยุดอัตโนมัติไม่สำเร็จ')
        return
      }
      setAutoDialog(false)
      await loadWeek(weekStart)
      alert(
        data.holidaysFound > 0
          ? `ใส่วันหยุดอัตโนมัติสำเร็จ: พบวันหยุด ${data.holidaysFound} วัน (${data.entriesUpserted} รายการ)`
          : 'ไม่พบวันหยุดในช่วงที่เลือก'
      )
    } finally {
      setSavingAuto(false)
    }
  }

  // ── แสดงผลเซลล์ ──
  const renderCell = (emp: WeekEmployee, cell: DayCell) => {
    if (!cell.editable) {
      return <span className="text-slate-300">—</span>
    }
    let content
    if (cell.source === 'none') {
      content = <span className="text-slate-300">—</span>
    } else if (cell.isDayOff) {
      content = (
        <span className="inline-block rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-500">
          หยุด
        </span>
      )
    } else if (cell.startTime && cell.endTime) {
      content = (
        <div className="leading-tight">
          <div className="text-[11px] font-medium text-[#333]">{cell.startTime}-{cell.endTime}</div>
          <div className="text-[10px] text-slate-400">{formatHours(cell.hours)} ชม.</div>
        </div>
      )
    } else {
      content = <span className="text-slate-300">—</span>
    }

    if (!canEdit) return <div className="px-1 py-1 text-center">{content}</div>

    return (
      <button
        type="button"
        onClick={() => openCell(emp, cell)}
        className={`w-full rounded px-1 py-1 text-center transition-colors hover:bg-slate-100 ${
          cell.source === 'entry' ? 'ring-1 ring-[#F6BD60]/50 bg-[#F6BD60]/5' : ''
        }`}
        title={cell.note || (cell.source === 'entry' ? 'ปรับเฉพาะวันนี้' : 'จากแม่แบบ')}
      >
        {content}
      </button>
    )
  }

  return (
    <div className="space-y-6">
      {/* print styles */}
      <style>{`@media print {
        aside, nav, .no-print { display: none !important; }
        body { background: white !important; }
        .print-area { box-shadow: none !important; }
      }`}</style>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#333] md:text-2xl">ตารางเวลางาน</h1>
          <p className="text-sm text-[#666]">
            วางแผนกะการทำงานของพนักงาน (เริ่มใช้ {SCHEDULE_MIN_DATE_ISO})
            {isViewer && <span className="ml-2 text-[#457b9d]">· โหมดดูอย่างเดียว</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {canEdit && (
            <Button variant="outline" onClick={openAuto} className="border-[#F28482] text-[#F28482] hover:bg-[#F28482]/10">
              <CalendarOff className="mr-2 h-4 w-4" />
              ใส่วันหยุดอัตโนมัติ
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            พิมพ์
          </Button>
        </div>
      </div>

      {/* Week selector */}
      <div className={`flex items-center justify-between rounded-lg bg-white p-3 shadow-sm no-print ${loadError ? 'hidden' : ''}`}>
        <Button variant="ghost" size="sm" onClick={goPrev} disabled={!canGoPrev} title={!canGoPrev ? 'ก่อน 1 ก.ค. 2026 เลื่อนถอยไม่ได้' : ''}>
          <ChevronLeft className="h-5 w-5" />
          สัปดาห์ก่อน
        </Button>
        <div className="text-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1d3557]">
            <CalendarClock className="h-4 w-4 text-[#457b9d]" />
            {weekData ? `${formatThaiDate(weekData.weekStart)} - ${formatThaiDateFull(weekData.weekEnd)}` : '...'}
          </div>
          <button onClick={goThisWeek} className="text-[11px] text-[#457b9d] hover:underline">
            สัปดาห์นี้
          </button>
        </div>
        <Button variant="ghost" size="sm" onClick={goNext}>
          สัปดาห์ถัดไป
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#84A59D]" />
          <span className="ml-2 text-[#666]">กำลังโหลดตารางเวลา...</span>
        </div>
      ) : loadError === 'auth' ? (
        <div className="rounded-lg border border-dashed border-[#F28482]/50 bg-[#F28482]/5 py-16 text-center">
          <p className="font-medium text-[#333]">กรุณาเข้าสู่ระบบก่อนดูตารางเวลา</p>
          <p className="mt-1 text-sm text-slate-500">เซสชันหมดอายุหรือยังไม่ได้เข้าสู่ระบบ</p>
          <Button className="mt-4 bg-[#84A59D] hover:bg-[#6b8a84]" onClick={() => (window.location.href = '/access/partner')}>
            ไปหน้าเข้าสู่ระบบ
          </Button>
        </div>
      ) : loadError === 'error' ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
          <p className="font-medium text-slate-500">เกิดข้อผิดพลาดในการโหลดตารางเวลา</p>
          <Button variant="outline" className="mt-4" onClick={() => loadWeek(weekStart)}>
            ลองใหม่
          </Button>
        </div>
      ) : weekData && weekData.isPastWeek ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
          <CalendarOff className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-500">ยังไม่เริ่มใช้ตารางเวลาในสัปดาห์นี้</p>
          <p className="text-sm text-slate-400">ตารางเวลาเริ่มใช้ตั้งแต่ {SCHEDULE_MIN_DATE_ISO} เป็นต้นไป</p>
        </div>
      ) : !weekData || weekData.employees.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-16 text-center text-slate-500">
          ยังไม่มีพนักงาน
        </div>
      ) : (
        <div className="space-y-6">
          {positionOrder.map((position) => {
            const emps = weekData.employees.filter((e) => e.position === position)
            if (emps.length === 0) return null
            return (
              <div key={position} className="print-area overflow-hidden rounded-lg bg-white shadow-md">
                {/* group header */}
                <div className="flex items-center justify-between px-4 py-2.5 text-white" style={{ backgroundColor: positionColors[position] }}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{positionIcons[position]}</span>
                    <h3 className="font-bold">{positionLabels[position]}</h3>
                  </div>
                  <Badge className="bg-white/20 text-white hover:bg-white/30">{emps.length} คน</Badge>
                </div>

                {/* table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-xs text-slate-500">
                        <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-medium min-w-[140px]">พนักงาน</th>
                        {weekData.days.map((d) => (
                          <th key={d.date} className={`px-1 py-2 text-center font-medium min-w-[64px] ${!d.editable ? 'text-slate-300' : ''}`}>
                            <div>{WEEKDAY_SHORT[d.weekday]}</div>
                            <div className="text-[10px] font-normal">{formatThaiDate(d.date)}</div>
                          </th>
                        ))}
                        <th className="px-2 py-2 text-center font-medium min-w-[64px]">ชม./สัปดาห์</th>
                        <th className="px-2 py-2 text-center font-medium min-w-[52px]">วันหยุด</th>
                        {canEdit && <th className="px-2 py-2 text-center font-medium no-print min-w-[44px]"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {emps.map((emp, i) => (
                        <tr key={emp.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="sticky left-0 z-10 px-3 py-2 font-medium text-[#333] whitespace-nowrap" style={{ backgroundColor: i % 2 === 0 ? '#fff' : 'rgba(248,250,252,0.5)' }}>
                            {emp.firstName} {emp.lastName}
                          </td>
                          {emp.days.map((cell) => (
                            <td key={cell.date} className="px-1 py-1 text-center align-middle">
                              {renderCell(emp, cell)}
                            </td>
                          ))}
                          <td className="px-2 py-2 text-center font-semibold text-[#1d3557]">{formatHours(emp.hoursPerWeek)}</td>
                          <td className="px-2 py-2 text-center text-slate-500">{emp.dayOffCount}</td>
                          {canEdit && (
                            <td className="px-2 py-2 text-center no-print">
                              <button
                                onClick={() => openTemplate(emp)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-[#457b9d]"
                                title="ตั้งแม่แบบกะประจำ"
                              >
                                <Clock className="h-4 w-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          {/* legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 no-print">
            <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded ring-1 ring-[#F6BD60]/50 bg-[#F6BD60]/5" /> ปรับเฉพาะวัน (override)</span>
            <span className="inline-flex items-center gap-1"><span className="rounded bg-red-100 px-1 text-red-500">หยุด</span> วันหยุด</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ตั้งแม่แบบกะประจำ</span>
            {canEdit && <span>· คลิกที่เซลล์เพื่อแก้กะรายวัน</span>}
          </div>
        </div>
      )}

      {/* Dialog: แก้กะรายวัน */}
      <Dialog open={!!cellDialog} onOpenChange={(o) => !o && setCellDialog(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {cellDialog && `${cellDialog.emp.firstName} — ${WEEKDAY_FULL[cellDialog.cell.weekday]} ${formatThaiDate(cellDialog.cell.date)}`}
            </DialogTitle>
            <DialogDescription>ปรับกะเฉพาะวันนี้ (ทับแม่แบบ)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Button variant={cellMode === 'work' ? 'default' : 'outline'} className={cellMode === 'work' ? 'bg-[#84A59D] hover:bg-[#6b8a84]' : ''} onClick={() => setCellMode('work')}>
                ทำงาน
              </Button>
              <Button variant={cellMode === 'off' ? 'default' : 'outline'} className={cellMode === 'off' ? 'bg-[#F28482] hover:bg-[#d96f6d]' : ''} onClick={() => setCellMode('off')}>
                วันหยุด
              </Button>
            </div>
            {cellMode === 'work' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">เวลาเริ่ม</Label>
                  <Input type="time" value={cellStart} onChange={(e) => setCellStart(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">เวลาเลิก</Label>
                  <Input type="time" value={cellEnd} onChange={(e) => setCellEnd(e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {cellDialog?.cell.source === 'entry' ? (
              <Button variant="ghost" className="text-slate-500" onClick={clearCell} disabled={savingCell}>
                <Trash2 className="mr-1 h-4 w-4" /> กลับไปใช้แม่แบบ
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCellDialog(null)}>ยกเลิก</Button>
              <Button className="bg-[#84A59D] hover:bg-[#6b8a84]" onClick={saveCell} disabled={savingCell}>
                {savingCell && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}บันทึก
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: แม่แบบกะประจำ */}
      <Dialog open={!!tplDialog} onOpenChange={(o) => !o && setTplDialog(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{tplDialog && `แม่แบบกะประจำ — ${tplDialog.firstName} ${tplDialog.lastName}`}</DialogTitle>
            <DialogDescription>กำหนดกะมาตรฐาน จ.–อา. (ใช้เติมทุกสัปดาห์อัตโนมัติ)</DialogDescription>
          </DialogHeader>
          {tplLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#457b9d]" /></div>
          ) : (
            <div className="space-y-2 py-2">
              {tplRows.map((row, idx) => (
                <div key={row.weekday} className="flex items-center gap-2">
                  <span className="w-16 text-sm text-[#333]">{WEEKDAY_FULL[row.weekday]}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-16 ${row.isDayOff ? 'border-red-300 text-red-500' : 'border-green-300 text-green-600'}`}
                    onClick={() => setTplRows((prev) => prev.map((r, i) => (i === idx ? { ...r, isDayOff: !r.isDayOff } : r)))}
                  >
                    {row.isDayOff ? 'หยุด' : 'ทำงาน'}
                  </Button>
                  <Input type="time" className="h-8" disabled={row.isDayOff} value={row.startTime || ''} onChange={(e) => setTplRows((prev) => prev.map((r, i) => (i === idx ? { ...r, startTime: e.target.value } : r)))} />
                  <span className="text-slate-400">-</span>
                  <Input type="time" className="h-8" disabled={row.isDayOff} value={row.endTime || ''} onChange={(e) => setTplRows((prev) => prev.map((r, i) => (i === idx ? { ...r, endTime: e.target.value } : r)))} />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTplDialog(null)}>ยกเลิก</Button>
            <Button className="bg-[#84A59D] hover:bg-[#6b8a84]" onClick={saveTemplate} disabled={savingTpl || tplLoading}>
              {savingTpl && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}บันทึกแม่แบบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: ใส่วันหยุดอัตโนมัติ */}
      <Dialog open={autoDialog} onOpenChange={setAutoDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>ใส่วันหยุดอัตโนมัติ</DialogTitle>
            <DialogDescription>เลือกช่วงวันที่ ระบบจะแสดงวันหยุดราชการที่พบให้ยืนยันก่อนใส่</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">ตั้งแต่วันที่</Label>
              <Input type="date" min={SCHEDULE_MIN_DATE_ISO} value={autoFrom} onChange={(e) => setAutoFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ถึงวันที่</Label>
              <Input type="date" min={SCHEDULE_MIN_DATE_ISO} value={autoTo} onChange={(e) => setAutoTo(e.target.value)} />
            </div>
          </div>

          {/* รายการวันหยุดที่จะถูกใส่ — ให้ผู้ใช้เห็นก่อนยืนยัน */}
          <div className="rounded-md border bg-slate-50 p-3 text-sm">
            {autoPreviewLoading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> กำลังตรวจสอบวันหยุด...
              </div>
            ) : autoHolidays.length === 0 ? (
              <span className="text-slate-400">ไม่มีวันหยุดราชการในช่วงนี้</span>
            ) : (
              <>
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  จะตั้ง {autoHolidays.length} วันนี้เป็นวันหยุดให้พนักงานทุกคน:
                </p>
                <ul className="space-y-1">
                  {autoHolidays.map((h) => (
                    <li key={h.date} className="flex items-center justify-between">
                      <span className="font-medium text-[#F28482]">{formatThaiDateFull(h.date)}</span>
                      <span className="text-slate-600">{h.name}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoDialog(false)}>ยกเลิก</Button>
            <Button
              className="bg-[#F28482] hover:bg-[#d96f6d]"
              onClick={applyAuto}
              disabled={savingAuto || autoPreviewLoading || autoHolidays.length === 0}
            >
              {savingAuto && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {autoHolidays.length > 0 ? `ใส่วันหยุด ${autoHolidays.length} วัน` : 'ใส่วันหยุด'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
