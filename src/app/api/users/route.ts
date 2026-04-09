import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePartner, getAuthUser, handleAuthError } from '@/lib/auth'
import { validateAllowedMenus, PARTNER_ONLY_MENUS } from '@/lib/menu-permissions'
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
        allowedMenus: true,
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
    const { username, password, name, role, allowedMenus } = body

    if (!username || !password || !name || !role) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      )
    }

    // Validate allowedMenus ถ้ามีค่า
    if (allowedMenus !== undefined && allowedMenus !== null) {
      if (!validateAllowedMenus(allowedMenus)) {
        return NextResponse.json(
          { error: 'ข้อมูลสิทธิ์เมนูไม่ถูกต้อง' },
          { status: 400 }
        )
      }
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

    // กรอง partner-only menus ออกสำหรับ non-partner
    let finalMenus = allowedMenus ?? null
    if (role !== 'PARTNER' && finalMenus) {
      finalMenus = finalMenus.filter((m: string) => !PARTNER_ONLY_MENUS.includes(m))
    }
    // PARTNER ไม่ต้องเก็บ allowedMenus (ได้ทุกเมนูเสมอ)
    if (role === 'PARTNER') finalMenus = null

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role,
        allowedMenus: finalMenus,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        allowedMenus: true,
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
    const { id, name, role, password, isActive, allowedMenus } = body

    if (!id) {
      return NextResponse.json(
        { error: 'กรุณาระบุ ID' },
        { status: 400 }
      )
    }

    // Validate allowedMenus ถ้ามีค่า
    if (allowedMenus !== undefined && allowedMenus !== null) {
      if (!validateAllowedMenus(allowedMenus)) {
        return NextResponse.json(
          { error: 'ข้อมูลสิทธิ์เมนูไม่ถูกต้อง' },
          { status: 400 }
        )
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive

    // จัดการ allowedMenus
    if (allowedMenus !== undefined) {
      const targetRole = role || (await prisma.user.findUnique({ where: { id: parseInt(id) }, select: { role: true } }))?.role
      if (targetRole === 'PARTNER') {
        updateData.allowedMenus = null // PARTNER ได้ทุกเมนูเสมอ
      } else if (allowedMenus === null) {
        updateData.allowedMenus = null
      } else {
        updateData.allowedMenus = allowedMenus.filter((m: string) => !PARTNER_ONLY_MENUS.includes(m))
      }
    }

    // ถ้าเปลี่ยน role → reset allowedMenus เป็น null (ใช้ default)
    if (role !== undefined && allowedMenus === undefined) {
      updateData.allowedMenus = null
    }

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
        allowedMenus: true,
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
