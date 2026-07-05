// เฟส 3 — Reconciliation: เทียบยอดจาก /api/summary จริง กับการคำนวณซ้ำอิสระจาก raw DB
import './_env-guard'
import { prisma } from '../../src/lib/prisma'
import { calculateSocialSecurity } from '../../src/lib/calculations'
import { shouldUseLeaveSource, getFdExtraIncome, getFdExtraExpenseForBuilding } from '../../src/lib/extra-work-source'
import {
  FLOOR1_RENT_DEFAULT,
  FLOOR1_RENT_ELIGIBLE_BUILDINGS,
  FLOOR1_RENT_FIELD_NAME,
} from '../../src/lib/income-defaults'

const PARTNER_COOKIE = 'access_user=' + encodeURIComponent(JSON.stringify({ id: 5 })) // bank (PARTNER)
const BASE = 'http://localhost:3000'
const ELIGIBLE = ['CT', 'YW', 'NANA']

// gate ช่วงทำงานระดับเดือน — mirror summary/route.ts (+ monthly-salary/salary-summary) ให้เหมือนเป๊ะ
function isInWorkPeriod(emp: { startDate: Date | null; endDate: Date | null }, viewIdx: number): boolean {
  if (emp.startDate) {
    const startIdx = emp.startDate.getUTCFullYear() * 12 + (emp.startDate.getUTCMonth() + 1)
    if (viewIdx < startIdx) return false
  }
  if (emp.endDate) {
    const endIdx = emp.endDate.getUTCFullYear() * 12 + (emp.endDate.getUTCMonth() + 1)
    if (viewIdx > endIdx) return false
  }
  return true
}

