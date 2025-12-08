import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePartner, getAuthUser, handleAuthError } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// GET - ดึงรายการ users ทั้งหมด (ต้องเป็น Partner)
export async function GET() {
  try {
    await requirePartner()

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(users)
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    )
  }
}

// POST - สร้าง user ใหม่ (ต้องเป็น Partner)
export async function POST(request: NextRequest) {
  try {
    await requirePartner()

    const body = await request.json()
    const { username, password, name, role } = body

    if (!username || !password || !name || !role) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      )
    }

    // เช็คว่า username ซ้ำหรือไม่
    const existingUser = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username นี้ถูกใช้งานแล้ว' },
        { status: 400 }
      )
    }

    // Hash password ก่อน save
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้าง user' },
      { status: 500 }
    )
  }
}

// PUT - แก้ไข user (ต้องเป็น Partner)
export async function PUT(request: NextRequest) {
  try {
    await requirePartner()

    const body = await request.json()
    const { id, name, role, password, isActive } = body

    if (!id) {
      return NextResponse.json(
        { error: 'กรุณาระบุ ID' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive

    // Hash password ถ้ามีการเปลี่ยน
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการแก้ไข user' },
      { status: 500 }
    )
  }
}

// DELETE - ลบ user (ต้องเป็น Partner)
export async function DELETE(request: NextRequest) {
  try {
    await requirePartner()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'กรุณาระบุ ID' },
        { status: 400 }
      )
    }

    // ห้ามลบตัวเอง
    const currentUser = await getAuthUser()
    if (currentUser?.id === parseInt(id)) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบตัวเองได้' },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบ user' },
      { status: 500 }
    )
  }
}
