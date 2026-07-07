// Invariant 3-way — เงินเดือน "ต่ออาคาร" ต้องเท่ากันเป๊ะทั้ง 3 แหล่ง:
//   ss      = salary-summary (ตารางรายจ่าย)        → ss.salaryPerBuilding
//   ms      = monthly-salary (หน้า /employees)      → ms.salaryPerBuilding  (ตัวเลข "ที่ถูก")
//   summary = /api/summary  (แดชบอร์ดสรุป)         → อาคาร CT: expenseByCategory['เงินเดือนพนักงาน']
// กันบั๊กที่เคยเกิด: salary-summary ไม่ carry-forward + ไม่เช็ค isPaused → เลขเกิน/ขาด (ต่างจาก monthly-salary)
//
// เทียบครบ 3 คู่ (ss=ms, ms=summary, ss=summary) ไม่ใช่ baseline เดียว — เพื่อ diagnostic:
//   pattern "2 fail 1 pass" → ตัวร่วมของ 2 คู่ที่ fail คือตัวที่พัง
//   เช่น ss=ms ✅ · ms≠summary ❌ · ss≠summary ❌ → summary คือตัวหลุด (ไม่ใช่ ms)
//
// รันแบบเดียวกับ _reconcile.ts: ต้องมี dev server ที่ localhost:3000
//   NOTE: เทียบแค่ "เงินเดือน" ล้วน (ไม่แตะ income/expense/fdExtra) → ไม่ต้องตั้ง EXTRA_WORK_SOURCE
//         เพราะ salaryPerBuilding คิดจาก MonthlySalary ล้วน ไม่ผูกกับ extra-work source
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

const SALARY_KEY = 'เงินเดือนพนักงาน' // key ใน summary.buildings[].expenseByCategory
const r2 = (n: number) => Math.round(n * 100) / 100
const ok = (a: number, b: number) => Math.abs(a - b) < 0.01

async function getJSON(url: string) {
  const res = await fetch(url, { headers: { Cookie: PARTNER_COOKIE } })
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}: ${await res.text()}`)
  return res.json()
}

// ดึงเงินเดือน/อาคาร ของ CT จาก /api/summary — พร้อม log เตือนเมื่อ key/อาคารหาย (ไม่เงียบ)
// แยก 2 กรณี: เงินเดือน 0 จริง (ปกติ) vs response format เปลี่ยน / หา CT ไม่เจอ (bug ต้องสืบ)
function getSummaryCtSalary(summary: any, tag: string): number {
  const buildings = summary?.buildings
  if (!Array.isArray(buildings)) {
    console.log(`⚠️  ${tag}: summary ไม่มี buildings[] (response format เปลี่ยน?) → fallback 0`)
    return 0
  }
  const ct = buildings.find((b: any) => b.buildingCode === 'CT')
  if (!ct) {
    console.log(`⚠️  ${tag}: หาอาคาร CT ไม่เจอใน summary.buildings (format เปลี่ยน?) → fallback 0`)
    return 0
  }
  const val = ct.expenseByCategory?.[SALARY_KEY]
  if (val === undefined) {
    console.log(`⚠️  ${tag}: ไม่พบ key '${SALARY_KEY}' ในอาคาร CT (เงินเดือน=0 จริง หรือ format เปลี่ยน?) → fallback 0`)
    return 0
  }
  return Number(val)
}

async function main() {
  let pass = 0, fail = 0
  const failRows: string[] = []
  console.log('\n| เดือน | ss | ms | summary(CT) | ss=ms | ms=summary | ss=summary | หมายเหตุ |')
  console.log('|---|---|---|---|---|---|---|---|')

  for (const p of PERIODS) {
    const tag = `${p.m}/${p.y}`
    const ss = await getJSON(`${BASE}/api/employees/salary-summary?month=${p.m}&year=${p.y}`)
    const ms = await getJSON(`${BASE}/api/employees/monthly-salary?month=${p.m}&year=${p.y}`)
    const sm = await getJSON(`${BASE}/api/summary?month=${p.m}&year=${p.y}`)

    const ssSal = Number(ss.salaryPerBuilding)
    const msSal = Number(ms.salaryPerBuilding)
    const smSal = getSummaryCtSalary(sm, `summary ${tag}`)

    // 3 คู่ salaryPerBuilding
    const okSsMs = ok(ssSal, msSal)
    const okMsSm = ok(msSal, smSal)
    const okSsSm = ok(ssSal, smSal)
    for (const okPair of [okSsMs, okMsSm, okSsSm]) { if (okPair) pass++; else fail++ }

    // invariant เดิม (เก็บไว้เป็น double-check ราคาถูก): totalSalary ต้อง ss=ms
    const okTotal = ok(Number(ss.totalSalary), Number(ms.totalSalary))
    if (okTotal) pass++; else fail++

    console.log(
      `| ${tag} | ${r2(ssSal)} | ${r2(msSal)} | ${r2(smSal)} | ` +
      `${okSsMs ? '✅' : '❌'} | ${okMsSm ? '✅' : '❌'} | ${okSsSm ? '✅' : '❌'} | ${p.note} |`
    )

    // report เมื่อ fail: แสดง "ทุกคู่" (ทั้ง pass และ fail) → อ่านออกทันทีว่าตัวไหนหลุด
    if (!(okSsMs && okMsSm && okSsSm)) {
      failRows.push(
        `${tag}: ss=ms ${okSsMs ? '✅' : '❌'} · ms=summary ${okMsSm ? '✅' : '❌'} · ss=summary ${okSsSm ? '✅' : '❌'}  ` +
        `[ss=${r2(ssSal)} ms=${r2(msSal)} summary=${r2(smSal)}]`
      )
    }
    if (!okTotal) {
      failRows.push(`${tag}: totalSalary ss≠ms  [ss=${r2(Number(ss.totalSalary))} ms=${r2(Number(ms.totalSalary))}]`)
    }
  }

  console.log(`\n==== Invariant salary 3-way (ss=ms=summary): ผ่าน ${pass} / ไม่ผ่าน ${fail} ====`)
  if (failRows.length) {
    console.log('\n❌ รายการที่ไม่ตรง (ตัวร่วมของคู่ที่ ❌ คือตัวที่พัง):')
    failRows.forEach((r) => console.log('  ' + r))
    process.exit(1)
  }
  console.log('✅ เงินเดือน/อาคาร ตรงกันทั้ง 3 แหล่ง (ss=ms=summary) ทุกเดือนที่ทดสอบ')
}

main().catch((e) => { console.error(e); process.exit(1) })
