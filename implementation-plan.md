# ASW Report - Implementation Plan

> **ARUN SA WAD Report System** - ระบบจัดการรายรับ-รายจ่ายสำหรับอาคาร

---

## Quick Info

| รายละเอียด | ค่า |
|------------|-----|
| **Tech Stack** | Next.js 16, Tailwind CSS, shadcn/ui, Prisma 7 |
| **Database** | Neon PostgreSQL (ap-southeast-1) |
| **Version** | 1.10.0 |
| **Production URL** | https://aswreport.vercel.app |

---

## Theme Colors

### Brand Colors (หลัก)

| สี | Hex Code | การใช้งาน |
|----|----------|-----------|
| **Primary Green** | `#84A59D` | Sidebar, ปุ่ม, Header, รายได้ |
| **Coral** | `#F28482` | รายจ่าย, Staff role |
| **Yellow/Gold** | `#F6BD60` | กำไร, Partner, Icons |
| **Cream** | `#F7EDE2` | พื้นหลังหน้า |

### Building Colors (สีประจำอาคาร)

| อาคาร | สี | Hex Code |
|-------|-----|----------|
| อาคาร 1 | Deep Space Blue | `#1d3557` |
| อาคาร 2 | Steel Blue | `#457b9d` |
| อาคาร 3 | Teal | `#2a9d8f` |
| อาคาร 4 | Saffron Yellow | `#e9c46a` |
| อาคาร 5 | Sandy Brown | `#f4a261` |

---

## User Accounts

### หุ้นส่วน (PARTNER) - เข้าถึงได้ทุกหน้า

| Username | Password | ชื่อ |
|----------|----------|------|
| bank | admin | Bank |
| tuiii | tuiii123 | Tuiii |
| partner1 | 1234 | หุ้นส่วน 1 |
| partner2 | 1234 | หุ้นส่วน 2 |

### พนักงาน (STAFF) - เข้าถึงได้หน้ากรอกข้อมูล และจัดการค่าใช้จ่ายส่วนกลาง

| Username | Password | ชื่อ |
|----------|----------|------|
| aswjj | jj123 | JJ |
| staff1 | 1234 | พนักงาน 1 |
| staff2 | 1234 | พนักงาน 2 |

### ผู้ดู (VIEWER) - เห็นทุกอย่างยกเว้น Dashboard, เงินเดือน, จัดการผู้ใช้, ค่าเช่าอาคาร, ประกันสังคม, OTA channels ✨ UPDATED

| Username | Password | ชื่อ |
|----------|----------|------|
| Jmng | jmng | เจม |

**หมายเหตุ VIEWER:**
- Login ผ่านหน้า `/access/staff` (ไม่ใช่หน้า partner)
- ไม่เห็น: Dashboard, เงินเดือนพนักงาน, ยอดค้างจ่ายคืน, จัดการผู้ใช้
- หน้า Settings: ไม่เห็นค่าเช่าอาคาร
- หน้า Transactions: ไม่เห็นค่าเช่าอาคาร, เงินเดือน, ประกันสังคม, รายได้ OTA (AirBNB, Booking, Agoda ฯลฯ), การ์ดกำไร/ขาดทุน+กราฟ
- หน้า Transactions: เห็น Direct Booking (รวม Cash), รายได้อื่นๆ, รับส่งสนามบิน, Thai Bus Tour, Co Van Kessel

---

## Pages & Features

### 1. Dashboard (`/`)
- Summary Cards 8 กล่อง (gradient backgrounds)
- กราฟเปรียบเทียบรายได้-รายจ่าย
- กราฟกำไรสุทธิ
- ดูข้อมูลย้อนหลัง 3/6/12 เดือน

### 2. กรอกข้อมูล (`/transactions`)
- เลือกอาคาร/เดือน/ปี
- กรอกรายรับ-รายจ่ายผ่านปุ่ม +/- (ExpenseHistory)
- **ระบบประวัติการเพิ่ม/ลดยอด:**
  - บันทึกแต่ละรายการแยกกัน พร้อมรายละเอียด
  - ยอดรวม Reset เป็น 0 ทุกเดือน
  - ดูประวัติ/ลบรายการได้
- แสดงค่าใช้จ่ายส่วนกลางจาก GlobalSettings
- Input เป็น read-only (ต้องกดปุ่ม +/- เท่านั้น)
- **กรองน้ำ Coway** - กรอกได้โดยตรงในหน้านี้ (ย้ายมาจากหน้า Settings) ✨ MOVED
- **รายได้พิเศษ (Special Income):**
  - ค่าเช่า รถรับส่งสนามบิน (สีเขียว emerald)
  - Thai Bus Tour (สีม่วง purple)
  - Co Van Kessel (สีส้ม orange)
- **VIEWER role:** ไม่เห็นค่าเช่าอาคาร, เงินเดือน, ประกันสังคม, รายได้ OTA (เห็น Direct Booking+Cash, รายได้อื่นๆ, รับส่งสนามบิน, Thai Bus, Co Van Kessel) ✨ UPDATED
- **การ์ดสรุปกำไร/ขาดทุน + กราฟแท่ง** แสดงด้านบนสุด (ซ่อนสำหรับ VIEWER) ✨ NEW
  - 3 ช่องสรุป: รวมรายรับ | รวมรายจ่าย | กำไร/ขาดทุน
  - กราฟแท่ง (recharts) เปรียบเทียบ รายรับ/รายจ่าย/กำไร
  - Header เปลี่ยนสีตามสถานะ: สีทอง = กำไร, สีแดง = ขาดทุน

