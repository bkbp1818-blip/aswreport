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
  console.log('🌱 กำลังเพิ่มรายการ OTA Sources...')

  const otaSources = [
    { name: 'Direct', order: 1 },
    { name: 'AirBNB', order: 2 },
    { name: 'Booking.com', order: 3 },
    { name: 'Agoda', order: 4 },
    { name: 'Expedia', order: 5 },
  ]

  for (const ota of otaSources) {
    const existing = await prisma.otaSource.findUnique({
      where: { name: ota.name },
    })

    if (existing) {
      console.log(`  ⏭️  มีอยู่แล้ว: ${ota.name}`)
    } else {
      await prisma.otaSource.create({
        data: {
          name: ota.name,
          order: ota.order,
          isActive: true,
        },
      })
      console.log(`  ✅ เพิ่ม: ${ota.name}`)
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
