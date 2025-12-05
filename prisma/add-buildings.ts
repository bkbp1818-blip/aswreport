import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as dotenv from 'dotenv'

// โหลด environment variables จาก .env.local
dotenv.config({ path: '.env.local' })

// สร้าง pg Pool
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🏨 เพิ่มอาคารใหม่...')

  // เพิ่มอาคาร Funn D 2 แห่ง
  const newBuildings = await Promise.all([
    prisma.building.upsert({
      where: { code: 'FUNNLP' },
      update: {},
      create: { name: 'Funn D - ลาดพร้าว 149', code: 'FUNNLP' },
    }),
    prisma.building.upsert({
      where: { code: 'FUNNS81' },
      update: {},
      create: { name: 'Funn D - สุขุมวิท 81', code: 'FUNNS81' },
    }),
  ])

  console.log('✅ เพิ่มอาคารใหม่เรียบร้อย:')
  newBuildings.forEach(b => console.log(`   - ${b.name} (${b.code})`))

  // สร้าง settings สำหรับอาคารใหม่
  for (const building of newBuildings) {
    await prisma.settings.upsert({
      where: { buildingId: building.id },
      update: {},
      create: {
        buildingId: building.id,
        managementFeePercent: 13.5,
        vatPercent: 7,
        monthlyRent: 0,
        littleHotelierExpense: 0,
      },
    })
  }

  console.log('✅ สร้างตั้งค่าเริ่มต้นสำหรับอาคารใหม่เรียบร้อย')

  // แสดงรายการอาคารทั้งหมด
  const allBuildings = await prisma.building.findMany()
  console.log('\n📋 รายการอาคารทั้งหมดในระบบ:')
  allBuildings.forEach(b => console.log(`   - ${b.name} (${b.code})`))
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
