import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Position } from '@prisma/client'
import { requirePartner, handleAuthError } from '@/lib/auth'

// GET - ดึงรายชื่อพนักงานทั้งหมด (ต้องเป็น Partner)
export async function GET() {
  try {
    await requirePartner()

    const employees = await prisma.employee.findMany({
      orderBy: [
        { position: 'asc' },
        { firstName: 'asc' },
      ],
    })
    return NextResponse.json(employees)
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน' },
      { status: 500 }
    )
  }
}

// POST - เพิ่มพนักงานใหม่ (ต้องเป็น Partner)
export async function POST(request: NextRequest) {
  try {
    await requirePartner()

    const body = await request.json()
    const { firstName, lastName, nickname, position, salary } = body

    if (!firstName || !lastName || !position) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        nickname: nickname || null,
        position: position as Position,
        salary: salary || 0,
        isActive: true,
      },
    })

    return NextResponse.json(employee)
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error creating employee:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเพิ่มพนักงาน' },
      { status: 500 }
    )
  }
}

// PUT - แก้ไขข้อมูลพนักงาน (ต้องเป็น Partner)
export async function PUT(request: NextRequest) {
  try {
    await requirePartner()

    const body = await request.json()
    const { id, firstName, lastName, nickname, position, salary, isActive } = body

    if (!id) {
      return NextResponse.json(
        { error: 'กรุณาระบุ ID พนักงาน' },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: {
        firstName,
        lastName,
        nickname: nickname || null,
        position: position as Position,
        salary: salary || 0,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    return NextResponse.json(employee)
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error updating employee:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการแก้ไขพนักงาน' },
      { status: 500 }
    )
  }
}

// DELETE - ลบพนักงาน (ต้องเป็น Partner)
export async function DELETE(request: NextRequest) {
  try {
    await requirePartner()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'กรุณาระบุ ID พนักงาน' },
        { status: 400 }
      )
    }

    await prisma.employee.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบพนักงาน' },
      { status: 500 }
    )
  }
}
