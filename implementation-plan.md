# ASW Report - Implementation Plan

## Project Overview

**ชื่อโปรเจค:** ASW Report (ARUN SA WAD Report System)
**วัตถุประสงค์:** ระบบจัดการรายรับ-รายจ่ายสำหรับอาคาร ARUN SA WAD 3 แห่ง
**Tech Stack:** Next.js 15, Tailwind CSS, shadcn/ui, Prisma 7, Neon (PostgreSQL)

---

## Completed Features

### 1. Database Setup
- [x] ออกแบบ Schema (Building, Category, Transaction, Settings)
- [x] ตั้งค่า Prisma 7 กับ Neon PostgreSQL
- [x] สร้าง Seed Data พร้อมข้อมูลตัวอย่าง
- [x] เชื่อมต่อ Connection String กับ Neon

### 2. API Endpoints
- [x] `/api/buildings` - จัดการข้อมูลอาคาร (GET)
- [x] `/api/categories` - จัดการหมวดหมู่รายรับ-รายจ่าย (GET)
- [x] `/api/transactions` - บันทึก/ดึงข้อมูลรายการ (GET, PUT)
- [x] `/api/settings` - ตั้งค่าอาคาร (GET, PUT)
- [x] `/api/summary` - คำนวณสรุปผลประกอบการ (GET)

### 3. Frontend Pages
- [x] **Dashboard** (`/`) - แสดงภาพรวมด้วยกราฟและ Summary Cards
- [x] **กรอกข้อมูล** (`/transactions`) - ฟอร์มบันทึกรายรับ-รายจ่ายรายเดือน
- [x] **รายงาน** (`/reports`) - ดูตัวอย่างและส่งออก Excel
- [x] **ตั้งค่า** (`/settings`) - กำหนดค่าใช้จ่ายคงที่แต่ละอาคาร

### 4. UI Components
- [x] Sidebar Navigation
- [x] shadcn/ui Components (Button, Card, Input, Select, Table, Tabs)
- [x] Recharts (Bar Chart, Pie Chart)
- [x] Export to Excel (xlsx library)

---

## Pending Tasks

### High Priority

| Task | Status | Description |
|------|--------|-------------|
| Run Seed Data | ⏳ รอดำเนินการ | รัน `npx prisma db seed` เพื่อเพิ่มข้อมูลตัวอย่าง |
| Add DATABASE_URL to Vercel | ⏳ รอดำเนินการ | เพิ่ม Environment Variable บน Vercel Dashboard |
| Test Local Development | ⏳ รอดำเนินการ | รัน `npm run dev` และทดสอบทุกฟีเจอร์ |
| Deploy to Vercel | ⏳ รอดำเนินการ | Deploy โปรเจคขึ้น Vercel |

### Medium Priority (Future Enhancements)

| Task | Status | Description |
|------|--------|-------------|
| เพิ่ม/แก้ไขอาคาร | 📋 วางแผน | ฟีเจอร์เพิ่ม/แก้ไข/ลบอาคารได้จากหน้า Settings |
| เพิ่ม/แก้ไขหมวดหมู่ | 📋 วางแผน | ฟีเจอร์เพิ่ม/แก้ไข/ลบหมวดหมู่รายรับ-รายจ่าย |
| รายงานเปรียบเทียบรายปี | 📋 วางแผน | เปรียบเทียบผลประกอบการแต่ละเดือนทั้งปี |
| Export PDF | 📋 วางแผน | ส่งออกรายงานเป็น PDF |
| Authentication | 📋 วางแผน | ระบบล็อกอินเพื่อความปลอดภัย |
| Backup Data | 📋 วางแผน | สำรองข้อมูลอัตโนมัติ |

### Low Priority (Nice to Have)

