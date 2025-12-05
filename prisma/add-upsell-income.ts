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
  console.log('💰 เพิ่มหมวดหมู่รายได้ Upsell...')

  // รายการหมวดหมู่รายได้ Upsell ที่ต้องการเพิ่ม
  const upsellCategories = [
    { name: 'รายได้ ค่าอาหาร', order: 10 },
    { name: 'รายได้ ค่าบริการรับส่งสนามบิน (ดอนเมือง-สุวรรณภูมิ)', order: 11 },
    { name: 'รายได้ ค่าทัวร์', order: 12 },
    { name: 'รายได้ Thai Bus Food Tour', order: 13 },
    { name: 'รายได้ Co Van Kessel', order: 14 },
  ]

  for (const cat of upsellCategories) {
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
          type: 'INCOME',
          order: cat.order,
        },
      })
      console.log(`✅ เพิ่ม "${category.name}" เรียบร้อย`)
    }
  }

  // แสดงหมวดหมู่รายได้ทั้งหมด
  const incomes = await prisma.category.findMany({
    where: { type: 'INCOME' },
    orderBy: { order: 'asc' }
  })
  console.log('\n📋 หมวดหมู่รายได้ทั้งหมด:')
  incomes.forEach((e, i) => console.log(`   ${i + 1}. ${e.name}`))
}

main()
  .then(async () => { await prisma.$disconnect(); await pool.end(); process.exit(0) })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); await pool.end(); process.exit(1) })
