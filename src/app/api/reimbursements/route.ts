import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMenuAccess, handleAuthError } from '@/lib/auth'

// GET - ดึงรายการยอดค้างจ่ายคืน (filter ตาม buildingId, month, year)
export async function GET(request: NextRequest) {
  try {
    await requireMenuAccess('/reimbursements')

    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('buildingId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    // details mode: ดึงรายละเอียดยอดที่คืนแล้ว (ใช้ในหน้า transactions)
    if (searchParams.get('details') === 'returned') {
      const where: Record<string, unknown> = { isReturned: true }
      if (buildingId) where.buildingId = parseInt(buildingId)

      const returnedMonth = searchParams.get('returnedMonth')
      const returnedYear = searchParams.get('returnedYear')
      if (returnedMonth && returnedYear) {
        const m = parseInt(returnedMonth)
        const y = parseInt(returnedYear)
        const startDate = new Date(Date.UTC(y, m - 1, 1))
        const endDate = new Date(Date.UTC(y, m, 1))
        where.returnedDate = { gte: startDate, lt: endDate }
      }

      const items = await prisma.reimbursement.findMany({
        where,
        include: {
          building: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ returnedDate: 'desc' }, { createdAt: 'desc' }],
      })

      return NextResponse.json(items)
    }

    // details mode: ดึงรายการค้างจ่าย (ใช้ในหน้า transactions)
    if (searchParams.get('details') === 'pending') {
      const where: Record<string, unknown> = { isReturned: false }
      if (buildingId) where.buildingId = parseInt(buildingId)

      const paidMonth = searchParams.get('paidMonth')
      const paidYear = searchParams.get('paidYear')
      if (paidMonth && paidYear) {
        const m = parseInt(paidMonth)
        const y = parseInt(paidYear)
        const startDate = new Date(Date.UTC(y, m - 1, 1))
        const endDate = new Date(Date.UTC(y, m, 1))
        where.paidDate = { gte: startDate, lt: endDate }
      }

      const items = await prisma.reimbursement.findMany({
        where,
        include: {
          building: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ paidDate: 'desc' }, { createdAt: 'desc' }],
      })

      return NextResponse.json(items)
    }

    // summary mode: คืนยอดรวมที่คืนแล้ว (ใช้ในหน้า transactions)
    if (searchParams.get('summary') === 'true') {
      const where: Record<string, unknown> = { isReturned: true }
      if (buildingId) where.buildingId = parseInt(buildingId)
      if (month) where.month = parseInt(month)
      if (year) where.year = parseInt(year)

      const result = await prisma.reimbursement.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      })

      return NextResponse.json({
        total: Number(result._sum.amount) || 0,
        count: result._count,
      })
    }

    const where: Record<string, unknown> = {}
    if (buildingId) where.buildingId = parseInt(buildingId)
    if (month) where.month = parseInt(month)
    if (year) where.year = parseInt(year)

    const reimbursements = await prisma.reimbursement.findMany({
      where,
      include: {
        building: { select: { id: true, name: true, code: true } },
      },
      orderBy: [
        { isReturned: 'asc' },
        { paidDate: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json(reimbursements)
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error fetching reimbursements:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลยอดค้างจ่ายคืน' },
      { status: 500 }
    )
  }
}

// POST - เพิ่มรายการใหม่ (รองรับหลายอาคาร หารเฉลี่ย)
export async function POST(request: NextRequest) {
  try {
    await requireMenuAccess('/reimbursements')

    const body = await request.json()
    const { amount, buildingIds, month, year, creditorName, description, paidDate, returnedDate } = body

    if (!amount || !buildingIds || !Array.isArray(buildingIds) || buildingIds.length === 0 || !month || !year || !creditorName) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      )
    }

    const totalAmount = parseFloat(amount)
    const splitAmount = totalAmount / buildingIds.length

    const reimbursements = await prisma.$transaction(
      buildingIds.map((bid: string) =>
        prisma.reimbursement.create({
          data: {
            amount: splitAmount,
            buildingId: parseInt(bid),
            month: parseInt(month),
            year: parseInt(year),
            creditorName,
            description: description || null,
            paidDate: paidDate ? new Date(paidDate) : null,
            returnedDate: returnedDate ? new Date(returnedDate) : null,
            isReturned: false,
          },
          include: {
            building: { select: { id: true, name: true, code: true } },
          },
        })
      )
    )

    return NextResponse.json(reimbursements)
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error creating reimbursement:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเพิ่มรายการ' },
      { status: 500 }
    )
  }
}

// PUT - แก้ไขรายการ / เปลี่ยนสถานะเป็น "คืนแล้ว"
export async function PUT(request: NextRequest) {
  try {
    await requireMenuAccess('/reimbursements')

    const body = await request.json()
    const { id, amount, buildingId, month, year, creditorName, description, paidDate, returnedDate, isReturned } = body

    if (!id) {
      return NextResponse.json(
        { error: 'กรุณาระบุ ID รายการ' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (amount !== undefined) data.amount = parseFloat(amount)
    if (buildingId !== undefined) data.buildingId = parseInt(buildingId)
    if (month !== undefined) data.month = parseInt(month)
    if (year !== undefined) data.year = parseInt(year)
    if (creditorName !== undefined) data.creditorName = creditorName
    if (description !== undefined) data.description = description || null
    if (paidDate !== undefined) data.paidDate = paidDate ? new Date(paidDate) : null
    if (returnedDate !== undefined) data.returnedDate = returnedDate ? new Date(returnedDate) : null
    if (isReturned !== undefined) data.isReturned = isReturned

    const reimbursement = await prisma.reimbursement.update({
      where: { id: parseInt(id) },
      data,
      include: {
        building: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json(reimbursement)
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error updating reimbursement:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการแก้ไขรายการ' },
      { status: 500 }
    )
  }
}

// PATCH - แก้ไขหลายรายการพร้อมกัน (bulk update: วันที่คืนเงิน + สถานะ)
export async function PATCH(request: NextRequest) {
  try {
    await requireMenuAccess('/reimbursements')

    const body = await request.json()
    const { ids, returnedDate, isReturned } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'กรุณาระบุรายการที่ต้องการแก้ไข' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (returnedDate !== undefined) data.returnedDate = returnedDate ? new Date(returnedDate) : null
    if (isReturned !== undefined) data.isReturned = isReturned

    const result = await prisma.reimbursement.updateMany({
      where: { id: { in: ids.map((id: number) => Number(id)) } },
      data,
    })

    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error bulk updating reimbursements:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการแก้ไขหลายรายการ' },
      { status: 500 }
    )
  }
}

// DELETE - ลบรายการ
export async function DELETE(request: NextRequest) {
  try {
    await requireMenuAccess('/reimbursements')

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'กรุณาระบุ ID รายการ' },
        { status: 400 }
      )
    }

    await prisma.reimbursement.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error deleting reimbursement:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบรายการ' },
      { status: 500 }
    )
  }
}