### 3. เงินเดือนพนักงาน (`/employees`)
- เพิ่ม/แก้ไข/ลบพนักงาน
- เรียงจากเงินเดือนสูง → น้อย
- แสดงเงินเดือนต่ออาคาร
- สถานะ active/inactive

### 4. ยอดค้างจ่ายคืน (`/reimbursements`) ✨ NEW
- ติดตามยอดเงินที่ต้องคืนให้เจ้าหนี้ (ป๊า, แบงค์, พลอย, ASW)
- เพิ่ม/แก้ไข/ลบ/คืนเงิน/ยกเลิกคืนเงิน
- **เลือกหลายอาคาร** — ยอดหารเฉลี่ยอัตโนมัติ (เช่น 3,000 ÷ 3 อาคาร = 1,000/อาคาร)
- กรองตามอาคาร/เดือน/ปี
- Summary Cards 3 ใบ: ยอดค้างจ่ายรวม (แดง) | ยอดคืนแล้ว (เขียว) | จำนวนรายการค้างจ่าย (เหลือง)
- ตารางแสดง: วันที่ยืมจ่าย, อาคาร, ชื่อเจ้าหนี้, รายละเอียด, จำนวนเงิน, วันที่คืนเงิน, สถานะ
- Badge สถานะ: สีแดง "ค้างจ่าย" / สีเขียว "คืนแล้ว"
- **เฉพาะ PARTNER** (Staff/Viewer เข้าไม่ได้)

### 5. จัดการผู้ใช้ (`/users`)
- เพิ่ม/แก้ไข/ลบ ผู้ใช้
- กำหนด role (PARTNER/STAFF)
- เปิด/ปิด บัญชี

### 6. จัดการค่าใช้จ่ายส่วนกลาง (`/settings`)
- **ทั้ง Partner, Staff, และ Viewer เข้าถึงได้** (Viewer ไม่เห็นค่าเช่าอาคาร)
- **ทุก field เป็น read-only ต้องกรอกผ่านปุ่มเท่านั้น**
- **Tab ตั้งค่าอาคาร:**
  - **Management Fee % / VAT %** - กดปุ่มแก้ไข (ดินสอ) → กรอกค่า % ใหม่ → บันทึกไป Settings table
  - **ค่าเช่าอาคาร** - กดปุ่ม +/- → กรอกรายละเอียด+จำนวนเงิน → บันทึกผ่าน ExpenseHistory (สะสมตามเดือน)
  - ~~ค่า Coway~~ - **ย้ายไปหน้า Transactions แล้ว** ✨ MOVED
- **Tab ค่าใช้จ่ายส่วนกลาง:**
  - ค่าดูแล MAX (หาร 3 อาคาร: NANA, CT, YW)
  - ค่าดูแลจราจร (หาร 3 อาคาร)
  - ค่าขนส่งสินค้า (หาร 3 อาคาร)
  - ค่า Amenity (หารทุกอาคาร)
  - ค่าน้ำเปล่า (หารทุกอาคาร)
  - ค่าขนมคุ้กกี้ (หารทุกอาคาร)
  - ค่ากาแฟ (หารทุกอาคาร)
  - ค่าน้ำมัน (หารทุกอาคาร)
  - ค่าเช่าที่จอดรถ (หารทุกอาคาร)
  - ค่าซ่อมบำรุงรถ (หารทุกอาคาร)
  - ค่าเดินทางแม่บ้าน (หารทุกอาคาร)
  - ค่าอุปกรณ์ทำความสะอาด (หารทุกอาคาร)
  - ค่าอาหาร (หารทุกอาคาร)
  - **เงินสมทบประกันสังคม (หาร 5 อาคาร)** ✨ NEW
    - เลือกพนักงานแบบ checkbox
    - ค่าเริ่มต้น 750 บาท/คน
    - Dialog สำหรับแก้ไขรายละเอียด

### 7. ดาวน์โหลดรายงาน (`/reports`)
- ดูตัวอย่างรายงาน
- แสดงทุก category (แม้ค่าเป็น 0)
- รายจ่ายแสดงค่าจาก GlobalSettings พร้อมรายละเอียด
- **Export PDF (2 หน้า - Modern Corporate Design)**
  - หน้า 1: Summary Cards 8 ตัว + กราฟเปรียบเทียบ
  - หน้า 2: ตารางรายรับรายจ่าย
- พิมพ์รายงาน (เหมือน PDF)
- มี emoji ตามหมวดหมู่

### 8. ระบบ Login (`/access`)
- เลือกประเภทผู้ใช้ (หุ้นส่วน/พนักงาน)
- Login ด้วย username/password
- รหัสผ่านเข้ารหัสด้วย bcrypt

---

## API Endpoints

