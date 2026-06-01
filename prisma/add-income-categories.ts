/**
 * เพิ่มหมวดรายได้ใหม่แบบ idempotent (รันซ้ำได้ปลอดภัย)
 *
 * รันด้วย: npx tsx prisma/add-income-categories.ts
 *
 * หมายเหตุ: ห้ามใช้ prisma/seed.ts กับ production DB เพราะ seed ลบ categories ทั้งหมด
 * ซึ่งจะทำลาย FK ของ ExpenseHistory (fieldName ที่เก็บ categoryId เก่า)
 */
import { PrismaClient, CategoryType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as dotenv from 'dotenv'

import { BITTERWELL_CATEGORY_NAME } from '../src/lib/income-defaults'

// โหลด environment variables จาก .env.local
dotenv.config({ path: '.env.local' })

// สร้าง pg Pool
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

// รายการหมวดรายได้ที่ต้องการเพิ่ม
// (Category model ไม่มี @unique บน name ดังนั้นใช้ findFirst + create เพื่อให้ idempotent)
const INCOME_CATEGORIES_TO_ADD = [
  BITTERWELL_CATEGORY_NAME,
] as const

async function main() {
  console.log('💰 เพิ่มหมวดรายได้ใหม่ (idempotent)...\n')

  for (const name of INCOME_CATEGORIES_TO_ADD) {
    const existing = await prisma.category.findFirst({
      where: { name, type: CategoryType.INCOME },
    })

    if (existing) {
      console.log(`   ⏭️  มีอยู่แล้ว: "${name}" (id=${existing.id})`)
      continue
    }

    // หา order สูงสุดของหมวดรายได้ปัจจุบัน เพื่อเรียงต่อท้าย
    const maxOrder = await prisma.category.findFirst({
      where: { type: CategoryType.INCOME },
      orderBy: { order: 'desc' },
    })

    const created = await prisma.category.create({
      data: {
        name,
        type: CategoryType.INCOME,
        order: (maxOrder?.order || 0) + 1,
      },
    })

    console.log(`   ✅ เพิ่มแล้ว: "${created.name}" (id=${created.id}, order=${created.order})`)
  }

  // แสดงรายการหมวดรายได้ทั้งหมดเพื่อยืนยัน
  const all = await prisma.category.findMany({
    where: { type: CategoryType.INCOME },
    orderBy: { order: 'asc' },
  })
  console.log('\n📋 รายการหมวดรายได้ทั้งหมด:')
  all.forEach((c) => console.log(`   - [${c.order}] ${c.name} (id=${c.id})`))
}

main()
  .then(async () => {
    await prisma.$disconnect()
    await pool.end()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error('❌ Error:', e)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