| Task | Status | Description |
|------|--------|-------------|
| Dark Mode | 💡 ไอเดีย | โหมดมืดสำหรับ UI |
| Mobile App | 💡 ไอเดีย | แอพมือถือสำหรับกรอกข้อมูล |
| Multi-language | 💡 ไอเดีย | รองรับภาษาอังกฤษ |
| Notification | 💡 ไอเดีย | แจ้งเตือนเมื่อถึงเวลากรอกข้อมูล |

---

## Project Structure

```
aswreport/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # ข้อมูลตัวอย่าง
├── src/
│   ├── app/
│   │   ├── api/           # API Routes
│   │   │   ├── buildings/
│   │   │   ├── categories/
│   │   │   ├── settings/
│   │   │   ├── summary/
│   │   │   └── transactions/
│   │   ├── reports/       # หน้ารายงาน
│   │   ├── settings/      # หน้าตั้งค่า
│   │   ├── transactions/  # หน้ากรอกข้อมูล
│   │   ├── layout.tsx     # Layout หลัก
│   │   └── page.tsx       # Dashboard
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   └── Sidebar.tsx    # เมนูด้านข้าง
│   └── lib/
│       ├── calculations.ts # สูตรคำนวณ
│       ├── prisma.ts      # Prisma client
│       └── utils.ts       # Utility functions
├── .env.local             # Environment variables (local)
├── prisma.config.ts       # Prisma 7 config
└── package.json
```

---

## Database Schema

### Building (อาคาร)
| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| name | String | ชื่ออาคาร |
| code | String | รหัสอาคาร (CT, YW, NANA) |

### Category (หมวดหมู่)
| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| name | String | ชื่อหมวดหมู่ |
| type | Enum | INCOME หรือ EXPENSE |
| order | Int | ลำดับการแสดงผล |

### Transaction (รายการ)
| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| buildingId | Int | FK to Building |
| categoryId | Int | FK to Category |
| amount | Decimal | จำนวนเงิน |
| month | Int | เดือน (1-12) |
| year | Int | ปี (2024, 2025, ...) |

### Settings (ตั้งค่า)
| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| buildingId | Int | FK to Building |
| managementFeePercent | Decimal | % ค่าบริหาร (default: 13.5) |
| vatPercent | Decimal | % VAT (default: 7) |
| monthlyRent | Decimal | ค่าเช่าอาคาร/เดือน |
| littleHotelierExpense | Decimal | ค่า Little Hotelier |

---

## Calculation Formulas

```
รวมรายได้ค่าเช่า = ผลรวม Transaction ที่เป็น INCOME

รวมค่าใช้จ่าย = ผลรวม Transaction ที่เป็น EXPENSE

Gross Profit = รวมรายได้ค่าเช่า - รวมค่าใช้จ่าย

Management Fee = รวมรายได้ค่าเช่า × (managementFeePercent / 100)

Net Profit = Gross Profit - Management Fee - Little Hotelier - ค่าเช่าอาคาร

Amount to be Paid = Management Fee × (1 + vatPercent / 100)
```

---

## Environment Variables

### Local Development (.env.local)
```env
DATABASE_URL="postgresql://..."
```

### Vercel Production
| Key | Value |
|-----|-------|
| DATABASE_URL | Connection string จาก Neon |

---

## Commands Reference

### Development
```bash
# รัน development server
npm run dev

# รัน seed data
npx prisma db seed

# Push schema ไปยังฐานข้อมูล
npx prisma db push

# เปิด Prisma Studio
npx prisma studio
```

### Production
```bash
# Build สำหรับ production
npm run build

# Deploy ไปยัง Vercel
vercel --prod
```

---

## Changelog

### Version 1.0.0 (Current)
- Initial release
- Dashboard with charts
- Transaction entry form
- Excel export
- Building settings

---

## Notes

- ใช้ Prisma 7 ซึ่งต้องตั้งค่า `prisma.config.ts` แทน `url` ใน schema
- ฐานข้อมูลอยู่บน Neon (Region: ap-southeast-1)
- UI ใช้ธีมสี pastel (#84A59D, #F28482, #F6BD60)
