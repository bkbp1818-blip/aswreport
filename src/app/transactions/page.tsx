'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { formatNumber, MONTHS, getMonthName } from '@/lib/utils'
import { generateYears, getAvailableMonths } from '@/lib/calculations'
import { CategoryIcon } from '@/lib/category-icons'
import { Loader2, Plus, Minus, Trash2, Pencil, TrendingUp, TrendingDown } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { getBuildingColor } from '@/lib/building-colors'
import { useAccess } from '@/contexts/AccessContext'

interface Building {
  id: number
  name: string
  code: string
}

interface Category {
  id: number
  name: string
  type: 'INCOME' | 'EXPENSE'
  order: number
}

interface Transaction {
  id?: number
  buildingId: number
  categoryId: number
  amount: number
  month: number
  year: number
  note?: string
  category?: Category
}

interface SalarySummary {
  totalSalary: number
  buildingCount: number
  salaryPerBuilding: number
}

interface BuildingSettings {
  monthlyRent: number
  cowayWaterFilterExpense: number
}

interface GlobalSettings {
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
  foodExpense: number
  buildingCount: number
  careExpenseDivisor: number // จำนวนอาคารที่ร่วมจ่ายค่าดูแล MAX, จราจร, ขนส่งสินค้า (3 อาคาร)
  maxCareExpensePerBuilding: number
  trafficCareExpensePerBuilding: number
  shippingExpensePerBuilding: number
  amenityExpensePerBuilding: number
  waterBottleExpensePerBuilding: number
  cookieExpensePerBuilding: number
  coffeeExpensePerBuilding: number
  fuelExpensePerBuilding: number
  parkingExpensePerBuilding: number
  motorcycleMaintenanceExpensePerBuilding: number
  maidTravelExpensePerBuilding: number
  cleaningSupplyExpensePerBuilding: number
  foodExpensePerBuilding: number
}

interface SocialSecurityData {
  totalAmount: number
  amountPerBuilding: number
  buildingCount: number
}

interface ExpenseHistoryItem {
  id: number
  targetType: string
  targetId: number | null
  fieldName: string
  fieldLabel: string
  actionType: string
  amount: string
  description: string
  month: number
  year: number
  createdAt: string
}

