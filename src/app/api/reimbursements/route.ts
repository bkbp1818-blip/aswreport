import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePartner, handleAuthError } from '@/lib/auth'

// GET - ดึงรายการยอดค้างจ่ายคืน (filter ตาม buildingId, month, year)
export async function GET(request: NextRequest) {
  try {
    await requirePartner()

    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('buildingId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

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

// POST - เพิ่มรายการใหม่
export async function POST(request: NextRequest) {
  try {
    await requirePartner()

    const body = await request.json()
    const { amount, buildingId, month, year, creditorName, description, paidDate } = body

    if (!amount || !buildingId || !month || !year || !creditorName) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      )
    }

    const reimbursement = await prisma.reimbursement.create({
      data: {
        amount: parseFloat(amount),
        buildingId: parseInt(buildingId),
        month: parseInt(month),
        year: parseInt(year),
        creditorName,
        description: description || null,
        paidDate: paidDate ? new Date(paidDate) : null,
        isReturned: false,
      },
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
    await requirePartner()

    const body = await request.json()
    const { id, amount, buildingId, month, year, creditorName, description, paidDate, isReturned } = body

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

// DELETE - ลบรายการ
export async function DELETE(request: NextRequest) {
  try {
    await requirePartner()

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