// ---- คำนวณซ้ำอิสระ (implement จากสูตรที่ audit ในเฟส 1) ----
async function recompute(buildingId: number, month: number, year: number) {
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    include: { settings: true },
  })
  if (!building) throw new Error('no building')
  const isEligible = ELIGIBLE.includes(building.code)
  const isFunnD = !isEligible
  const useLeave = shouldUseLeaveSource(month, year)

  const categories = await prisma.category.findMany()
  const catMap = new Map(categories.map((c) => [c.id, c]))

  // TRANSACTION history → categoryTotals + special income
  const txHist = await prisma.expenseHistory.findMany({
    where: { targetType: 'TRANSACTION', targetId: buildingId, month, year },
  })
  const catTotals: Record<number, number> = {}
  let airport = 0, thaiBus = 0, coVan = 0, floor1 = 0, hasFloor1 = false
  let fdLadAcc = 0, fdSukAcc = 0 // สะสม fdExtra จาก ExpenseHistory (ใช้เมื่อ legacy)
  for (const it of txHist) {
    const amt = Number(it.amount)
    const sign = it.actionType === 'ADD' ? 1 : -1
    if (it.fieldName === 'airportShuttleRentIncome') { airport += sign * amt; continue }
    if (it.fieldName === 'thaiBusTourIncome') { thaiBus += sign * amt; continue }
    if (it.fieldName === 'coVanKesselIncome') { coVan += sign * amt; continue }
    if (it.fieldName === FLOOR1_RENT_FIELD_NAME) { hasFloor1 = true; floor1 += sign * amt; continue }
    if (it.fieldName === 'fdExtraLadpraoIncome') { if (!useLeave) fdLadAcc += sign * amt; continue }
    if (it.fieldName === 'fdExtraSukhumvitIncome') { if (!useLeave) fdSukAcc += sign * amt; continue }
    const cid = parseInt(it.fieldName)
    catTotals[cid] = (catTotals[cid] || 0) + sign * amt
  }
  airport = Math.max(0, airport); thaiBus = Math.max(0, thaiBus); coVan = Math.max(0, coVan)
  floor1 = Math.max(0, floor1)
  const eligFloor1 = (FLOOR1_RENT_ELIGIBLE_BUILDINGS as readonly string[]).includes(building.code)
  if (eligFloor1 && !hasFloor1) floor1 = FLOOR1_RENT_DEFAULT
  if (!eligFloor1) floor1 = 0
  for (const k of Object.keys(catTotals)) catTotals[+k] = Math.max(0, catTotals[+k])

  // fdExtra income: legacy → จาก ExpenseHistory, leave → จาก leave-bay (เฉพาะ CT/YW/NANA)
  let fdLadprao = Math.max(0, fdLadAcc), fdSukhumvit = Math.max(0, fdSukAcc)
  if (useLeave && isEligible) {
    const leave = await getFdExtraIncome(month, year)
    fdLadprao = Math.max(0, leave.fdExtraLadpraoIncome)
    fdSukhumvit = Math.max(0, leave.fdExtraSukhumvitIncome)
  }

  // virtual tx
  const incomeTx: number[] = []
  const expenseTxExclSalary: number[] = []
  for (const [cidStr, amt] of Object.entries(catTotals)) {
    if (amt <= 0) continue
    const cat = catMap.get(+cidStr)
    if (!cat) continue
    if (cat.type === 'INCOME') incomeTx.push(amt)
    else if (cat.name !== 'เงินเดือนพนักงาน') expenseTxExclSalary.push(amt)
  }

  // SETTINGS per-building totals (ยกเว้น coway)
  const setHist = await prisma.expenseHistory.findMany({
    where: { targetType: 'SETTINGS', targetId: buildingId, month, year },
  })
  const pbt: Record<string, number> = {}
  for (const it of setHist) {
    if (it.fieldName === 'cowayWaterFilterExpense') continue
    const amt = Number(it.amount)
    pbt[it.fieldName] = (pbt[it.fieldName] || 0) + (it.actionType === 'ADD' ? amt : -amt)
  }
  for (const k of Object.keys(pbt)) pbt[k] = Math.max(0, pbt[k])

  // salary — mirror summary/monthly-salary เป๊ะ: gate ช่วงทำงาน + carry-forward + isPaused
  const allEmployees = await prisma.employee.findMany({ where: { isActive: true } })
  const viewIdx = year * 12 + month
  const employees = allEmployees.filter((e) => isInWorkPeriod(e, viewIdx))
  const ms = await prisma.monthlySalary.findMany({ where: { month, year } })

  // carry-forward: คนที่ไม่มี record เดือนนี้ → record ล่าสุด "ก่อน" เดือนนี้ (ข้ามหลายเดือนได้)
  const idsWithRecord = new Set(ms.map((r) => r.employeeId))
  const idsWithout = employees.filter((e) => !idsWithRecord.has(e.id)).map((e) => e.id)
  const prevRecords: typeof ms = []
  if (idsWithout.length > 0) {
    const allPrev = await prisma.monthlySalary.findMany({
      where: { employeeId: { in: idsWithout }, OR: [{ year: { lt: year } }, { year, month: { lt: month } }] },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })
    const seen = new Set<number>()
    for (const rec of allPrev) { if (!seen.has(rec.employeeId)) { seen.add(rec.employeeId); prevRecords.push(rec) } }
  }
  // effective salary ต่อคน: record เดือนนี้ (isPaused→0) → carry-forward (isPaused→0) → default
  const effMap = new Map<number, number>()
  for (const e of employees) {
    const rec = ms.find((x) => x.employeeId === e.id)
    const prev = !rec ? prevRecords.find((p) => p.employeeId === e.id) : null
    let eff: number
    if (rec) eff = rec.isPaused ? 0 : Number(rec.salary)
    else if (prev) eff = prev.isPaused ? 0 : Number(prev.salary)
    else eff = Number(e.salary)
    effMap.set(e.id, eff)
  }
  const totalSalary = employees.reduce((s, e) => s + (effMap.get(e.id) ?? 0), 0)
  const salaryPerBuilding = isEligible ? totalSalary / 3 : (pbt.salaryExpense || 0)

  // social security (recompute จาก effectiveSalary เฉพาะคนที่มี contribution > 0)
  const ssContribs = await prisma.socialSecurityContribution.findMany({ where: { month, year } })
  const ssMap = new Map(ssContribs.map((c) => [c.employeeId, Number(c.amount)]))
  let ssTotal = 0
  for (const e of employees) {
    if ((ssMap.get(e.id) || 0) > 0) {
      const eff = effMap.get(e.id) ?? 0
      ssTotal += calculateSocialSecurity(eff)
    }
  }
  const ssPerBuilding = isEligible ? ssTotal / 3 : (pbt.socialSecurityExpense || 0)

  // global 16 fields
  const g = (k: string) => pbt[k] || 0
  const totalGlobal =
    g('maxCareExpense') + g('trafficCareExpense') + g('shippingExpense') + g('amenityExpense') +
    g('waterBottleExpense') + g('cookieExpense') + g('coffeeExpense') + g('sugarExpense') +
    g('coffeeMateExpense') + g('fuelExpense') + g('parkingExpense') + g('motorcycleMaintenanceExpense') +
    g('maidTravelExpense') + g('cleaningSupplyExpense') + g('foodExpense') + g('siteminderExpense')

  const managerAdminIncome = isEligible ? g('managerAdminSalaryIncome') : 0
  const managerAdminExpense = isFunnD ? g('managerAdminSalaryExpense') : 0
  const holidayComp = isEligible ? g('holidayCompensation') : 0
  let aswOtherService = 0
  if (isFunnD) {
    if (useLeave) {
      const leave = await getFdExtraIncome(month, year)
      aswOtherService = getFdExtraExpenseForBuilding(building.code, leave.raw)
    } else {
      aswOtherService = g('aswOtherServiceExpense')
    }
  }

  // coway
  const cowayHist = await prisma.expenseHistory.findMany({
    where: { targetType: 'SETTINGS', targetId: buildingId, fieldName: 'cowayWaterFilterExpense', month, year },
  })
  let coway = 0
  for (const it of cowayHist) coway += it.actionType === 'ADD' ? Number(it.amount) : -Number(it.amount)
  coway = Math.max(0, coway)

  // reimbursement
  const reimb = await prisma.reimbursement.aggregate({
    where: { buildingId, month, year, isReturned: true },
    _sum: { amount: true },
  })
  const reimbExpense = Number(reimb._sum.amount) || 0

  const monthlyRent = building.settings ? Number(building.settings.monthlyRent) : 0

  const totalIncome =
    incomeTx.reduce((a, b) => a + b, 0) + airport + thaiBus + coVan +
    fdLadprao + fdSukhumvit + managerAdminIncome + floor1

  const totalExpense =
    expenseTxExclSalary.reduce((a, b) => a + b, 0) + monthlyRent + coway + salaryPerBuilding +
    totalGlobal + ssPerBuilding + managerAdminExpense + aswOtherService + reimbExpense + holidayComp

  return {
    totalIncome, totalExpense, grossProfit: totalIncome - totalExpense,
    salaryPerBuilding, ssPerBuilding, floor1RentIncome: floor1,
    reimbExpense, holidayComp, monthlyRent, coway,
  }
}