export default function TransactionsPage() {
  const { isViewer } = useAccess()
  const [buildings, setBuildings] = useState<Building[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(new Date().getMonth() + 1)
  )
  const [selectedYear, setSelectedYear] = useState<string>(
    String(new Date().getFullYear())
  )
  const [transactionData, setTransactionData] = useState<Record<number, number>>({})
  const [airportShuttleRentIncome, setAirportShuttleRentIncome] = useState<number>(0)
  const [thaiBusTourIncome, setThaiBusTourIncome] = useState<number>(0)
  const [coVanKesselIncome, setCoVanKesselIncome] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [salarySummary, setSalarySummary] = useState<SalarySummary | null>(null)
  const [buildingSettings, setBuildingSettings] = useState<BuildingSettings | null>(null)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null)
  const [socialSecurityData, setSocialSecurityData] = useState<SocialSecurityData | null>(null)

  // State สำหรับ Dialog เพิ่ม/ลดยอด
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [adjustType, setAdjustType] = useState<'add' | 'subtract' | 'edit'>('add')
  const [adjustAction, setAdjustAction] = useState<'add' | 'subtract'>('add') // สำหรับ edit mode
  const [adjustCategoryId, setAdjustCategoryId] = useState<number | string | null>(null)
  const [adjustCategoryName, setAdjustCategoryName] = useState('')
  const [adjustAmount, setAdjustAmount] = useState<string>('')
  const [adjustDescription, setAdjustDescription] = useState<string>('')

  // State สำหรับประวัติค่าใช้จ่าย
  const [adjustMonth, setAdjustMonth] = useState<string>(String(new Date().getMonth() + 1))
  const [adjustYear, setAdjustYear] = useState<string>(String(new Date().getFullYear()))
  const [expenseHistory, setExpenseHistory] = useState<ExpenseHistoryItem[]>([])
  const [historyTotal, setHistoryTotal] = useState<number>(0)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [savingHistory, setSavingHistory] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const years = generateYears()

  // โหลดรายการอาคารและหมวดหมู่ และเงินเดือนพนักงาน
  useEffect(() => {
    Promise.all([
      fetch('/api/buildings').then((res) => res.json()),
      fetch('/api/categories').then((res) => res.json()),
      fetch('/api/employees/salary-summary').then((res) => res.json()),
    ])
      .then(([buildingsData, categoriesData, salaryData]) => {
        setBuildings(buildingsData)
        setCategories(categoriesData)
        setSalarySummary(salaryData)
        if (buildingsData.length > 0 && !selectedBuilding) {
          setSelectedBuilding(String(buildingsData[0].id))
        }
      })
      .catch((err) => console.error('Error loading data:', err))
      .finally(() => setLoading(false))
  }, [])

  // โหลดข้อมูล transactions และ settings เมื่อเลือกอาคาร/เดือน/ปี
  const loadTransactions = useCallback(async () => {
    if (!selectedBuilding || !selectedMonth || !selectedYear) return

    setLoading(true)
    try {
      const historyParams = new URLSearchParams({
        targetType: 'TRANSACTION',
        targetId: selectedBuilding,
        month: selectedMonth,
        year: selectedYear,
      })

      // โหลด expense history totals, settings, global totals และ social security พร้อมกัน
      const [historyTotalsRes, settingsRes, globalTotalsRes, socialSecurityRes] = await Promise.all([
        fetch(`/api/expense-history/totals?${historyParams}`),
        fetch(`/api/settings?buildingId=${selectedBuilding}`),
        fetch(`/api/expense-history/global-totals?month=${selectedMonth}&year=${selectedYear}`),
        fetch(`/api/social-security?month=${selectedMonth}&year=${selectedYear}`)
      ])

      const historyData = await historyTotalsRes.json()
      const settings = await settingsRes.json()
      const globalTotalsData = await globalTotalsRes.json()
      const socialSecurityDataRes = await socialSecurityRes.json()

      // แปลงข้อมูลจาก expense history totals เป็น Record<categoryId, amount>
      const dataMap: Record<number, number> = {}
      if (historyData.totals) {
        for (const [fieldName, amount] of Object.entries(historyData.totals)) {
          // ถ้าเป็น special income fields ให้เก็บแยก
          if (fieldName === 'airportShuttleRentIncome') {
            setAirportShuttleRentIncome(amount as number)
          } else if (fieldName === 'thaiBusTourIncome') {
            setThaiBusTourIncome(amount as number)
          } else if (fieldName === 'coVanKesselIncome') {
            setCoVanKesselIncome(amount as number)
          } else {
            dataMap[parseInt(fieldName)] = amount as number
          }
        }
      }
      // ถ้าไม่มี special income fields ให้ reset เป็น 0
      if (!historyData.totals?.airportShuttleRentIncome) {
        setAirportShuttleRentIncome(0)
      }
      if (!historyData.totals?.thaiBusTourIncome) {
        setThaiBusTourIncome(0)
      }
      if (!historyData.totals?.coVanKesselIncome) {
        setCoVanKesselIncome(0)
      }
      setTransactionData(dataMap)

      // เก็บ settings ของอาคาร
      if (settings) {
        setBuildingSettings({
          monthlyRent: Number(settings.monthlyRent) || 0,
          cowayWaterFilterExpense: Number(settings.cowayWaterFilterExpense) || 0,
        })
      } else {
        setBuildingSettings(null)
      }

      // อัปเดต globalSettings จาก expense-history/global-totals
      if (globalTotalsData && globalTotalsData.totals) {
        const globalData: GlobalSettings = {
          maxCareExpense: globalTotalsData.totals.maxCareExpense || 0,
          trafficCareExpense: globalTotalsData.totals.trafficCareExpense || 0,
          shippingExpense: globalTotalsData.totals.shippingExpense || 0,
          amenityExpense: globalTotalsData.totals.amenityExpense || 0,
          waterBottleExpense: globalTotalsData.totals.waterBottleExpense || 0,
          cookieExpense: globalTotalsData.totals.cookieExpense || 0,
          coffeeExpense: globalTotalsData.totals.coffeeExpense || 0,
          fuelExpense: globalTotalsData.totals.fuelExpense || 0,
          parkingExpense: globalTotalsData.totals.parkingExpense || 0,
          motorcycleMaintenanceExpense: globalTotalsData.totals.motorcycleMaintenanceExpense || 0,
          maidTravelExpense: globalTotalsData.totals.maidTravelExpense || 0,
          cleaningSupplyExpense: globalTotalsData.totals.cleaningSupplyExpense || 0,
          foodExpense: globalTotalsData.totals.foodExpense || 0,
          buildingCount: globalTotalsData.buildingCount || 0,
          careExpenseDivisor: globalTotalsData.careExpenseDivisor || 3,
          maxCareExpensePerBuilding: globalTotalsData.totalsPerBuilding?.maxCareExpensePerBuilding || 0,
          trafficCareExpensePerBuilding: globalTotalsData.totalsPerBuilding?.trafficCareExpensePerBuilding || 0,
          shippingExpensePerBuilding: globalTotalsData.totalsPerBuilding?.shippingExpensePerBuilding || 0,
          amenityExpensePerBuilding: globalTotalsData.totalsPerBuilding?.amenityExpensePerBuilding || 0,
          waterBottleExpensePerBuilding: globalTotalsData.totalsPerBuilding?.waterBottleExpensePerBuilding || 0,
          cookieExpensePerBuilding: globalTotalsData.totalsPerBuilding?.cookieExpensePerBuilding || 0,
          coffeeExpensePerBuilding: globalTotalsData.totalsPerBuilding?.coffeeExpensePerBuilding || 0,
          fuelExpensePerBuilding: globalTotalsData.totalsPerBuilding?.fuelExpensePerBuilding || 0,
          parkingExpensePerBuilding: globalTotalsData.totalsPerBuilding?.parkingExpensePerBuilding || 0,
          motorcycleMaintenanceExpensePerBuilding: globalTotalsData.totalsPerBuilding?.motorcycleMaintenanceExpensePerBuilding || 0,
          maidTravelExpensePerBuilding: globalTotalsData.totalsPerBuilding?.maidTravelExpensePerBuilding || 0,
          cleaningSupplyExpensePerBuilding: globalTotalsData.totalsPerBuilding?.cleaningSupplyExpensePerBuilding || 0,
          foodExpensePerBuilding: globalTotalsData.totalsPerBuilding?.foodExpensePerBuilding || 0,
        }
        setGlobalSettings(globalData)
      }

      // เก็บข้อมูลเงินสมทบประกันสังคม
      if (socialSecurityDataRes) {
        setSocialSecurityData({
          totalAmount: socialSecurityDataRes.totalAmount || 0,
          amountPerBuilding: socialSecurityDataRes.amountPerBuilding || 0,
          buildingCount: socialSecurityDataRes.buildingCount || 5,
        })
      }
    } catch (err) {
      console.error('Error loading transactions:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedBuilding, selectedMonth, selectedYear])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  // แยกหมวดหมู่ตามประเภท
  const incomeCategories = categories.filter((c) => c.type === 'INCOME')
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')

  // แยกรายได้เป็น 2 กลุ่ม: ค่าเช่า และ รายได้อื่นๆ
  const rentalIncomeCategories = incomeCategories.filter((c) => c.name.includes('ค่าเช่า'))
  const otherIncomeCategories = incomeCategories.filter((c) => !c.name.includes('ค่าเช่า'))

  // กลุ่ม Direct Booking sub-items
  const directBookingSubNames = ['ค่าเช่าจาก PayPal', 'ค่าเช่าจาก Credit Card', 'ค่าเช่าจาก Bank Transfer', 'ค่าเช่า Cash']
  const directBookingSubCategories = rentalIncomeCategories.filter((c) => directBookingSubNames.includes(c.name))

  // กรองออกจากรายการค่าเช่าปกติ (ลบ Direct Booking standalone + 3 sub-items)
  const normalRentalCategories = rentalIncomeCategories.filter(
    (c) => !directBookingSubNames.includes(c.name) && c.name !== 'ค่าเช่าจาก Direct Booking'
  )

  // Subtotal ของ Direct Booking (รวมข้อมูลเก่า + 3 sub-items)
  const directBookingCategory = rentalIncomeCategories.find((c) => c.name === 'ค่าเช่าจาก Direct Booking')
  const directBookingSubtotal = directBookingSubCategories.reduce((sum, c) => sum + (transactionData[c.id] || 0), 0)
    + (directBookingCategory ? (transactionData[directBookingCategory.id] || 0) : 0)

  // หา categoryId ของเงินเดือนพนักงาน
  const salaryCategory = categories.find((c) => c.name === 'เงินเดือนพนักงาน')
  const salaryCategoryId = salaryCategory?.id

  // รายการค่าใช้จ่ายที่จัดการใน GlobalSettings แล้ว (ไม่ต้องแสดงซ้ำ)
  const globalSettingsCategoryNames = [
    'ค่าดูแล MAX',
    'ค่าดูแลจราจร',
    'ค่าขนส่งสินค้า',
    'ค่า Amenity',
    'ค่า Amenity (แปรงสีฟัน หมวกคลุมผม)',
    'Amenity',
    'ค่าเช่าเครื่องกรองน้ำ Coway',
    'ค่าเช่าเครื่องกรองน้ำ',
    'ค่าน้ำเปล่า',
    'ค่าขนมคุ้กกี้',
    'ค่ากาแฟซอง น้ำตาล คอฟฟี่เมท',
    'ค่ากาแฟ',
    'ค่าน้ำมันรถมอเตอร์ไซค์',
    'ค่าน้ำมัน',
    'ค่าเช่าที่จอดรถมอเตอร์ไซค์',
    'ค่าเช่าที่จอดรถ',
    'ค่าซ่อมบำรุงรถมอเตอร์ไซค์',
    'ค่าซ่อมบำรุงรถ',
    'ค่าเดินทางแม่บ้าน',
    'ค่าอุปกรณ์ทำความสะอาด',
  ]

  // รายจ่ายหน้างาน Cash - แสดงบนสุดของตารางรายจ่าย
  const cashExpenseCategory = expenseCategories.find((c) => c.name === 'รายจ่ายหน้างาน Cash')

  // แยกรายจ่ายเป็น 2 กลุ่ม: เงินเดือนพนักงาน และ รายจ่ายอื่นๆ (ไม่รวมรายการที่จัดการใน GlobalSettings แล้ว)
  const otherExpenseCategories = expenseCategories.filter(
    (c) => c.id !== salaryCategoryId && !globalSettingsCategoryNames.includes(c.name) && c.name !== 'รายจ่ายหน้างาน Cash'
  )

  // ฟังก์ชันดึงค่าแสดงผลสำหรับแต่ละ category
  const getDisplayAmount = (categoryId: number): number => {
    // ถ้าเป็นเงินเดือนพนักงาน ให้ใช้ค่าจาก salary summary
    if (categoryId === salaryCategoryId && salarySummary) {
      return salarySummary.salaryPerBuilding
    }
    return transactionData[categoryId] || 0
  }

  // เช็คว่า category นี้เป็น readonly หรือไม่ (เงินเดือนพนักงาน)
  const isSalaryCategory = (categoryId: number): boolean => {
    return categoryId === salaryCategoryId
  }

  // คำนวณยอดรวม (ใช้ getDisplayAmount เพื่อรวมเงินเดือนพนักงานด้วย)
  const totalRentalIncome = rentalIncomeCategories.reduce(
    (sum, c) => sum + getDisplayAmount(c.id),
    0
  )
  const totalOtherIncome = otherIncomeCategories.reduce(
    (sum, c) => sum + getDisplayAmount(c.id),
    0
  )

  // รายได้พิเศษ จาก state (เก็บใน ExpenseHistory)
  const totalIncome = totalRentalIncome + totalOtherIncome + airportShuttleRentIncome + thaiBusTourIncome + coVanKesselIncome

  // รวมค่าเช่าอาคารจาก settings ด้วย
  const monthlyRent = buildingSettings?.monthlyRent || 0

  // ค่าเช่าเครื่องกรองน้ำ Coway จาก settings
  const cowayWaterFilterExpense = buildingSettings?.cowayWaterFilterExpense || 0

  // ค่าดูแล MAX, ค่าดูแลจราจร, ค่าขนส่งสินค้า แสดงเฉพาะ 3 อาคาร (NANA, CT, YW) - ไม่รวม Funn D
  const selectedBuildingCode = buildings.find((b) => String(b.id) === selectedBuilding)?.code || ''
  const eligibleBuildingsForCare = ['NANA', 'CT', 'YW']
  const isEligibleForCareExpense = eligibleBuildingsForCare.includes(selectedBuildingCode)

  // ค่าใช้จ่ายส่วนกลาง (หารตามจำนวนอาคาร)
  // ค่าดูแล MAX, ค่าดูแลจราจร, ค่าขนส่งสินค้า แสดงเฉพาะอาคารที่ต้องจ่าย (3 อาคาร)
  const maxCareExpensePerBuilding = isEligibleForCareExpense ? (globalSettings?.maxCareExpensePerBuilding || 0) : 0
  const trafficCareExpensePerBuilding = isEligibleForCareExpense ? (globalSettings?.trafficCareExpensePerBuilding || 0) : 0
  const shippingExpensePerBuilding = isEligibleForCareExpense ? (globalSettings?.shippingExpensePerBuilding || 0) : 0
  const amenityExpensePerBuilding = globalSettings?.amenityExpensePerBuilding || 0
  const waterBottleExpensePerBuilding = globalSettings?.waterBottleExpensePerBuilding || 0
  const cookieExpensePerBuilding = globalSettings?.cookieExpensePerBuilding || 0
  const coffeeExpensePerBuilding = globalSettings?.coffeeExpensePerBuilding || 0
  const fuelExpensePerBuilding = globalSettings?.fuelExpensePerBuilding || 0
  const parkingExpensePerBuilding = globalSettings?.parkingExpensePerBuilding || 0
  const motorcycleMaintenanceExpensePerBuilding = globalSettings?.motorcycleMaintenanceExpensePerBuilding || 0
  const maidTravelExpensePerBuilding = globalSettings?.maidTravelExpensePerBuilding || 0
  const cleaningSupplyExpensePerBuilding = globalSettings?.cleaningSupplyExpensePerBuilding || 0
  const foodExpensePerBuilding = globalSettings?.foodExpensePerBuilding || 0

  // เงินสมทบประกันสังคม (หาร 5 อาคาร)
  const socialSecurityExpensePerBuilding = socialSecurityData?.amountPerBuilding || 0

  // รวมค่าใช้จ่ายส่วนกลางทั้งหมด
  const totalGlobalExpense = maxCareExpensePerBuilding + trafficCareExpensePerBuilding +
    shippingExpensePerBuilding + amenityExpensePerBuilding + waterBottleExpensePerBuilding +
    cookieExpensePerBuilding + coffeeExpensePerBuilding + fuelExpensePerBuilding + parkingExpensePerBuilding +
    motorcycleMaintenanceExpensePerBuilding + maidTravelExpensePerBuilding +
    cleaningSupplyExpensePerBuilding + foodExpensePerBuilding + socialSecurityExpensePerBuilding

  // คำนวณยอดรวมรายจ่าย: เงินเดือนพนักงาน + รายจ่ายอื่นๆ + ค่าเช่าอาคาร + ค่า Coway + ค่าใช้จ่ายส่วนกลาง
  const salaryExpense = salarySummary?.salaryPerBuilding || 0
  const otherExpense = otherExpenseCategories.reduce(
    (sum, c) => sum + (transactionData[c.id] || 0),
    0
  )
  const cashExpenseAmount = cashExpenseCategory ? (transactionData[cashExpenseCategory.id] || 0) : 0
  const totalExpense = salaryExpense + otherExpense + monthlyRent + cowayWaterFilterExpense + totalGlobalExpense + cashExpenseAmount

  // ดึงประวัติค่าใช้จ่าย
  const fetchExpenseHistory = async (categoryId: number | string | null, month: string, year: string) => {
    if (!selectedBuilding || categoryId === null) return

    setLoadingHistory(true)
    try {
      const params = new URLSearchParams({
        targetType: 'TRANSACTION',
        targetId: selectedBuilding,
        fieldName: String(categoryId),
        month,
        year,
      })
      const res = await fetch(`/api/expense-history?${params}`)
      const data = await res.json()
      setExpenseHistory(data.history || [])
      setHistoryTotal(data.total || 0)
    } catch (error) {
      console.error('Error fetching expense history:', error)
      setExpenseHistory([])
      setHistoryTotal(0)
    } finally {
      setLoadingHistory(false)
    }
  }

  // ลบรายการประวัติ
  const handleDeleteHistory = async (historyId: number) => {
    if (!confirm('ต้องการลบรายการนี้?')) return

    setDeletingId(historyId)
    try {
      const res = await fetch(`/api/expense-history/${historyId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        const data = await res.json()
        setExpenseHistory(data.history || [])
        setHistoryTotal(data.total || 0)

        // ถ้าเดือน/ปีใน Dialog ตรงกับเดือน/ปีในหน้าหลัก ให้ reload ข้อมูลทั้งหมด
        if (adjustMonth === selectedMonth && adjustYear === selectedYear) {
          loadTransactions()
        }
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error deleting history:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    } finally {
      setDeletingId(null)
    }
  }

  // เปลี่ยนเดือน/ปีในDialog
  const handleAdjustMonthYearChange = (newMonth: string, newYear: string) => {
    setAdjustMonth(newMonth)
    setAdjustYear(newYear)
    if (adjustCategoryId !== null) {
      fetchExpenseHistory(adjustCategoryId, newMonth, newYear)
    }
  }

  // ปิด Dialog และ reload ข้อมูล
  const handleDialogClose = (open: boolean) => {
    setAdjustDialogOpen(open)
    // เมื่อปิด Dialog ให้ reload ข้อมูลใหม่
    if (!open) {
      loadTransactions()
    }
  }

  // เปิด Dialog เพิ่ม/ลดยอด
  const openAdjustDialog = (type: 'add' | 'subtract' | 'edit', categoryId: number | string, categoryName: string) => {
    setAdjustType(type)
    setAdjustCategoryId(categoryId)
    setAdjustCategoryName(categoryName)
    setAdjustAmount('')
    setAdjustDescription('')
    // ใช้เดือน/ปีที่เลือกในหน้าหลัก
    setAdjustMonth(selectedMonth)
    setAdjustYear(selectedYear)
    setAdjustDialogOpen(true)
    // ดึงประวัติ
    fetchExpenseHistory(categoryId, selectedMonth, selectedYear)
  }

  // คำนวณยอดใหม่ (preview)
  const getNewAmount = () => {
    const adjustValue = parseFloat(adjustAmount) || 0
    // ใช้ effectiveAction สำหรับ edit mode
    const effectiveAction = adjustType === 'edit' ? adjustAction : adjustType
    const newValue = effectiveAction === 'add'
      ? historyTotal + adjustValue
      : historyTotal - adjustValue
    return Math.max(0, newValue) // ไม่ให้ติดลบ
  }

  // ดึง action จริงที่ใช้ในการบันทึก
  const getEffectiveAction = () => {
    return adjustType === 'edit' ? adjustAction : adjustType
  }

  // ยืนยันการเพิ่ม/ลดยอด
  const handleAdjustConfirm = async () => {
    if (adjustCategoryId === null || !selectedBuilding) return
    if (!adjustDescription.trim()) {
      alert('กรุณากรอกรายละเอียด')
      return
    }
    if (!adjustAmount || parseFloat(adjustAmount) <= 0) {
      alert('กรุณากรอกจำนวนเงิน')
      return
    }

    // เก็บค่าไว้ก่อน async call เพื่อหลีกเลี่ยงปัญหา closure
    const currentCategoryId = adjustCategoryId
    const requestMonth = adjustMonth
    const requestYear = adjustYear
    const currentSelectedMonth = selectedMonth
    const currentSelectedYear = selectedYear

    setSavingHistory(true)
    const effectiveAction = getEffectiveAction()

    // ตรวจสอบว่าเป็น settings field (เช่น cowayWaterFilterExpense) หรือไม่
    const isSettingsField = currentCategoryId === 'cowayWaterFilterExpense'
    const targetType = isSettingsField ? 'SETTINGS' : 'TRANSACTION'

    try {
      const res = await fetch('/api/expense-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId: selectedBuilding,
          fieldName: String(currentCategoryId),
          fieldLabel: adjustCategoryName,
          actionType: effectiveAction === 'add' ? 'ADD' : 'SUBTRACT',
          amount: adjustAmount,
          description: adjustDescription.trim(),
          month: requestMonth,
          year: requestYear,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setExpenseHistory(data.history || [])
        setHistoryTotal(data.total || 0)
        // อัปเดตยอดใน state ถ้าเดือน/ปีตรงกับที่เลือกในหน้าหลัก
        if (requestMonth === currentSelectedMonth && requestYear === currentSelectedYear) {
          // ตรวจสอบว่าเป็น special income field หรือ settings field หรือไม่
          if (currentCategoryId === 'airportShuttleRentIncome') {
            setAirportShuttleRentIncome(data.total || 0)
          } else if (currentCategoryId === 'thaiBusTourIncome') {
            setThaiBusTourIncome(data.total || 0)
          } else if (currentCategoryId === 'coVanKesselIncome') {
            setCoVanKesselIncome(data.total || 0)
          } else if (currentCategoryId === 'cowayWaterFilterExpense') {
            // อัปเดต buildingSettings สำหรับ Coway
            setBuildingSettings(prev => prev ? {
              ...prev,
              cowayWaterFilterExpense: data.total || 0
            } : null)
          } else {
            setTransactionData((prev) => ({
              ...prev,
              [currentCategoryId]: data.total || 0,
            }))
          }
        }
        // Reset form
        setAdjustAmount('')
        setAdjustDescription('')
      } else {
        const errorData = await res.json()
        if (res.status === 401) {
          alert('กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล')
          window.location.href = '/access/staff'
          return
        }
        alert(errorData.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error saving expense history:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSavingHistory(false)
    }
  }

  const selectedBuildingName =
    buildings.find((b) => String(b.id) === selectedBuilding)?.name || ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-[#333] md:text-2xl">กรอกข้อมูล</h1>
          <p className="text-sm text-[#666] md:text-base">
            บันทึกรายรับ-รายจ่ายประจำเดือน
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
            <SelectTrigger className="w-full bg-white sm:w-[200px]">
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

          <div className="flex flex-1 gap-2 sm:flex-none">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full bg-white sm:w-[120px]">
                <SelectValue placeholder="เดือน" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableMonths(selectedYear, selectedBuildingCode).map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[90px] bg-white">
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
        </div>
      </div>

      {/* Info Banner */}
      {selectedBuildingName && selectedBuilding && (
        <div
          className="rounded-lg p-4 text-white"
          style={{ backgroundColor: getBuildingColor(selectedBuilding) }}
        >
          <p className="font-medium">
            {selectedBuildingName} - {getMonthName(parseInt(selectedMonth))}{' '}
            {selectedYear}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-[#666]">กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <>
        {/* สรุปกำไร/ขาดทุน + กราฟแท่ง (ซ่อนสำหรับ VIEWER) */}
        {!isViewer && (() => {
          const profit = totalIncome - totalExpense
          const isProfit = profit >= 0
          const barData = [
            { name: 'รายรับ', amount: totalIncome, color: '#5B8A7D' },
            { name: 'รายจ่าย', amount: totalExpense, color: '#E8837B' },
            { name: isProfit ? 'กำไร' : 'ขาดทุน', amount: Math.abs(profit), color: isProfit ? '#D4A24C' : '#E74C3C' },
          ]
          return (
            <Card className="border-0 shadow-md overflow-hidden mb-4 md:mb-6">
              <CardHeader className={`${isProfit ? 'bg-gradient-to-r from-[#D4A24C] to-[#c49540]' : 'bg-gradient-to-r from-[#E74C3C] to-[#c0392b]'} text-white py-3 md:py-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isProfit ? <TrendingUp className="h-5 w-5 md:h-6 md:w-6" /> : <TrendingDown className="h-5 w-5 md:h-6 md:w-6" />}
                    <CardTitle className="text-white text-base md:text-lg">{isProfit ? 'กำไร' : 'ขาดทุน'}</CardTitle>
                  </div>
                  <p className={`text-xl md:text-2xl font-bold text-white`}>
                    {isProfit ? '+' : '-'}{formatNumber(Math.abs(profit))}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6">
                {/* สรุปตัวเลข 3 ช่อง */}
                <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4">
                  <div className="text-center p-2 md:p-3 bg-[#84A59D]/10 rounded-lg">
                    <p className="text-[10px] md:text-xs text-[#5a7d75] mb-1">รวมรายรับ</p>
                    <p className="text-sm md:text-lg font-bold text-[#5B8A7D]">{formatNumber(totalIncome)}</p>
                  </div>
                  <div className="text-center p-2 md:p-3 bg-[#F28482]/10 rounded-lg">
                    <p className="text-[10px] md:text-xs text-[#d96f6d] mb-1">รวมรายจ่าย</p>
                    <p className="text-sm md:text-lg font-bold text-[#E8837B]">{formatNumber(totalExpense)}</p>
                  </div>
                  <div className={`text-center p-2 md:p-3 rounded-lg ${isProfit ? 'bg-[#D4A24C]/10' : 'bg-[#E74C3C]/10'}`}>
                    <p className={`text-[10px] md:text-xs mb-1 ${isProfit ? 'text-[#c49540]' : 'text-[#c0392b]'}`}>{isProfit ? 'กำไร' : 'ขาดทุน'}</p>
                    <p className={`text-sm md:text-lg font-bold ${isProfit ? 'text-[#D4A24C]' : 'text-[#E74C3C]'}`}>{isProfit ? '+' : '-'}{formatNumber(Math.abs(profit))}</p>
                  </div>
                </div>
                {/* กราฟแท่ง */}
                <div className="h-[180px] md:h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                        return value
                      }} />
                      <Tooltip formatter={(value: number) => [formatNumber(value) + ' บาท', '']} />
                      <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={60}>
                        {barData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          {/* รายรับ */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#84A59D] to-[#6b8a84] text-white flex flex-row items-center justify-between">
              <CardTitle className="text-white">รายรับ</CardTitle>
              <div className="text-right">
                <p className="text-sm text-white/80">รวมรายได้</p>
                <p className="text-xl font-bold text-white">{formatNumber(totalIncome)}</p>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {/* กลุ่ม 1: รายได้ค่าเช่า */}
              <div className="bg-[#84A59D]/10 px-4 py-2 border-b border-[#84A59D]/20">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-semibold text-[#5a7d75]">รายได้ค่าเช่า</p>
                  <p className="text-sm font-bold text-[#5a7d75]">{formatNumber(totalRentalIncome)}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 md:w-[50px]">#</TableHead>
                    <TableHead>รายการ</TableHead>
                    <TableHead className="text-right">จำนวนเงิน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Direct Booking Group Header */}
                  <TableRow className="bg-[#1d3557]/10">
                    <TableCell className="font-medium px-2 md:px-4"></TableCell>
                    <TableCell className="px-2 md:px-4">
                      <div className="flex items-center gap-1 md:gap-2">
                        <CategoryIcon name="ค่าเช่าจาก Direct Booking" className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs md:text-sm font-semibold text-[#1d3557]">Direct Booking</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-2 md:px-4">
                      <div className="flex items-center justify-end gap-1 md:gap-1.5">
                        <div className="text-right px-2 py-1 md:px-3 md:py-2 bg-[#1d3557]/10 border border-[#1d3557]/20 rounded-md text-xs md:text-sm font-bold text-[#1d3557] min-w-[60px] md:min-w-[80px]">
                          {formatNumber(directBookingSubtotal)}
                        </div>
                        <div className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0" />
                        <div className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0" />
                        <div className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0" />
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Direct Booking Sub-items (PayPal, Credit Card, Bank Transfer) */}
                  {directBookingSubCategories.map((category, index) => (
                    <TableRow key={category.id} className={index % 2 === 0 ? 'bg-white' : 'bg-[#84A59D]/5'}>
                      <TableCell className="font-medium px-2 md:px-4">{index + 1}</TableCell>
                      <TableCell className="px-2 md:px-4">
                        <div className="flex items-center gap-1 md:gap-2 pl-4 md:pl-6">
                          <CategoryIcon name={category.name} className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs md:text-sm">{category.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-2 md:px-4">
                        <div className="flex items-center justify-end gap-1 md:gap-1.5">
                          <div className="text-right px-2 py-1 md:px-3 md:py-2 bg-gray-50 border rounded-md text-xs md:text-sm font-medium min-w-[60px] md:min-w-[80px]">
                            {formatNumber(transactionData[category.id] || 0)}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                            onClick={() => openAdjustDialog('edit', category.id, category.name)}
                          >
                            <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                            onClick={() => openAdjustDialog('add', category.id, category.name)}
                          >
                            <Plus className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                            onClick={() => openAdjustDialog('subtract', category.id, category.name)}
                          >
                            <Minus className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* OTA อื่นๆ (AirBNB, Booking, Agoda, Trip, Expedia, RB) - ซ่อนสำหรับ VIEWER */}
                  {!isViewer && normalRentalCategories.map((category, index) => (
                    <TableRow key={category.id} className={(directBookingSubCategories.length + index) % 2 === 0 ? 'bg-white' : 'bg-[#84A59D]/5'}>
                      <TableCell className="font-medium px-2 md:px-4">{directBookingSubCategories.length + index + 1}</TableCell>
                      <TableCell className="px-2 md:px-4">
                        <div className="flex items-center gap-1 md:gap-2">
                          <CategoryIcon name={category.name} className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs md:text-sm">{category.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-2 md:px-4">
                        <div className="flex items-center justify-end gap-1 md:gap-1.5">
                          <div className="text-right px-2 py-1 md:px-3 md:py-2 bg-gray-50 border rounded-md text-xs md:text-sm font-medium min-w-[60px] md:min-w-[80px]">
                            {formatNumber(transactionData[category.id] || 0)}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                            onClick={() => openAdjustDialog('edit', category.id, category.name)}
                          >
                            <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                            onClick={() => openAdjustDialog('add', category.id, category.name)}
                          >
                            <Plus className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                            onClick={() => openAdjustDialog('subtract', category.id, category.name)}
                          >
                            <Minus className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* กลุ่ม 2: รายได้อื่นๆ */}
              {otherIncomeCategories.length > 0 && (
                <>
                  <div className="bg-[#F6BD60]/10 px-4 py-2 border-y border-[#F6BD60]/20">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold text-[#D4A24C]">รายได้อื่นๆ</p>
                      <p className="text-sm font-bold text-[#D4A24C]">{formatNumber(totalOtherIncome)}</p>
                    </div>
                  </div>
                  <Table>
                    <TableBody>
                      {otherIncomeCategories.map((category, index) => (
                        <TableRow key={category.id} className={index % 2 === 0 ? 'bg-white' : 'bg-[#F6BD60]/5'}>
                          <TableCell className="font-medium w-8 md:w-[50px] px-2 md:px-4">{index + 1}</TableCell>
                          <TableCell className="px-2 md:px-4">
                            <div className="flex items-center gap-1 md:gap-2">
                              <CategoryIcon name={category.name} className="h-4 w-4 flex-shrink-0" />
                              <span className="text-xs md:text-sm">{category.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-2 md:px-4">
                            <div className="flex items-center justify-end gap-1 md:gap-1.5">
                              <div
                                className="text-right px-2 py-1 md:px-3 md:py-2 bg-gray-50 border rounded-md text-xs md:text-sm font-medium min-w-[60px] md:min-w-[80px]"
                              >
                                {formatNumber(transactionData[category.id] || 0)}
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                                onClick={() => openAdjustDialog('edit', category.id, category.name)}
                              >
                                <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                                onClick={() => openAdjustDialog('add', category.id, category.name)}
                              >
                                <Plus className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                                onClick={() => openAdjustDialog('subtract', category.id, category.name)}
                              >
                                <Minus className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}

              {/* กลุ่ม 3: รายได้ค่าเช่า รถรับส่งสนามบิน */}
              {(
                <>
                  <div className="bg-emerald-500/10 px-4 py-2 border-y border-emerald-500/20">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold text-emerald-600">รายได้ค่าเช่า รถรับส่งสนามบิน</p>
                      <p className="text-sm font-bold text-emerald-600">{formatNumber(airportShuttleRentIncome)}</p>
                    </div>
                  </div>
                  <Table>
                    <TableBody>
                      <TableRow className="bg-emerald-50/50">
                        <TableCell className="font-medium w-8 md:w-[50px] px-2 md:px-4">1</TableCell>
                        <TableCell className="px-2 md:px-4">
                          <div className="flex items-center gap-1 md:gap-2">
                            <CategoryIcon name="รถรับส่งสนามบิน" className="h-4 w-4 flex-shrink-0" />
                            <span className="text-xs md:text-sm font-medium text-emerald-600">ค่าเช่า รถรับส่งสนามบิน</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-2 md:px-4">
                          <div className="flex items-center justify-end gap-1 md:gap-1.5">
                            <div className="text-right px-2 py-1 md:px-3 md:py-2 bg-emerald-50 border border-emerald-200 rounded-md text-xs md:text-sm font-medium min-w-[60px] md:min-w-[80px] text-emerald-600">
                              {formatNumber(airportShuttleRentIncome)}
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                              onClick={() => openAdjustDialog('edit', 'airportShuttleRentIncome', 'ค่าเช่า รถรับส่งสนามบิน')}
                            >
                              <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                              onClick={() => openAdjustDialog('add', 'airportShuttleRentIncome', 'ค่าเช่า รถรับส่งสนามบิน')}
                            >
                              <Plus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                              onClick={() => openAdjustDialog('subtract', 'airportShuttleRentIncome', 'ค่าเช่า รถรับส่งสนามบิน')}
                            >
                              <Minus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </>
              )}

              {/* กลุ่ม 4: รายได้ Thai Bus Tour */}
              {(
                <>
                  <div className="bg-purple-500/10 px-4 py-2 border-y border-purple-500/20">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold text-purple-600">รายได้ Thai Bus Tour</p>
                      <p className="text-sm font-bold text-purple-600">{formatNumber(thaiBusTourIncome)}</p>
                    </div>
                  </div>
                  <Table>
                    <TableBody>
                      <TableRow className="bg-purple-50/50">
                        <TableCell className="font-medium w-8 md:w-[50px] px-2 md:px-4">1</TableCell>
                        <TableCell className="px-2 md:px-4">
                          <div className="flex items-center gap-1 md:gap-2">
                            <CategoryIcon name="Thai Bus" className="h-4 w-4 flex-shrink-0" />
                            <span className="text-xs md:text-sm font-medium text-purple-600">Thai Bus Tour</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-2 md:px-4">
                          <div className="flex items-center justify-end gap-1 md:gap-1.5">
                            <div className="text-right px-2 py-1 md:px-3 md:py-2 bg-purple-50 border border-purple-200 rounded-md text-xs md:text-sm font-medium min-w-[60px] md:min-w-[80px] text-purple-600">
                              {formatNumber(thaiBusTourIncome)}
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                              onClick={() => openAdjustDialog('edit', 'thaiBusTourIncome', 'Thai Bus Tour')}
                            >
                              <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                              onClick={() => openAdjustDialog('add', 'thaiBusTourIncome', 'Thai Bus Tour')}
                            >
                              <Plus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                              onClick={() => openAdjustDialog('subtract', 'thaiBusTourIncome', 'Thai Bus Tour')}
                            >
                              <Minus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </>
              )}

              {/* กลุ่ม 5: รายได้ Co Van Kessel */}
              {(
                <>
                  <div className="bg-orange-500/10 px-4 py-2 border-y border-orange-500/20">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold text-orange-600">รายได้ Co Van Kessel</p>
                      <p className="text-sm font-bold text-orange-600">{formatNumber(coVanKesselIncome)}</p>
                    </div>
                  </div>
                  <Table>
                    <TableBody>
                      <TableRow className="bg-orange-50/50">
                        <TableCell className="font-medium w-8 md:w-[50px] px-2 md:px-4">1</TableCell>
                        <TableCell className="px-2 md:px-4">
                          <div className="flex items-center gap-1 md:gap-2">
                            <CategoryIcon name="Co Van" className="h-4 w-4 flex-shrink-0" />
                            <span className="text-xs md:text-sm font-medium text-orange-600">Co Van Kessel</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-2 md:px-4">
                          <div className="flex items-center justify-end gap-1 md:gap-1.5">
                            <div className="text-right px-2 py-1 md:px-3 md:py-2 bg-orange-50 border border-orange-200 rounded-md text-xs md:text-sm font-medium min-w-[60px] md:min-w-[80px] text-orange-600">
                              {formatNumber(coVanKesselIncome)}
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                              onClick={() => openAdjustDialog('edit', 'coVanKesselIncome', 'Co Van Kessel')}
                            >
                              <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                              onClick={() => openAdjustDialog('add', 'coVanKesselIncome', 'Co Van Kessel')}
                            >
                              <Plus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                              onClick={() => openAdjustDialog('subtract', 'coVanKesselIncome', 'Co Van Kessel')}
                            >
                              <Minus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>

          {/* รายจ่าย */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#F28482] to-[#d96f6d] text-white flex flex-row items-center justify-between">
              <CardTitle className="text-white">รายจ่าย</CardTitle>
              <div className="text-right">
                <p className="text-sm text-white/80">รวมค่าใช้จ่าย</p>
                <p className="text-xl font-bold text-white">{formatNumber(totalExpense)}</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 md:w-[50px]">#</TableHead>
                    <TableHead>รายการ</TableHead>
                    <TableHead className="text-right">จำนวนเงิน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* อันดับ 1: รายจ่ายหน้างาน Cash - แสดงบนสุด */}
                  {cashExpenseCategory && (
                    <TableRow className="bg-[#F28482]/10">
                      <TableCell className="font-medium px-2 md:px-4">1</TableCell>
                      <TableCell className="px-2 md:px-4">
                        <div className="flex items-center gap-1 md:gap-2">
                          <CategoryIcon name={cashExpenseCategory.name} className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs md:text-sm font-medium text-[#F28482]">{cashExpenseCategory.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-2 md:px-4">
                        <div className="flex items-center justify-end gap-1 md:gap-1.5">
                          <div className="text-right px-2 py-1 md:px-3 md:py-2 bg-red-50 border border-red-200 rounded-md text-xs md:text-sm font-medium min-w-[60px] md:min-w-[80px] text-[#F28482]">
                            {formatNumber(transactionData[cashExpenseCategory.id] || 0)}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                            onClick={() => openAdjustDialog('edit', cashExpenseCategory.id, cashExpenseCategory.name)}
                          >
                            <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                            onClick={() => openAdjustDialog('add', cashExpenseCategory.id, cashExpenseCategory.name)}
                          >
                            <Plus className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                            onClick={() => openAdjustDialog('subtract', cashExpenseCategory.id, cashExpenseCategory.name)}
                          >
                            <Minus className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {/* ค่าเช่าอาคาร - ดึงจาก Settings (ซ่อนสำหรับ VIEWER) */}
                  {!isViewer && monthlyRent > 0 && (
                    <TableRow className="bg-[#F6BD60]/10">
                      <TableCell className="font-medium px-2 md:px-4">1</TableCell>
                      <TableCell className="px-2 md:px-4">
                        <div className="flex items-center gap-1 md:gap-2">
                          <CategoryIcon name="ค่าเช่าอาคาร" className="h-4 w-4 flex-shrink-0" />
                          <div>
                            <span className="text-xs md:text-sm font-medium text-[#D4A24C]">ค่าเช่าอาคาร</span>
                            <p className="text-[10px] md:text-xs text-slate-400 hidden md:block">
                              (ดึงจากหน้าตั้งค่าอาคาร)
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-2 md:px-4">
                        <p className="font-medium text-xs md:text-sm text-[#D4A24C]">
                          {formatNumber(monthlyRent)}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                  {/* เงินเดือนพนักงาน (ซ่อนสำหรับ VIEWER) */}
                  {!isViewer && salaryCategory && salarySummary && (
                    <TableRow className="bg-[#84A59D]/10">
                      <TableCell className="font-medium px-2 md:px-4">{(monthlyRent > 0 ? 1 : 0) + 1}</TableCell>
                      <TableCell className="px-2 md:px-4">
                        <div className="flex items-center gap-1 md:gap-2">
                          <CategoryIcon name={salaryCategory.name} className="h-4 w-4 flex-shrink-0" />
                          <div>
                            <span className="text-xs md:text-sm font-medium text-[#84A59D]">{salaryCategory.name}</span>
                            <p className="text-[10px] md:text-xs text-[#84A59D] hidden md:block">
                              ({formatNumber(salarySummary.totalSalary)} / {salarySummary.buildingCount} อาคาร)
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-2 md:px-4">
                        <p className="font-medium text-xs md:text-sm text-[#84A59D]">
                          {formatNumber(salarySummary.salaryPerBuilding)}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                  {/* ค่าใช้จ่ายส่วนกลาง - แสดงเฉพาะรายการที่มีค่ามากกว่า 0 */}
                  {globalSettings && (
                    <>
                      {/* ค่าดูแล MAX - เฉพาะ 3 อาคาร (NANA, CT, YW) */}
                      {maxCareExpensePerBuilding > 0 && (
                        <TableRow className="bg-[#9B59B6]/10">
                          <TableCell className="font-medium px-2 md:px-4">
                            {(!isViewer && monthlyRent > 0 ? 1 : 0) + (!isViewer && salaryCategory && salarySummary ? 1 : 0) + 1}
                          </TableCell>
                          <TableCell className="px-2 md:px-4">
                            <div className="flex items-center gap-1 md:gap-2">
                              <CategoryIcon name="ค่าดูแล MAX" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-xs md:text-sm font-medium text-[#9B59B6]">ค่าดูแล MAX</span>
                                <p className="text-[10px] md:text-xs text-[#9B59B6] hidden md:block">
                                  ({formatNumber(globalSettings.maxCareExpense)} / {globalSettings.careExpenseDivisor} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-2 md:px-4">
                            <p className="font-medium text-xs md:text-sm text-[#9B59B6]">{formatNumber(maxCareExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าดูแลจราจร - เฉพาะ 3 อาคาร (NANA, CT, YW) */}
                      {trafficCareExpensePerBuilding > 0 && (
                        <TableRow className="bg-[#E74C3C]/10">
                          <TableCell className="font-medium px-2 md:px-4">
                            {(!isViewer && monthlyRent > 0 ? 1 : 0) + (!isViewer && salaryCategory && salarySummary ? 1 : 0) + (maxCareExpensePerBuilding > 0 ? 1 : 0) + 1}
                          </TableCell>
                          <TableCell className="px-2 md:px-4">
                            <div className="flex items-center gap-1 md:gap-2">
                              <CategoryIcon name="ค่าดูแลจราจร" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-xs md:text-sm font-medium text-[#E74C3C]">ค่าดูแลจราจร</span>
                                <p className="text-[10px] md:text-xs text-[#E74C3C] hidden md:block">
                                  ({formatNumber(globalSettings.trafficCareExpense)} / {globalSettings.careExpenseDivisor} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-2 md:px-4">
                            <p className="font-medium text-xs md:text-sm text-[#E74C3C]">{formatNumber(trafficCareExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าขนส่งสินค้า - เฉพาะ 3 อาคาร (NANA, CT, YW) */}
                      {shippingExpensePerBuilding > 0 && (
                        <TableRow className="bg-orange-100/50">
                          <TableCell className="font-medium px-2 md:px-4">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) + (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) + 1}
                          </TableCell>
                          <TableCell className="px-2 md:px-4">
                            <div className="flex items-center gap-1 md:gap-2">
                              <CategoryIcon name="ค่าขนส่งสินค้า" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-xs md:text-sm font-medium text-orange-600">ค่าขนส่งสินค้า</span>
                                <p className="text-[10px] md:text-xs text-orange-500 hidden md:block">
                                  ({formatNumber(globalSettings.shippingExpense)} / {globalSettings.careExpenseDivisor} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-2 md:px-4">
                            <p className="font-medium text-xs md:text-sm text-orange-600">{formatNumber(shippingExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่า Amenity - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-pink-100/50">
                          <TableCell className="font-medium px-2 md:px-4">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1}
                          </TableCell>
                          <TableCell className="px-2 md:px-4">
                            <div className="flex items-center gap-1 md:gap-2">
                              <CategoryIcon name="Amenity" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-xs md:text-sm font-medium text-pink-500">Amenity</span>
                                <p className="text-[10px] md:text-xs text-pink-400 hidden md:block">
                                  ({formatNumber(globalSettings.amenityExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-2 md:px-4">
                            <p className="font-medium text-xs md:text-sm text-pink-500">{formatNumber(amenityExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าเช่าเครื่องกรองน้ำ Coway - แสดงเสมอ พร้อมปุ่มแก้ไข */}
                      <TableRow className="bg-cyan-100/50">
                        <TableCell className="font-medium px-2 md:px-4">
                          {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                           (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                           (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1}
                        </TableCell>
                        <TableCell className="px-2 md:px-4">
                          <div className="flex items-center gap-1 md:gap-2">
                            <CategoryIcon name="กรองน้ำ" className="h-4 w-4 flex-shrink-0" />
                            <div>
                              <span className="text-xs md:text-sm font-medium text-cyan-600">กรองน้ำ Coway</span>
                              <p className="text-[10px] md:text-xs text-cyan-500 hidden md:block">
                                (บาท/เดือน)
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-2 md:px-4">
                          <div className="flex items-center justify-end gap-1">
                            <p className="font-medium text-xs md:text-sm text-cyan-600">{formatNumber(cowayWaterFilterExpense)}</p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                              onClick={() => openAdjustDialog('edit', 'cowayWaterFilterExpense', 'กรองน้ำ Coway')}
                            >
                              <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                              onClick={() => openAdjustDialog('add', 'cowayWaterFilterExpense', 'กรองน้ำ Coway')}
                            >
                              <Plus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                              onClick={() => openAdjustDialog('subtract', 'cowayWaterFilterExpense', 'กรองน้ำ Coway')}
                            >
                              <Minus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* ค่าน้ำเปล่า - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-sky-100/50">
                          <TableCell className="font-medium px-2 md:px-4">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1}
                          </TableCell>
                          <TableCell className="px-2 md:px-4">
                            <div className="flex items-center gap-1 md:gap-2">
                              <CategoryIcon name="น้ำเปล่า" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-xs md:text-sm font-medium text-cyan-500">ค่าน้ำเปล่า</span>
                                <p className="text-[10px] md:text-xs text-cyan-400 hidden md:block">
                                  ({formatNumber(globalSettings.waterBottleExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-2 md:px-4">
                            <p className="font-medium text-xs md:text-sm text-cyan-500">{formatNumber(waterBottleExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าขนมคุ้กกี้ - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-amber-100/50">
                          <TableCell className="font-medium px-2 md:px-4">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1}
                          </TableCell>
                          <TableCell className="px-2 md:px-4">
                            <div className="flex items-center gap-1 md:gap-2">
                              <CategoryIcon name="คุ้กกี้" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-xs md:text-sm font-medium text-amber-500">ค่าขนมคุ้กกี้</span>
                                <p className="text-[10px] md:text-xs text-amber-400 hidden md:block">
                                  ({formatNumber(globalSettings.cookieExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-2 md:px-4">
                            <p className="font-medium text-xs md:text-sm text-amber-500">{formatNumber(cookieExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่ากาแฟซอง น้ำตาล คอฟฟี่เมท - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-amber-200/50">
                          <TableCell className="font-medium px-2 md:px-4">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1}
                          </TableCell>
                          <TableCell className="px-2 md:px-4">
                            <div className="flex items-center gap-1 md:gap-2">
                              <CategoryIcon name="กาแฟ" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-xs md:text-sm font-medium text-amber-700">กาแฟ น้ำตาล คอฟฟี่เมท</span>
                                <p className="text-[10px] md:text-xs text-amber-600 hidden md:block">
                                  ({formatNumber(globalSettings.coffeeExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-2 md:px-4">
                            <p className="font-medium text-xs md:text-sm text-amber-700">{formatNumber(coffeeExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าน้ำมันรถมอเตอร์ไซค์ - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-gray-100/50">
                          <TableCell className="font-medium px-2 md:px-4">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + 1}
                          </TableCell>
                          <TableCell className="px-2 md:px-4">
                            <div className="flex items-center gap-1 md:gap-2">
                              <CategoryIcon name="น้ำมัน" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-xs md:text-sm font-medium text-gray-600">ค่าน้ำมันมอไซค์</span>
                                <p className="text-[10px] md:text-xs text-gray-500 hidden md:block">
                                  ({formatNumber(globalSettings.fuelExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-2 md:px-4">
                            <p className="font-medium text-xs md:text-sm text-gray-600">{formatNumber(fuelExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าเช่าที่จอดรถมอเตอร์ไซค์ - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-slate-100/50">
                          <TableCell className="font-medium px-2 md:px-4">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + 1 + 1}
                          </TableCell>
                          <TableCell className="px-2 md:px-4">
                            <div className="flex items-center gap-1 md:gap-2">
                              <CategoryIcon name="ที่จอดรถ" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-xs md:text-sm font-medium text-slate-600">ค่าที่จอดรถมอไซค์</span>
                                <p className="text-[10px] md:text-xs text-slate-500 hidden md:block">
                                  ({formatNumber(globalSettings.parkingExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-2 md:px-4">
                            <p className="font-medium text-xs md:text-sm text-slate-600">{formatNumber(parkingExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าซ่อมบำรุงรถมอเตอร์ไซค์ - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-orange-100/50">
                          <TableCell className="font-medium px-2 md:px-4">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1}
                          </TableCell>
                          <TableCell className="px-2 md:px-4">
                            <div className="flex items-center gap-1 md:gap-2">
                              <CategoryIcon name="ซ่อมบำรุงรถ" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-xs md:text-sm font-medium text-orange-600">ซ่อมบำรุงมอไซค์</span>
                                <p className="text-[10px] md:text-xs text-orange-500 hidden md:block">
                                  ({formatNumber(globalSettings.motorcycleMaintenanceExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-2 md:px-4">
                            <p className="font-medium text-xs md:text-sm text-orange-600">{formatNumber(motorcycleMaintenanceExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าเดินทางแม่บ้าน - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-violet-100/50">
                          <TableCell className="font-medium px-2 md:px-4">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1}
                          </TableCell>
                          <TableCell className="px-2 md:px-4">
                            <div className="flex items-center gap-1 md:gap-2">
                              <CategoryIcon name="เดินทางแม่บ้าน" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-xs md:text-sm font-medium text-violet-600">เดินทางแม่บ้าน</span>
                                <p className="text-[10px] md:text-xs text-violet-500 hidden md:block">
                                  ({formatNumber(globalSettings.maidTravelExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-2 md:px-4">
                            <p className="font-medium text-xs md:text-sm text-violet-600">{formatNumber(maidTravelExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าอุปกรณ์ทำความสะอาด - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-teal-100/50">
                          <TableCell className="font-medium px-2 md:px-4">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1}
                          </TableCell>
                          <TableCell className="px-2 md:px-4">
                            <div className="flex items-center gap-1 md:gap-2">
                              <CategoryIcon name="ทำความสะอาด" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-xs md:text-sm font-medium text-teal-600">อุปกรณ์ทำความสะอาด</span>
                                <p className="text-[10px] md:text-xs text-teal-500 hidden md:block">
                                  ({formatNumber(globalSettings.cleaningSupplyExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-2 md:px-4">
                            <p className="font-medium text-xs md:text-sm text-teal-600">{formatNumber(cleaningSupplyExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าอาหาร - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-orange-100/50">
                          <TableCell className="font-medium px-2 md:px-4">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1}
                          </TableCell>
                          <TableCell className="px-2 md:px-4">
                            <div className="flex items-center gap-1 md:gap-2">
                              <CategoryIcon name="อาหาร" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-xs md:text-sm font-medium text-orange-600">ค่าอาหาร</span>
                                <p className="text-[10px] md:text-xs text-orange-500 hidden md:block">
                                  ({formatNumber(globalSettings.foodExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-2 md:px-4">
                            <p className="font-medium text-xs md:text-sm text-orange-600">{formatNumber(foodExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* เงินสมทบประกันสังคม - ซ่อนสำหรับ Viewer */}
                      {!isViewer && socialSecurityData && (
                        <TableRow className="bg-pink-100/50">
                          <TableCell className="font-medium px-2 md:px-4">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1}
                          </TableCell>
                          <TableCell className="px-2 md:px-4">
                            <div className="flex items-center gap-1 md:gap-2">
                              <CategoryIcon name="ประกันสังคม" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-xs md:text-sm font-medium text-pink-600">ประกันสังคม</span>
                                <p className="text-[10px] md:text-xs text-pink-500 hidden md:block">
                                  ({formatNumber(socialSecurityData.totalAmount)} / {socialSecurityData.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-2 md:px-4">
                            <p className="font-medium text-xs md:text-sm text-pink-600">{formatNumber(socialSecurityExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                  {/* รายจ่ายอื่นๆ */}
                  {otherExpenseCategories.map((category, index) => {
                    // baseIndex = ค่าเช่าอาคาร + ค่า Coway + เงินเดือน + ค่าดูแลMAX + ค่าดูแลจราจร + ค่าขนส่ง + 12 รายการค่าใช้จ่ายส่วนกลาง (รวมประกันสังคม)
                    const baseIndex = (monthlyRent > 0 ? 1 : 0) + 1 + (salaryCategory && salarySummary ? 1 : 0) +
                      (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                      (shippingExpensePerBuilding > 0 ? 1 : 0) + (globalSettings ? 11 : 0) + (socialSecurityData ? 1 : 0)
                    return (
                      <TableRow
                        key={category.id}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-[#F28482]/5'}
                      >
                        <TableCell className="font-medium px-2 md:px-4">{baseIndex + index + 1}</TableCell>
                        <TableCell className="px-2 md:px-4">
                          <div className="flex items-center gap-1 md:gap-2">
                            <CategoryIcon name={category.name} className="h-4 w-4 flex-shrink-0" />
                            <span className="text-xs md:text-sm">{category.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-2 md:px-4">
                          <div className="flex items-center justify-end gap-1 md:gap-1.5">
                            <div
                              className="text-right px-2 py-1 md:px-3 md:py-2 bg-gray-50 border rounded-md text-xs md:text-sm font-medium min-w-[60px] md:min-w-[80px]"
                            >
                              {formatNumber(transactionData[category.id] || 0)}
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                              onClick={() => openAdjustDialog('edit', category.id, category.name)}
                            >
                              <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                              onClick={() => openAdjustDialog('add', category.id, category.name)}
                            >
                              <Plus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                              onClick={() => openAdjustDialog('subtract', category.id, category.name)}
                            >
                              <Minus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        </>
      )}

      {/* Dialog เพิ่ม/ลดยอด พร้อมประวัติ */}
      <Dialog open={adjustDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto p-3 sm:p-6">
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
                  แก้ไข: {adjustCategoryName}
                </span>
              ) : adjustType === 'add' ? (
                `+ เพิ่มยอด: ${adjustCategoryName}`
              ) : (
                `- ลดยอด: ${adjustCategoryName}`
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 sm:space-y-4 py-1 sm:py-4">
            {/* เลือกเดือน/ปี */}
            <div className="flex flex-col sm:flex-row gap-1.5 sm:items-center p-1.5 sm:p-0 bg-slate-50 sm:bg-transparent rounded-lg sm:rounded-none">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-[10px] sm:text-sm text-gray-500 w-auto sm:w-16">เดือน/ปี:</span>
                <Select
                  value={adjustMonth}
                  onValueChange={(val) => handleAdjustMonthYearChange(val, adjustYear)}
                >
                  <SelectTrigger className="w-[80px] sm:w-[120px] h-7 sm:h-10 text-[11px] sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableMonths(adjustYear, selectedBuildingCode).map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={adjustYear}
                  onValueChange={(val) => handleAdjustMonthYearChange(adjustMonth, val)}
                >
                  <SelectTrigger className="w-[55px] sm:w-[90px] h-7 sm:h-10 text-[11px] sm:text-sm">
                    <SelectValue />
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
              <div className="sm:ml-auto text-right">
                <span className="text-[9px] sm:text-sm text-gray-500">ยอดรวม: </span>
                <span className="font-bold text-xs sm:text-lg">{formatNumber(historyTotal)} บาท</span>
              </div>
            </div>

            {/* ตารางประวัติ */}
            <div className="border rounded-lg max-h-[120px] sm:max-h-[200px] overflow-y-auto overflow-x-auto">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : expenseHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  ยังไม่มีประวัติ
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px] sm:w-[100px] px-1 sm:px-4 text-[9px] sm:text-xs">วันที่</TableHead>
                      <TableHead className="px-1 sm:px-4 text-[9px] sm:text-xs">รายละเอียด</TableHead>
                      <TableHead className="text-right w-[60px] sm:w-[100px] px-1 sm:px-4 text-[9px] sm:text-xs">จำนวน</TableHead>
                      <TableHead className="w-[30px] sm:w-[50px] px-0.5 sm:px-4"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-[9px] sm:text-xs text-gray-500 px-1 sm:px-4 py-1 sm:py-2">
                          {new Date(item.createdAt).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </TableCell>
                        <TableCell className="text-[10px] sm:text-sm px-1 sm:px-4 py-1 sm:py-2 max-w-[80px] sm:max-w-none truncate">{item.description}</TableCell>
                        <TableCell className={`text-right font-medium text-[10px] sm:text-sm px-1 sm:px-4 py-1 sm:py-2 ${item.actionType === 'ADD' ? 'text-green-600' : 'text-red-600'}`}>
                          {item.actionType === 'ADD' ? '+' : '-'}{formatNumber(Number(item.amount))}
                        </TableCell>
                        <TableCell className="px-0.5 sm:px-4 py-1 sm:py-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 sm:h-7 sm:w-7 text-gray-400 hover:text-red-600"
                            onClick={() => handleDeleteHistory(item.id)}
                            disabled={deletingId === item.id}
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="h-2.5 w-2.5 sm:h-4 sm:w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Form เพิ่มรายการใหม่ */}
            <div className="border-t pt-1.5 sm:pt-4 space-y-1.5 sm:space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-sm font-medium text-gray-700">
                  {adjustType === 'edit'
                    ? 'เพิ่ม/ลดรายการ'
                    : adjustType === 'add'
                      ? 'เพิ่มรายการใหม่'
                      : 'ลดรายการใหม่'}
                </p>
                {/* ตัวเลือก add/subtract สำหรับ edit mode */}
                {adjustType === 'edit' && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={adjustAction === 'add' ? 'default' : 'outline'}
                      className={`h-6 sm:h-8 text-[10px] sm:text-sm px-1.5 sm:px-3 ${adjustAction === 'add' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      onClick={() => setAdjustAction('add')}
                    >
                      <Plus className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                      เพิ่ม
                    </Button>
                    <Button
                      size="sm"
                      variant={adjustAction === 'subtract' ? 'default' : 'outline'}
                      className={`h-6 sm:h-8 text-[10px] sm:text-sm px-1.5 sm:px-3 ${adjustAction === 'subtract' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                      onClick={() => setAdjustAction('subtract')}
                    >
                      <Minus className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                      ลด
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] sm:text-sm text-gray-500">รายละเอียด *</label>
                <Input
                  value={adjustDescription}
                  onChange={(e) => setAdjustDescription(e.target.value)}
                  className="mt-0.5 h-7 sm:h-10 text-[11px] sm:text-sm"
                  placeholder="เช่น ค่าซ่อมแอร์, ค่าฉีดปลวก..."
                />
              </div>
              <div>
                <label className="text-[10px] sm:text-sm text-gray-500">จำนวนเงิน *</label>
                <Input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="mt-0.5 h-7 sm:h-10 text-[11px] sm:text-sm text-right"
                  placeholder="0"
                />
              </div>
              {adjustAmount && parseFloat(adjustAmount) > 0 && (
                <div className="flex justify-between items-center bg-gray-50 p-1.5 sm:p-3 rounded-lg">
                  <span className="text-[10px] sm:text-sm">ยอดใหม่หลังบันทึก:</span>
                  <span className={`text-[11px] sm:text-lg font-bold ${getEffectiveAction() === 'add' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatNumber(getNewAmount())} บาท
                  </span>
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
              disabled={savingHistory || !adjustDescription.trim() || !adjustAmount}
              className={`w-full sm:w-auto h-7 sm:h-10 text-[11px] sm:text-sm ${getEffectiveAction() === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {savingHistory ? (
                <Loader2 className="h-2.5 w-2.5 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
              ) : null}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
