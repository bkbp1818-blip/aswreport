import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

const ROOMS_BY_BUILDING_CODE: Record<string, string[]> = {
  CT: ['101', '201', '202', '301', '302', '401', '402'],
  YW: ['138A', '138B', '138AB', '140A', '140B', '140AB'],
  NANA: ['1', '2', '3', '6', '7', '8'],
}

async function main() {
  console.log('🌱 กำลังเพิ่มห้องตามอาคาร...')

  const buildings = await prisma.building.findMany()
  const byCode = new Map(buildings.map((b) => [b.code, b]))

  for (const [code, roomNames] of Object.entries(ROOMS_BY_BUILDING_CODE)) {
    const building = byCode.get(code)
    if (!building) {
      console.warn(`  ⚠️  ไม่พบอาคาร code=${code} ข้าม`)
      continue
    }

    console.log(`\n📍 อาคาร ${building.name} (${code}):`)

    for (let i = 0; i < roomNames.length; i++) {
      const name = roomNames[i]
      const order = i + 1

      const existing = await prisma.room.findUnique({
        where: { buildingId_name: { buildingId: building.id, name } },
      })

      if (existing) {
        console.log(`  ⏭️  มีอยู่แล้ว: ห้อง ${name}`)
      } else {
        await prisma.room.create({
          data: {
            buildingId: building.id,
            name,
            order,
            isActive: true,
          },
        })
        console.log(`  ✅ เพิ่ม: ห้อง ${name}`)
      }
    }
  }

  console.log('\n🎉 เสร็จสิ้น')
}

main()
  .catch((e) => {
    console.error('❌ เกิดข้อผิดพลาด:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
