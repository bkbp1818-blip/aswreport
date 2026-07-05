// โหลด env แบบเดียวกับ Next.js (.env.local ชนะ .env เสมอ) + guard ความปลอดภัย
// ทุกสคริปต์ทดสอบต้อง import ไฟล์นี้ "ก่อน" import prisma เพื่อกันเผลอต่อ production
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const host = (process.env.DATABASE_URL || '').replace(/.*@([^/?]+).*/, '$1')
// allowlist ของ Neon branch ที่อนุญาตให้ทดสอบ (กัน production ep-square-bush เสมอ)
//  - gentle-forest  = branch test-verify (เดิม)
//  - young-hall     = branch feat-schedule (ทดสอบฟีเจอร์ตารางเวลา)
//  - billowing-dawn = branch fix-salary-summary-v2 (แก้บั๊กเงินเดือนรวม salary-summary, ถ่ายจาก prod ล่าสุด)
const ALLOWED_BRANCHES = ['gentle-forest', 'young-hall', 'billowing-dawn']
const PRODUCTION_MARKER = 'square-bush' // ห้ามต่อ production เด็ดขาด

if (host.includes(PRODUCTION_MARKER) || !ALLOWED_BRANCHES.some((b) => host.includes(b))) {
  console.error(`\n🛑 หยุด! DATABASE_URL host = "${host}" ไม่ใช่ branch ที่อนุญาต (${ALLOWED_BRANCHES.join(', ')})`)
  console.error('   เพื่อความปลอดภัย จะไม่รัน query ใดๆ กับ DB ที่ไม่ใช่ branch ทดสอบ\n')
  process.exit(1)
}

console.log(`✓ guard ผ่าน — ต่อ branch: ${host}`)