async function callApi(buildingId: number, month: number, year: number) {
  const res = await fetch(`${BASE}/api/summary?buildingId=${buildingId}&month=${month}&year=${year}`, {
    headers: { Cookie: PARTNER_COOKIE },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return res.json()
}

const r2 = (n: number) => Math.round(n * 100) / 100
const ok = (a: number, b: number) => Math.abs(a - b) < 0.01

async function main() {
  const buildings = await prisma.building.findMany({ orderBy: { id: 'asc' } })
  const periods = [
    { m: 2, y: 2026 }, { m: 3, y: 2026 }, { m: 4, y: 2026 },
    { m: 5, y: 2026 }, { m: 6, y: 2026 }, { m: 7, y: 2026 },
  ]

  let pass = 0, fail = 0
  const failRows: string[] = []
  console.log('\n| อาคาร | เดือน | บรรทัด | ระบบ(API) | คำนวณซ้ำ | ต่าง | สถานะ |')
  console.log('|---|---|---|---|---|---|---|')

  for (const p of periods) {
    for (const b of buildings) {
      const api = await callApi(b.id, p.m, p.y)
      const mine = await recompute(b.id, p.m, p.y)
      const lines: [string, number, number][] = [
        ['totalIncome', api.totalIncome, mine.totalIncome],
        ['totalExpense', api.totalExpense, mine.totalExpense],
        ['grossProfit', api.grossProfit, mine.grossProfit],
        ['เงินเดือน/อาคาร', api.socialSecurityExpense !== undefined ? api.expenseByCategory?.['เงินเดือนพนักงาน'] ?? 0 : 0, mine.salaryPerBuilding],
        ['ประกันสังคม', api.socialSecurityExpense, mine.ssPerBuilding],
        ['ค่าเช่าชั้น1', api.floor1RentIncome, mine.floor1RentIncome],
        ['คืนยอดค้าง', api.reimbursementReturnExpense, mine.reimbExpense],
        ['ค่าแรงวันหยุด', api.holidayCompensation, mine.holidayComp],
      ]
      for (const [label, sys, my] of lines) {
        const diff = r2((sys || 0) - (my || 0))
        const status = ok(sys || 0, my || 0) ? '✅' : '❌'
        if (status === '✅') pass++; else { fail++; failRows.push(`${b.code} ${p.m}/${p.y} ${label}: ระบบ=${r2(sys||0)} ซ้ำ=${r2(my||0)} ต่าง=${diff}`) }
        console.log(`| ${b.code} | ${p.m}/${p.y} | ${label} | ${r2(sys||0)} | ${r2(my||0)} | ${diff} | ${status} |`)
      }
    }
  }

  console.log(`\n==== สรุป: ผ่าน ${pass} / ไม่ผ่าน ${fail} ====`)
  if (failRows.length) { console.log('\n❌ รายการที่ไม่ตรง:'); failRows.forEach((r) => console.log('  ' + r)) }
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