| Endpoint | Methods | คำอธิบาย | Auth |
|----------|---------|----------|------|
| `/api/auth/login` | POST | เข้าสู่ระบบ | - |
| `/api/buildings` | GET | ข้อมูลอาคาร | - |
| `/api/categories` | GET | หมวดหมู่รายรับ-รายจ่าย | - |
| `/api/transactions` | GET, PUT, DELETE | บันทึก/ดึงรายการ | Auth |
| `/api/settings` | GET, PUT | ตั้งค่าอาคาร | Auth/Partner |
| `/api/global-settings` | GET, PUT | ค่าใช้จ่ายส่วนกลาง | Auth |
| `/api/summary` | GET | สรุปผลประกอบการ | Auth |
| `/api/summary/history` | GET | ข้อมูลย้อนหลัง | Partner |
| `/api/employees` | GET, POST, PUT, DELETE | จัดการพนักงาน | Partner |
| `/api/employees/salary-summary` | GET | สรุปเงินเดือน | Partner |
| `/api/users` | GET, POST, PUT, DELETE | จัดการผู้ใช้ | Partner |
| `/api/expense-history` | GET, POST | ประวัติเพิ่ม/ลดค่าใช้จ่าย ✨ | Auth |
| `/api/expense-history/[id]` | DELETE | ลบรายการประวัติ ✨ | Auth |
| `/api/expense-history/totals` | GET | ยอดรวมจากประวัติ | - |
| `/api/social-security` | GET, POST | จัดการเงินสมทบประกันสังคม ✨ | Auth |
| `/api/reimbursements` | GET, POST, PUT, DELETE | จัดการยอดค้างจ่ายคืน ✨ | Partner |
| `/api/categories/add-payment-channels` | POST | เพิ่ม categories ใหม่ ✨ | - |

---

## Calculation Formulas

```
รวมรายได้         = ผลรวม INCOME
รวมค่าใช้จ่าย      = ผลรวม EXPENSE + ค่าเช่าอาคาร + ค่า Coway + เงินเดือนพนักงาน + ค่าใช้จ่ายส่วนกลาง
Gross Profit     = รายได้ - ค่าใช้จ่าย
Management Fee   = รายได้ค่าเช่า × 13.5% (เฉพาะค่าเช่า ไม่รวมค่าอาหาร/ทัวร์)
VAT             = Management Fee × 7%
Net Profit       = Gross Profit - Management Fee - VAT - Little Hotelier
Amount to Pay    = Management Fee + VAT
```

**หมายเหตุ:**
- อาคาร FUNNS81, FUNNLP ไม่คำนวณ Management Fee และ VAT
- ค่าดูแล MAX, ค่าดูแลจราจร, ค่าขนส่งสินค้า หาร 3 อาคาร (NANA, CT, YW)
- ค่าใช้จ่ายส่วนกลางอื่นๆ หารตามจำนวนอาคารทั้งหมด

---

## Commands

```bash
# Development
npm run dev              # รัน server
npx prisma db seed       # เพิ่มข้อมูลตัวอย่าง
npx prisma db push       # Push schema
npx prisma studio        # เปิด Prisma Studio

# Production
npm run build            # Build
npx vercel --prod        # Deploy
```

---

## Changelog

### v1.10.0 (Current - March 2026)
- **เพิ่มหน้ายอดค้างจ่ายคืน (`/reimbursements`):**
  - ระบบติดตามยอดเงินที่ต้องคืนให้เจ้าหนี้ (ป๊า, แบงค์, พลอย, ASW)
  - เพิ่ม Reimbursement model ใน database (amount, buildingId, month, year, creditorName, description, paidDate, returnedDate, isReturned)
  - API `/api/reimbursements` รองรับ GET (filter), POST (หลายอาคาร), PUT, DELETE
  - **เลือกหลายอาคาร** เมื่อเพิ่มรายการ — ยอดหารเฉลี่ยอัตโนมัติ (checkbox)
  - **Dropdown เจ้าหนี้** แทนการพิมพ์: ป๊า, แบงค์, พลอย, ASW
  - กรองตามอาคาร (มี "ทุกอาคาร") / เดือน / ปี
  - Summary Cards 3 ใบ: ยอดค้างจ่ายรวม | ยอดคืนแล้ว | จำนวนรายการค้างจ่าย
  - ตาราง: วันที่ยืมจ่าย, อาคาร, ชื่อเจ้าหนี้, รายละเอียด, จำนวนเงิน, วันที่คืนเงิน, สถานะ, จัดการ
  - Badge สถานะ: สีแดง "ค้างจ่าย" / สีเขียว "คืนแล้ว"
  - ปุ่มจัดการ: คืนเงิน/ยกเลิกคืน, แก้ไข, ลบ
  - เฉพาะ PARTNER เท่านั้น (เพิ่ม Sidebar menu + block Viewer/Staff)
  - เพิ่ม HandCoins icon ใน Sidebar
  - ไฟล์ใหม่: `prisma/schema.prisma`, `src/app/api/reimbursements/route.ts`, `src/app/reimbursements/page.tsx`
  - ไฟล์แก้ไข: `src/components/Sidebar.tsx`, `src/contexts/AccessContext.tsx`

### v1.9.2 (March 2026)
- **แก้บัก: กรองน้ำ Coway ไม่แสดงตัวเลขที่กรอก:**
  - สาเหตุ: ข้อมูล Coway ถูกบันทึกด้วย `targetType: 'SETTINGS'` แต่ถูกโหลดกลับด้วย `targetType: 'TRANSACTION'` ทำให้ระบบหาไม่เจอ
  - แก้ `fetchExpenseHistory` ให้ใช้ `targetType: 'SETTINGS'` สำหรับ Coway
  - แก้ `loadTransactions` ให้โหลดค่า Coway จาก ExpenseHistory แทน Settings table
  - แก้ Summary API (`/api/summary`, `/api/summary/history`) ให้ query ExpenseHistory แทน Settings table
  - ไฟล์ที่แก้: `transactions/page.tsx`, `api/summary/route.ts`, `api/summary/history/route.ts`

