import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

// โหลด environment variables จาก .env.local
dotenv.config({ path: '.env.local' })

// สร้าง pg Pool
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🔐 Seeding users with hashed passwords...')

  // Hash password ก่อน save
  const hashedPassword = await bcrypt.hash('1234', 10)

  // สร้าง users ตัวอย่าง
  const users = [
    // หุ้นส่วน
    { username: 'partner1', password: hashedPassword, name: 'หุ้นส่วน 1', role: 'PARTNER' as const },
    { username: 'partner2', password: hashedPassword, name: 'หุ้นส่วน 2', role: 'PARTNER' as const },
    // พนักงาน
    { username: 'staff1', password: hashedPassword, name: 'พนักงาน 1', role: 'STAFF' as const },
    { username: 'staff2', password: hashedPassword, name: 'พนักงาน 2', role: 'STAFF' as const },
  ]

  for (const user of users) {
    const existing = await prisma.user.findUnique({
      where: { username: user.username },
    })

    if (!existing) {
      await prisma.user.create({
        data: user,
      })
      console.log(`✅ Created user: ${user.username} (${user.role})`)
    } else {
      // อัพเดท password เป็น hashed version ถ้ายังเป็น plain text
      if (!existing.password.startsWith('$2')) {
        await prisma.user.update({
          where: { username: user.username },
          data: { password: hashedPassword },
        })
        console.log(`🔄 Updated password hash for: ${user.username}`)
      } else {
        console.log(`⏭️ User already exists: ${user.username}`)
      }
    }
  }

  console.log('\n🎉 Done seeding users!')
  console.log('📝 Default password: 1234')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
