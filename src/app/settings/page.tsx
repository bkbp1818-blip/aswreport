'use client'

import { useEffect, useState } from 'react'
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
  Save,
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
  Plus,
  Minus,
  Trash2,
  Calendar,
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { getBuildingColor } from '@/lib/building-colors'

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
  maxCareExpense: number
  trafficCareExpense: number
  shippingExpense: number
  amenityExpense: number
  waterBottleExpense: number
  cookieExpense: number
  coffeeExpense: number
  fuelExpense: number
  parkingExpense: number
  motorcycleMaintenanceExpense: number
  maidTravelExpense: number
  cleaningSupplyExpense: number
  laundryDetergentExpense: number
  [key: string]: number // for dynamic fields
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

export default function SettingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<string>('')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingGlobal, setSavingGlobal] = useState(false)
  const [activeTab, setActiveTab] = useState('building-settings')

  // Form state
  const [formData, setFormData] = useState({
    managementFeePercent: 13.5,
    vatPercent: 7,
    monthlyRent: 0,
    cowayWaterFilterExpense: 0,
  })

  // Global settings form state
  const [globalFormData, setGlobalFormData] = useState({
    maxCareExpense: 0,
    trafficCareExpense: 0,
    shippingExpense: 0,
    amenityExpense: 0,
    waterBottleExpense: 0,
    cookieExpense: 0,
    coffeeExpense: 0,
    fuelExpense: 0,
    parkingExpense: 0,
    motorcycleMaintenanceExpense: 0,
    maidTravelExpense: 0,
    cleaningSupplyExpense: 0,
    laundryDetergentExpense: 0,
  })

  // State สำหรับ Dialog เพิ่ม/ลดยอด
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add')
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

  // เปิด Dialog เพิ่ม/ลดยอด
  const openAdjustDialog = (
    type: 'add' | 'subtract',
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
        // อัปเดตยอดใน form
        if (adjustTarget === 'building') {
          setFormData((prev) => ({ ...prev, [adjustFieldKey]: data.total || 0 }))
        } else {
          setGlobalFormData((prev) => ({ ...prev, [adjustFieldKey]: data.total || 0 }))
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
          actionType: adjustType === 'add' ? 'ADD' : 'SUBTRACT',
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
        // อัปเดตยอดใน form
        if (adjustTarget === 'building') {
          setFormData((prev) => ({ ...prev, [adjustFieldKey]: data.total || 0 }))
        } else {
          setGlobalFormData((prev) => ({ ...prev, [adjustFieldKey]: data.total || 0 }))
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

  // คำนวณยอดปัจจุบัน (จาก historyTotal)
  const getCurrentAmount = () => {
    return historyTotal
  }

  // คำนวณยอดใหม่ (preview)
  const getNewAmount = () => {
    const currentValue = historyTotal
    const adjustValue = parseFloat(adjustAmount) || 0
    const newValue = adjustType === 'add'
      ? currentValue + adjustValue
      : currentValue - adjustValue
    return Math.max(0, newValue) // ไม่ให้ติดลบ
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
        setGlobalFormData({
          maxCareExpense: globalData.maxCareExpense || 0,
          trafficCareExpense: globalData.trafficCareExpense || 0,
          shippingExpense: globalData.shippingExpense || 0,
          amenityExpense: globalData.amenityExpense || 0,
          waterBottleExpense: globalData.waterBottleExpense || 0,
          cookieExpense: globalData.cookieExpense || 0,
          coffeeExpense: globalData.coffeeExpense || 0,
          fuelExpense: globalData.fuelExpense || 0,
          parkingExpense: globalData.parkingExpense || 0,
          motorcycleMaintenanceExpense: globalData.motorcycleMaintenanceExpense || 0,
          maidTravelExpense: globalData.maidTravelExpense || 0,
          cleaningSupplyExpense: globalData.cleaningSupplyExpense || 0,
          laundryDetergentExpense: globalData.laundryDetergentExpense || 0,
        })
      })
      .catch((err) => console.error('Error loading data:', err))
      .finally(() => setLoading(false))
  }, [])

  // โหลด settings เมื่อเลือกอาคาร
  useEffect(() => {
    if (!selectedBuilding) return

    setLoading(true)
    fetch(`/api/settings?buildingId=${selectedBuilding}`)
      .then((res) => res.json())
      .then((data) => {
        setSettings(data)
        if (data) {
          setFormData({
            managementFeePercent: Number(data.managementFeePercent) || 13.5,
            vatPercent: Number(data.vatPercent) || 7,
            monthlyRent: Number(data.monthlyRent) || 0,
            cowayWaterFilterExpense: Number(data.cowayWaterFilterExpense) || 0,
          })
        }
      })
      .catch((err) => console.error('Error loading settings:', err))
      .finally(() => setLoading(false))
  }, [selectedBuilding])

  const handleSave = async () => {
    if (!selectedBuilding) return

    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId: selectedBuilding,
          ...formData,
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
      alert('บันทึกการตั้งค่าสำเร็จ')
    } catch (err) {
      console.error('Error saving:', err)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveGlobal = async () => {
    setSavingGlobal(true)
    try {
      const res = await fetch('/api/global-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(globalFormData),
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

      // โหลด global settings ใหม่เพื่ออัปเดตค่าที่หารแล้ว
      const updatedGlobal = await fetch('/api/global-settings').then((r) => r.json())
      setGlobalSettings(updatedGlobal)

      alert('บันทึกการตั้งค่าส่วนกลางสำเร็จ')
    } catch (err) {
      console.error('Error saving global settings:', err)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSavingGlobal(false)
    }
  }

  const selectedBuildingData = buildings.find(
    (b) => String(b.id) === selectedBuilding
  )

  // สีของอาคารที่เลือก
  const buildingColor = selectedBuilding ? getBuildingColor(selectedBuilding) : '#84A59D'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#333] md:text-2xl">จัดการค่าใช้จ่ายส่วนกลาง</h1>
        <p className="text-sm text-[#666] md:text-base">
          กำหนดค่าใช้จ่ายส่วนกลางและค่าคงที่สำหรับแต่ละอาคาร
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white p-1 shadow-sm">
          <TabsTrigger
            value="building-settings"
            className="transition-colors duration-300"
            style={{
              backgroundColor: activeTab === 'building-settings' ? buildingColor : 'transparent',
              color: activeTab === 'building-settings' ? 'white' : undefined,
            }}
          >
            ตั้งค่าอาคาร
          </TabsTrigger>
          <TabsTrigger
            value="global-settings"
            className="transition-colors duration-300"
            style={{
              backgroundColor: activeTab === 'global-settings' ? '#9B59B6' : 'transparent',
              color: activeTab === 'global-settings' ? 'white' : undefined,
            }}
          >
            ค่าใช้จ่ายส่วนกลาง
          </TabsTrigger>
          <TabsTrigger
            value="info"
            className="transition-colors duration-300"
            style={{
              backgroundColor: activeTab === 'info' ? buildingColor : 'transparent',
              color: activeTab === 'info' ? 'white' : undefined,
            }}
          >
            ข้อมูลอาคาร
          </TabsTrigger>
        </TabsList>

        <TabsContent value="building-settings" className="space-y-4">
          {/* เลือกอาคาร */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader
              className="text-white rounded-t-xl transition-colors duration-300"
              style={{ backgroundColor: buildingColor }}
            >
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                เลือกอาคาร
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
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
                className="text-white transition-colors duration-300"
                style={{ backgroundColor: buildingColor }}
              >
                <CardTitle className="text-white">ค่าใช้จ่ายคงที่ - {selectedBuildingData?.name}</CardTitle>
                <CardDescription className="text-white/80">
                  กำหนดค่าใช้จ่ายประจำสำหรับอาคารนี้
                </CardDescription>
              </CardHeader>
              <CardContent
                className="space-y-6 p-6 transition-colors duration-300"
                style={{ background: `linear-gradient(to bottom, ${buildingColor}10, white)` }}
              >
                <div className="grid gap-4 sm:grid-cols-2 md:gap-6">
                  {/* Management Fee */}
                  <div className="space-y-2 rounded-lg border border-[#F6BD60]/30 bg-white p-4 shadow-sm">
                    <Label htmlFor="managementFee" className="text-[#D4A24C] font-semibold">
                      Management Fee (%)
                    </Label>
                    <Input
                      id="managementFee"
                      type="number"
                      step="0.1"
                      value={formData.managementFeePercent}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          managementFeePercent: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="bg-[#F6BD60]/5 border-[#F6BD60]/30 focus:border-[#F6BD60] focus:ring-[#F6BD60]"
                    />
                    <p className="text-xs text-[#666]">
                      เปอร์เซ็นต์ค่าบริหารจัดการ (Roombix)
                    </p>
                    <p className="text-[10px] text-slate-400">
                      สูตร: = รายได้ค่าเช่า × {formData.managementFeePercent}%
                    </p>
                  </div>

                  {/* VAT */}
                  <div className="space-y-2 rounded-lg border border-[#84A59D]/30 bg-white p-4 shadow-sm">
                    <Label htmlFor="vat" className="text-[#84A59D] font-semibold">
                      VAT (%)
                    </Label>
                    <Input
                      id="vat"
                      type="number"
                      step="0.1"
                      value={formData.vatPercent}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          vatPercent: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="bg-[#84A59D]/5 border-[#84A59D]/30 focus:border-[#84A59D] focus:ring-[#84A59D]"
                    />
                    <p className="text-xs text-[#666]">ภาษีมูลค่าเพิ่ม</p>
                  </div>

                  {/* Monthly Rent */}
                  <div className="space-y-2 rounded-lg border border-[#F28482]/30 bg-white p-4 shadow-sm">
                    <Label htmlFor="monthlyRent" className="text-[#F28482] font-semibold">
                      ค่าเช่าอาคาร/เดือน (บาท)
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id="monthlyRent"
                        type="number"
                        value={formData.monthlyRent}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            monthlyRent: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="bg-[#F28482]/5 border-[#F28482]/30 focus:border-[#F28482] focus:ring-[#F28482] flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        type="button"
                        className="h-9 w-9 flex-shrink-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                        onClick={() => openAdjustDialog('add', 'monthlyRent', 'ค่าเช่าอาคาร', 'building')}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        type="button"
                        className="h-9 w-9 flex-shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                        onClick={() => openAdjustDialog('subtract', 'monthlyRent', 'ค่าเช่าอาคาร', 'building')}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-[#666]">
                      ค่าเช่าอาคารรายเดือน
                    </p>
                  </div>

                  {/* Coway Water Filter */}
                  <div className="space-y-2 rounded-lg border border-blue-400/30 bg-white p-4 shadow-sm">
                    <Label htmlFor="cowayWaterFilter" className="text-blue-500 font-semibold">
                      ค่าเช่าเครื่องกรองน้ำ Coway (บาท/เดือน)
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id="cowayWaterFilter"
                        type="number"
                        value={formData.cowayWaterFilterExpense}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            cowayWaterFilterExpense: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="bg-blue-50 border-blue-200 focus:border-blue-400 focus:ring-blue-400 flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        type="button"
                        className="h-9 w-9 flex-shrink-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                        onClick={() => openAdjustDialog('add', 'cowayWaterFilterExpense', 'ค่าเช่าเครื่องกรองน้ำ Coway', 'building')}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        type="button"
                        className="h-9 w-9 flex-shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                        onClick={() => openAdjustDialog('subtract', 'cowayWaterFilterExpense', 'ค่าเช่าเครื่องกรองน้ำ Coway', 'building')}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-[#666]">
                      ค่าเช่าเครื่องกรองน้ำ Coway สำหรับอาคารนี้
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="shadow-lg transition-colors duration-300 hover:opacity-90"
                    style={{ backgroundColor: buildingColor }}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    บันทึกการตั้งค่า
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab ค่าใช้จ่ายส่วนกลาง */}
        <TabsContent value="global-settings" className="space-y-4">
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#9B59B6] to-[#8E44AD] text-white">
              <CardTitle className="flex items-center gap-2 text-white">
                <Globe className="h-5 w-5" />
                ค่าใช้จ่ายส่วนกลาง
              </CardTitle>
              <CardDescription className="text-white/80">
                ค่าใช้จ่ายที่ใช้ร่วมกันทุกอาคาร (หาร {globalSettings?.buildingCount || 0} อาคาร)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6 bg-gradient-to-b from-[#9B59B6]/5 to-white">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
                {/* ค่าดูแล MAX - หาร 3 อาคาร */}
                <div className="space-y-3 rounded-xl border border-[#9B59B6]/30 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#9B59B6]/10">
                      <ShieldCheck className="h-4 w-4 text-[#9B59B6]" />
                    </div>
                    <Label className="text-[#9B59B6] font-semibold text-sm">ค่าดูแล MAX</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={globalFormData.maxCareExpense}
                      onChange={(e) => setGlobalFormData((prev) => ({ ...prev, maxCareExpense: parseFloat(e.target.value) || 0 }))}
                      className="bg-[#9B59B6]/5 border-[#9B59B6]/30 flex-1"
                    />
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'maxCareExpense', 'ค่าดูแล MAX', 'global')}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'maxCareExpense', 'ค่าดูแล MAX', 'global')}><Minus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร 3 อาคาร</span>
                    <span className="font-semibold text-[#9B59B6]">{formatNumber(globalFormData.maxCareExpense / 3)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าดูแลจราจร - หาร 3 อาคาร */}
                <div className="space-y-3 rounded-xl border border-[#E74C3C]/30 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E74C3C]/10">
                      <TrafficCone className="h-4 w-4 text-[#E74C3C]" />
                    </div>
                    <Label className="text-[#E74C3C] font-semibold text-sm">ค่าดูแลจราจร</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={globalFormData.trafficCareExpense}
                      onChange={(e) => setGlobalFormData((prev) => ({ ...prev, trafficCareExpense: parseFloat(e.target.value) || 0 }))}
                      className="bg-[#E74C3C]/5 border-[#E74C3C]/30 flex-1"
                    />
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'trafficCareExpense', 'ค่าดูแลจราจร', 'global')}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'trafficCareExpense', 'ค่าดูแลจราจร', 'global')}><Minus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร 3 อาคาร</span>
                    <span className="font-semibold text-[#E74C3C]">{formatNumber(globalFormData.trafficCareExpense / 3)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าขนส่งสินค้า - หาร 3 อาคาร */}
                <div className="space-y-3 rounded-xl border border-orange-500/30 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                      <Truck className="h-4 w-4 text-orange-600" />
                    </div>
                    <Label className="text-orange-600 font-semibold text-sm">ค่าขนส่งสินค้า</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={globalFormData.shippingExpense}
                      onChange={(e) => setGlobalFormData((prev) => ({ ...prev, shippingExpense: parseFloat(e.target.value) || 0 }))}
                      className="bg-orange-50 border-orange-200 flex-1"
                    />
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'shippingExpense', 'ค่าขนส่งสินค้า', 'global')}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'shippingExpense', 'ค่าขนส่งสินค้า', 'global')}><Minus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร 3 อาคาร</span>
                    <span className="font-semibold text-orange-600">{formatNumber(globalFormData.shippingExpense / 3)} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่า Amenity */}
                <div className="space-y-3 rounded-xl border border-pink-400/30 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10">
                      <Sparkles className="h-4 w-4 text-pink-500" />
                    </div>
                    <Label className="text-pink-500 font-semibold text-sm">ค่า Amenity</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={globalFormData.amenityExpense}
                      onChange={(e) => setGlobalFormData((prev) => ({ ...prev, amenityExpense: parseFloat(e.target.value) || 0 }))}
                      className="bg-pink-50 border-pink-200 flex-1"
                    />
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'amenityExpense', 'ค่า Amenity', 'global')}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'amenityExpense', 'ค่า Amenity', 'global')}><Minus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalSettings?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-pink-500">{formatNumber(globalFormData.amenityExpense / (globalSettings?.buildingCount || 1))} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าน้ำเปล่า */}
                <div className="space-y-3 rounded-xl border border-cyan-400/30 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
                      <Droplets className="h-4 w-4 text-cyan-500" />
                    </div>
                    <Label className="text-cyan-500 font-semibold text-sm">ค่าน้ำเปล่า</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={globalFormData.waterBottleExpense}
                      onChange={(e) => setGlobalFormData((prev) => ({ ...prev, waterBottleExpense: parseFloat(e.target.value) || 0 }))}
                      className="bg-cyan-50 border-cyan-200 flex-1"
                    />
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'waterBottleExpense', 'ค่าน้ำเปล่า', 'global')}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'waterBottleExpense', 'ค่าน้ำเปล่า', 'global')}><Minus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalSettings?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-cyan-500">{formatNumber(globalFormData.waterBottleExpense / (globalSettings?.buildingCount || 1))} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าขนมคุ้กกี้ */}
                <div className="space-y-3 rounded-xl border border-amber-400/30 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                      <Cookie className="h-4 w-4 text-amber-600" />
                    </div>
                    <Label className="text-amber-600 font-semibold text-sm">ค่าขนมคุ้กกี้</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={globalFormData.cookieExpense}
                      onChange={(e) => setGlobalFormData((prev) => ({ ...prev, cookieExpense: parseFloat(e.target.value) || 0 }))}
                      className="bg-amber-50 border-amber-200 flex-1"
                    />
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'cookieExpense', 'ค่าขนมคุ้กกี้', 'global')}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'cookieExpense', 'ค่าขนมคุ้กกี้', 'global')}><Minus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalSettings?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-amber-600">{formatNumber(globalFormData.cookieExpense / (globalSettings?.buildingCount || 1))} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่ากาแฟซอง น้ำตาล คอฟฟี่เมท */}
                <div className="space-y-3 rounded-xl border border-amber-700/30 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-700/10">
                      <Coffee className="h-4 w-4 text-amber-700" />
                    </div>
                    <Label className="text-amber-700 font-semibold text-sm">ค่ากาแฟซอง</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={globalFormData.coffeeExpense}
                      onChange={(e) => setGlobalFormData((prev) => ({ ...prev, coffeeExpense: parseFloat(e.target.value) || 0 }))}
                      className="bg-amber-50 border-amber-300 flex-1"
                    />
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'coffeeExpense', 'ค่ากาแฟซอง', 'global')}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'coffeeExpense', 'ค่ากาแฟซอง', 'global')}><Minus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalSettings?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-amber-700">{formatNumber(globalFormData.coffeeExpense / (globalSettings?.buildingCount || 1))} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าน้ำมันรถมอเตอร์ไซค์ */}
                <div className="space-y-3 rounded-xl border border-gray-500/30 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-500/10">
                      <Fuel className="h-4 w-4 text-gray-600" />
                    </div>
                    <Label className="text-gray-600 font-semibold text-sm">ค่าน้ำมันรถ</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={globalFormData.fuelExpense}
                      onChange={(e) => setGlobalFormData((prev) => ({ ...prev, fuelExpense: parseFloat(e.target.value) || 0 }))}
                      className="bg-gray-50 border-gray-300 flex-1"
                    />
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'fuelExpense', 'ค่าน้ำมันรถ', 'global')}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'fuelExpense', 'ค่าน้ำมันรถ', 'global')}><Minus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalSettings?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-gray-600">{formatNumber(globalFormData.fuelExpense / (globalSettings?.buildingCount || 1))} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าเช่าที่จอดรถมอเตอร์ไซค์ */}
                <div className="space-y-3 rounded-xl border border-slate-500/30 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/10">
                      <ParkingCircle className="h-4 w-4 text-slate-600" />
                    </div>
                    <Label className="text-slate-600 font-semibold text-sm">ค่าที่จอดรถ</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={globalFormData.parkingExpense}
                      onChange={(e) => setGlobalFormData((prev) => ({ ...prev, parkingExpense: parseFloat(e.target.value) || 0 }))}
                      className="bg-slate-50 border-slate-300 flex-1"
                    />
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'parkingExpense', 'ค่าที่จอดรถ', 'global')}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'parkingExpense', 'ค่าที่จอดรถ', 'global')}><Minus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalSettings?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-slate-600">{formatNumber(globalFormData.parkingExpense / (globalSettings?.buildingCount || 1))} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าซ่อมบำรุงรถมอเตอร์ไซค์ */}
                <div className="space-y-3 rounded-xl border border-rose-500/30 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
                      <Wrench className="h-4 w-4 text-rose-600" />
                    </div>
                    <Label className="text-rose-600 font-semibold text-sm">ค่าซ่อมบำรุงรถ</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={globalFormData.motorcycleMaintenanceExpense}
                      onChange={(e) => setGlobalFormData((prev) => ({ ...prev, motorcycleMaintenanceExpense: parseFloat(e.target.value) || 0 }))}
                      className="bg-rose-50 border-rose-200 flex-1"
                    />
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'motorcycleMaintenanceExpense', 'ค่าซ่อมบำรุงรถ', 'global')}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'motorcycleMaintenanceExpense', 'ค่าซ่อมบำรุงรถ', 'global')}><Minus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalSettings?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-rose-600">{formatNumber(globalFormData.motorcycleMaintenanceExpense / (globalSettings?.buildingCount || 1))} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าเดินทางแม่บ้าน */}
                <div className="space-y-3 rounded-xl border border-violet-500/30 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                      <Bus className="h-4 w-4 text-violet-600" />
                    </div>
                    <Label className="text-violet-600 font-semibold text-sm">ค่าเดินทางแม่บ้าน</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={globalFormData.maidTravelExpense}
                      onChange={(e) => setGlobalFormData((prev) => ({ ...prev, maidTravelExpense: parseFloat(e.target.value) || 0 }))}
                      className="bg-violet-50 border-violet-200 flex-1"
                    />
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'maidTravelExpense', 'ค่าเดินทางแม่บ้าน', 'global')}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'maidTravelExpense', 'ค่าเดินทางแม่บ้าน', 'global')}><Minus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalSettings?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-violet-600">{formatNumber(globalFormData.maidTravelExpense / (globalSettings?.buildingCount || 1))} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าอุปกรณ์ทำความสะอาด */}
                <div className="space-y-3 rounded-xl border border-teal-500/30 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
                      <SprayCan className="h-4 w-4 text-teal-600" />
                    </div>
                    <Label className="text-teal-600 font-semibold text-sm">ค่าอุปกรณ์ทำความสะอาด</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={globalFormData.cleaningSupplyExpense}
                      onChange={(e) => setGlobalFormData((prev) => ({ ...prev, cleaningSupplyExpense: parseFloat(e.target.value) || 0 }))}
                      className="bg-teal-50 border-teal-200 flex-1"
                    />
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'cleaningSupplyExpense', 'ค่าอุปกรณ์ทำความสะอาด', 'global')}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'cleaningSupplyExpense', 'ค่าอุปกรณ์ทำความสะอาด', 'global')}><Minus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalSettings?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-teal-600">{formatNumber(globalFormData.cleaningSupplyExpense / (globalSettings?.buildingCount || 1))} บาท/อาคาร</span>
                  </div>
                </div>

                {/* ค่าน้ำยาสำหรับซักผ้า */}
                <div className="space-y-3 rounded-xl border border-indigo-500/30 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
                      <Waves className="h-4 w-4 text-indigo-600" />
                    </div>
                    <Label className="text-indigo-600 font-semibold text-sm">ค่าน้ำยาซักผ้า</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={globalFormData.laundryDetergentExpense}
                      onChange={(e) => setGlobalFormData((prev) => ({ ...prev, laundryDetergentExpense: parseFloat(e.target.value) || 0 }))}
                      className="bg-indigo-50 border-indigo-200 flex-1"
                    />
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-green-600 hover:bg-green-100" onClick={() => openAdjustDialog('add', 'laundryDetergentExpense', 'ค่าน้ำยาซักผ้า', 'global')}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" type="button" className="h-9 w-9 flex-shrink-0 text-red-600 hover:bg-red-100" onClick={() => openAdjustDialog('subtract', 'laundryDetergentExpense', 'ค่าน้ำยาซักผ้า', 'global')}><Minus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">หาร {globalSettings?.buildingCount || 0} อาคาร</span>
                    <span className="font-semibold text-indigo-600">{formatNumber(globalFormData.laundryDetergentExpense / (globalSettings?.buildingCount || 1))} บาท/อาคาร</span>
                  </div>
                </div>
              </div>

              {/* สรุปค่าใช้จ่ายต่ออาคาร */}
              {globalSettings && globalSettings.buildingCount > 0 && (
                <div className="rounded-xl border border-[#9B59B6]/20 bg-gradient-to-br from-[#9B59B6]/5 to-white p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#9B59B6]/10">
                      <Globe className="h-4 w-4 text-[#9B59B6]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-700">สรุปค่าใช้จ่ายต่ออาคาร</h4>
                      <p className="text-[10px] text-slate-400">* หาร 3 อาคาร (CT, YW, NANA) | หาร {globalSettings.buildingCount} อาคาร (ทุกอาคาร)</p>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-[#9B59B6]/10 text-sm">
                      <ShieldCheck className="h-4 w-4 text-[#9B59B6] flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าดูแล MAX</span>
                      <span className="font-semibold text-[#9B59B6]">{formatNumber(globalFormData.maxCareExpense / 3)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-[#E74C3C]/10 text-sm">
                      <TrafficCone className="h-4 w-4 text-[#E74C3C] flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าดูแลจราจร</span>
                      <span className="font-semibold text-[#E74C3C]">{formatNumber(globalFormData.trafficCareExpense / 3)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-orange-500/10 text-sm">
                      <Truck className="h-4 w-4 text-orange-600 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าขนส่งสินค้า</span>
                      <span className="font-semibold text-orange-600">{formatNumber(globalFormData.shippingExpense / 3)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-pink-400/10 text-sm">
                      <Sparkles className="h-4 w-4 text-pink-500 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่า Amenity</span>
                      <span className="font-semibold text-pink-500">{formatNumber(globalFormData.amenityExpense / globalSettings.buildingCount)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-cyan-400/10 text-sm">
                      <Droplets className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าน้ำเปล่า</span>
                      <span className="font-semibold text-cyan-500">{formatNumber(globalFormData.waterBottleExpense / globalSettings.buildingCount)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-amber-400/10 text-sm">
                      <Cookie className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าขนมคุ้กกี้</span>
                      <span className="font-semibold text-amber-600">{formatNumber(globalFormData.cookieExpense / globalSettings.buildingCount)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-amber-700/10 text-sm">
                      <Coffee className="h-4 w-4 text-amber-700 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่ากาแฟซอง</span>
                      <span className="font-semibold text-amber-700">{formatNumber(globalFormData.coffeeExpense / globalSettings.buildingCount)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-gray-500/10 text-sm">
                      <Fuel className="h-4 w-4 text-gray-600 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าน้ำมันรถ</span>
                      <span className="font-semibold text-gray-600">{formatNumber(globalFormData.fuelExpense / globalSettings.buildingCount)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-500/10 text-sm">
                      <ParkingCircle className="h-4 w-4 text-slate-600 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าที่จอดรถ</span>
                      <span className="font-semibold text-slate-600">{formatNumber(globalFormData.parkingExpense / globalSettings.buildingCount)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-rose-500/10 text-sm">
                      <Wrench className="h-4 w-4 text-rose-600 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าซ่อมบำรุงรถ</span>
                      <span className="font-semibold text-rose-600">{formatNumber(globalFormData.motorcycleMaintenanceExpense / globalSettings.buildingCount)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-violet-500/10 text-sm">
                      <Bus className="h-4 w-4 text-violet-600 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าเดินทางแม่บ้าน</span>
                      <span className="font-semibold text-violet-600">{formatNumber(globalFormData.maidTravelExpense / globalSettings.buildingCount)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-teal-500/10 text-sm">
                      <SprayCan className="h-4 w-4 text-teal-600 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าอุปกรณ์ทำความสะอาด</span>
                      <span className="font-semibold text-teal-600">{formatNumber(globalFormData.cleaningSupplyExpense / globalSettings.buildingCount)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-indigo-500/10 text-sm">
                      <Waves className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                      <span className="text-slate-600 flex-1">ค่าน้ำยาซักผ้า</span>
                      <span className="font-semibold text-indigo-600">{formatNumber(globalFormData.laundryDetergentExpense / globalSettings.buildingCount)}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex justify-between items-center p-2 bg-[#9B59B6]/10 rounded">
                      <span className="font-semibold text-slate-700">รวมค่าใช้จ่ายส่วนกลาง/อาคาร (ทุกอาคาร)</span>
                      <span className="font-bold text-[#9B59B6]">
                        {formatNumber(
                          (globalFormData.maxCareExpense / 3) +
                          (globalFormData.trafficCareExpense / 3) +
                          (globalFormData.shippingExpense / 3) +
                          (globalFormData.amenityExpense / globalSettings.buildingCount) +
                          (globalFormData.waterBottleExpense / globalSettings.buildingCount) +
                          (globalFormData.cookieExpense / globalSettings.buildingCount) +
                          (globalFormData.coffeeExpense / globalSettings.buildingCount) +
                          (globalFormData.fuelExpense / globalSettings.buildingCount) +
                          (globalFormData.parkingExpense / globalSettings.buildingCount) +
                          (globalFormData.motorcycleMaintenanceExpense / globalSettings.buildingCount) +
                          (globalFormData.maidTravelExpense / globalSettings.buildingCount) +
                          (globalFormData.cleaningSupplyExpense / globalSettings.buildingCount) +
                          (globalFormData.laundryDetergentExpense / globalSettings.buildingCount)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveGlobal}
                  disabled={savingGlobal}
                  className="shadow-lg bg-[#9B59B6] hover:bg-[#8E44AD]"
                >
                  {savingGlobal ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  บันทึกค่าใช้จ่ายส่วนกลาง
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#84A59D] to-[#6b8a84] text-white">
              <CardTitle className="text-white">ข้อมูลอาคารทั้งหมด</CardTitle>
              <CardDescription className="text-white/80">
                รายการอาคารที่มีในระบบ
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-gradient-to-b from-[#84A59D]/5 to-white">
              <div className="space-y-4">
                {buildings.map((building) => (
                  <div
                    key={building.id}
                    className="flex items-center justify-between rounded-xl border-2 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
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
            <CardHeader className="bg-gradient-to-r from-[#F28482] to-[#d96f6d] text-white">
              <CardTitle className="text-white">สูตรการคำนวณ</CardTitle>
              <CardDescription className="text-white/80">
                สูตรที่ใช้ในการคำนวณผลประกอบการ
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-gradient-to-b from-[#F28482]/5 to-white">
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
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={adjustType === 'add' ? 'text-green-600' : 'text-red-600'}>
              {adjustType === 'add' ? (
                <span className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  เพิ่มยอด {adjustFieldName}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Minus className="h-5 w-5" />
                  ลดยอด {adjustFieldName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* เลือกเดือน/ปี */}
            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
              <Calendar className="h-5 w-5 text-slate-500" />
              <div className="flex items-center gap-2">
                <Select
                  value={adjustMonth.toString()}
                  onValueChange={(value) => handleMonthYearChange(parseInt(value), adjustYear)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { value: '1', label: 'มกราคม' },
                      { value: '2', label: 'กุมภาพันธ์' },
                      { value: '3', label: 'มีนาคม' },
                      { value: '4', label: 'เมษายน' },
                      { value: '5', label: 'พฤษภาคม' },
                      { value: '6', label: 'มิถุนายน' },
                      { value: '7', label: 'กรกฎาคม' },
                      { value: '8', label: 'สิงหาคม' },
                      { value: '9', label: 'กันยายน' },
                      { value: '10', label: 'ตุลาคม' },
                      { value: '11', label: 'พฤศจิกายน' },
                      { value: '12', label: 'ธันวาคม' },
                    ].map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={adjustYear.toString()}
                  onValueChange={(value) => handleMonthYearChange(adjustMonth, parseInt(value))}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="ml-auto text-right">
                <div className="text-xs text-slate-500">ยอดรวมเดือนนี้</div>
                <div className="text-xl font-bold text-slate-700">{formatNumber(historyTotal)} บาท</div>
              </div>
            </div>

            {/* ประวัติรายการ */}
            <div className="border rounded-lg">
              <div className="bg-slate-100 px-3 py-2 font-semibold text-sm text-slate-600 border-b">
                ประวัติรายการ ({expenseHistory.length} รายการ)
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {loadingHistory ? (
                  <div className="p-4 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    <span className="text-sm">กำลังโหลด...</span>
                  </div>
                ) : expenseHistory.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-sm">
                    ยังไม่มีรายการในเดือนนี้
                  </div>
                ) : (
                  <div className="divide-y">
                    {expenseHistory.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${item.actionType === 'ADD' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {item.actionType === 'ADD' ? '+' : '-'}
                            </span>
                            <span className="font-medium text-sm truncate">{item.description}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {new Date(item.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${item.actionType === 'ADD' ? 'text-green-600' : 'text-red-600'}`}>
                            {item.actionType === 'ADD' ? '+' : '-'}{formatNumber(Number(item.amount))}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteHistory(item.id)}
                            disabled={deletingId === item.id}
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
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
            <div className={`border-2 rounded-lg p-4 ${adjustType === 'add' ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
              <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                {adjustType === 'add' ? (
                  <><Plus className="h-4 w-4 text-green-600" /> เพิ่มรายการใหม่</>
                ) : (
                  <><Minus className="h-4 w-4 text-red-600" /> ลดรายการ</>
                )}
              </div>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="adjustDescription" className="text-xs">รายละเอียด *</Label>
                  <Input
                    id="adjustDescription"
                    value={adjustDescription}
                    onChange={(e) => setAdjustDescription(e.target.value)}
                    placeholder="เช่น ค่าฉีดปลวก, ค่าซ่อมแอร์"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="adjustAmount" className="text-xs">จำนวนเงิน (บาท) *</Label>
                  <Input
                    id="adjustAmount"
                    type="number"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Preview ยอดใหม่ */}
              {adjustAmount && parseFloat(adjustAmount) > 0 && (
                <div className="mt-3 pt-3 border-t border-dashed flex justify-between items-center">
                  <span className="text-sm text-slate-600">ยอดรวมหลังบันทึก</span>
                  <span className="text-lg font-bold text-slate-800">{formatNumber(getNewAmount())} บาท</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
              ปิด
            </Button>
            <Button
              onClick={handleAdjustConfirm}
              disabled={!adjustAmount || parseFloat(adjustAmount) <= 0 || !adjustDescription.trim() || savingHistory}
              className={adjustType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {savingHistory ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : adjustType === 'add' ? (
                <Plus className="h-4 w-4 mr-1" />
              ) : (
                <Minus className="h-4 w-4 mr-1" />
              )}
              บันทึกรายการ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
