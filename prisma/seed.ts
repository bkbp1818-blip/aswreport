import { PrismaClient, CategoryType, Position } from '@prisma/client'
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
  console.log('🌱 เริ่มต้น Seed ข้อมูล...')

  // สร้างอาคาร 3 แห่ง
  const buildings = await Promise.all([
    prisma.building.upsert({
      where: { code: 'CT' },
      update: {},
      create: { name: 'ARUN SA WAD - Chinatown', code: 'CT' },
    }),
    prisma.building.upsert({
      where: { code: 'YW' },
      update: {},
      create: { name: 'ARUN SA WAD - Yaowarat', code: 'YW' },
    }),
    prisma.building.upsert({
      where: { code: 'NANA' },
      update: {},
      create: { name: 'ARUN SA WAD - 103 NANA', code: 'NANA' },
    }),
  ])

  console.log('✅ สร้างอาคารเรียบร้อย:', buildings.map(b => b.name).join(', '))

  // สร้างหมวดหมู่รายรับ
  const incomeCategories = [
    'ค่าเช่าจาก Direct Booking',
    'ค่าเช่าจาก AirBNB',
    'ค่าเช่าจาก Booking',
    'ค่าเช่าจาก Agoda',
    'ค่าเช่าจาก Trip',
    'ค่าเช่าจาก Expedia',
    'ค่าเช่าจาก RB',
    'ค่าเช่าจาก PayPal',
    'ค่าเช่าจาก Credit Card',
    'ค่าเช่าจาก Bank Transfer',
    'ค่าเช่า Cash',
    'ค่าปรับของใช้เสียหาย',
  ]

  // สร้างหมวดหมู่รายจ่าย
  const expenseCategories = [
    'รายจ่ายหน้างาน Cash',
    'Little Hotelier Expense',
    'ค่า Fee จาก PayPal',
    'ค่าไฟฟ้า',
    'ค่าน้ำประปา',
    'ค่า Internet',
    'ค่า Netflix',
    'ค่า Youtube',
    'เงินเดือนพนักงาน',
    'ค่าการตลาดต่างๆ',
    'ค่า Amenity (แปรงสีฟัน หมวกคลุมผม)',
    'ค่าน้ำเปล่า',
    'ค่าขนมคุ้กกี้',
    'ค่ากาแฟซอง น้ำตาล คอฟฟี่เมท',
    'ค่าน้ำมันรถมอเตอร์ไซค์',
    'ค่าเช่าที่จอดรถมอเตอร์ไซค์',
    'ค่าซ่อมบำรุงรถมอเตอร์ไซค์',
    'ค่าซ่อมบำรุงอาคาร',
    'ค่าเดินทางแม่บ้าน',
    'ค่าทำความสะอาด',
  ]

  // ลบหมวดหมู่เก่า (ถ้ามี) และสร้างใหม่
  await prisma.category.deleteMany({})

  // สร้างหมวดหมู่รายรับ
  for (let i = 0; i < incomeCategories.length; i++) {
    await prisma.category.create({
      data: {
        name: incomeCategories[i],
        type: CategoryType.INCOME,
        order: i + 1,
      },
    })
  }

  // สร้างหมวดหมู่รายจ่าย
  for (let i = 0; i < expenseCategories.length; i++) {
    await prisma.category.create({
      data: {
        name: expenseCategories[i],
        type: CategoryType.EXPENSE,
        order: i + 1,
      },
    })
  }

  console.log('✅ สร้างหมวดหมู่เรียบร้อย:', incomeCategories.length + expenseCategories.length, 'รายการ')

  // สร้าง Settings สำหรับแต่ละอาคาร
  for (const building of buildings) {
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

  console.log('✅ สร้างตั้งค่าเริ่มต้นสำหรับแต่ละอาคารเรียบร้อย')

  // สร้างข้อมูลตัวอย่างสำหรับเดือนปัจจุบัน
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const categories = await prisma.category.findMany()
  const incomes = categories.filter(c => c.type === CategoryType.INCOME)
  const expenses = categories.filter(c => c.type === CategoryType.EXPENSE)

  // สร้างข้อมูลตัวอย่างสำหรับอาคารแรก (Chinatown)
  const building1 = buildings[0]

  // รายรับตัวอย่าง
  const sampleIncomes = [
    { categoryName: 'ค่าเช่าจาก Direct Booking', amount: 45000 },
    { categoryName: 'ค่าเช่าจาก AirBNB', amount: 32000 },
    { categoryName: 'ค่าเช่าจาก Booking', amount: 28000 },
    { categoryName: 'ค่าเช่าจาก Agoda', amount: 25000 },
  ]

  for (const income of sampleIncomes) {
    const category = incomes.find(c => c.name === income.categoryName)
    if (category) {
      await prisma.transaction.upsert({
        where: {
          buildingId_categoryId_month_year: {
            buildingId: building1.id,
            categoryId: category.id,
            month: currentMonth,
            year: currentYear,
          },
        },
        update: { amount: income.amount },
        create: {
          buildingId: building1.id,
          categoryId: category.id,
          amount: income.amount,
          month: currentMonth,
          year: currentYear,
        },
      })
    }
  }

  // รายจ่ายตัวอย่าง
  const sampleExpenses = [
    { categoryName: 'ค่าไฟฟ้า', amount: 8500 },
    { categoryName: 'ค่าน้ำประปา', amount: 1200 },
    { categoryName: 'ค่า Internet', amount: 1500 },
    { categoryName: 'เงินเดือนพนักงาน', amount: 15000 },
    { categoryName: 'ค่า Amenity (แปรงสีฟัน หมวกคลุมผม)', amount: 800 },
    { categoryName: 'ค่าน้ำเปล่า', amount: 500 },
  ]

  for (const expense of sampleExpenses) {
    const category = expenses.find(c => c.name === expense.categoryName)
    if (category) {
      await prisma.transaction.upsert({
        where: {
          buildingId_categoryId_month_year: {
            buildingId: building1.id,
            categoryId: category.id,
            month: currentMonth,
            year: currentYear,
          },
        },
        update: { amount: expense.amount },
        create: {
          buildingId: building1.id,
          categoryId: category.id,
          amount: expense.amount,
          month: currentMonth,
          year: currentYear,
        },
      })
    }
  }

  console.log('✅ สร้างข้อมูลตัวอย่างเรียบร้อย (อาคาร Chinatown, เดือน', currentMonth + '/' + currentYear + ')')

  // ===== สร้าง Users ตัวอย่าง =====
  console.log('\n🔐 กำลังสร้าง Users ตัวอย่าง...')

  const hashedPassword = await bcrypt.hash('1234', 10)

  const users = [
    { username: 'partner1', password: hashedPassword, name: 'หุ้นส่วน 1', role: 'PARTNER' as const },
    { username: 'partner2', password: hashedPassword, name: 'หุ้นส่วน 2', role: 'PARTNER' as const },
    { username: 'staff1', password: hashedPassword, name: 'พนักงาน 1', role: 'STAFF' as const },
    { username: 'staff2', password: hashedPassword, name: 'พนักงาน 2', role: 'STAFF' as const },
  ]

  for (const user of users) {
    const existing = await prisma.user.findUnique({
      where: { username: user.username },
    })

    if (!existing) {
      await prisma.user.create({ data: user })
      console.log(`  ✅ Created user: ${user.username}`)
    } else if (!existing.password.startsWith('$2')) {
      await prisma.user.update({
        where: { username: user.username },
        data: { password: hashedPassword },
      })
      console.log(`  🔄 Updated password hash: ${user.username}`)
    }
  }

  // ===== สร้างพนักงานตัวอย่าง =====
  console.log('\n👥 กำลังสร้างพนักงานตัวอย่าง...')

  const employees = [
    // หุ้นส่วน (ไม่มีเงินเดือน)
    { firstName: 'สมชาย', lastName: 'ใจดี', nickname: 'ชาย', position: Position.PARTNER, salary: 0 },
    { firstName: 'สมหญิง', lastName: 'ใจงาม', nickname: 'หญิง', position: Position.PARTNER, salary: 0 },
    // ผู้จัดการ
    { firstName: 'มานี', lastName: 'มีทรัพย์', nickname: 'นี', position: Position.MANAGER, salary: 25000 },
    // แม่บ้าน
    { firstName: 'สมศรี', lastName: 'รักสะอาด', nickname: 'ศรี', position: Position.MAID, salary: 15000 },
    { firstName: 'สมใจ', lastName: 'ขยัน', nickname: 'ใจ', position: Position.MAID, salary: 15000 },
    { firstName: 'สมปอง', lastName: 'ใฝ่ดี', nickname: 'ปอง', position: Position.MAID, salary: 14000 },
  ]

  for (const emp of employees) {
    const existing = await prisma.employee.findFirst({
      where: {
        firstName: emp.firstName,
        lastName: emp.lastName,
      }
    })

    if (!existing) {
      await prisma.employee.create({
        data: {
          ...emp,
          isActive: true,
        }
      })
      console.log(`  ✅ Created employee: ${emp.nickname || emp.firstName}`)
    }
  }

  console.log('\n🎉 Seed ข้อมูลเสร็จสมบูรณ์!')
  console.log('📝 Default user password: 1234')
}

main()
  .catch((e) => {
    console.error('❌ เกิดข้อผิดพลาด:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
