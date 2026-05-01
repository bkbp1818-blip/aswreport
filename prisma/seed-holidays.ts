import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

const HOLIDAYS_2026 = [
  { name: 'วันขึ้นปีใหม่', date: '2026-01-01' },
  { name: 'วันมาฆบูชา', date: '2026-03-03' },
  { name: 'วันจักรี', date: '2026-04-06' },
  { name: 'วันสงกรานต์', date: '2026-04-13' },
  { name: 'วันสงกรานต์', date: '2026-04-14' },
  { name: 'วันสงกรานต์', date: '2026-04-15' },
  { name: 'วันแรงงานแห่งชาติ', date: '2026-05-01' },
  { name: 'วันฉัตรมงคล', date: '2026-05-04' },
  { name: 'วันวิสาขบูชา', date: '2026-05-31' },
  { name: 'ชดเชยวันวิสาขบูชา', date: '2026-06-01' },
  { name: 'วันเฉลิมพระชนมพรรษา ร.10', date: '2026-07-28' },
  { name: 'วันอาสาฬหบูชา', date: '2026-07-30' },
  { name: 'วันเข้าพรรษา', date: '2026-07-31' },
  { name: 'วันแม่แห่งชาติ', date: '2026-08-12' },
  { name: 'วันคล้ายวันสวรรคต ร.9', date: '2026-10-13' },
  { name: 'วันปิยมหาราช', date: '2026-10-23' },
  { name: 'วันคล้ายวันพระราชสมภพ ร.9', date: '2026-12-05' },
  { name: 'วันรัฐธรรมนูญ', date: '2026-12-10' },
  { name: 'วันสิ้นปี', date: '2026-12-31' },
]

async function main() {
  console.log('🌱 กำลังเพิ่มวันหยุดราชการ 2026...')

  for (const h of HOLIDAYS_2026) {
    const existing = await prisma.holiday.findUnique({
      where: { date: new Date(h.date) },
    })

    if (existing) {
      console.log(`  ⏭️  มีอยู่แล้ว: ${h.date} - ${h.name}`)
    } else {
      await prisma.holiday.create({
        data: {
          name: h.name,
          date: new Date(h.date),
          isActive: true,
        },
      })
      console.log(`  ✅ เพิ่ม: ${h.date} - ${h.name}`)
    }
  }

  console.log('🎉 เสร็จสิ้น')
}

main()
  .catch((e) => {
    console.error('❌ เกิดข้อผิดพลาด:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
