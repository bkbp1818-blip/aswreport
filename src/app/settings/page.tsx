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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Loader2,
  Building2,
  Globe,
  ShieldCheck,
  TrafficCone,
  Truck,
  Sparkles,
  Droplets,
  Cookie,
  Coffee,
  Fuel,
  ParkingCircle,
  Wrench,
  Bus,
  Waves,
  SprayCan,
  Utensils,
  Plus,
  Minus,
  Trash2,
  Calendar,
  Pencil,
  HeartPulse,
  Check,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatNumber, MONTHS } from '@/lib/utils'
import { useAccess } from '@/contexts/AccessContext'
import { getBuildingColor } from '@/lib/building-colors'
import { generateYears, getAvailableMonths } from '@/lib/calculations'

interface Building {
  id: number
  name: string
  code: string
}

interface Settings {
  id: number
  buildingId: number
  managementFeePercent: number
  vatPercent: number
  monthlyRent: number
  littleHotelierExpense: number
  cowayWaterFilterExpense: number
  building?: Building
}

interface GlobalSettings {
  id: number
  buildingCount: number
  careExpenseDivisor: number
  maxCareExpense: number
  trafficCareExpense: number
  shippingExpense: number
  amenityExpense: number
  waterBottleExpense: number
  cookieExpense: number
  coffeeExpense: number
  sugarExpense: number
  coffeeMateExpense: number
  fuelExpense: number
  parkingExpense: number
  motorcycleMaintenanceExpense: number
  maidTravelExpense: number
  cleaningSupplyExpense: number
  foodExpense: number
  [key: string]: number // for dynamic fields
}

interface GlobalTotals {
  totals: Record<string, number>
  totalsPerBuilding: Record<string, number>
  totalGlobalExpense: number
  buildingCount: number
  careExpenseDivisor: number
}

interface ExpenseHistoryItem {
  id: number
  targetType: string
  targetId: number | null
  fieldName: string
  fieldLabel: string
  actionType: string
  amount: number
  description: string
  month: number
  year: number
  createdAt: string
}

interface SocialSecurityEmployee {
  id: number
  firstName: string
  lastName: string
  nickname: string | null
  position: string
  contributionId: number | null
  amount: number
}

interface SocialSecurityData {
  employees: SocialSecurityEmployee[]
  totalAmount: number
  amountPerBuilding: number
  buildingCount: number
}