### v1.9.1 (February 2026)
- **เพิ่มการ์ดสรุปกำไร/ขาดทุน + กราฟแท่งในหน้ากรอกข้อมูล:**
  - แสดงด้านบนสุดของหน้า (เหนือตารางรายรับ-รายจ่าย)
  - 3 ช่องสรุป: รวมรายรับ (สีเขียว) | รวมรายจ่าย (สีแดง) | กำไร/ขาดทุน (สีทอง/แดง)
  - กราฟแท่ง 3 แท่ง (recharts): รายรับ (#5B8A7D) | รายจ่าย (#E8837B) | กำไร (#D4A24C) หรือ ขาดทุน (#E74C3C)
  - Header เปลี่ยนสีอัตโนมัติ: สีทอง+ลูกศรขึ้น = กำไร, สีแดง+ลูกศรลง = ขาดทุน
  - Tooltip แสดงจำนวนเงินเมื่อชี้กราฟ
  - Responsive รองรับมือถือ
  - ซ่อนจาก VIEWER (Jmng) — ไม่เห็นการ์ดกำไร/ขาดทุนและกราฟ

### v1.9.0 (February 2026)
- **เพิ่ม "ค่าเช่า Cash" เป็นรายการรายรับใหม่:**
  - อยู่ในกลุ่ม Direct Booking sub-items (ทุกอาคาร ทุก user เห็น)
  - เพิ่ม icon DollarSign สีเขียว (#2E7D32)
  - Dashboard Pie Chart: รวมเข้า Direct Booking อัตโนมัติ
  - เพิ่มสี Cash ใน BRAND_COLORS ของ Dashboard
- **เปิดรายได้เพิ่มเติมให้ VIEWER (Jmng) เห็น:**
  - รายได้บริการต่างๆ (ค่าอาหาร, ค่าทัวร์ ฯลฯ)
  - ค่าเช่า รถรับส่งสนามบิน
  - Thai Bus Tour
  - Co Van Kessel
- **VIEWER ยังคงไม่เห็น:** OTA channels (AirBNB, Booking, Agoda ฯลฯ), ค่าเช่าอาคาร, เงินเดือน, ประกันสังคม
- **เพิ่ม "รายจ่ายหน้างาน Cash" เป็นรายการรายจ่ายใหม่:**
  - อยู่ตำแหน่งบนสุดของตารางรายจ่าย (order: 0)
  - icon DollarSign สีชมพูโคราล (#F28482)
  - ทุกอาคาร ทุก user กรอกได้
- **เพิ่ม "ค่า Fee จาก Credit Card" เป็นรายการรายจ่ายใหม่:**
  - อยู่ถัดจาก ค่า Fee จาก PayPal (order: 20)
  - icon CreditCard สีน้ำเงิน Visa Blue (#1A1F71)
  - ทุกอาคาร ทุก user กรอกได้

### v1.8.9 (February 2026)
- **เพิ่มเดือนมกราคม 2026 สำหรับ Funn D ทั้ง 2 อาคาร:**
  - หน้ากรอกข้อมูล (`/transactions`): เลือกเดือน มค. ได้เมื่อเลือกอาคาร Funn D (FUNNLP, FUNNS81)
  - หน้าจัดการค่าใช้จ่ายส่วนกลาง (`/settings`): แท็บตั้งค่าอาคาร เลือกเดือน มค. ได้เมื่อเลือก Funn D
  - แท็บค่าใช้จ่ายส่วนกลาง: ไม่แสดงเดือน มค. (เริ่มที่ กพ. เหมือนเดิม)
  - Dashboard: ไม่แสดงเดือน มค.
  - ใช้ `buildingCode?.startsWith('FUNN')` ในการตรวจสอบ
- **รีเซ็ตรหัสผ่าน user bank:** เปลี่ยนจาก PB19021005 เป็น admin

### v1.8.8 (February 2026)
- **เพิ่ม VIEWER role สำหรับผู้ดูแบบจำกัดสิทธิ์:**
  - สร้าง user "Jmng" (password: jmng) เป็น VIEWER
  - Login ผ่านหน้า `/access/staff`
  - ไม่เห็น: Dashboard, เงินเดือนพนักงาน, จัดการผู้ใช้
  - หน้า Settings: ไม่เห็นค่าเช่าอาคาร
  - หน้า Transactions: ไม่เห็นค่าเช่าอาคาร, เงินเดือน, ประกันสังคม
  - หน้า Transactions: รายได้เห็นแค่ Direct Booking (ซ่อน OTA อื่นๆ, รายได้อื่น, รถรับส่ง, Thai Bus Tour, Co Van Kessel) — *ต่อมาเปิดเพิ่มใน v1.9.0*
- **ย้ายกรองน้ำ Coway จากหน้า Settings ไปหน้า Transactions:**
  - เพิ่มปุ่มแก้ไข/เพิ่ม/ลดในหน้า Transactions
  - ลบส่วน Coway ออกจากหน้า Settings
  - ทุก user (รวม VIEWER) สามารถแก้ไขได้

### v1.8.7 (February 2026)
- **รวม PayPal / Credit Card / Bank Transfer เป็นรายการย่อยของ Direct Booking:**
  - หน้ากรอกข้อมูล: แสดงกลุ่ม "Direct Booking" พร้อม subtotal + 3 รายการย่อย (PayPal, Credit Card, Bank Transfer) ย่อหน้าเข้าไป
  - Dashboard Pie Chart: รวม 3 ช่องทางเป็น "Direct Booking" ชิ้นเดียว (API `incomeByChannel` merge อัตโนมัติ)
  - OTA อื่นๆ (AirBNB, Booking, Agoda, Trip, Expedia, RB) แสดงปกติ
  - ไม่มี database migration — ใช้ categories เดิมที่มีอยู่ใน DB
- **จำกัดการแสดงข้อมูลตั้งแต่ กุมภาพันธ์ 2026 เป็นต้นไป:**
  - ลบปี 2025 และก่อนหน้าออกจาก dropdown ปี (startYear = 2026)
  - เมื่อเลือกปี 2026 จะแสดงเฉพาะเดือน กพ.-ธค. (ไม่มี มค.)
  - เพิ่ม `getAvailableMonths()` helper function ใน `calculations.ts`
  - ใช้งานใน Dashboard, Transactions, Settings (รวม dialogs ทุกจุด)
  - Dashboard "เดือนที่แล้ว" จะไม่ย้อนไปก่อน กพ. 2026

### v1.8.6 (January 2026)
- **Responsive Dialog สำหรับหน้า Settings และ Transactions:**
  - Dialog popup เมื่อกดปุ่ม edit/+/- พอดีกับหน้าจอมือถือ 6 นิ้ว
  - ใช้ `w-[95vw]` เพื่อให้ Dialog กว้างเต็มหน้าจอบนมือถือ
  - ลดขนาด font เป็น `9px`, `10px`, `11px` สำหรับมือถือ
  - ลดความสูงตารางจาก `180px` เป็น `120px` บนมือถือ
  - ลดความสูงปุ่มและ input เป็น `h-7` บนมือถือ
  - ลด padding ทั่วทั้ง Dialog: `p-3 sm:p-6`
  - ปรับ DialogFooter เป็น `flex-col-reverse sm:flex-row` สำหรับมือถือ
  - ปรับ Select triggers ให้เล็กลง: `h-7 sm:h-10`

### v1.8.5 (January 2026)
- **เพิ่ม Category รายได้ใหม่:**
  - ค่าปรับของใช้เสียหาย (Damage Penalty) - สำหรับบันทึกเงินค่าปรับที่ได้รับจากลูกค้าเมื่อทำของเสียหาย
- **UI Updates:**
  - เพิ่ม AlertTriangle icon สีแดง สำหรับ category ค่าปรับของใช้เสียหาย
- **Bug Fix:**
  - แก้ไข Summary API ให้รวม incomeByChannel และ expenseByCategory สำหรับ "ทุกอาคาร" view

### v1.8.4 (January 2026)
- **Responsive Design สำหรับหน้า Settings:**
  - ปรับขนาดปุ่มให้เล็กลงบนมือถือ: `h-7 w-7 sm:h-9 sm:w-9`
  - ปรับขนาดไอคอนในปุ่ม: `h-3 w-3 sm:h-4 sm:w-4`
  - ปรับ padding ของการ์ด: `p-3 sm:p-4`
  - ปรับไอคอนหัวการ์ด: `h-6 w-6 sm:h-8 sm:w-8`
  - ปรับช่องแสดงผลค่าใช้จ่าย: `px-2 sm:px-3 py-1.5 sm:py-2`, `text-sm sm:text-base`
  - ปรับ CardHeader ของ info tab: responsive padding และ text size
  - รองรับการแสดงผลบนหน้าจอ 6 นิ้วโดยไม่ต้อง scroll แนวนอน

### v1.8.3 (January 2026)
- **Responsive Design สำหรับหน้า Reports:**
  - ปรับขนาด Tables รายรับรายจ่าย ให้เล็กลงบนมือถือ
  - ปรับขนาด Table สรุปผลประกอบการ ให้เล็กลงบนมือถือ
  - ลด padding: `px-2 py-1` บนมือถือ → `px-4 py-2` บน sm:
  - ลดขนาดตัวอักษร: `text-xs` บนมือถือ → `text-sm` บน sm:
  - ซ่อน icons บนมือถือ: `hidden sm:block`
  - ซ่อน subtitles/descriptions บนมือถือ
  - ย่อข้อความให้สั้นลงบนมือถือ (เช่น "Net Profit" แทน "Net Profit (Owner)")
  - เพิ่ม `line-clamp-1` และ `whitespace-nowrap` ป้องกันข้อความล้น
- **ปรับสีตัวอักษรให้เข้มขึ้น (อ่านง่ายบนพื้นหลังสี):**
  - รายได้ (เขียว): `#84A59D` → `#3d5650`
  - รายจ่าย (แดง): `#F28482` → `#a84442`
  - Gross Profit (น้ำเงิน): `#5B9BD5` → `#2d5a7a`
  - Net Profit/เหลือง: `#D4A24C` → `#8a6420`
  - Subtitle: `text-slate-400` → `text-slate-500`

### v1.8.2 (January 2026)
- **Responsive Design ทั้งระบบ:**
  - หน้า Settings: TabsList wrap ได้บนมือถือ (`flex-wrap h-auto gap-1`)
  - หน้า Transactions: Tables scroll แนวนอนได้ (`overflow-x-auto`)
  - หน้า Reports: Tables scroll แนวนอนได้ (`overflow-x-auto`)

### v1.8.1 (December 2025)
- **ยืนยันค่าใช้จ่ายส่วนกลางแสดงแยกเดือนถูกต้อง:**
  - หน้า Settings: มี selector เดือน/ปี - โหลดข้อมูลตามเดือนที่เลือก
  - หน้า Reports/PDF: ใช้ข้อมูลจาก Summary API ที่ดึงตาม ExpenseHistory
  - ทดสอบ: ธ.ค. 2025 มีข้อมูล 18 รายการ, พ.ย. 2025 มี 0 รายการ
- **ยืนยัน PDF แสดง Social Security ถูกต้อง:**
  - แสดงในตาราง "ค่าใช้จ่ายรวมอาคาร"
  - สีชมพู (#E91E63) พร้อมไอคอน HeartPulse
  - หาร 5 อาคาร (เช่น 2,750 ÷ 5 = 550 บาท/อาคาร)

### v1.8.0 (December 2025)
- **ระบบเงินสมทบประกันสังคม (Social Security):**
  - เพิ่ม SocialSecurityContribution model
  - API `/api/social-security` สำหรับจัดการข้อมูล
  - Card เล็กในหน้า Settings (sync กับเดือน/ปีส่วนกลาง)
  - Dialog สำหรับแก้ไขเงินสมทบพนักงานแต่ละคน
  - Checkbox เลือกพนักงาน (ค่าเริ่มต้น 750 บาท)
  - แสดงในหน้า transactions และ reports/PDF
  - หาร 5 อาคาร
- **เพิ่ม Categories รายได้ใหม่:**
  - ค่าเช่าจาก PayPal
  - ค่าเช่าจาก Credit Card
  - ค่าเช่าจาก Bank Transfer
- **เพิ่ม Category รายจ่ายใหม่:**
  - ค่า Fee จาก PayPal
- **ลบ Category:**
  - ค่าเช่าจาก ช่องทางอื่น (ไม่ใช้แล้ว)
- **UI Components:**
  - เพิ่ม Checkbox component (shadcn/ui)
  - เพิ่ม HeartPulse icon สำหรับ Social Security
  - เพิ่ม icons และสีสำหรับ PayPal, Credit Card, Bank Transfer

### v1.7.1 (December 2025)
- **แก้ไข Bug ยอดรวมไม่อัปเดต:**
  - รายได้พิเศษ (airportShuttleRentIncome, thaiBusTourIncome, coVanKesselIncome) อัปเดตยอดรวมถูกต้องแล้ว
  - ยอดรวมอัปเดตอัตโนมัติเมื่อปิด popup หลังกรอกข้อมูลผ่าน +/-
  - ยอดรวมอัปเดตเมื่อกดปุ่มถังขยะลบรายการ
- **เพิ่มปุ่มแก้ไข (ดินสอ) ทุก field:**
  - ตารางรายรับ - ทุก field มีปุ่มแก้ไข
  - ตารางรายจ่าย - ทุก field มีปุ่มแก้ไข
  - หน้า Settings - ทำงานเหมือนหน้า Transactions (ปุ่ม +/- และแก้ไข)
- **E2E Testing ผ่านทั้งหมด:**
  - ทดสอบ API หน้ากรอกข้อมูล (TRANSACTION)
  - ทดสอบ API หน้าจัดการค่าใช้จ่าย (SETTINGS, GLOBAL_SETTINGS)
  - CREATE, CALCULATE, ADD/SUBTRACT, DELETE - ทำงานถูกต้อง

### v1.7.0 (December 2025)
- **เพิ่มรายได้พิเศษ (Special Income) 3 รายการ:**
  - ค่าเช่า รถรับส่งสนามบิน (airportShuttleRentIncome)
  - Thai Bus Tour (thaiBusTourIncome)
  - Co Van Kessel (coVanKesselIncome)
- **กรอกข้อมูลผ่านหน้า Transactions โดยตรง:**
  - ใช้ปุ่ม +/- เหมือน field อื่นๆ
  - เก็บข้อมูลใน ExpenseHistory
  - ไม่ต้องกรอกที่หน้า Settings
- **เพิ่มค่าอาหาร (foodExpense) ในค่าใช้จ่ายส่วนกลาง**
- **อัปเดต PDF และ Print:**
  - แสดงรายได้พิเศษทั้ง 3 รายการในตารางรายรับ
  - แสดงค่าอาหารในตารางรายจ่าย
- **UI Updates:**
  - ค่าเช่า รถรับส่งสนามบิน: สีเขียว (emerald)
  - Thai Bus Tour: สีม่วง (purple)
  - Co Van Kessel: สีส้ม (orange)

### v1.6.1 (December 2025)
- **ปรับปรุงหน้า Settings - แยกระบบ % และ จำนวนเงิน:**
  - **Field % (Management Fee, VAT):**
    - เปลี่ยนจากปุ่ม +/- เป็นปุ่มแก้ไข (ไอคอนดินสอ)
    - กรอกค่า % ใหม่โดยตรง (ไม่สะสม)
    - บันทึกไป Settings table ทันที
  - **Field จำนวนเงิน (ค่าเช่า, Coway, ค่าใช้จ่ายส่วนกลาง):**
    - ยังคงใช้ปุ่ม +/- สำหรับเพิ่ม/ลดยอดสะสม
    - บันทึกผ่าน ExpenseHistory ตามเดือน/ปี
- **UI Updates:**
  - ทุก field เป็น read-only (ไม่สามารถกรอกโดยตรง)
  - เพิ่ม validation messages แสดงเมื่อกรอกไม่ครบ
  - เพิ่ม autoFocus ใน Dialog

### v1.6.0 (December 2025)
- **ระบบประวัติการเพิ่ม/ลดค่าใช้จ่าย (ExpenseHistory):**
  - เพิ่ม ExpenseHistory model สำหรับบันทึกประวัติการเพิ่ม/ลด
  - บันทึกแต่ละรายการแยกกัน พร้อมรายละเอียด (เช่น "ค่าฉีดปลวก", "ค่าซ่อมแอร์")
  - ยอดรวม Reset เป็น 0 ทุกเดือน (คำนวณจาก ExpenseHistory)
  - ดูประวัติ/ลบรายการได้
- **API ใหม่:**
  - `POST /api/expense-history` - บันทึกรายการเพิ่ม/ลด
  - `GET /api/expense-history` - ดึงประวัติรายการ
  - `DELETE /api/expense-history/[id]` - ลบรายการ
  - `GET /api/expense-history/totals` - ดึงยอดรวมทุก category
- **UI Updates:**
  - หน้า Settings: ปุ่ม +/- เปิด popup ที่มีประวัติ + form กรอกรายการใหม่
  - หน้า Transactions: input เป็น read-only, ใช้ปุ่ม +/- กรอกข้อมูล
  - ยอดรวมโหลดจาก ExpenseHistory แทน Transaction table

### v1.5.0 (December 2025)
- **เพิ่ม Fields ค่าใช้จ่ายใหม่ 3 รายการ:**
  - ค่าเช่าเครื่องกรองน้ำ Coway (Settings - แยกต่ออาคาร)
  - ค่าอุปกรณ์ทำความสะอาด (GlobalSettings - หารทุกอาคาร)
  - ค่าน้ำยาสำหรับซักผ้า (GlobalSettings - หารทุกอาคาร)
- อัปเดตหน้า Settings UI (เพิ่ม input fields)
- อัปเดตหน้า Transactions UI (แสดง read-only fields)
- อัปเดตหน้า Reports UI (แสดงในรายงานและ PDF)
- อัปเดต Summary API (คำนวณค่าใช้จ่ายใหม่)

### v1.4.0 (December 2025)
- **PDF Design ใหม่แบบ Modern Corporate**
  - ลดจาก 3 หน้าเหลือ 2 หน้า (กระชับกว่า)
  - หน้า 1: Summary Cards 8 ตัว + กราฟเปรียบเทียบ + อัตราส่วนกำไร
  - หน้า 2: ตารางรายรับรายจ่ายแบบ Modern
- Summary Cards แสดง: รายได้, ค่าใช้จ่าย, Gross Profit, Net Profit, Management Fee, Amount to Pay, ค่าเช่า, เงินเดือน
- ปรับ design ให้มี gradient, shadow, border-radius
- Font size ใหญ่ขึ้นอ่านง่าย (10-12px แทน 9px)
- เพิ่ม white space ให้ดูโปร่งตา
- Export All Buildings ปรับเป็น 2 หน้าต่ออาคาร

### v1.3.0 (December 2025)
- เพิ่มหน้าจัดการค่าใช้จ่ายส่วนกลาง (GlobalSettings)
- Staff สามารถเข้าถึงหน้าจัดการค่าใช้จ่ายส่วนกลางได้
- หน้าดาวน์โหลดแสดงทุก category แม้ค่าเป็น 0
- แสดงรายละเอียดค่าใช้จ่ายส่วนกลางในหน้าดาวน์โหลด
- ลบรายการซ้ำซ้อนระหว่าง category และ GlobalSettings
- ปรับ PDF ให้แสดงพอดีหน้า (font size, padding, layout)
- ปรับตารางให้ตัวหนังสือไม่ถูกตัดหรือทับ

### v1.2.0
- PDF Report 3 หน้า (ตาราง, สรุป, กราฟ)
- เพิ่ม emoji ในรายการรายรับ-รายจ่าย PDF
- ปรับปุ่มพิมพ์ให้แสดงเหมือน PDF
- ลบปุ่มแชร์ Line และคัดลอกลิงก์
- ปรับขนาดตารางอัตโนมัติตามจำนวนรายการ
- แสดงเงินเดือนพนักงานในสรุป
- Authentication ด้วย bcrypt
- API Protection (requireAuth/requirePartner)
- หน้าจัดการผู้ใช้ (/users)

### v1.1.0
- UI Improvements ทั่วทั้งระบบ
- Dynamic Building Colors (หน้าตั้งค่า)
- เรียงพนักงานตามเงินเดือน
- Employee Management
- Mediterranean Color Palette

### v1.0.0
- Initial release
- Dashboard, กรอกข้อมูล, รายงาน, ตั้งค่า
- Export Excel
- Authentication

---

## Database Schema

### Building
| Field | Type | คำอธิบาย |
|-------|------|----------|
| id | Int | Primary key |
| name | String | ชื่ออาคาร |
| code | String | รหัส (CT, YW, NANA) |

### Category
| Field | Type | คำอธิบาย |
|-------|------|----------|
| id | Int | Primary key |
| name | String | ชื่อหมวดหมู่ |
| type | Enum | INCOME / EXPENSE |
| order | Int | ลำดับ |

### Transaction
| Field | Type | คำอธิบาย |
|-------|------|----------|
| id | Int | Primary key |
| buildingId | Int | FK อาคาร |
| categoryId | Int | FK หมวดหมู่ |
| amount | Decimal | จำนวนเงิน |
| month | Int | เดือน (1-12) |
| year | Int | ปี |

### Settings
| Field | Type | คำอธิบาย |
|-------|------|----------|
| id | Int | Primary key |
| buildingId | Int | FK อาคาร |
| managementFeePercent | Decimal | % ค่าบริหาร |
| vatPercent | Decimal | % VAT |
| monthlyRent | Decimal | ค่าเช่า/เดือน |
| littleHotelierExpense | Decimal | ค่า Little Hotelier |
| cowayWaterFilterExpense | Decimal | ค่าเช่าเครื่องกรองน้ำ Coway ✨ |

### GlobalSettings
| Field | Type | คำอธิบาย |
|-------|------|----------|
| id | Int | Primary key |
| maxCareExpense | Decimal | ค่าดูแล MAX |
| trafficCareExpense | Decimal | ค่าดูแลจราจร |
| shippingExpense | Decimal | ค่าขนส่งสินค้า |
| amenityExpense | Decimal | ค่า Amenity |
| waterBottleExpense | Decimal | ค่าน้ำเปล่า |
| cookieExpense | Decimal | ค่าขนมคุ้กกี้ |
| coffeeExpense | Decimal | ค่ากาแฟ |
| fuelExpense | Decimal | ค่าน้ำมัน |
| parkingExpense | Decimal | ค่าเช่าที่จอดรถ |
| motorcycleMaintenanceExpense | Decimal | ค่าซ่อมบำรุงรถ |
| maidTravelExpense | Decimal | ค่าเดินทางแม่บ้าน |
| cleaningSupplyExpense | Decimal | ค่าอุปกรณ์ทำความสะอาด |
| foodExpense | Decimal | ค่าอาหาร ✨ |

### Employee
| Field | Type | คำอธิบาย |
|-------|------|----------|
| id | Int | Primary key |
| firstName | String | ชื่อ |
| lastName | String | นามสกุล |
| nickname | String? | ชื่อเล่น |
| position | Enum | MAID / MANAGER / PARTNER |
| salary | Decimal | เงินเดือน |
| isActive | Boolean | สถานะ |

### User
| Field | Type | คำอธิบาย |
|-------|------|----------|
| id | Int | Primary key |
| username | String | ชื่อผู้ใช้ |
| password | String | รหัสผ่าน (hashed) |
| name | String | ชื่อแสดง |
| role | Enum | PARTNER / STAFF / VIEWER ✨ |
| isActive | Boolean | สถานะ |

### ExpenseHistory
| Field | Type | คำอธิบาย |
|-------|------|----------|
| id | Int | Primary key |
| targetType | String | "SETTINGS", "GLOBAL_SETTINGS", หรือ "TRANSACTION" |
| targetId | Int? | buildingId (สำหรับ Settings/Transaction) หรือ null |
| fieldName | String | ชื่อ field หรือ categoryId |
| fieldLabel | String | ชื่อที่แสดง (เช่น "ค่าเช่าอาคาร") |
| actionType | String | "ADD" หรือ "SUBTRACT" |
| amount | Decimal | จำนวนเงิน |
| description | String | รายละเอียด (บังคับกรอก) |
| month | Int | เดือน (1-12) |
| year | Int | ปี |
| createdAt | DateTime | วันที่สร้าง |

### Reimbursement ✨ NEW
| Field | Type | คำอธิบาย |
|-------|------|----------|
| id | Int | Primary key |
| amount | Decimal | จำนวนเงิน |
| buildingId | Int | FK อาคาร |
| month | Int | เดือน (1-12) |
| year | Int | ปี |
| creditorName | String | ชื่อเจ้าหนี้ (ป๊า/แบงค์/พลอย/ASW) |
| description | String? | หมายเหตุ/รายละเอียด |
| paidDate | DateTime? | วันที่ยืมจ่ายเงิน |
| returnedDate | DateTime? | วันที่คืนเงิน |
| isReturned | Boolean | สถานะคืนแล้วหรือยัง (default: false) |
| createdAt | DateTime | วันที่สร้าง |
| updatedAt | DateTime | วันที่อัปเดต |

### SocialSecurityContribution
| Field | Type | คำอธิบาย |
|-------|------|----------|
| id | Int | Primary key |
| employeeId | Int | FK พนักงาน |
| amount | Decimal | จำนวนเงินสมทบ (ค่าเริ่มต้น 750) |
| month | Int | เดือน (1-12) |
| year | Int | ปี |
| createdAt | DateTime | วันที่สร้าง |
| updatedAt | DateTime | วันที่อัปเดต |

---

## Future Plans

| Task | Status |
|------|--------|
| เพิ่ม/แก้ไขอาคาร | 📋 วางแผน |
| เพิ่ม/แก้ไขหมวดหมู่ | 📋 วางแผน |
| รายงานเปรียบเทียบรายปี | 📋 วางแผน |
| Backup Data | 📋 วางแผน |
| Dark Mode | 💡 ไอเดีย |
| Mobile App | 💡 ไอเดีย |

---

## Notes

- ใช้ Prisma 7 ต้องตั้งค่า `prisma.config.ts`
- ฐานข้อมูลอยู่บน Neon (Region: ap-southeast-1)
- UI ใช้ธีมสี pastel
- รหัสผ่านเข้ารหัสด้วย bcrypt
- API มีการตรวจสอบสิทธิ์ (Auth)
- Production URL: https://aswreport.vercel.app
- **ค่าใช้จ่ายส่วนกลางแยกตามเดือน:** ข้อมูลเก็บใน ExpenseHistory แยกตาม month/year - ไม่ใช่ค่าคงที่ใน GlobalSettings
- **Social Security แยกตามเดือน:** ข้อมูลเก็บใน SocialSecurityContribution แยกตาม month/year
