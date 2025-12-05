import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('💸 เพิ่มหมวดหมู่รายจ่าย Upsell...')

  // รายการหมวดหมู่รายจ่าย Upsell ที่ต้องการเพิ่ม
  const upsellExpenseCategories = [
    { name: 'ค่าใช้จ่าย ค่าอาหาร', order: 21 },
    { name: 'ค่าใช้จ่าย ค่าบริการรับส่งสนามบิน (ดอนเมือง-สุวรรณภูมิ)', order: 22 },
    { name: 'ค่าใช้จ่าย ค่าทัวร์', order: 23 },
    { name: 'ค่าใช้จ่าย Thai Bus Food Tour', order: 24 },
    { name: 'ค่าใช้จ่าย Co Van Kessel', order: 25 },
  ]

  for (const cat of upsellExpenseCategories) {
    // ตรวจสอบว่ามีอยู่แล้วหรือไม่
    const existing = await prisma.category.findFirst({
      where: { name: cat.name }
    })

    if (existing) {
      console.log(`✅ "${cat.name}" มีอยู่แล้ว`)
    } else {
      // เพิ่มหมวดหมู่ใหม่
      const category = await prisma.category.create({
        data: {
          name: cat.name,
          type: 'EXPENSE',
          order: cat.order,
        },
      })
      console.log(`✅ เพิ่ม "${category.name}" เรียบร้อย`)
    }
  }

  // แสดงหมวดหมู่รายจ่ายทั้งหมด
  const expenses = await prisma.category.findMany({
    where: { type: 'EXPENSE' },
    orderBy: { order: 'asc' }
  })
  console.log('\n📋 หมวดหมู่รายจ่ายทั้งหมด:')
  expenses.forEach((e, i) => console.log(`   ${i + 1}. ${e.name}`))
}

main()
  .then(async () => { await prisma.$disconnect(); await pool.end(); process.exit(0) })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); await pool.end(); process.exit(1) })