export default function SettingsPage() {
  const { isViewer } = useAccess()
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<string>('')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('building-settings')

  // Global settings - ใช้ดึงจาก ExpenseHistory totals ตามเดือน/ปี
  const [globalSelectedMonth, setGlobalSelectedMonth] = useState<string>(
    String(new Date().getMonth() + 1)
  )
  const [globalSelectedYear, setGlobalSelectedYear] = useState<string>(
    String(new Date().getFullYear())
  )
  const [globalTotals, setGlobalTotals] = useState<GlobalTotals | null>(null)
  const [loadingGlobal, setLoadingGlobal] = useState(false)
  const years = generateYears()

  // Building settings - ใช้ดึงจาก ExpenseHistory totals ตามเดือน/ปี
  const [buildingSelectedMonth, setBuildingSelectedMonth] = useState<string>(
    String(new Date().getMonth() + 1)
  )
  const [buildingSelectedYear, setBuildingSelectedYear] = useState<string>(
    String(new Date().getFullYear())
  )
  const [settingsTotals, setSettingsTotals] = useState<Record<string, number>>({})
  const [loadingSettingsTotals, setLoadingSettingsTotals] = useState(false)

  // State สำหรับ Dialog เพิ่ม/ลดยอด
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [adjustType, setAdjustType] = useState<'add' | 'subtract' | 'edit'>('add')
  const [adjustAction, setAdjustAction] = useState<'add' | 'subtract'>('add') // สำหรับ edit mode
  const [adjustFieldKey, setAdjustFieldKey] = useState<string>('')
  const [adjustFieldName, setAdjustFieldName] = useState('')
  const [adjustAmount, setAdjustAmount] = useState<string>('')
  const [adjustTarget, setAdjustTarget] = useState<'building' | 'global'>('building')
  const [adjustDescription, setAdjustDescription] = useState('')
  const [adjustMonth, setAdjustMonth] = useState(new Date().getMonth() + 1)
  const [adjustYear, setAdjustYear] = useState(new Date().getFullYear())
  const [expenseHistory, setExpenseHistory] = useState<ExpenseHistoryItem[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [savingHistory, setSavingHistory] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // State สำหรับ Dialog แก้ไขค่า % (Management Fee, VAT)
  const [percentDialogOpen, setPercentDialogOpen] = useState(false)
  const [percentFieldKey, setPercentFieldKey] = useState<string>('')
  const [percentFieldName, setPercentFieldName] = useState('')
  const [percentValue, setPercentValue] = useState<string>('')
  const [savingPercent, setSavingPercent] = useState(false)

  // State สำหรับเงินสมทบประกันสังคม
  const [socialSecurityData, setSocialSecurityData] = useState<SocialSecurityData | null>(null)
  const [loadingSocialSecurity, setLoadingSocialSecurity] = useState(false)
  const [savingSocialSecurity, setSavingSocialSecurity] = useState<number | null>(null)
  const [socialSecurityDialogOpen, setSocialSecurityDialogOpen] = useState(false)

  // Fetch ประวัติค่าใช้จ่าย
  const fetchExpenseHistory = async (
    targetType: string,
    targetId: number | null,
    fieldName: string,
    month: number,
    year: number
  ) => {
    setLoadingHistory(true)
    try {
      const params = new URLSearchParams({
        targetType,
        fieldName,
        month: month.toString(),
        year: year.toString(),
      })
      if (targetId !== null) {
        params.append('targetId', targetId.toString())
      }
      const res = await fetch(`/api/expense-history?${params}`)
      const data = await res.json()
      if (res.ok) {
        setExpenseHistory(data.history || [])
        setHistoryTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Error fetching expense history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  // ปิด Dialog และ reload ข้อมูล
  const handleDialogClose = (open: boolean) => {
    setAdjustDialogOpen(open)
    // เมื่อปิด Dialog ให้ reload ข้อมูลใหม่
    if (!open) {
      if (adjustTarget === 'building') {
        fetchSettingsTotals(selectedBuilding, buildingSelectedMonth, buildingSelectedYear)
      } else {
        fetchGlobalTotals(globalSelectedMonth, globalSelectedYear)
      }
    }
  }

  // ดึง action จริงที่ใช้ในการบันทึก
  const getEffectiveAction = () => {
    return adjustType === 'edit' ? adjustAction : adjustType
  }

  // เปิด Dialog เพิ่ม/ลดยอด
  const openAdjustDialog = (
    type: 'add' | 'subtract' | 'edit',
    fieldKey: string,
    fieldName: string,
    target: 'building' | 'global'
  ) => {
    setAdjustType(type)
    setAdjustFieldKey(fieldKey)
    setAdjustFieldName(fieldName)
    setAdjustTarget(target)
    setAdjustAmount('')
    setAdjustDescription('')
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    setAdjustMonth(currentMonth)
    setAdjustYear(currentYear)
    setAdjustDialogOpen(true)

    // Fetch ประวัติ
    const targetType = target === 'building' ? 'SETTINGS' : 'GLOBAL_SETTINGS'
    const targetId = target === 'building' ? parseInt(selectedBuilding) : null
    fetchExpenseHistory(targetType, targetId, fieldKey, currentMonth, currentYear)
  }

  // เมื่อเปลี่ยนเดือน/ปี ให้ fetch ประวัติใหม่
  const handleMonthYearChange = (month: number, year: number) => {
    setAdjustMonth(month)
    setAdjustYear(year)
    const targetType = adjustTarget === 'building' ? 'SETTINGS' : 'GLOBAL_SETTINGS'
    const targetId = adjustTarget === 'building' ? parseInt(selectedBuilding) : null
    fetchExpenseHistory(targetType, targetId, adjustFieldKey, month, year)
  }

  // ลบรายการประวัติ
  const handleDeleteHistory = async (id: number) => {
    if (!confirm('ต้องการลบรายการนี้ใช่ไหม?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/expense-history/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setExpenseHistory(data.history || [])
        setHistoryTotal(data.total || 0)
        // อัปเดตยอด - refresh totals
        if (adjustTarget === 'building') {
          // Refresh settings totals for building
          fetchSettingsTotals(selectedBuilding, buildingSelectedMonth, buildingSelectedYear)
        } else {
          // Refresh global totals
          fetchGlobalTotals(globalSelectedMonth, globalSelectedYear)
        }
      }
    } catch (error) {
      console.error('Error deleting history:', error)
    } finally {
      setDeletingId(null)
    }
  }

  // ยืนยันการเพิ่ม/ลดยอด (บันทึกผ่าน API)
  const handleAdjustConfirm = async () => {
    if (!adjustAmount || parseFloat(adjustAmount) <= 0) return
    if (!adjustDescription.trim()) {
      alert('กรุณากรอกรายละเอียด')
      return
    }

    setSavingHistory(true)
    const effectiveAction = getEffectiveAction()
    try {
      const targetType = adjustTarget === 'building' ? 'SETTINGS' : 'GLOBAL_SETTINGS'
      const targetId = adjustTarget === 'building' ? selectedBuilding : null

      const res = await fetch('/api/expense-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          fieldName: adjustFieldKey,
          fieldLabel: adjustFieldName,
          actionType: effectiveAction === 'add' ? 'ADD' : 'SUBTRACT',
          amount: parseFloat(adjustAmount),
          description: adjustDescription.trim(),
          month: adjustMonth,
          year: adjustYear,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setExpenseHistory(data.history || [])
        setHistoryTotal(data.total || 0)
        // อัปเดตยอด - refresh totals
        if (adjustTarget === 'building') {
          // Refresh settings totals for building
          fetchSettingsTotals(selectedBuilding, buildingSelectedMonth, buildingSelectedYear)
        } else {
          // Refresh global totals
          fetchGlobalTotals(globalSelectedMonth, globalSelectedYear)
        }
        // Reset form
        setAdjustAmount('')
        setAdjustDescription('')
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error saving history:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSavingHistory(false)
    }
  }

  // คำนวณยอดใหม่ (preview)
  const getNewAmount = () => {
    const currentValue = historyTotal
    const adjustValue = parseFloat(adjustAmount) || 0
    const effectiveAction = getEffectiveAction()
    const newValue = effectiveAction === 'add'
      ? currentValue + adjustValue
      : currentValue - adjustValue
    return Math.max(0, newValue) // ไม่ให้ติดลบ
  }

  // เปิด Dialog แก้ไขค่า %
  const openPercentDialog = (fieldKey: string, fieldName: string, currentValue: number) => {
    setPercentFieldKey(fieldKey)
    setPercentFieldName(fieldName)
    setPercentValue(String(currentValue || ''))
    setPercentDialogOpen(true)
  }

  // บันทึกค่า % ไปที่ Settings table
  const handlePercentSave = async () => {
    if (!selectedBuilding || !percentValue) return

    const value = parseFloat(percentValue)
    if (isNaN(value) || value < 0) {
      alert('กรุณากรอกค่าที่ถูกต้อง')
      return
    }

    setSavingPercent(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId: selectedBuilding,
          [percentFieldKey]: value,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        if (res.status === 401) {
          alert('กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล')
          window.location.href = '/access/partner'
          return
        }
        if (res.status === 403) {
          alert('เฉพาะ Partner เท่านั้นที่สามารถแก้ไขการตั้งค่าได้')
          return
        }
        throw new Error(errorData.error || 'Failed to save')
      }

      // อัปเดต settings state
      const data = await res.json()
      setSettings(data)
      setPercentDialogOpen(false)
      alert('บันทึกสำเร็จ')
    } catch (err) {
      console.error('Error saving percent:', err)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSavingPercent(false)
    }
  }

  // ดึง global totals จาก ExpenseHistory
  const fetchGlobalTotals = useCallback(async (month: string, year: string) => {
    setLoadingGlobal(true)
    try {
      const res = await fetch(`/api/expense-history/global-totals?month=${month}&year=${year}`)
      const data = await res.json()
      if (res.ok) {
        setGlobalTotals(data)
      }
    } catch (error) {
      console.error('Error fetching global totals:', error)
    } finally {
      setLoadingGlobal(false)
    }
  }, [])

  // ดึง settings totals จาก ExpenseHistory (per building)
  const fetchSettingsTotals = useCallback(async (buildingId: string, month: string, year: string) => {
    if (!buildingId) return
    setLoadingSettingsTotals(true)
    try {
      const res = await fetch(`/api/expense-history/totals?targetType=SETTINGS&targetId=${buildingId}&month=${month}&year=${year}`)
      const data = await res.json()
      if (res.ok) {
        setSettingsTotals(data.totals || {})
      }
    } catch (error) {
      console.error('Error fetching settings totals:', error)
    } finally {
      setLoadingSettingsTotals(false)
    }
  }, [])

  // ดึงข้อมูลเงินสมทบประกันสังคม
  const fetchSocialSecurity = useCallback(async (month: string, year: string) => {
    setLoadingSocialSecurity(true)
    try {
      const res = await fetch(`/api/social-security?month=${month}&year=${year}`)
      const data = await res.json()
      if (res.ok) {
        setSocialSecurityData(data)
      }
    } catch (error) {
      console.error('Error fetching social security:', error)
    } finally {
      setLoadingSocialSecurity(false)
    }
  }, [])

  // บันทึกเงินสมทบประกันสังคม
  const saveSocialSecurityContribution = async (employeeId: number, amount: number) => {
    setSavingSocialSecurity(employeeId)
    try {
      const res = await fetch('/api/social-security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          amount,
          month: parseInt(globalSelectedMonth),
          year: parseInt(globalSelectedYear),
        }),
      })
      if (res.ok) {
        // Refresh data
        fetchSocialSecurity(globalSelectedMonth, globalSelectedYear)
      }
    } catch (error) {
      console.error('Error saving social security:', error)
    } finally {
      setSavingSocialSecurity(null)
    }
  }

  // โหลดรายการอาคารและ Global Settings
  useEffect(() => {
    Promise.all([
      fetch('/api/buildings').then((res) => res.json()),
      fetch('/api/global-settings').then((res) => res.json()),
    ])
      .then(([buildingsData, globalData]) => {
        setBuildings(buildingsData)
        if (buildingsData.length > 0) {
          setSelectedBuilding(String(buildingsData[0].id))
        }
        setGlobalSettings(globalData)
      })
      .catch((err) => console.error('Error loading data:', err))
      .finally(() => setLoading(false))
  }, [])

  // โหลด global totals เมื่อเปลี่ยนเดือน/ปี
  useEffect(() => {
    fetchGlobalTotals(globalSelectedMonth, globalSelectedYear)
  }, [globalSelectedMonth, globalSelectedYear, fetchGlobalTotals])

  // โหลด settings totals เมื่อเปลี่ยนอาคาร หรือ เดือน/ปี
  useEffect(() => {
    if (selectedBuilding) {
      fetchSettingsTotals(selectedBuilding, buildingSelectedMonth, buildingSelectedYear)
    }
  }, [selectedBuilding, buildingSelectedMonth, buildingSelectedYear, fetchSettingsTotals])

  // โหลดเงินสมทบประกันสังคมเมื่อเปลี่ยนเดือน/ปี (ซิงค์กับค่าใช้จ่ายส่วนกลาง)
  useEffect(() => {
    fetchSocialSecurity(globalSelectedMonth, globalSelectedYear)
  }, [globalSelectedMonth, globalSelectedYear, fetchSocialSecurity])

  // โหลด settings เมื่อเลือกอาคาร
  useEffect(() => {
    if (!selectedBuilding) return

    setLoading(true)
    fetch(`/api/settings?buildingId=${selectedBuilding}`)
      .then((res) => res.json())
      .then((data) => {
        setSettings(data)
      })
      .catch((err) => console.error('Error loading settings:', err))
      .finally(() => setLoading(false))
  }, [selectedBuilding])

  const selectedBuildingData = buildings.find(
    (b) => String(b.id) === selectedBuilding
  )

  // สีของอาคารที่เลือก
  const buildingColor = selectedBuilding ? getBuildingColor(selectedBuilding) : '#84A59D'

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-[#333]">จัดการค่าใช้จ่ายส่วนกลาง</h1>
        <p className="text-xs sm:text-sm md:text-base text-[#666]">
          กำหนดค่าใช้จ่ายส่วนกลางและค่าคงที่สำหรับแต่ละอาคาร
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4">
        <TabsList className="bg-white p-1 shadow-sm flex-wrap h-auto gap-1">
          <TabsTrigger
            value="building-settings"
            className="transition-colors duration-300 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
            style={{
              backgroundColor: activeTab === 'building-settings' ? buildingColor : 'transparent',
              color: activeTab === 'building-settings' ? 'white' : undefined,
            }}
          >
            ตั้งค่าอาคาร
          </TabsTrigger>
          <TabsTrigger
            value="global-settings"
            className="transition-colors duration-300 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
            style={{
              backgroundColor: activeTab === 'global-settings' ? '#9B59B6' : 'transparent',
              color: activeTab === 'global-settings' ? 'white' : undefined,
            }}
          >
            ค่าใช้จ่ายส่วนกลาง
          </TabsTrigger>
          <TabsTrigger
            value="info"
            className="transition-colors duration-300 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
            style={{
              backgroundColor: activeTab === 'info' ? buildingColor : 'transparent',
              color: activeTab === 'info' ? 'white' : undefined,
            }}
          >
            ข้อมูลอาคาร
          </TabsTrigger>
        </TabsList>

        <TabsContent value="building-settings" className="space-y-3 sm:space-y-4">
          {/* เลือกอาคาร */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader
              className="text-white rounded-t-xl transition-colors duration-300 px-4 py-3 sm:px-6 sm:py-4"
              style={{ backgroundColor: buildingColor }}
            >
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                เลือกอาคาร
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue placeholder="เลือกอาคาร" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getBuildingColor(b.id) }}
                        />
                        {b.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* ตั้งค่า */}
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-[#666]">กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader
                className="text-white transition-colors duration-300 px-4 py-3 sm:px-6 sm:py-4"
                style={{ backgroundColor: buildingColor }}
              >
                <CardTitle className="text-white text-sm sm:text-base">ค่าใช้จ่ายคงที่ - {selectedBuildingData?.name}</CardTitle>
                <CardDescription className="text-white/80 text-xs sm:text-sm">
                  กำหนดค่าใช้จ่ายประจำสำหรับอาคารนี้
                </CardDescription>
              </CardHeader>
              <CardContent
                className="space-y-4 sm:space-y-6 p-3 sm:p-6 transition-colors duration-300"
                style={{ background: `linear-gradient(to bottom, ${buildingColor}10, white)` }}
              >
                {/* Selector เดือน/ปี สำหรับค่าเช่าอาคาร */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg" style={{ backgroundColor: `${buildingColor}15` }}>
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: buildingColor }} />
                  <span className="text-xs sm:text-sm font-medium" style={{ color: buildingColor }}>เดือน/ปี:</span>
                  <div className="flex gap-2 flex-1 sm:flex-none">
                    <Select value={buildingSelectedMonth} onValueChange={setBuildingSelectedMonth}>
                      <SelectTrigger className="w-full sm:w-[130px] bg-white text-xs sm:text-sm">
                        <SelectValue placeholder="เดือน" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableMonths(buildingSelectedYear, selectedBuildingData?.code).map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={buildingSelectedYear} onValueChange={setBuildingSelectedYear}>
                      <SelectTrigger className="w-[80px] sm:w-[100px] bg-white text-xs sm:text-sm">
                        <SelectValue placeholder="ปี" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {loadingSettingsTotals && <Loader2 className="h-4 w-4 animate-spin" style={{ color: buildingColor }} />}
                </div>

                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 md:gap-6">
                  {/* VAT */}
                  <div className="space-y-2 rounded-lg border border-[#84A59D]/30 bg-white p-3 sm:p-4 shadow-sm">
                    <Label className="text-[#84A59D] font-semibold text-xs sm:text-sm">
                      VAT (%)
                    </Label>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-[#84A59D]/5 border border-[#84A59D]/30 rounded-md text-right font-medium text-sm sm:text-base">
                        {formatNumber(settings?.vatPercent || 0)}%
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        type="button"
                        className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-[#84A59D] hover:bg-[#84A59D]/20 hover:text-[#84A59D]"
                        onClick={() => openPercentDialog('vatPercent', 'VAT', settings?.vatPercent || 0)}
                      >
                        <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                    <p className="text-[10px] sm:text-xs text-[#666]">ภาษีมูลค่าเพิ่ม</p>
                  </div>

                  {/* Monthly Rent - ซ่อนสำหรับ viewer */}
                  {!isViewer && (
                    <div className="space-y-2 rounded-lg border border-[#F28482]/30 bg-white p-3 sm:p-4 shadow-sm">
                      <Label className="text-[#F28482] font-semibold text-xs sm:text-sm">
                        ค่าเช่าอาคาร/เดือน (บาท)
                      </Label>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-[#F28482]/5 border border-[#F28482]/30 rounded-md text-right font-medium text-sm sm:text-base">
                          {formatNumber(settingsTotals.monthlyRent || 0)}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          type="button"
                          className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                          onClick={() => openAdjustDialog('edit', 'monthlyRent', 'ค่าเช่าอาคาร', 'building')}
                        >
                          <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          type="button"
                          className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                          onClick={() => openAdjustDialog('add', 'monthlyRent', 'ค่าเช่าอาคาร', 'building')}
                        >
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          type="button"
                          className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                          onClick={() => openAdjustDialog('subtract', 'monthlyRent', 'ค่าเช่าอาคาร', 'building')}
                        >
                          <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                      <p className="text-[10px] sm:text-xs text-[#666]">
                        ค่าเช่าอาคารรายเดือน
                      </p>
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab ค่าใช้จ่ายส่วนกลาง */}
        <TabsContent value="global-settings" className="space-y-3 sm:space-y-4">
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#9B59B6] to-[#8E44AD] text-white px-4 py-3 sm:px-6 sm:py-4">
              <CardTitle className="flex items-center gap-2 text-white text-sm sm:text-base">
                <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                ค่าใช้จ่ายส่วนกลาง
              </CardTitle>
              <CardDescription className="text-white/80 text-xs sm:text-sm">
                ค่าใช้จ่ายที่ใช้ร่วมกันทุกอาคาร (หาร {globalTotals?.buildingCount || 0} อาคาร)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6 bg-gradient-to-b from-[#9B59B6]/5 to-white">
              {/* Selector เดือน/ปี */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-[#9B59B6]/10 rounded-lg">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-[#9B59B6]" />
                <span className="text-xs sm:text-sm font-medium text-[#9B59B6]">เดือน/ปี:</span>
                <div className="flex gap-2 flex-1 sm:flex-none">
                  <Select value={globalSelectedMonth} onValueChange={setGlobalSelectedMonth}>
                    <SelectTrigger className="w-full sm:w-[130px] bg-white text-xs sm:text-sm">
                      <SelectValue placeholder="เดือน" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={globalSelectedYear} onValueChange={setGlobalSelectedYear}>
                    <SelectTrigger className="w-[80px] sm:w-[100px] bg-white text-xs sm:text-sm">
                      <SelectValue placeholder="ปี" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {loadingGlobal && <Loader2 className="h-4 w-4 animate-spin text-[#9B59B6]" />}
              </div>

              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* ค่าดูแล MAX - หาร 3 อาคาร */}
                <div className="space-y-3 rounded-xl border border-[#9B59B6]/30 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-[#9B59B6]/10">
                      <ShieldCheck className="h-4 w-4 text-[#9B59B6]" />
                    </div>
                    <Label className="text-[#9B59B6] font-semibold text-sm">ค่าดูแล MAX</Label>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-[#9B59B6]/5 border border-[#9B59B6]/30 rounded-md text-right font-medium text-sm sm:text-base">
                      {formatNumber(globalTotals?.totals?.maxCareExpense || 0)}
                    </div>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-blue-600 hover:bg-blue-100" onClick={() => openAdjustDialog('edit', 'maxCareExpense', 'ค่าดูแล MAX', 'global')}><Pencil className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'maxCareExpense', 'ค่าดูแล MAX', 'global')}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'maxCareExpense', 'ค่าดูแล MAX', 'global')}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร 3 อาคาร</span>
                    <span className="font-semibold text-[#9B59B6]">{formatNumber(globalTotals?.totalsPerBuilding?.maxCareExpensePerBuilding || 0)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าดูแลจราจร - หาร 3 อาคาร */}
                <div className="space-y-3 rounded-xl border border-[#E74C3C]/30 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-[#E74C3C]/10">
                      <TrafficCone className="h-4 w-4 text-[#E74C3C]" />
                    </div>
                    <Label className="text-[#E74C3C] font-semibold text-sm">ค่าดูแลจราจร</Label>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-[#E74C3C]/5 border border-[#E74C3C]/30 rounded-md text-right font-medium text-sm sm:text-base">
                      {formatNumber(globalTotals?.totals?.trafficCareExpense || 0)}
                    </div>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-blue-600 hover:bg-blue-100" onClick={() => openAdjustDialog('edit', 'trafficCareExpense', 'ค่าดูแลจราจร', 'global')}><Pencil className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'trafficCareExpense', 'ค่าดูแลจราจร', 'global')}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'trafficCareExpense', 'ค่าดูแลจราจร', 'global')}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร 3 อาคาร</span>
                    <span className="font-semibold text-[#E74C3C]">{formatNumber(globalTotals?.totalsPerBuilding?.trafficCareExpensePerBuilding || 0)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าขนส่งสินค้า - หาร 3 อาคาร */}
                <div className="space-y-3 rounded-xl border border-orange-500/30 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-orange-500/10">
                      <Truck className="h-4 w-4 text-orange-600" />
                    </div>
                    <Label className="text-orange-600 font-semibold text-sm">ค่าขนส่งสินค้า</Label>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-orange-50 border border-orange-200 rounded-md text-right font-medium text-sm sm:text-base">
                      {formatNumber(globalTotals?.totals?.shippingExpense || 0)}
                    </div>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-blue-600 hover:bg-blue-100" onClick={() => openAdjustDialog('edit', 'shippingExpense', 'ค่าขนส่งสินค้า', 'global')}><Pencil className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'shippingExpense', 'ค่าขนส่งสินค้า', 'global')}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'shippingExpense', 'ค่าขนส่งสินค้า', 'global')}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร 3 อาคาร</span>
                    <span className="font-semibold text-orange-600">{formatNumber(globalTotals?.totalsPerBuilding?.shippingExpensePerBuilding || 0)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่า Amenity */}
                <div className="space-y-3 rounded-xl border border-pink-400/30 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-pink-500/10">
                      <Sparkles className="h-4 w-4 text-pink-500" />
                    </div>
                    <Label className="text-pink-500 font-semibold text-sm">ค่า Amenity</Label>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-pink-50 border border-pink-200 rounded-md text-right font-medium text-sm sm:text-base">
                      {formatNumber(globalTotals?.totals?.amenityExpense || 0)}
                    </div>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-blue-600 hover:bg-blue-100" onClick={() => openAdjustDialog('edit', 'amenityExpense', 'ค่า Amenity', 'global')}><Pencil className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'amenityExpense', 'ค่า Amenity', 'global')}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'amenityExpense', 'ค่า Amenity', 'global')}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalTotals?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-pink-500">{formatNumber(globalTotals?.totalsPerBuilding?.amenityExpensePerBuilding || 0)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าน้ำเปล่า */}
                <div className="space-y-3 rounded-xl border border-cyan-400/30 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-cyan-500/10">
                      <Droplets className="h-4 w-4 text-cyan-500" />
                    </div>
                    <Label className="text-cyan-500 font-semibold text-sm">ค่าน้ำเปล่า</Label>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-cyan-50 border border-cyan-200 rounded-md text-right font-medium text-sm sm:text-base">
                      {formatNumber(globalTotals?.totals?.waterBottleExpense || 0)}
                    </div>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-blue-600 hover:bg-blue-100" onClick={() => openAdjustDialog('edit', 'waterBottleExpense', 'ค่าน้ำเปล่า', 'global')}><Pencil className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'waterBottleExpense', 'ค่าน้ำเปล่า', 'global')}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'waterBottleExpense', 'ค่าน้ำเปล่า', 'global')}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalTotals?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-cyan-500">{formatNumber(globalTotals?.totalsPerBuilding?.waterBottleExpensePerBuilding || 0)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าขนมคุ้กกี้ */}
                <div className="space-y-3 rounded-xl border border-amber-400/30 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-500/10">
                      <Cookie className="h-4 w-4 text-amber-600" />
                    </div>
                    <Label className="text-amber-600 font-semibold text-sm">ค่าขนมคุ้กกี้</Label>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-amber-50 border border-amber-200 rounded-md text-right font-medium text-sm sm:text-base">
                      {formatNumber(globalTotals?.totals?.cookieExpense || 0)}
                    </div>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-blue-600 hover:bg-blue-100" onClick={() => openAdjustDialog('edit', 'cookieExpense', 'ค่าขนมคุ้กกี้', 'global')}><Pencil className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'cookieExpense', 'ค่าขนมคุ้กกี้', 'global')}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'cookieExpense', 'ค่าขนมคุ้กกี้', 'global')}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalTotals?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-amber-600">{formatNumber(globalTotals?.totalsPerBuilding?.cookieExpensePerBuilding || 0)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่ากาแฟซอง น้ำตาล คอฟฟี่เมท */}
                <div className="space-y-3 rounded-xl border border-amber-700/30 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-700/10">
                      <Coffee className="h-4 w-4 text-amber-700" />
                    </div>
                    <Label className="text-amber-700 font-semibold text-sm">ค่ากาแฟซอง</Label>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-amber-50 border border-amber-300 rounded-md text-right font-medium text-sm sm:text-base">
                      {formatNumber(globalTotals?.totals?.coffeeExpense || 0)}
                    </div>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-blue-600 hover:bg-blue-100" onClick={() => openAdjustDialog('edit', 'coffeeExpense', 'ค่ากาแฟซอง', 'global')}><Pencil className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'coffeeExpense', 'ค่ากาแฟซอง', 'global')}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'coffeeExpense', 'ค่ากาแฟซอง', 'global')}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalTotals?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-amber-700">{formatNumber(globalTotals?.totalsPerBuilding?.coffeeExpensePerBuilding || 0)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าน้ำตาลซอง */}
                <div className="space-y-3 rounded-xl border border-amber-800/30 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-800/10">
                      <Coffee className="h-4 w-4 text-amber-800" />
                    </div>
                    <Label className="text-amber-800 font-semibold text-sm">ค่าน้ำตาลซอง</Label>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-amber-50 border border-amber-300 rounded-md text-right font-medium text-sm sm:text-base">
                      {formatNumber(globalTotals?.totals?.sugarExpense || 0)}
                    </div>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-blue-600 hover:bg-blue-100" onClick={() => openAdjustDialog('edit', 'sugarExpense', 'ค่าน้ำตาลซอง', 'global')}><Pencil className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'sugarExpense', 'ค่าน้ำตาลซอง', 'global')}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'sugarExpense', 'ค่าน้ำตาลซอง', 'global')}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalTotals?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-amber-800">{formatNumber(globalTotals?.totalsPerBuilding?.sugarExpensePerBuilding || 0)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าคอฟฟี่เมท */}
                <div className="space-y-3 rounded-xl border border-amber-900/30 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-900/10">
                      <Coffee className="h-4 w-4 text-amber-900" />
                    </div>
                    <Label className="text-amber-900 font-semibold text-sm">ค่าคอฟฟี่เมท</Label>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-amber-50 border border-amber-300 rounded-md text-right font-medium text-sm sm:text-base">
                      {formatNumber(globalTotals?.totals?.coffeeMateExpense || 0)}
                    </div>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-blue-600 hover:bg-blue-100" onClick={() => openAdjustDialog('edit', 'coffeeMateExpense', 'ค่าคอฟฟี่เมท', 'global')}><Pencil className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'coffeeMateExpense', 'ค่าคอฟฟี่เมท', 'global')}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'coffeeMateExpense', 'ค่าคอฟฟี่เมท', 'global')}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalTotals?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-amber-900">{formatNumber(globalTotals?.totalsPerBuilding?.coffeeMateExpensePerBuilding || 0)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าน้ำมันรถมอเตอร์ไซค์ */}
                <div className="space-y-3 rounded-xl border border-gray-500/30 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gray-500/10">
                      <Fuel className="h-4 w-4 text-gray-600" />
                    </div>
                    <Label className="text-gray-600 font-semibold text-sm">ค่าน้ำมันรถ</Label>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-300 rounded-md text-right font-medium text-sm sm:text-base">
                      {formatNumber(globalTotals?.totals?.fuelExpense || 0)}
                    </div>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-blue-600 hover:bg-blue-100" onClick={() => openAdjustDialog('edit', 'fuelExpense', 'ค่าน้ำมันรถ', 'global')}><Pencil className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'fuelExpense', 'ค่าน้ำมันรถ', 'global')}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'fuelExpense', 'ค่าน้ำมันรถ', 'global')}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalTotals?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-gray-600">{formatNumber(globalTotals?.totalsPerBuilding?.fuelExpensePerBuilding || 0)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าเช่าที่จอดรถมอเตอร์ไซค์ */}
                <div className="space-y-3 rounded-xl border border-slate-500/30 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-slate-500/10">
                      <ParkingCircle className="h-4 w-4 text-slate-600" />
                    </div>
                    <Label className="text-slate-600 font-semibold text-sm">ค่าที่จอดรถ</Label>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-300 rounded-md text-right font-medium text-sm sm:text-base">
                      {formatNumber(globalTotals?.totals?.parkingExpense || 0)}
                    </div>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-blue-600 hover:bg-blue-100" onClick={() => openAdjustDialog('edit', 'parkingExpense', 'ค่าที่จอดรถ', 'global')}><Pencil className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'parkingExpense', 'ค่าที่จอดรถ', 'global')}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'parkingExpense', 'ค่าที่จอดรถ', 'global')}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalTotals?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-slate-600">{formatNumber(globalTotals?.totalsPerBuilding?.parkingExpensePerBuilding || 0)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าซ่อมบำรุงรถมอเตอร์ไซค์ */}
                <div className="space-y-3 rounded-xl border border-rose-500/30 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-rose-500/10">
                      <Wrench className="h-4 w-4 text-rose-600" />
                    </div>
                    <Label className="text-rose-600 font-semibold text-sm">ค่าซ่อมบำรุงรถ</Label>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-rose-50 border border-rose-200 rounded-md text-right font-medium text-sm sm:text-base">
                      {formatNumber(globalTotals?.totals?.motorcycleMaintenanceExpense || 0)}
                    </div>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-blue-600 hover:bg-blue-100" onClick={() => openAdjustDialog('edit', 'motorcycleMaintenanceExpense', 'ค่าซ่อมบำรุงรถ', 'global')}><Pencil className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'motorcycleMaintenanceExpense', 'ค่าซ่อมบำรุงรถ', 'global')}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'motorcycleMaintenanceExpense', 'ค่าซ่อมบำรุงรถ', 'global')}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalTotals?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-rose-600">{formatNumber(globalTotals?.totalsPerBuilding?.motorcycleMaintenanceExpensePerBuilding || 0)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าเดินทางแม่บ้าน */}
                <div className="space-y-3 rounded-xl border border-violet-500/30 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-violet-500/10">
                      <Bus className="h-4 w-4 text-violet-600" />
                    </div>
                    <Label className="text-violet-600 font-semibold text-sm">ค่าเดินทางแม่บ้าน</Label>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-violet-50 border border-violet-200 rounded-md text-right font-medium text-sm sm:text-base">
                      {formatNumber(globalTotals?.totals?.maidTravelExpense || 0)}
                    </div>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-blue-600 hover:bg-blue-100" onClick={() => openAdjustDialog('edit', 'maidTravelExpense', 'ค่าเดินทางแม่บ้าน', 'global')}><Pencil className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'maidTravelExpense', 'ค่าเดินทางแม่บ้าน', 'global')}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'maidTravelExpense', 'ค่าเดินทางแม่บ้าน', 'global')}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalTotals?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-violet-600">{formatNumber(globalTotals?.totalsPerBuilding?.maidTravelExpensePerBuilding || 0)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าอุปกรณ์ทำความสะอาด */}
                <div className="space-y-3 rounded-xl border border-teal-500/30 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-teal-500/10">
                      <SprayCan className="h-4 w-4 text-teal-600" />
                    </div>
                    <Label className="text-teal-600 font-semibold text-sm">ค่าอุปกรณ์ทำความสะอาด</Label>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-teal-50 border border-teal-200 rounded-md text-right font-medium text-sm sm:text-base">
                      {formatNumber(globalTotals?.totals?.cleaningSupplyExpense || 0)}
                    </div>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-blue-600 hover:bg-blue-100" onClick={() => openAdjustDialog('edit', 'cleaningSupplyExpense', 'ค่าอุปกรณ์ทำความสะอาด', 'global')}><Pencil className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'cleaningSupplyExpense', 'ค่าอุปกรณ์ทำความสะอาด', 'global')}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'cleaningSupplyExpense', 'ค่าอุปกรณ์ทำความสะอาด', 'global')}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalTotals?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-teal-600">{formatNumber(globalTotals?.totalsPerBuilding?.cleaningSupplyExpensePerBuilding || 0)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าอาหาร */}
                <div className="space-y-3 rounded-xl border border-orange-400/30 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-orange-400/10">
                      <Utensils className="h-4 w-4 text-orange-500" />
                    </div>
                    <Label className="text-orange-500 font-semibold text-sm">ค่าอาหาร</Label>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-orange-50 border border-orange-200 rounded-md text-right font-medium text-sm sm:text-base">
                      {formatNumber(globalTotals?.totals?.foodExpense || 0)}
                    </div>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-blue-600 hover:bg-blue-100" onClick={() => openAdjustDialog('edit', 'foodExpense', 'ค่าอาหาร', 'global')}><Pencil className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'foodExpense', 'ค่าอาหาร', 'global')}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'foodExpense', 'ค่าอาหาร', 'global')}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalTotals?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-orange-500">{formatNumber(globalTotals?.totalsPerBuilding?.foodExpensePerBuilding || 0)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* เงินสมทบประกันสังคม */}
                <div className="space-y-3 rounded-xl border border-[#E91E63]/30 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-[#E91E63]/10">
                      <HeartPulse className="h-4 w-4 text-[#E91E63]" />
                    </div>
                    <Label className="text-[#E91E63] font-semibold text-sm">เงินสมทบประกันสังคม</Label>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-[#E91E63]/5 border border-[#E91E63]/20 rounded-md text-right font-medium text-sm sm:text-base">
                      {formatNumber(socialSecurityData?.totalAmount || 0)}
                    </div>
                    <Button size="icon" variant="ghost" type="button" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-[#E91E63] hover:bg-[#E91E63]/10" onClick={() => setSocialSecurityDialogOpen(true)}><Pencil className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร 5 อาคาร</span>
                    <span className="font-semibold text-[#E91E63]">{formatNumber(socialSecurityData?.amountPerBuilding || 0)} บาท/อาคาร</span>
                  </div>
                </div>
              </div>

              {/* สรุปค่าใช้จ่ายต่ออาคาร */}
              {globalTotals && globalTotals.buildingCount > 0 && (
                <div className="rounded-xl border border-[#9B59B6]/20 bg-gradient-to-br from-[#9B59B6]/5 to-white p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-[#9B59B6]/10">
                      <Globe className="h-4 w-4 text-[#9B59B6]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-700">สรุปค่าใช้จ่ายต่ออาคาร</h4>
                      <p className="text-[10px] text-slate-400">* หาร 3 อาคาร (CT, YW, NANA) | หาร {globalTotals.buildingCount} อาคาร (ทุกอาคาร)</p>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-[#9B59B6]/10 text-sm">
                      <ShieldCheck className="h-4 w-4 text-[#9B59B6] flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าดูแล MAX</span>
                      <span className="font-semibold text-[#9B59B6]">{formatNumber(globalTotals.totalsPerBuilding?.maxCareExpensePerBuilding || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-[#E74C3C]/10 text-sm">
                      <TrafficCone className="h-4 w-4 text-[#E74C3C] flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าดูแลจราจร</span>
                      <span className="font-semibold text-[#E74C3C]">{formatNumber(globalTotals.totalsPerBuilding?.trafficCareExpensePerBuilding || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-orange-500/10 text-sm">
                      <Truck className="h-4 w-4 text-orange-600 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าขนส่งสินค้า</span>
                      <span className="font-semibold text-orange-600">{formatNumber(globalTotals.totalsPerBuilding?.shippingExpensePerBuilding || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-pink-400/10 text-sm">
                      <Sparkles className="h-4 w-4 text-pink-500 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่า Amenity</span>
                      <span className="font-semibold text-pink-500">{formatNumber(globalTotals.totalsPerBuilding?.amenityExpensePerBuilding || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-cyan-400/10 text-sm">
                      <Droplets className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าน้ำเปล่า</span>
                      <span className="font-semibold text-cyan-500">{formatNumber(globalTotals.totalsPerBuilding?.waterBottleExpensePerBuilding || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-amber-400/10 text-sm">
                      <Cookie className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าขนมคุ้กกี้</span>
                      <span className="font-semibold text-amber-600">{formatNumber(globalTotals.totalsPerBuilding?.cookieExpensePerBuilding || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-amber-700/10 text-sm">
                      <Coffee className="h-4 w-4 text-amber-700 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่ากาแฟซอง</span>
                      <span className="font-semibold text-amber-700">{formatNumber(globalTotals.totalsPerBuilding?.coffeeExpensePerBuilding || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-amber-800/10 text-sm">
                      <Coffee className="h-4 w-4 text-amber-800 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าน้ำตาลซอง</span>
                      <span className="font-semibold text-amber-800">{formatNumber(globalTotals.totalsPerBuilding?.sugarExpensePerBuilding || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-amber-900/10 text-sm">
                      <Coffee className="h-4 w-4 text-amber-900 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าคอฟฟี่เมท</span>
                      <span className="font-semibold text-amber-900">{formatNumber(globalTotals.totalsPerBuilding?.coffeeMateExpensePerBuilding || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-gray-500/10 text-sm">
                      <Fuel className="h-4 w-4 text-gray-600 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าน้ำมันรถ</span>
                      <span className="font-semibold text-gray-600">{formatNumber(globalTotals.totalsPerBuilding?.fuelExpensePerBuilding || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-500/10 text-sm">
                      <ParkingCircle className="h-4 w-4 text-slate-600 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าที่จอดรถ</span>
                      <span className="font-semibold text-slate-600">{formatNumber(globalTotals.totalsPerBuilding?.parkingExpensePerBuilding || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-rose-500/10 text-sm">
                      <Wrench className="h-4 w-4 text-rose-600 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าซ่อมบำรุงรถ</span>
                      <span className="font-semibold text-rose-600">{formatNumber(globalTotals.totalsPerBuilding?.motorcycleMaintenanceExpensePerBuilding || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-violet-500/10 text-sm">
                      <Bus className="h-4 w-4 text-violet-600 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าเดินทางแม่บ้าน</span>
                      <span className="font-semibold text-violet-600">{formatNumber(globalTotals.totalsPerBuilding?.maidTravelExpensePerBuilding || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-teal-500/10 text-sm">
                      <SprayCan className="h-4 w-4 text-teal-600 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าอุปกรณ์ทำความสะอาด</span>
                      <span className="font-semibold text-teal-600">{formatNumber(globalTotals.totalsPerBuilding?.cleaningSupplyExpensePerBuilding || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-orange-400/10 text-sm">
                      <Utensils className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าอาหาร</span>
                      <span className="font-semibold text-orange-500">{formatNumber(globalTotals.totalsPerBuilding?.foodExpensePerBuilding || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-[#E91E63]/10 text-sm">
                      <HeartPulse className="h-4 w-4 text-[#E91E63] flex-shrink-0" />
                      <span className="text-slate-600 flex-1">เงินสมทบประกันสังคม</span>
                      <span className="font-semibold text-[#E91E63]">{formatNumber(socialSecurityData?.amountPerBuilding || 0)}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex justify-between items-center p-2 bg-[#9B59B6]/10 rounded">
                      <span className="font-semibold text-slate-700">รวมค่าใช้จ่ายส่วนกลาง/อาคาร (ทุกอาคาร)</span>
                      <span className="font-bold text-[#9B59B6] text-lg">
                        {formatNumber(globalTotals.totalGlobalExpense || 0)} บาท
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          </TabsContent>

      {/* Dialog เงินสมทบประกันสังคม */}
      <Dialog open={socialSecurityDialogOpen} onOpenChange={setSocialSecurityDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[550px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="bg-gradient-to-r from-[#E91E63] to-[#C2185B] -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 py-3 sm:py-4 rounded-t-lg">
            <DialogTitle className="flex items-center gap-2 text-white">
              <HeartPulse className="h-5 w-5" />
              เงินสมทบประกันสังคม (นายจ้าง)
            </DialogTitle>
            <p className="text-white/80 text-sm">
              กรอกจำนวนเงินสมทบประกันสังคมของแต่ละพนักงาน (หาร 5 อาคาร)
            </p>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* รายชื่อพนักงาน */}
            {socialSecurityData && socialSecurityData.employees.length > 0 ? (
              <div className="space-y-2">
                {socialSecurityData.employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#E91E63]/20 hover:border-[#E91E63]/40 transition-colors"
                  >
                    <Checkbox
                      id={`dialog-emp-${emp.id}`}
                      checked={emp.amount > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          // เมื่อ check ให้ตั้งค่าเริ่มต้น 750 บาท
                          setSocialSecurityData((prev) => {
                            if (!prev) return prev
                            return {
                              ...prev,
                              employees: prev.employees.map((e) =>
                                e.id === emp.id ? { ...e, amount: 750 } : e
                              ),
                            }
                          })
                          saveSocialSecurityContribution(emp.id, 750)
                        } else {
                          // เมื่อ uncheck ให้ตั้งค่าเป็น 0
                          setSocialSecurityData((prev) => {
                            if (!prev) return prev
                            return {
                              ...prev,
                              employees: prev.employees.map((e) =>
                                e.id === emp.id ? { ...e, amount: 0 } : e
                              ),
                            }
                          })
                          saveSocialSecurityContribution(emp.id, 0)
                        }
                      }}
                      className="h-5 w-5 border-[#E91E63] data-[state=checked]:bg-[#E91E63] data-[state=checked]:border-[#E91E63]"
                    />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={`dialog-emp-${emp.id}`} className="font-medium text-slate-700 cursor-pointer text-sm">
                        {emp.firstName} {emp.lastName}
                        {emp.nickname && <span className="text-slate-400 ml-1">({emp.nickname})</span>}
                      </Label>
                      <p className="text-xs text-slate-400">
                        {emp.position === 'MAID' ? 'แม่บ้าน' : emp.position === 'MANAGER' ? 'ผู้จัดการ' : 'หุ้นส่วน'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={emp.amount || ''}
                        onChange={(e) => {
                          const newAmount = parseFloat(e.target.value) || 0
                          setSocialSecurityData((prev) => {
                            if (!prev) return prev
                            return {
                              ...prev,
                              employees: prev.employees.map((e) =>
                                e.id === emp.id ? { ...e, amount: newAmount } : e
                              ),
                            }
                          })
                        }}
                        onBlur={(e) => {
                          const newAmount = parseFloat(e.target.value) || 0
                          saveSocialSecurityContribution(emp.id, newAmount)
                        }}
                        placeholder="0"
                        className="w-24 text-right border-[#E91E63]/30 focus:border-[#E91E63]"
                        disabled={savingSocialSecurity === emp.id}
                      />
                      <span className="text-xs text-slate-500">บาท</span>
                      {savingSocialSecurity === emp.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-[#E91E63]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                {loadingSocialSecurity ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>กำลังโหลด...</span>
                  </div>
                ) : (
                  <p>ไม่พบข้อมูลพนักงาน กรุณาเพิ่มพนักงานก่อน</p>
                )}
              </div>
            )}

            {/* สรุปยอดรวม */}
            {socialSecurityData && socialSecurityData.employees.length > 0 && (
              <div className="p-4 bg-[#E91E63]/10 rounded-xl border border-[#E91E63]/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-slate-700">รวมเงินสมทบประกันสังคม</span>
                  <span className="font-bold text-[#E91E63] text-lg">
                    {formatNumber(socialSecurityData.totalAmount || 0)} บาท
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#E91E63]/20">
                  <span className="text-sm text-slate-500">หาร 5 อาคาร</span>
                  <span className="font-semibold text-[#E91E63]">
                    {formatNumber(socialSecurityData.amountPerBuilding || 0)} บาท/อาคาร
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSocialSecurityDialogOpen(false)} className="w-full sm:w-auto">
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        <TabsContent value="info" className="space-y-4">
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#84A59D] to-[#6b8a84] text-white px-4 py-3 sm:px-6 sm:py-4">
              <CardTitle className="text-white text-sm sm:text-base">ข้อมูลอาคารทั้งหมด</CardTitle>
              <CardDescription className="text-white/80 text-xs sm:text-sm">
                รายการอาคารที่มีในระบบ
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 bg-gradient-to-b from-[#84A59D]/5 to-white">
              <div className="space-y-4">
                {buildings.map((building) => (
                  <div
                    key={building.id}
                    className="flex items-center justify-between rounded-xl border-2 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderColor: getBuildingColor(building.id) }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-white font-bold shadow-md"
                        style={{ backgroundColor: getBuildingColor(building.id) }}
                      >
                        {building.code}
                      </div>
                      <div>
                        <p className="font-semibold text-[#333]">{building.name}</p>
                        <p className="text-sm text-[#666]">
                          รหัส: {building.code}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Formula Info */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#F28482] to-[#d96f6d] text-white px-4 py-3 sm:px-6 sm:py-4">
              <CardTitle className="text-white text-sm sm:text-base">สูตรการคำนวณ</CardTitle>
              <CardDescription className="text-white/80 text-xs sm:text-sm">
                สูตรที่ใช้ในการคำนวณผลประกอบการ
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 bg-gradient-to-b from-[#F28482]/5 to-white">
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border-l-4 border-l-[#84A59D] bg-[#84A59D]/10 p-4">
                  <p className="font-semibold text-[#84A59D]">รวมรายได้ค่าเช่า</p>
                  <p className="text-[#666] font-mono">= ผลรวมรายรับทั้งหมด</p>
                </div>
                <div className="rounded-lg border-l-4 border-l-[#F28482] bg-[#F28482]/10 p-4">
                  <p className="font-semibold text-[#F28482]">Gross Profit</p>
                  <p className="text-[#666] font-mono">= รวมรายได้ - รวมค่าใช้จ่าย</p>
                  <p className="text-xs text-slate-400 mt-1">(รวมค่าใช้จ่ายรวมค่าเช่าอาคารแล้ว)</p>
                </div>
                <div className="rounded-lg border-l-4 border-l-[#F6BD60] bg-[#F6BD60]/10 p-4">
                  <p className="font-semibold text-[#D4A24C]">Management Fee</p>
                  <p className="text-[#666] font-mono">= รายได้ค่าเช่า × 13.5%</p>
                  <p className="text-xs text-slate-400 mt-1">(เฉพาะรายได้ค่าเช่าเท่านั้น ไม่รวมค่าอาหาร, รับส่ง, ทัวร์)</p>
                </div>
                <div className="rounded-lg border-l-4 border-l-[#84A59D] bg-[#84A59D]/10 p-4">
                  <p className="font-semibold text-[#84A59D]">Net Profit for Owner</p>
                  <p className="text-[#666] font-mono">
                    = Gross Profit - Management Fee - VAT - Little Hotelier
                  </p>
                </div>
                <div className="rounded-lg border-l-4 border-l-[#F6BD60] bg-[#F6BD60]/10 p-4">
                  <p className="font-semibold text-[#D4A24C]">Amount to be Paid</p>
                  <p className="text-[#666] font-mono">= Management Fee × 1.07 (รวม VAT 7%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog เพิ่ม/ลดยอด */}
      <Dialog open={adjustDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className={`text-xs sm:text-base ${
              adjustType === 'edit'
                ? 'text-blue-600'
                : adjustType === 'add'
                  ? 'text-green-600'
                  : 'text-red-600'
            }`}>
              {adjustType === 'edit' ? (
                <span className="flex items-center gap-1 sm:gap-2">
                  <Pencil className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                  แก้ไข: {adjustFieldName}
                </span>
              ) : adjustType === 'add' ? (
                <span className="flex items-center gap-1 sm:gap-2">
                  <Plus className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                  เพิ่มยอด {adjustFieldName}
                </span>
              ) : (
                <span className="flex items-center gap-1 sm:gap-2">
                  <Minus className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                  ลดยอด {adjustFieldName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 sm:space-y-4 py-1 sm:py-4">
            {/* เลือกเดือน/ปี */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 p-1.5 sm:p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-1 sm:gap-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 hidden sm:block" />
                <Select
                  value={adjustMonth.toString()}
                  onValueChange={(value) => handleMonthYearChange(parseInt(value), adjustYear)}
                >
                  <SelectTrigger className="w-[85px] sm:w-[120px] h-7 sm:h-10 text-[11px] sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableMonths(adjustYear, selectedBuildingData?.code).map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={adjustYear.toString()}
                  onValueChange={(value) => handleMonthYearChange(adjustMonth, parseInt(value))}
                >
                  <SelectTrigger className="w-[60px] sm:w-[100px] h-7 sm:h-10 text-[11px] sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:ml-auto text-right">
                <div className="text-[9px] sm:text-xs text-slate-500">ยอดรวมเดือนนี้</div>
                <div className="text-xs sm:text-xl font-bold text-slate-700">{formatNumber(historyTotal)} บาท</div>
              </div>
            </div>

            {/* ประวัติรายการ */}
            <div className="border rounded-lg">
              <div className="bg-slate-100 px-1.5 sm:px-3 py-1 sm:py-2 font-semibold text-[10px] sm:text-sm text-slate-600 border-b">
                ประวัติ ({expenseHistory.length} รายการ)
              </div>
              <div className="max-h-[120px] sm:max-h-[200px] overflow-y-auto">
                {loadingHistory ? (
                  <div className="p-2 sm:p-4 text-center text-slate-500">
                    <Loader2 className="h-3 w-3 sm:h-5 sm:w-5 animate-spin mx-auto" />
                    <span className="text-[10px] sm:text-sm">กำลังโหลด...</span>
                  </div>
                ) : expenseHistory.length === 0 ? (
                  <div className="p-2 sm:p-4 text-center text-slate-400 text-[10px] sm:text-sm">
                    ยังไม่มีรายการในเดือนนี้
                  </div>
                ) : (
                  <div className="divide-y">
                    {expenseHistory.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-1.5 sm:px-3 py-1 sm:py-2 hover:bg-slate-50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <span className={`text-[9px] sm:text-xs px-0.5 sm:px-1.5 py-0.5 rounded ${item.actionType === 'ADD' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {item.actionType === 'ADD' ? '+' : '-'}
                            </span>
                            <span className="font-medium text-[10px] sm:text-sm truncate">{item.description}</span>
                          </div>
                          <div className="text-[9px] sm:text-xs text-slate-400 mt-0.5">
                            {new Date(item.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <span className={`font-semibold text-[10px] sm:text-sm ${item.actionType === 'ADD' ? 'text-green-600' : 'text-red-600'}`}>
                            {item.actionType === 'ADD' ? '+' : '-'}{formatNumber(Number(item.amount))}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 sm:h-7 sm:w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteHistory(item.id)}
                            disabled={deletingId === item.id}
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-2.5 w-2.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Form กรอกรายการใหม่ */}
            <div className={`border-2 rounded-lg p-2 sm:p-4 ${
              adjustType === 'edit'
                ? 'border-blue-200 bg-blue-50/50'
                : adjustType === 'add'
                  ? 'border-green-200 bg-green-50/50'
                  : 'border-red-200 bg-red-50/50'
            }`}>
              <div className="flex items-center justify-between mb-1.5 sm:mb-3">
                <div className="text-[10px] sm:text-sm font-semibold flex items-center gap-1 sm:gap-2">
                  {adjustType === 'edit' ? (
                    <><Pencil className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-blue-600" /> เพิ่ม/ลด</>
                  ) : adjustType === 'add' ? (
                    <><Plus className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-green-600" /> เพิ่มรายการ</>
                  ) : (
                    <><Minus className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-red-600" /> ลดรายการ</>
                  )}
                </div>
                {/* ตัวเลือก add/subtract สำหรับ edit mode */}
                {adjustType === 'edit' && (
                  <div className="flex gap-0.5">
                    <Button
                      size="sm"
                      variant={adjustAction === 'add' ? 'default' : 'outline'}
                      className={`h-6 sm:h-8 text-[10px] sm:text-sm px-1.5 sm:px-3 ${adjustAction === 'add' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      onClick={() => setAdjustAction('add')}
                    >
                      <Plus className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-0.5" />
                      เพิ่ม
                    </Button>
                    <Button
                      size="sm"
                      variant={adjustAction === 'subtract' ? 'default' : 'outline'}
                      className={`h-6 sm:h-8 text-[10px] sm:text-sm px-1.5 sm:px-3 ${adjustAction === 'subtract' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                      onClick={() => setAdjustAction('subtract')}
                    >
                      <Minus className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-0.5" />
                      ลด
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid gap-1.5 sm:gap-3">
                <div>
                  <Label htmlFor="adjustDescription" className="text-[9px] sm:text-xs">รายละเอียด *</Label>
                  <Input
                    id="adjustDescription"
                    autoFocus
                    value={adjustDescription}
                    onChange={(e) => setAdjustDescription(e.target.value)}
                    placeholder="เช่น ค่าฉีดปลวก"
                    className={`mt-0.5 h-7 sm:h-10 text-[11px] sm:text-sm ${!adjustDescription.trim() && adjustAmount ? 'border-red-300 focus:border-red-500' : ''}`}
                  />
                </div>
                <div>
                  <Label htmlFor="adjustAmount" className="text-[9px] sm:text-xs">จำนวนเงิน (บาท) *</Label>
                  <Input
                    id="adjustAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="0"
                    className={`mt-0.5 h-7 sm:h-10 text-[11px] sm:text-sm ${adjustDescription.trim() && (!adjustAmount || parseFloat(adjustAmount) <= 0) ? 'border-red-300 focus:border-red-500' : ''}`}
                  />
                </div>
              </div>

              {/* Preview ยอดใหม่ */}
              {adjustAmount && parseFloat(adjustAmount) > 0 && (
                <div className="mt-1.5 sm:mt-3 pt-1.5 sm:pt-3 border-t border-dashed flex justify-between items-center">
                  <span className="text-[10px] sm:text-sm text-slate-600">ยอดรวมหลังบันทึก</span>
                  <span className="text-xs sm:text-lg font-bold text-slate-800">{formatNumber(getNewAmount())} บาท</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-1.5 sm:gap-2">
            <Button variant="outline" onClick={() => handleDialogClose(false)} className="w-full sm:w-auto h-7 sm:h-10 text-[11px] sm:text-sm">
              ปิด
            </Button>
            <Button
              onClick={handleAdjustConfirm}
              disabled={!adjustAmount || parseFloat(adjustAmount) <= 0 || !adjustDescription.trim() || savingHistory}
              className={`w-full sm:w-auto h-7 sm:h-10 text-[11px] sm:text-sm ${getEffectiveAction() === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {savingHistory ? (
                <Loader2 className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-1 animate-spin" />
              ) : getEffectiveAction() === 'add' ? (
                <Plus className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-1" />
              ) : (
                <Minus className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-1" />
              )}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog แก้ไขค่า % */}
      <Dialog open={percentDialogOpen} onOpenChange={setPercentDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-slate-700">
              <span className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                แก้ไข {percentFieldName}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="percentValue" className="text-sm font-medium">
                กรอกค่าเปอร์เซ็นต์ (%)
              </Label>
              <Input
                id="percentValue"
                type="number"
                step="0.1"
                min="0"
                max="100"
                autoFocus
                value={percentValue}
                onChange={(e) => setPercentValue(e.target.value)}
                placeholder="เช่น 13.5"
                className="text-lg font-medium"
              />
              <p className="text-xs text-slate-500">
                ค่านี้จะถูกใช้ในการคำนวณรายงาน
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setPercentDialogOpen(false)} className="w-full sm:w-auto">
              ยกเลิก
            </Button>
            <Button
              onClick={handlePercentSave}
              disabled={!percentValue || parseFloat(percentValue) < 0 || savingPercent}
              style={{ backgroundColor: buildingColor }}
              className="w-full sm:w-auto hover:opacity-90"
            >
              {savingPercent ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4 mr-1" />
              )}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
