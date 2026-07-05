// Invariant — salary-summary (ตารางรายจ่าย) ต้องให้เงินเดือนรวม "เท่ากันเป๊ะ" กับ monthly-salary (หน้า /employees)
// กันบั๊กที่เคยเกิด: salary-summary ไม่ carry-forward + ไม่เช็ค isPaused → เลขเกิน/ขาด (ต่างจาก monthly-salary)
// รันแบบเดียวกับ _reconcile.ts: ต้องมี dev server ที่ localhost:3000 (ควร EXTRA_WORK_SOURCE=legacy)
import './_env-guard'

const PARTNER_COOKIE = 'access_user=' + encodeURIComponent(JSON.stringify({ id: 5 })) // bank (PARTNER)
const BASE = 'http://localhost:3000'

// เดือนที่ทดสอบ — ครอบทั้งเดือนปกติ, เดือนมีคน paused (carry-forward), เดือนมีคนเข้ากลางเดือน
const PERIODS = [
  { m: 2, y: 2026, note: 'baseline' },
  { m: 3, y: 2026, note: 'มีคน paused (carry-forward)' },
  { m: 4, y: 2026, note: 'มีคน paused (carry-forward)' },
  { m: 5, y: 2026, note: 'ปกติ' },
  { m: 6, y: 2026, note: 'มีคนเข้ากลางเดือน (คุณ K 24 มิ.ย.)' },
  { m: 7, y: 2026, note: 'คุณ K record เต็มเดือน' },
]

const r2 = (n: number) => Math.round(n * 100) / 100
const ok = (a: number, b: number) => Math.abs(a - b) < 0.01

async function getJSON(url: string) {
  const res = await fetch(url, { headers: { Cookie: PARTNER_COOKIE } })
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}: ${await res.text()}`)
  return res.json()
}

async function main() {
  let pass = 0, fail = 0
  const failRows: string[] = []
  console.log('\n| เดือน | salary-summary | monthly-salary | ต่าง | สถานะ | หมายเหตุ |')
  console.log('|---|---|---|---|---|---|')

  for (const p of PERIODS) {
    const ss = await getJSON(`${BASE}/api/employees/salary-summary?month=${p.m}&year=${p.y}`)
    const ms = await getJSON(`${BASE}/api/employees/monthly-salary?month=${p.m}&year=${p.y}`)

    // invariant 1: totalSalary ต้องเท่ากันเป๊ะ
    const dTotal = r2(ss.totalSalary - ms.totalSalary)
    const okTotal = ok(ss.totalSalary, ms.totalSalary)
    if (okTotal) pass++; else { fail++; failRows.push(`${p.m}/${p.y} totalSalary: salary-summary=${r2(ss.totalSalary)} monthly-salary=${r2(ms.totalSalary)} ต่าง=${dTotal}`) }
    console.log(`| ${p.m}/${p.y} | ${r2(ss.totalSalary)} | ${r2(ms.totalSalary)} | ${dTotal} | ${okTotal ? '✅' : '❌'} | ${p.note} |`)

    // invariant 2: salaryPerBuilding (÷3) ต้องเท่ากันเป๊ะด้วย
    const okPer = ok(ss.salaryPerBuilding, ms.salaryPerBuilding)
    if (okPer) pass++; else { fail++; failRows.push(`${p.m}/${p.y} salaryPerBuilding: salary-summary=${r2(ss.salaryPerBuilding)} monthly-salary=${r2(ms.salaryPerBuilding)}`) }
  }

  console.log(`\n==== Invariant salary-summary = monthly-salary: ผ่าน ${pass} / ไม่ผ่าน ${fail} ====`)
  if (failRows.length) {
    console.log('\n❌ รายการที่ไม่ตรง:')
    failRows.forEach((r) => console.log('  ' + r))
    process.exit(1)
  }
  console.log('✅ ทั้ง 2 สูตรให้เงินเดือนรวม + ต่ออาคาร ตรงกันทุกเดือนที่ทดสอบ')
}

main().catch((e) => { console.error(e); process.exit(1) })
