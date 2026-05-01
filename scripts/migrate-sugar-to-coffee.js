// Migration: ย้ายค่า sugarExpense → coffeeExpense ใน ExpenseHistory
// เหตุผล: หน้า /transactions เก็บ น้ำตาล+คอฟฟี่เมท รวมในตัว coffeeExpense
//   แต่ใน DB มี sugarExpense legacy 3 records (NANA, CT, YW ก.พ. 2026 อาคารละ 146)
//   ที่ /api/summary นับแยก ทำให้ Dashboard กับหน้ากรอกข้อมูลไม่ตรงกัน
//
// รัน: node scripts/migrate-sugar-to-coffee.js

require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  // ตรวจ records ที่จะแก้ก่อน
  const before = await prisma.expenseHistory.findMany({
    where: { targetType: 'SETTINGS', fieldName: 'sugarExpense' },
    select: { id: true, targetId: true, month: true, year: true, amount: true, actionType: true },
    orderBy: { id: 'asc' },
  })

  console.log('--- BEFORE ---')
  console.log('records ที่จะ migrate:', before.length)
  for (const r of before) {
    console.log(`  id=${r.id} building=${r.targetId} ${r.month}/${r.year} amount=${r.amount} action=${r.actionType}`)
  }

  if (before.length === 0) {
    console.log('ไม่มีข้อมูล sugarExpense ใน DB → ไม่ต้องทำอะไร')
    process.exit(0)
  }

  // Migrate
  const updated = await prisma.expenseHistory.updateMany({
    where: { targetType: 'SETTINGS', fieldName: 'sugarExpense' },
    data: { fieldName: 'coffeeExpense' },
  })

  console.log('\n--- AFTER ---')
  console.log(`Updated: ${updated.count} records (fieldName 'sugarExpense' → 'coffeeExpense')`)

  // Verify
  const verify = await prisma.expenseHistory.findMany({
    where: { id: { in: before.map((r) => r.id) } },
    select: { id: true, targetId: true, fieldName: true, amount: true },
    orderBy: { id: 'asc' },
  })
  for (const r of verify) {
    console.log(`  id=${r.id} building=${r.targetId} fieldName=${r.fieldName} amount=${r.amount}`)
  }

  await prisma.$disconnect()
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
