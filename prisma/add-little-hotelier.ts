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
  console.log('🏨 เพิ่มหมวดหมู่ Little Hotelier Expense...')

  // ตรวจสอบว่ามีอยู่แล้วหรือไม่
  const existing = await prisma.category.findFirst({
    where: { name: 'Little Hotelier Expense' }
  })

  if (existing) {
    console.log('✅ หมวดหมู่ Little Hotelier Expense มีอยู่แล้ว')
  } else {
    // เพิ่ม Little Hotelier Expense เป็นหมวดหมู่รายจ่าย
    const category = await prisma.category.create({
      data: {
        name: 'Little Hotelier Expense',
        type: 'EXPENSE',
        order: 20,
      },
    })
    console.log('✅ เพิ่มหมวดหมู่เรียบร้อย:', category.name)
  }

  // แสดงหมวดหมู่รายจ่ายทั้งหมด
  const expenses = await prisma.category.findMany({
    where: { type: 'EXPENSE' },
    orderBy: { order: 'asc' }
  })
  console.log('\n📋 หมวดหมู่รายจ่ายทั้งหมด:')
  expenses.forEach(e => console.log('   -', e.name))
}

main()
  .then(async () => { await prisma.$disconnect(); await pool.end(); process.exit(0) })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); await pool.end(); process.exit(1) })
