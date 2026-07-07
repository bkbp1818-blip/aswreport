# ASW Report - Implementation Plan

> **ARUN SA WAD Report System** - ระบบจัดการรายรับ-รายจ่ายสำหรับอาคาร

---

## Quick Info

| รายละเอียด | ค่า |
|------------|-----|
| **Tech Stack** | Next.js 16, Tailwind CSS, shadcn/ui, Prisma 7 |
| **Database** | Neon PostgreSQL (ap-southeast-1) |
| **Version** | 1.34.0 |
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

### พนักงาน (STAFF) - เข้าถึงได้ตามสิทธิ์เมนูที่กำหนด ✨ UPDATED v1.14.0

| Username | Password | ชื่อ | สิทธิ์เมนู |
|----------|----------|------|-----------|
| aswjj | jj123 | JJ | กรอกข้อมูล, ยอดค้างจ่ายคืน |
| staff1 | 1234 | พนักงาน 1 | ค่าเริ่มต้น (กรอกข้อมูล, ตั้งค่า) |
| staff2 | 1234 | พนักงาน 2 | ค่าเริ่มต้น (กรอกข้อมูล, ตั้งค่า) |

### ผู้ดู (VIEWER) - เห็นทุกอย่างยกเว้น Dashboard, เงินเดือน, จัดการผู้ใช้, ค่าเช่าอาคาร, ประกันสังคม, OTA channels ✨ UPDATED

| Username | Password | ชื่อ |
|----------|----------|------|
| Jmng | jmng | เจม |

**หมายเหตุ VIEWER:**
- Login ผ่านหน้า `/access/staff` (ไม่ใช่หน้า partner)
- ไม่เห็น: Dashboard, เงินเดือนพนักงาน, ยอดค้างจ่ายคืน, จัดการผู้ใช้
- หน้า Settings: ไม่เห็นค่าเช่าอาคาร
- หน้า Transactions: ไม่เห็นค่าเช่าอาคาร, เงินเดือน, ประกันสังคม, รายได้ OTA (AirBNB, Booking, Agoda ฯลฯ), OTA sub-rows ใต้ Direct Booking, การ์ดกำไร/ขาดทุน+กราฟ
- หน้า Transactions: เห็น Direct Booking (รวม Cash), รายได้อื่นๆ, รับส่งสนามบิน, Thai Bus Tour, Co Van Kessel, งานเสริม FD

**หมายเหตุพิเศษสำหรับ user `aswjj` และ `jmng` (v1.20.0):**
- หน้า Transactions: ไม่เห็น 2 sections ด้านล่างสุด — "คืนยอดค้างจ่ายแล้ว (ยืมจ่ายเดือนนี้)" และ "ยอดค้างจ่ายที่ยังไม่จ่ายคืน (ยืมจ่ายเดือนนี้)"
- เปรียบเทียบ username แบบ case-insensitive (รองรับ Jmng/jmng/JMNG)

---

## Pages & Features

### 1. Dashboard (`/`) ✨ UPDATED v1.21.1
- **Summary Cards 3 ใบ** (gradient): รวมรายได้ / รวมค่าใช้จ่าย / Gross Profit
- **Additional Cards 2 ใบ**: ค่าเช่าอาคาร / เงินเดือนพนักงาน
- กราฟเปรียบเทียบอาคาร (ทุกอาคาร) — รายรับ/รายจ่าย/กำไรสุทธิ
- กราฟย้อนหลัง 3/6/12/custom เดือน (อาคารเดียว) — เปรียบเทียบ + รายรับ + รายจ่าย + กำไรสุทธิ
- **AbortController** ใน fetch history ป้องกัน race condition เมื่อสลับช่วงเวลา ✨ NEW v1.21.1

### 2. กรอกข้อมูล (`/transactions`)
- เลือกอาคาร/เดือน/ปี
- กรอกรายรับ-รายจ่ายผ่านปุ่ม +/- (ExpenseHistory) หรือ inline form (สำหรับรายได้รายวัน)
- **ระบบประวัติการเพิ่ม/ลดยอด:**
  - บันทึกแต่ละรายการแยกกัน พร้อมรายละเอียด, ห้อง, วันที่
  - ยอดรวม Reset เป็น 0 ทุกเดือน
  - ดูประวัติ/ลบรายการได้
- **Daily Entry Sections (inline form ทุกเดือน):** ✨ UPDATED v1.21.2
  - **กลุ่ม "กรอกข้อมูลรายวัน — Direct Booking"** (สีม่วง `#a78bfa`):
    - **4 ช่องทาง** (PayPal, Credit Card, Bank Transfer, Cash) — เลิก matrix 5 OTA × 4 Channel ในทุกเดือนแล้ว
    - แต่ละแถว: date picker + dropdown ห้อง + หมายเหตุ + amount + ปุ่ม "บันทึก" + "ตรวจสอบ"
    - Save → POST `/api/expense-history` (ADD) → category `ค่าเช่าจาก [Channel]` + `roomId` + `day` (`otaSourceId=null` ตั้งแต่ เม.ย. 2026)
  - **กลุ่ม "กรอกข้อมูลรายเดือน — OTA"** (สีเหลือง `#fbbf24`):
    - 5 OTA (Agoda, Booking, AirBnB, Trip, Expedia)
    - แต่ละแถว: date picker + dropdown ห้อง + หมายเหตุ + amount + ปุ่ม "บันทึก" + "ตรวจสอบ" ✨ UPDATED v1.22.3
    - Save → POST `/api/expense-history` (ADD) → category `ค่าเช่าจาก [OTA]` + `roomId` + `day` (ไม่มี channel)
  - **กลุ่ม "รายได้ค่าเช่า (OTA)" (Agoda/Booking/AirBnB/Trip/Expedia/RB):** ซ่อนทุกเดือน — ใช้ Daily Entry แทน ✨ UPDATED v1.21.2
  - **Dialog "ตรวจสอบ"** ของแต่ละแถว: column วันที่/ห้อง/จำนวน/ผู้กรอก+เวลาบันทึก + ปุ่มลบรายตัว + footer ยอดรวม ✨ UPDATED v1.23.0
  - **DateBox component** ✨ NEW v1.22.4: text input แสดง `DD/MM/YYYY` + click เปิด native date picker (`showPicker()`) — ไม่เพิ่ม dependency
  - **Reset state หลังบันทึก** ✨ NEW v1.22.4: ทุก field กลับ default (`day=today, roomId='', amount='', note=''`) เพื่อพร้อมกรอกครั้งถัดไป
  - **บังคับเลือกห้อง:** อาคาร CT/YW/NANA (FUNN ไม่มีห้อง — ไม่แสดง dropdown) ✨ NEW v1.22.0
- **OTA Source สำหรับ Direct Booking:** ✨ NEW v1.17.0
  - รายชื่อ OTA: Direct, AirBNB, Booking.com, Agoda, Expedia, **Trip** (เพิ่มใน v1.19.0)
  - เก็บใน OtaSource master table
- ค่าใช้จ่ายส่วนกลาง **แยกตามอาคาร** (ไม่ใช่ GlobalSettings อีกแล้ว) ✨ UPDATED
- Input เป็น read-only (ต้องกดปุ่ม +/- เท่านั้น)
- **กรองน้ำ Coway** - กรอกได้โดยตรงในหน้านี้ (ย้ายมาจากหน้า Settings) ✨ MOVED
- **รายได้พิเศษ (Special Income) — inline form (ห้อง+หมายเหตุ+วันที่+จำนวน+บันทึก/ตรวจสอบ):** ✨ UPDATED v1.22.2
  - ค่าเช่า รถรับส่งสนามบิน (สีเขียว emerald) — fieldName `airportShuttleRentIncome`
  - Thai Bus Tour (สีม่วง purple) — fieldName `thaiBusTourIncome`
  - Co Van Kessel (สีส้ม orange) — fieldName `coVanKesselIncome`
  - **3 รายการนี้ใช้ helpers** `saveSpecialIncome()` + `openSpecialHistory()` (field-based ไม่ใช่ category id) — รูปแบบเดียวกับ OTA monthly entry
  - **ค่าเช่าอาคารชั้น 1 (สี amber)** — เฉพาะ NANA, fieldName `floor1RentIncome` — prefill default 23,000 (smart fallback ใน summary), ไม่มี dropdown ห้อง, badge "ค่าเริ่มต้น" ถ้ายังไม่บันทึก ✨ NEW v1.27.0
  - งานเสริม FD (สีเขียว teal) — เฉพาะ CT/YW/NANA แยก 2 อาคาร: ลาดพร้าว 21, สุขุมวิท 81 ✨ UPDATED v1.16.0
  - รายได้จาก FD เงินเดือนเมเนเจอร์แอดมิน (สีม่วง violet) — เฉพาะ CT/YW/NANA ✨ NEW
- **รายได้อื่นๆ — Generic Income Categories (gate ตามอาคาร):** ✨ UPDATED v1.27.0
  - ค่าทำความสะอาด Bitterwell — เฉพาะ CT/YW/NANA (กรอกเองรายเดือน, Bitterwell จ่ายให้)
  - Gate ผ่าน UI filter ที่ `otherIncomeCategories` — backend summary ใช้ generic flow ปกติ
- **รายจ่ายพิเศษ (Special Expense) — เฉพาะ Funn D:**
  - รายจ่ายให้ ASW เงินเดือนเมเนเจอร์แอดมิน (สีม่วง violet)
  - บริการอื่นๆจาก ASW (สีส้มอำพัน amber)
- **รายจ่าย Site Minder Dynamic Revenue Plus — ทุกอาคาร:** ✨ NEW v1.12.0
  - fieldName: `siteminderExpense` — สีน้ำเงิน blue (#2563EB)
  - icon Globe, แสดงทุกอาคาร พร้อมปุ่มแก้ไข/เพิ่ม/ลด
- **ค่าแรงวันหยุดชดเชย — เฉพาะ CT/YW/NANA (read-only):** ✨ NEW v1.21.0
  - fieldName: `holidayCompensation` — สีเขียว #84A59D
  - แสดงยอดต่ออาคาร (หาร 3) — ไม่มีปุ่มกดในหน้านี้ จัดการที่หน้า `/holidays` เท่านั้น
  - รวมเข้า totalExpense → กระทบกำไร/ขาดทุน
- **รายจ่ายคืนยอดค้างจ่าย — ทุกอาคาร (read-only):** ✨ UPDATED v1.14.0
  - ดึงรายละเอียดจาก Reimbursement ที่ `isReturned=true` ตาม buildingId + paidDate เดือน/ปี
  - แสดงยอดรวมในตารางรายจ่าย (1 แถวสรุป) + ตารางรายละเอียดแยก Card สีเขียว
  - ไม่มีปุ่มแก้ไข (ข้อมูลมาจากหน้า `/reimbursements`)
  - รวมเข้า totalExpense → ส่งผลต่อกำไร/ขาดทุน
- **ตาราง "คืนยอดค้างจ่ายแล้ว" (Card สีเขียว):** ✨ NEW v1.14.0
  - แสดงรายละเอียดแต่ละรายการ: วันที่ยืมจ่าย, วันที่คืนเงิน, ชื่อเจ้าหนี้, รายละเอียด, จำนวนเงิน
  - อ้างอิงตาม paidDate (วันที่ยืมจ่าย) ให้ตรงเดือน
  - รวมในรายจ่ายแล้ว
- **ตาราง "ยอดค้างจ่ายที่ยังไม่จ่ายคืน" (Card สีส้ม):** ✨ NEW v1.14.0
  - แสดงรายการที่ยังไม่คืน: วันที่ยืมจ่าย, ชื่อเจ้าหนี้, รายละเอียด, จำนวนเงิน
  - อ้างอิงตาม paidDate (วันที่ยืมจ่าย) ให้ตรงเดือน
  - ไม่รวมในรายจ่าย (แสดงข้อมูลอย่างเดียว)
- **การ์ดสรุปยอดค้างจ่าย + ยอดที่คืนแล้ว:** ✨ NEW v1.14.0
  - การ์ดสีส้ม: ยอดค้างจ่าย (จำนวนรายการ — ไม่รวมในรายจ่าย)
  - การ์ดสีเขียว: ยอดที่คืนแล้ว (จำนวนรายการ — รวมในรายจ่ายแล้ว)
- **VIEWER role:** ไม่เห็นค่าเช่าอาคาร, เงินเดือน, ประกันสังคม, รายได้ OTA (เห็น Direct Booking+Cash, รายได้อื่นๆ, รับส่งสนามบิน, Thai Bus, Co Van Kessel) ✨ UPDATED
- **การ์ดสรุปกำไร/ขาดทุน + กราฟแท่ง** แสดงด้านบนสุด (ซ่อนสำหรับ VIEWER) ✨ NEW
  - 3 ช่องสรุป: รวมรายรับ | รวมรายจ่าย | กำไร/ขาดทุน
  - กราฟแท่ง (recharts) เปรียบเทียบ รายรับ/รายจ่าย/กำไร
  - Header เปลี่ยนสีตามสถานะ: สีทอง = กำไร, สีแดง = ขาดทุน

### 3. เงินเดือนพนักงาน (`/employees`) ✨ UPDATED v1.32.0
- เพิ่ม/แก้ไข/ลบพนักงาน
- **Summary Cards 3 ใบ:** จำนวนพนักงาน | เงินเดือนรวม+ต่ออาคาร | ประกันสังคมรวม+ต่ออาคาร
- **ตัวเลือกเดือน/ปี** ที่ Header — ควบคุมข้อมูลทั้งหน้า
- **Card แยกประเภท (read-only):** หุ้นส่วน | ผู้จัดการ | แม่บ้าน — แสดง effectiveSalary ตามเดือนที่เลือก
- **Layout 2 คอลัมน์ซ้าย-ขวา:**
  - **ซ้าย: กรอกเงินเดือนรายเดือน** — ตั้งเงินเดือนแต่ละคนแยกตามเดือน
    - **Toggle ปิด/เปิด แยกจากตัวเลขเงินเดือน** ✨ UPDATED v1.29.0 — ปิด (`isPaused=true`) = ลาออก/พักงาน ไม่นับรวม (ขีดฆ่าชื่อ); เปิด = ทำงานปกติ **ใส่ยอด 0 ได้** (เช่นพนักงานรายวันจ่ายสิ้นเดือน) แสดงป้าย "ยอด 0 (ยังทำงานอยู่)"
    - Batch save — กรอกหลายคนแล้วกดบันทึกทีเดียว (ส่งทั้งตัวเลข + สถานะปิด/เปิด)
    - Carry forward — ดึงข้อมูลเดือนก่อน (รวมสถานะ isPaused) มาแสดง auto (ป้าย "auto" สีฟ้า)
    - **Dropdown สถานะจ้างงาน (ACTIVE/RESIGNED/OUTSOURCE)** ✨ NEW v1.31.0 — เลือกใต้ชื่อพนักงาน; บันทึกทันที (POST `/api/employees/employment-status` → sync `isPaused` เดือนที่ดู one-shot ไม่ย้อนเดือนเก่า); ป้าย derive ต่อเดือนจาก `isPaused` (ลาออก=จาง, Outsource=เด่น) — ป้ายตามเดือนจริง ไม่รั่วข้ามเดือน
    - **วันเริ่มงาน / วันลาออก (work period)** ✨ NEW v1.32.0 · ✨ UPDATED v1.34.0 — date picker ใน dialog เพิ่ม/แก้พนักงาน; หน้าเงินเดือน **ซ่อน row** พนักงานที่เดือน M/Y นอกช่วง [เดือน startDate → เดือน endDate] (เทียบระดับเดือน · เข้ากลางเดือน = แสดงทั้งเดือน · null = แสดงทุกเดือน) — v1.32.0 เป็น display-filter frontend เท่านั้น; **v1.34.0 ย้าย gate ลง backend ครบ 3 endpoint** (monthly-salary/salary-summary/summary) → คนนอกช่วงหลุดจากยอดรวม + จำนวนคน + ประกันสังคมด้วย (ไม่ใช่แค่ซ่อน row)
    - **ปุ่มแก้ไขพนักงาน (ดินสอ) ต่อคน** ✨ NEW v1.32.0 — เปิด dialog แก้ไข (เดิม handleEdit เป็น dead code); โหมด edit ซ่อนช่องเงินเดือนฐานกันสับสนกับ MonthlySalary · โหมด add ยังตั้ง salary ฐานได้
  - **ขวา: เงินสมทบประกันสังคม (นายจ้าง)** — คำนวณ auto 5% ของเงินเดือน (สูงสุด 875 บาท ตามกฎหมาย 2569)
    - **หักพนักงานที่ปิด (isPaused) ออกจากยอด auto** — ให้ตรงกับ Dashboard/summary ✨ FIXED v1.29.1
    - Toggle เปิด/ปิดประกันสังคมแต่ละคน — **ปิดแล้วบันทึก amount=0 จริง** (ไม่ลบ record) เพื่อกัน carry forward ดึงค่าเดือนก่อนกลับมา ✨ FIXED v1.28.1
    - แสดงสูตร "5% × เงินเดือน" ให้เห็นที่มา
    - Carry forward — ดึง toggle จากเดือนก่อนมา auto
    - ยอดรวมหาร 3 อาคาร → แสดงที่หน้ากรอกข้อมูล auto (read-only)
- เรียงจากเงินเดือนสูง → น้อย (ทั้ง 2 ตาราง เรียงเหมือนกัน)
- **MonthlySalary model** — เก็บเงินเดือนแยกตามพนักงาน+เดือน+ปี + ฟิลด์ `isPaused` (ปิด/เปิด) ✨ UPDATED v1.29.0 (ถ้าไม่มี record fallback ไป Employee.salary)
- **Employee.employmentStatus** (enum `EmploymentStatus`: ACTIVE/RESIGNED/OUTSOURCE, default ACTIVE) ✨ NEW v1.31.0 — ป้ายถาวรระดับตัวคน; RESIGNED→`isPaused=true` เดือนที่ดู, ACTIVE/OUTSOURCE→`isPaused=false`
- **Employee.startDate + endDate** (DateTime? nullable) ✨ NEW v1.32.0 · ✨ UPDATED v1.34.0 — วันเริ่ม/ลาออก คุมการแสดงผลต่อเดือน (v1.32.0 display-filter frontend; **v1.34.0 gate ที่ backend ครบ 3 endpoint คำนวณเงินด้วย** ผ่าน helper `isInWorkPeriod`); null → แสดง/นับทุกเดือน; ไม่เชื่อม `isPaused`/`employmentStatus` (คนละ layer)

### 4. ยอดค้างจ่ายคืน (`/reimbursements`)
- ติดตามยอดเงินที่ต้องคืนให้เจ้าหนี้ (ป๊า, แบงค์, พลอย, ASW)
- เพิ่ม/แก้ไข/ลบ/คืนเงิน/ยกเลิกคืนเงิน
- **เลือกหลายอาคาร** — ยอดหารเฉลี่ยอัตโนมัติ (เช่น 3,000 ÷ 3 อาคาร = 1,000/อาคาร)
- **ตัวกรองแบบ Collapsible Chip:** ✨ UPDATED v1.12.0
  - ปุ่มกรองเรียงแถวเดียวแบบ pill: `[อาคาร]` `[เดือน]` `[เจ้าหนี้]` `[ปี]`
  - กดปุ่มแล้วกาง panel ข้างล่างเป็น chip ให้แตะเลือกหลายรายการ
  - เลือกแล้วปุ่มเปลี่ยนสีเขียวพร้อมแสดงจำนวน
  - ปุ่ม "ล้างทั้งหมด" เมื่อมี filter active
  - กรองฝั่ง client (ไม่ต้องเรียก API ใหม่ทุกครั้ง)
- **Layout 2 คอลัมน์ซ้าย-ขวา (desktop):** ✨ UPDATED v1.13.0
  - **ซ้าย:** Card ยอดค้างจ่ายรวม (แดง) + จำนวนรายการ → ตารางค้างจ่าย (มี checkbox)
  - **ขวา:** Card ยอดคืนแล้ว (เขียว) + จำนวนรายการ → ตารางคืนแล้ว (มี checkbox)
  - Mobile: ซ้อนบน-ล่าง
- **Bulk Select & Action:** ✨ NEW v1.13.0
  - เลือกหลายรายการด้วย checkbox (เลือกทั้งหมด / เลือกทีละรายการ)
  - ฝั่งค้างจ่าย: เลือกวันที่คืน + กด "คืนเงินทั้งหมด"
  - ฝั่งคืนแล้ว: แก้ไขวันที่คืนหลายรายการ + ยกเลิกคืนเงินหลายรายการ
  - Bulk Action Bar แสดงจำนวนที่เลือก + ยอดรวม
- **จัดกลุ่มตามวันที่ + แถวสรุปยอด:** ✨ NEW v1.13.0
  - ตารางค้างจ่าย: จัดกลุ่มตามวันที่ยืมจ่าย + แถวสรุปท้ายกลุ่ม (สีแดงอ่อน)
  - ตารางคืนแล้ว: จัดกลุ่มตามวันที่คืนเงิน + คอลัมน์วันที่ยืมจ่าย + แถวสรุปท้ายกลุ่ม (สีเขียวอ่อน) ✨ UPDATED v1.14.0
  - แต่ละกลุ่มแสดง: วันที่ + จำนวนรายการ + ยอดรวม
- **เฉพาะ PARTNER** (Staff/Viewer เข้าไม่ได้)

### 5. วันหยุดราชการ (`/holidays`) ✨ NEW v1.21.0
- **เฉพาะ PARTNER** (จำกัดผ่าน `PARTNER_ONLY_MENUS`)
- **Layout 2 คอลัมน์ซ้าย-ขวา** (`lg:grid-cols-2`) — มือถือยังเป็น stack
- **Section ซ้าย: รายการวันหยุดราชการ** (สีเขียว #84A59D)
  - CRUD ผ่าน Dialog (`<Input type="date">` + ชื่อ)
  - Filter ตามปี + เพิ่ม/แก้ไข/ลบ (soft delete: `isActive=false`)
  - Records inactive แสดงในตารางย่อยด้วยปุ่ม "เปิดใช้งาน"
  - Seed 19 วันหยุดราชการไทย 2026 (สามารถแก้ไข/เพิ่มได้ผ่าน UI)
- **Section ขวา: จ่ายค่าแรงวันหยุดชดเชย** (สีคอรัล #F28482)
  - Filter เดือน/ปี ที่ลงรายจ่าย
  - ปุ่ม "+ จ่ายค่าแรง" เปิด Dialog:
    - เลือกพนักงาน (MAID/MANAGER เท่านั้น — PARTNER ไม่มีค่าแรงนี้)
    - เลือกวันหยุดที่ทำงาน (Checkbox หลายวันได้)
    - เลือกเดือน/ปีที่จะลงรายจ่าย (default = filter ปัจจุบัน)
    - **Preview การคำนวณ per-holiday:** แต่ละวันแสดงฐานเงินเดือน (* = carry forward) → ยอดต่อวัน → รวม → ÷ 3 อาคาร
  - **ปุ่มแก้ไข** (ดินสอ) ในแต่ละแถว — Dialog เดียวกับเพิ่ม pre-fill ค่าเดิม → POST ใหม่ก่อน DELETE เก่า (atomicity safe)
  - **ปุ่มลบ** — ลบทั้ง group 3 อาคาร (CT/YW/NANA) พร้อมกัน
  - ตารางคอลัมน์: # | ชื่อพนักงาน | รายละเอียด (วันที่ · ชื่อวันหยุด · ฐาน → ยอด) | รวมทุกอาคาร | / อาคาร | แก้ไข/ลบ
  - มี TableFooter รวมยอดท้าย
- **สูตรการคำนวณ per-holiday:**
  - แต่ละวันหยุด: `salary_ของเดือนของวันหยุดนั้น ÷ 30 × 2`
  - รวมทุกวันหยุด → ÷ 3 อาคาร = ยอดต่ออาคาร
  - **Skip 0 + carry forward**: ถ้าเดือนของวันหยุดมี salary=0 หรือไม่มี record → ใช้เงินเดือนล่าสุดที่ > 0 ก่อนเดือนนั้น
- **บันทึกใน ExpenseHistory:**
  - 3 records (CT/YW/NANA) ต่อการบันทึก 1 ครั้ง — `groupId` เดียวกัน (ใช้ `prisma.$transaction` atomicity)
  - `targetType=SETTINGS`, `fieldName=holidayCompensation`, `actionType=ADD`
  - `description` เก็บเป็น **JSON** (v1) — มี employeeName, employeeId, holidayIds, items[date,name,salary,amount], totalAllBuildings, perBuilding (UI parse แสดงแบบจัดเรียง — fallback ไป raw text สำหรับ records เก่า)

### 6. จัดการห้อง (`/rooms`) ✨ NEW v1.22.0
- **เฉพาะ PARTNER** (จำกัดผ่าน `PARTNER_ONLY_MENUS`)
- เลือกอาคารผ่าน Select → แสดงตารางห้องของอาคารนั้น
- **Master List ที่ seed ไว้:**
  - **CT (Chinatown):** 7 ห้อง — 101, 201, 202, 301, 302, 401, 402
  - **YW (Yaowarat):** 6 ห้อง — 138A, 138B, 138AB, 140A, 140B, 140AB
  - **NANA (103 NANA):** 6 ห้อง — 1, 2, 3, 6, 7, 8
  - **FUNNLP / FUNNS81:** ไม่มีห้องแยก (แสดงข้อความ "อาคารนี้ไม่มีห้องแยก")
- **CRUD:** Dialog เพิ่ม/แก้ไข (name + note optional) — soft delete (`isActive=false`) — ปุ่ม "เปิดใช้งานอีกครั้ง" สำหรับห้องที่ถูกซ่อน
- **Schema:** model `Room` + ExpenseHistory.roomId (Int? nullable, onDelete: SetNull) — ข้อมูลเก่า `roomId=null` แสดงเป็น "—" ในประวัติ
- **ใช้กับ:** dropdown ห้องในหน้า `/transactions` — ทั้ง Daily Entry (DB+OTA), Special Income (รถรับส่ง/Thai Bus/Co Van Kessel), และ Adjust Dialog (รายได้อื่นๆ)

### 7. จัดการผู้ใช้ (`/users`)
- เพิ่ม/แก้ไข/ลบ ผู้ใช้
- กำหนด role (PARTNER/STAFF/VIEWER)
- **จัดการสิทธิ์เมนูรายผู้ใช้** — PARTNER เปิด/ปิดเมนูให้ STAFF/VIEWER ด้วย checkbox ✨ NEW v1.14.0
  - PARTNER เข้าได้ทุกเมนูเสมอ (ไม่สามารถจำกัดได้)
  - เมนู "จัดการผู้ใช้" สงวนสำหรับ PARTNER เท่านั้น
  - ถ้าไม่ได้ตั้งค่า → ใช้ค่าเริ่มต้นตาม role (กรอกข้อมูล + ตั้งค่า)
  - สิทธิ์อัพเดทอัตโนมัติโดยไม่ต้อง logout/login ใหม่ (`/api/auth/me`)
- เปิด/ปิด บัญชี

### 8. จัดการค่าใช้จ่ายส่วนกลาง (`/settings`)
- **ทั้ง Partner, Staff, และ Viewer เข้าถึงได้** (Viewer ไม่เห็นค่าเช่าอาคาร)
- **ทุก field เป็น read-only ต้องกรอกผ่านปุ่มเท่านั้น**
- **Tab ตั้งค่าอาคาร:**
  - **VAT %** - กดปุ่มแก้ไข (ดินสอ) → กรอกค่า % ใหม่ → บันทึกไป Settings table
  - **ค่าเช่าอาคาร** - กดปุ่ม +/- → กรอกรายละเอียด+จำนวนเงิน → บันทึกผ่าน ExpenseHistory (สะสมตามเดือน)
  - ~~ค่า Coway~~ - **ย้ายไปหน้า Transactions แล้ว** ✨ MOVED
- ~~**Tab ค่าใช้จ่ายส่วนกลาง:**~~ — **ลบแล้ว** ย้ายไปกรอกในหน้า Transactions แยกตามอาคาร (ไม่มี GLOBAL_SETTINGS อีกแล้ว) ✨ REMOVED
- **Tab ข้อมูลอาคาร:** แสดงข้อมูลอาคารทั้งหมด + สูตรการคำนวณ

### 9. ดาวน์โหลดรายงาน (`/reports`)
- ดูตัวอย่างรายงาน
- แสดงทุก category (แม้ค่าเป็น 0)
- รายจ่ายแสดงค่าจาก GlobalSettings พร้อมรายละเอียด
- **Export PDF (2 หน้า - Modern Corporate Design)**
  - หน้า 1: Summary Cards 8 ตัว + กราฟเปรียบเทียบ
  - หน้า 2: ตารางรายรับรายจ่าย
- พิมพ์รายงาน (เหมือน PDF)
- มี emoji ตามหมวดหมู่

### 10. ระบบ Login (`/access`)
- เลือกประเภทผู้ใช้ (หุ้นส่วน/พนักงาน)
- Login ด้วย username/password
- รหัสผ่านเข้ารหัสด้วย bcrypt

### 11. ตารางเวลางาน (`/schedule`) ✨ NEW v1.30.0
- **ฟีเจอร์วางแผน/แสดงกะการทำงานพนักงาน — display-only แยกอิสระจากระบบการเงินทั้งหมด**
  (ไม่แตะ/ไม่พึ่งพา เงินเดือน, ประกันสังคม, ค่าแรงวันหยุด, คืนยอดค้าง, summary, leave-bay)
- **สิทธิ์:** ดูได้ทุก role ที่ login (รวม VIEWER) · แก้ได้เฉพาะ PARTNER/STAFF (VIEWER ซ่อนปุ่มแก้)
- **เริ่มใช้ 1 ก.ค. 2026 (กค 2569):** สัปดาห์/วันก่อนหน้าแก้ไม่ได้ — กันทั้ง frontend
  (ปุ่มสัปดาห์ก่อน disable, เซลล์อ่านอย่างเดียว) และ **บังคับซ้ำที่ server** ทุก endpoint ที่เขียน
- **Layout สไตล์ Bitterwell:** จัดกลุ่มตาม position → แถวละคน → เซลล์ จ.–อา. (เวลา+ชม. / "หยุด" / "—")
  → คอลัมน์ ชม./สัปดาห์ + จำนวนวันหยุด
- **แม่แบบกะประจำ (ScheduleTemplate):** ตั้งกะมาตรฐาน จ.–อา. ต่อคน → เติมทุกสัปดาห์อัตโนมัติ
- **กะรายวัน (ScheduleEntry):** คลิกเซลล์ override เฉพาะวัน (กรอบเหลือง) · "กลับไปใช้แม่แบบ" = ลบ entry
- **ใส่วันหยุดอัตโนมัติ:** เลือกช่วง → preview รายการวันหยุด (ชื่อ+วันที่) ให้ยืนยันก่อน
  → ตั้งเป็นวันหยุดให้พนักงานทุกคน · **อ่านตาราง Holiday อย่างเดียว ไม่เขียน**
- **ปุ่มพิมพ์:** print CSS ซ่อนแถบเมนู/ปุ่ม
- **Schema (additive, ไม่แตะตารางการเงิน):**
  - `ScheduleTemplate` — employeeId, weekday(0=จ..6=อา), startTime/endTime("HH:mm"), isDayOff · unique(employeeId,weekday)
  - `ScheduleEntry` — employeeId, date(@db.Date, ≥2026-07-01), startTime/endTime, isDayOff, note · unique(employeeId,date)
  - FK → Employee(id) onDelete Cascade · relation field ฝั่ง Employee เป็น virtual (ไม่มี column/ALTER บนตาราง employees)
- **ไฟล์:** `src/app/schedule/{page.tsx,_ui-utils.ts}` + `src/app/api/schedule/{_utils,_auth,template,entry,week,auto-holiday}`
  · เมนู `/schedule` (default ทุก role) + Sidebar link

---

## API Endpoints

| Endpoint | Methods | คำอธิบาย | Auth |
|----------|---------|----------|------|
| `/api/auth/login` | POST | เข้าสู่ระบบ | - |
| `/api/buildings` | GET | ข้อมูลอาคาร | - |
| `/api/categories` | GET | หมวดหมู่รายรับ-รายจ่าย | - |
| `/api/transactions` | GET, PUT, DELETE | บันทึก/ดึงรายการ | Auth |
| `/api/settings` | GET, PUT | ตั้งค่าอาคาร | Auth/Partner |
| ~~`/api/global-settings`~~ | ~~GET, PUT~~ | ~~ค่าใช้จ่ายส่วนกลาง~~ — **ลบแล้ว** ใช้ ExpenseHistory แยกอาคารแทน | - |
| `/api/summary` | GET | สรุปผลประกอบการ | Auth |
| `/api/summary/history` | GET | ข้อมูลย้อนหลัง | Partner |
| `/api/employees` | GET, POST, PUT, DELETE | จัดการพนักงาน | Partner |
| `/api/employees/salary-summary` | GET | สรุปเงินเดือน (รับ ?month&year สำหรับเงินเดือนรายเดือน) | Partner |
| `/api/employees/monthly-salary` | GET, POST | เงินเดือนรายเดือนแต่ละคน (carry forward, batch save) ✨ v1.15.0 | Partner |
| `/api/users` | GET, POST, PUT, DELETE | จัดการผู้ใช้ | Partner |
| `/api/expense-history` | GET, POST | ประวัติเพิ่ม/ลดค่าใช้จ่าย — POST บันทึก `userId` จาก session + GET include `user{id,username,name}` ✨ UPDATED v1.23.0 | Auth |
| `/api/expense-history/[id]` | DELETE | ลบรายการประวัติ ✨ | Auth |
| `/api/expense-history/totals` | GET | ยอดรวมจากประวัติ (รองรับ `?groupBy=ota` คืน byOta breakdown) ✨ UPDATED v1.17.0 | - |
| `/api/ota-sources` | GET, POST | รายชื่อ OTA master (Direct, AirBNB, Booking.com, Agoda, Expedia) ✨ NEW v1.17.0 | GET=Auth / POST=Partner |
| `/api/ota-sources/[id]` | PATCH, DELETE | แก้ไข/soft-delete OTA ✨ NEW v1.17.0 | Partner |
| `/api/social-security` | GET, POST | จัดการเงินสมทบประกันสังคม ✨ | Auth |
| `/api/auth/me` | GET | ดึงข้อมูล user ปัจจุบันจาก DB (refresh allowedMenus) ✨ v1.14.0 | Auth |
| `/api/reimbursements` | GET, POST, PUT, PATCH, DELETE | จัดการยอดค้างจ่ายคืน (PATCH = bulk, GET: summary/details=returned/details=pending) ✨ | Partner |
| `/api/categories/add-payment-channels` | POST | เพิ่ม categories ใหม่ ✨ | - |
| `/api/holidays` | GET, POST | จัดการรายการวันหยุดราชการ (GET filter ?year=) ✨ NEW v1.21.0 | GET=Auth / POST=Partner |
| `/api/holidays/[id]` | PUT, DELETE | แก้ไข/soft delete (isActive=false) วันหยุด ✨ NEW v1.21.0 | Partner |
| `/api/holiday-compensation` | GET, POST | GET: list รายการค่าแรง group แบบ groupId / POST: บันทึกค่าแรง 3 records (CT/YW/NANA) per-holiday + JSON description ✨ NEW v1.21.0 | Auth/Partner |
| `/api/holiday-compensation/[groupId]` | DELETE | ลบรายการค่าแรงทั้ง group 3 อาคาร ✨ NEW v1.21.0 | Partner |
| `/api/holiday-compensation/eligible-employees` | GET | คืน employees + salaries[1..12] (skip 0 + carry forward) ของปีที่ระบุ — ใช้ใน Dialog ✨ NEW v1.21.0 | Auth |
| `/api/rooms` | GET, POST | จัดการห้องพัก (GET filter `?buildingId=&includeInactive=`) ✨ NEW v1.22.0 | GET=public / POST=Partner |
| `/api/rooms/[id]` | PUT, DELETE | แก้ไข/soft delete (isActive=false) ห้อง ✨ NEW v1.22.0 | Partner |
| `/api/schedule/template` | GET, POST, DELETE | แม่แบบกะประจำต่อคน (upsert 7 วัน) ✨ NEW v1.30.0 | GET=Auth / เขียน≠VIEWER |
| `/api/schedule/entry` | GET, POST, DELETE | กะรายวัน override (กันวันที่ <2026-07-01 ที่ server) ✨ NEW v1.30.0 | GET=Auth / เขียน≠VIEWER |
| `/api/schedule/week` | GET | ตารางทั้งทีมรายสัปดาห์ (รวมแม่แบบ+override + ชม./สัปดาห์ + วันหยุด) ✨ NEW v1.30.0 | Auth |
| `/api/schedule/auto-holiday` | GET, POST | GET=preview วันหยุด (อ่าน Holiday อย่างเดียว) / POST=ใส่วันหยุดให้พนักงาน ✨ NEW v1.30.0 | GET=Auth / POST≠VIEWER |

---

## Calculation Formulas

```
รวมรายได้         = ผลรวม INCOME categories + special income fields
รวมค่าใช้จ่าย      = ผลรวม EXPENSE (ไม่รวม "เงินเดือนพนักงาน")
                  + ค่าเช่าอาคาร (จาก Settings) + ค่า Coway
                  + เงินเดือนพนักงาน + ค่าใช้จ่ายส่วนกลาง (16 fields)
                  + เงินสมทบประกันสังคม + ค่าแรงวันหยุดชดเชย
                  + รายจ่ายให้ ASW + งานเสริม FD + คืนยอดค้างจ่าย
Gross Profit     = รวมรายได้ - รวมค่าใช้จ่าย
```

**หมายเหตุ:** ✨ UPDATED v1.21.1
- **Management Fee และ VAT ถูกยกเลิก** — Card "Net Profit (Owner)" และ "Amount to be Paid" ลบออกจาก Dashboard แล้ว
- อาคาร FUNNS81 (สุขุมวิท 81), FUNNLP (ลาดพร้าว 21) ใช้สูตรเดียวกันทั้งหมด ✨ UPDATED v1.16.0
- **เงินเดือนพนักงาน** หาร 3 อาคาร (CT, YW, NANA) — Funn D กรอกเองแยกอาคาร
- **เงินสมทบประกันสังคม** — CT/YW/NANA: คำนวณ auto จาก effectiveSalary (5%, สูงสุด 875 บาท ตามกฎหมาย 2569) หาร 3 อาคาร, Funn D: กรอกเองผ่าน ExpenseHistory ✨ UPDATED v1.15.0
- **ค่าใช้จ่ายส่วนกลาง 16 fields** — **แยกตามอาคาร** (targetType=SETTINGS, targetId=buildingId) ทุกอาคารกรอกแยกกัน ✨ UPDATED v1.11.0
- **CT/YW/NANA:** มีรายได้จาก FD เงินเดือนเมเนเจอร์แอดมิน ✨ NEW v1.11.0
- **Funn D:** มีรายจ่ายให้ ASW เงินเดือนเมเนเจอร์แอดมิน + บริการอื่นๆจาก ASW ✨ NEW v1.11.0
- **Site Minder Dynamic Revenue Plus** — ทุกอาคารกรอกแยกผ่าน ExpenseHistory ✨ NEW v1.12.0
- **ค่าแรงวันหยุดชดเชย** — เฉพาะ CT/YW/NANA — สูตร per-holiday: `Σ(salary_ของเดือนของวันหยุด ÷ 30 × 2) ÷ 3 อาคาร` (skip 0 + carry forward จากเดือนล่าสุดที่ > 0) ✨ NEW v1.21.0
- **คืนยอดค้างจ่าย (Reimbursement)** — filter ตาม column `month/year` (ไม่ใช่ `paidDate`) ทั้ง Dashboard และ /transactions ใช้ source of truth เดียวกัน ✨ FIXED v1.21.1

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

### v1.34.0 (Current - July 2026) — Backend gate startDate/endDate ครบ 3 endpoint (เงินเดือน/คน/ประกันสังคม ตรงกันทุกเดือน) ✅ DEPLOYED

ต่อยอดจาก work-period (v1.32.0) ที่เป็น **frontend display-filter** → ย้าย gate ช่วงทำงานลง
**backend ครบทั้ง 3 endpoint** ที่คำนวณเงินเดือน คนนอกช่วง [เดือน startDate → เดือน endDate]
ถูกกรองทิ้งที่ server → totalSalary / จำนวนคน / ประกันสังคม **ตรงกันเป๊ะทุก endpoint ทุกเดือน**
(ปิด Known limitation ของ v1.32.0 + v1.33.0)

- **กติกา gate** (ระดับเดือน UTC, `viewIdx = ปี*12 + เดือน`): startDate เดือนเริ่มงาน = นับ ·
  endDate เดือนทำงานวันสุดท้าย = ยังนับ (`>`) · null = ไม่จำกัดฝั่งนั้น — helper `isInWorkPeriod`
  เหมือนกันเป๊ะทั้ง 3 endpoint
- **สเต็ป 1 — monthly-salary** (commit `43b6565`): gate ที่ backend + relabel วันลาออก→ทำงานวันสุดท้าย + frontend `page.tsx`
- **สเต็ป 2 — salary-summary** (commit `88d3cb9`): helper `isInWorkPeriod` + filter ก่อน carry-forward/reduce
  · invariant `salary-summary === monthly-salary` **12/12 ผ่าน**
- **สเต็ป 3 — summary** (commit `31052bb`): gate + carry-forward + `effectiveSalaryMap`
  (ใช้ทั้งการคิดเงินเดือนรวม**และประกันสังคม**) แทน `msMap` เดิมที่ไม่มี carry-forward →
  summary ตรง monthly-salary ทุกเดือน (แก้เคส YW มิ.ย. เดิม 50,133/อาคาร → 36,800)
- **test infra** (commit `413240b`): `_reconcile.ts` recompute mirror gate+carry-forward +
  ขยาย periods ทดสอบเป็น ก.พ.–ก.ค. · `_env-guard.ts` เพิ่ม allowlist branch `broad-sea`
- **Verify:** snapshot ตรงทุกเดือน ก.พ.–ก.ค. (**พ.ค. 98,800 · มิ.ย. 110,400 · ก.ค. 85,500**;
  carry-forward มี.ค. 113,600 · เม.ย. 112,800) · invariant 12/12 · **reconcile API===recompute 240/0**
  (`EXTRA_WORK_SOURCE=legacy`) · **UI ผ่าน production ทุกเดือน**
- **ทดสอบบน Neon branch `broad-sea`** (ถ่ายจาก prod ล่าสุด) — **ไม่มี schema change ไม่ db push**
- **Deploy:** merge PR #6 → commit `b7c682c` บน master → **production** ✅
- ไฟล์: `salary-summary/route.ts`, `summary/route.ts` (แก้), `_reconcile.ts`, `_env-guard.ts` (test)
  — **ไม่แตะ** monthly-salary (เสร็จสเต็ป 1), summary/history, social-security

**Lessons learned:**
- gate ครั้งเดียว "ก่อน" carry-forward/reduce → เงินเดือน + จำนวนคน + ประกันสังคม ถูกอัตโนมัติ
  (คนนอกช่วงหลุดจาก list ที่ทุกสูตรใช้ร่วมกัน ไม่ต้องแก้จุดคิดยอดทีละจุด)
- SS ต้อง mirror ให้ครบ — ใช้ `effectiveSalaryMap` (carry-forward) ไม่ใช่ `msMap` เดิม
  ไม่งั้นคน carry-forward จะได้ประกันสังคมผิด (msMap.get เป็น undefined ตกไป default)
- reconcile ต้องรันแหล่ง fdExtra เดียวกับ dev server (`EXTRA_WORK_SOURCE=legacy`) — ไม่งั้น
  income/expense ต่างด้วยยอด "งานเสริม FD" (ไม่เกี่ยวเงินเดือน) หลอกว่า fail
- แยก commit ต่อสเต็ปที่ verify ผ่าน + push **feature branch preview** ก่อน merge
  (ไม่ push master ตรง = กัน production deploy พลาด — guard เช็ค branch ก่อน push)

**Known limitation / งานถัดไป:**
1. **invariant test 3-way — ✅ เสร็จแล้ว** (commit `1f07cab`) — `_salary-invariant.ts` ขยายจาก 2 เป็น
   **3 แหล่ง** (ss=ms=summary) เทียบที่ระดับ `salaryPerBuilding` (อาคาร CT: `expenseByCategory['เงินเดือนพนักงาน']`)
   ครบ 3 คู่ (ss=ms · ms=summary · ss=summary) + `totalSalary` ss=ms double-check → **24/24 ผ่าน**
   (6 เดือน ก.พ.–ก.ค. × 4 เช็ค) · pattern "2 fail 1 pass" (ตัวร่วมของคู่ที่ fail คือตัวที่พัง) ชี้ตัวการได้ ·
   ไม่ต้องตั้ง `EXTRA_WORK_SOURCE` (salaryPerBuilding คิดจาก MonthlySalary ล้วน ไม่ผูก extra-work)
2. ยังไม่คิดเงินครึ่งเดือนอัตโนมัติ (เข้า/ออกกลางเดือน) — Bank กรอก MonthlySalary เดือนนั้นเอง (ยกมาจาก v1.32.0)

### v1.33.0 (July 2026) — Bug fix: salary-summary คำนวณเงินเดือนรวมให้ตรง monthly-salary

แก้บั๊ก `/api/employees/salary-summary` (ตารางรายจ่าย) คำนวณเงินเดือนรวม **ไม่ตรง** กับ
`/api/employees/monthly-salary` (หน้า /employees) — เจอ 3 สูตรที่ให้ผลต่างกัน

- **ปัญหา 3 สูตรไม่ตรงกัน:**
  - `salary-summary` (ตารางรายจ่าย) — ไม่ carry-forward + ไม่เช็ค isPaused → พอไม่มี record เดือนนั้น
    ตกไปใช้ `Employee.salary` (default เก่า) → ผิดทั้ง**เกิน** (คนลาออก/paused ยังนับ) และ**ขาด** (คนขึ้นเงินเดือนได้ค่าเก่า)
  - `summary` (Dashboard) — เช็ค isPaused แต่ไม่ carry-forward → ยังเพี้ยน (**ยังไม่แก้ = งานถัดไป**)
  - `monthly-salary` (หน้า /employees) — carry-forward + isPaused ครบ = ถูกต้อง (Bank ยืนยัน)
- **แก้:** ลอก carry-forward + isPaused จาก monthly-salary มาใส่ salary-summary (branch `if month&&year`)
  → 2 endpoint ตรงกันทุกเดือน · ไม่แตะ monthly-salary/summary
- **ผลกระทบบัญชีย้อนหลัง** (salary-summary เคยเกินจริงเทียบ monthly-salary ที่ถูก — snapshot ตอน query 6 เดือน):
  ก.พ. ตรงพอดี · **มี.ค. +8,000** · **เม.ย. +8,000** · พ.ค. ตรงพอดี · **มิ.ย. +40,000** · **ก.ค. +41,000**
  ต้นเหตุ = คนลาออก/paused ที่ salary-summary ยังนับ default (อรุณ/โบตั๋น มี.ค.–เม.ย.; ป้าสิน/พี่ต้น/เติ้ล มิ.ย.–ก.ค.)
  — เผื่อย้อนดูตัวเลขเก่า (ตัวเลขปัจจุบันเปลี่ยนตามข้อมูลล่าสุด เช่น ก.ค. = 85,500 หลังรวมพนักงานใหม่ id24)
- **test ใหม่:** `_salary-invariant.ts` — invariant `salary-summary === monthly-salary` ทุกเดือน
  (coverage ที่ไม่เคยมี = เหตุที่บั๊กรอดมานาน) · **Regression 141/141 ผ่าน** (unit 31 + reconciliation 80 + live 18 + invariant 12)
- **ทดสอบบน Neon branch billowing-dawn** (ถ่ายจาก prod ล่าสุด) — **ไม่มี schema change ไม่ db push**
- ไฟล์: `salary-summary/route.ts` (แก้), `_salary-invariant.ts` (ใหม่)

**Lessons learned:**
- **regression ที่ผ่านไม่ได้แปลว่าถูกทุกสูตร** — salary-summary ไม่เคยมี test coverage เลย บั๊กเลยรอดมานานแม้ 129/129 ผ่านตลอด
- **invariant test (2 endpoint เท่ากัน) > hardcode expected** — expected values (77,000) ล้าสมัยทันทีที่ข้อมูลเปลี่ยน
  (Bank เพิ่มพนักงานใหม่ id24 กลางงาน) แต่ invariant "salary-summary === monthly-salary" จริงเสมอไม่ว่าข้อมูลเปลี่ยนยังไง
- **อย่าเชื่อ re-implementation ในสคริปต์ — ยิง endpoint จริง** (สคริปต์คำนวณเองได้ 77,000 แต่ endpoint จริง 85,500
  เพราะสคริปต์ไม่รู้จักพนักงานใหม่ที่เพิ่งเพิ่ม)
- **branch snapshot อาจ stale** — ต้องสร้าง branch สดจาก production ล่าสุดถ้าเพิ่งแก้ข้อมูล
  (เจอตอน branch billowing-dawn รุ่นแรกไม่มี record ที่ Bank เพิ่งกรอก มิ.ย.=1,800)

**Known limitation / งานถัดไป:**
1. **summary (Dashboard) ยังเพี้ยน** — เช็ค isPaused แต่ไม่ carry-forward → เงินเดือนรวมหน้า Dashboard ยังไม่ตรง
   monthly-salary บางเดือน (เช่น YW มิ.ย. 50,133/อาคาร แทน 36,800) = งานถัดไป (แก้แบบเดียวกับ salary-summary)
2. **carry-forward ไม่เช็ควันเริ่มงาน** — พนักงานที่มี startDate (คุณ K เริ่ม 24 มิ.ย.) ถูกนับเงิน (Employee.salary
   fallback/carry) ในเดือน**ก่อน**เริ่มงาน (มี.ค.–พ.ค.) ทั้งใน monthly-salary และ salary-summary — เพราะ
   work-period (v1.32.0) เป็น frontend-filter ไม่กัน backend = งานถัดไป

### v1.32.0 (July 2026) — ฟีเจอร์ใหม่: วันเริ่มงาน/วันลาออก (Work Period) — display-filter

เพิ่มช่วงทำงานพนักงาน (startDate/endDate) ซ่อนพนักงานในเดือนที่ยังไม่เริ่ม/ลาออกแล้ว —
**display-filter layer เท่านั้น ไม่แตะระบบคำนวณเงินที่ตรวจ 129 จุด**

- **schema (additive):** `Employee.startDate` + `endDate` (DateTime? nullable) — db push production:
  Employee 12 แถวได้ null ทั้งคู่, 6 ตารางที่ตรวจแถวเท่าเดิม (MonthlySalary=62, ExpenseHistory=1080)
- **backend:** monthly-salary GET ส่ง startDate/endDate; employees PUT/POST รับบันทึก — ไม่มี logic กรอง ไม่แตะ summary
- **frontend:** date picker ใน dialog + filter row ต่อเดือน (เทียบ YYYY-MM ไม่ใช่วัน)
- **เปิดใช้ปุ่มแก้ไขพนักงาน** (handleEdit เดิม dead code) + ซ่อนช่องเงินเดือนฐานโหมด edit
- **Regression 129/129 ผ่าน** (unit 31 + reconciliation 80 + live 18) — ยอดการเงินไม่เปลี่ยน
- **ทดสอบ Neon branch green-haze → db push production** (preview SQL เห็นเฉพาะ ADD COLUMN 2 ตัว nullable)

**Lessons learned:**
- filter ที่ frontend เท่านั้น = regression ผ่านแน่ (backend/summary ไม่แตะ) — แลกกับยอดรวมอาจไม่ตรง row
  ถ้าคนซ่อนมี fallback salary > 0 (Bank รับ trade-off)
- เทียบระดับเดือน (slice YYYY-MM จาก ISO) กัน timezone เพี้ยน — เข้ากลางเดือนต้องแสดงทั้งเดือน
- startDate/endDate แยก layer จาก employmentStatus/isPaused โดยสิ้นเชิง (display vs เงิน)
- **dead code ที่เปิดใช้ (handleEdit) ต้องทดสอบพฤติกรรมจริง** — แยกโหมด add(POST)/edit(PUT) ให้ถูก +
  พิสูจน์ว่าแก้คนเดิมไม่สร้างซ้ำ (Bank ลอง UI จับได้ ที่ automated test มองไม่เห็น)

**Known limitation / งานถัดไป:**
- ยังไม่คิดเงินครึ่งเดือนอัตโนมัติ (เข้า/ออกกลางเดือน) — Bank กรอก MonthlySalary เดือนนั้นเอง
- ปุ่มลบพนักงาน (handleDelete) ยัง dead code — ไม่มีปุ่มลบใน UI (นอกสเปคงานนี้)

### v1.31.0 (July 2026) — ฟีเจอร์ใหม่: สถานะจ้างงานพนักงาน (ACTIVE/RESIGNED/OUTSOURCE)

เพิ่ม dropdown เลือกสถานะจ้างงานในหน้าเงินเดือนพนักงาน — ป้ายถาวรระดับตัวคนที่คุม
`isPaused` รายเดือนเบื้องหลัง **ไม่แตะสูตรคำนวณเงินเดิม**

- **schema (additive):** enum `EmploymentStatus` + `Employee.employmentStatus` default ACTIVE —
  db push production: Employee 12 แถวได้ ACTIVE ครบ, 6 ตารางที่ตรวจแถวเท่าเดิม (ExpenseHistory=1080)
- **API ใหม่ `/api/employees/employment-status`** (POST): เปลี่ยนสถานะ + sync `isPaused` ลงเดือนที่ดู
  (one-shot ไม่ย้อนเดือนเก่า) — RESIGNED→`isPaused=true`, ACTIVE/OUTSOURCE→`isPaused=false`; ไม่แตะ salary
- **monthly-salary GET:** เพิ่ม `employmentStatus` ใน select ส่งให้ frontend
- **หน้า `/employees`:** dropdown ใต้ชื่อในการ์ดกรอกเงินเดือนรายเดือน — บันทึกทันที + reload
- **ป้าย derive ต่อเดือน (bug fix):** ป้ายอ่านจาก `isPaused` รายเดือน ไม่ใช่ `employmentStatus` ตรงๆ
  (ค่าเดียวทั้งคน) → ป้ายตามเดือนจริง ไม่รั่วโชว์ผิดเดือน (ลาออก=จาง, Outsource=เด่น)
- **Regression 129/129 ผ่าน** (unit 31/31 + reconciliation 80/80 + live 18/18) — ยอดการเงินไม่เปลี่ยน
- **ทดสอบบน Neon branch shy-rice → db push production** (preview SQL เห็นเฉพาะ CREATE TYPE +
  ADD COLUMN DEFAULT ACTIVE — ไม่มีของเกิน)

**Lessons learned:**
- ป้ายสถานะที่เก็บเป็นค่าเดียวทั้งคน (`employmentStatus`) จะรั่วข้ามเดือนถ้าโชว์ตรงๆ — ต้อง derive
  จากสถานะรายเดือน (`isPaused`) ที่ต่างกันแต่ละเดือน
- OUTSOURCE = คุณสมบัติถาวรตัวคน (`isPaused=false`) ต่างจาก RESIGNED ที่ผูกกับเดือน

**Known limitation / งานถัดไป:**
- ยังไม่มี "วันเริ่มงาน / วันลาออก" ของพนักงาน → พนักงานทุกคนแสดงในทุกเดือน (รวมเดือน**ก่อน**เข้าทำงาน
  เช่น โบตั๋น/อรุณ) — เป็นงานแยกที่ตั้งใจเลื่อนไป ต้องออกแบบเรื่องเงินครึ่งเดือน/เข้ากลางเดือนด้วย

### v1.30.1 (July 2026) — Privacy fix: หน้าตารางเวลาไม่ส่ง nickname ออกจาก API

แก้ปัญหาความเป็นส่วนตัวในหน้า `/schedule` (ทุก role เห็นได้) —
ชื่อเล่น (nickname) ของพนักงานบางคนมีข้อมูลเงินเดือนปนอยู่ (เช่น "เจมส์(กพ 21k...)")
ทำให้พนักงานเห็นเงินเดือนกันเองผ่านตารางกะ

- **ตัด `nickname` ตั้งแต่ต้นทาง API** (`/api/schedule/week`) — ลบออกจาก Prisma `select` (DB ไม่ดึงมาด้วยซ้ำ) และจาก response object → กด F12 ดู Network ก็ไม่เห็น
- **หน้า `/schedule`** เหลือแสดงแค่ ชื่อจริง + นามสกุล (ลบ field ออกจาก type + ตัดการแสดง `(nickname)`)
- **ขอบเขตแคบ:** แก้เฉพาะ 2 ไฟล์ฟีเจอร์ schedule — ไม่แตะตาราง Employee, หน้า `/employees` และหน้าเงินเดือนเดิมยังใช้ nickname ปกติ (13+5 จุด ไม่โดนกระทบ)
- **Lesson:** ข้อมูลอ่อนไหวต้องตัดที่ระดับ API (server) ไม่ใช่แค่ซ่อนที่หน้าจอ — เพราะ response ยังหลุดผ่าน DevTools/Network ได้

### v1.30.0 (July 2026) — ฟีเจอร์ใหม่: ตารางเวลางานพนักงาน (Staff Schedule) — display-only แยกจากการเงิน

เพิ่มหน้า `/schedule` วางแผน/แสดงกะการทำงานพนักงาน สไตล์ตาราง Bitterwell —
**ฟีเจอร์แสดงผล/วางแผนล้วน ไม่เกี่ยวและไม่แตะระบบคำนวณเงินใดๆ**

- **2 ตารางใหม่ (isolated):** `ScheduleTemplate` + `ScheduleEntry` — additive เท่านั้น ไม่แก้ตารางการเงิน
- **4 route ใหม่ใต้ `/api/schedule/`** (template, entry, week, auto-holiday — auto-holiday มีทั้ง GET preview และ POST) แยกอิสระ
- **display-only:** ชม./สัปดาห์ + วันหยุด เป็นตัวเลขแสดงผล ไม่ส่งเข้าเงินเดือน/OT/leave
- **ด่านวันที่ 1 ก.ค. 2026:** กันทั้ง frontend + บังคับซ้ำที่ server ทุก endpoint ที่เขียน
- **อ่าน Holiday อย่างเดียว** (ปุ่มใส่วันหยุดอัตโนมัติ ไม่เขียน/แก้ Holiday)
- **สิทธิ์:** ดูได้ทุก role (รวม VIEWER) · แก้ได้เฉพาะ PARTNER/STAFF
- **Regression 129/129 ผ่าน** (unit 31/31 + reconciliation 80/80 + live 18/18) — ยอดการเงินไม่เปลี่ยนแม้บาทเดียว
- **ทดสอบบน Neon branch ก่อน → db push production** (14 ตารางการเงินแถวเท่าเดิม, 2 ตารางใหม่เกิดที่ 0 แถว)

**Lessons learned:**
- โปรเจกต์ใช้ `prisma db push` ไม่ใช่ `migrate` → ตรวจ preview ด้วย `prisma migrate diff --from-config-datasource --to-schema` ก่อนทุกครั้ง
- Prisma 7 + driver adapter (`@prisma/adapter-pg`) · `prisma.config.ts` โหลด `.env.local` (ไม่ auto-load `.env`)
- relation field ฝั่ง Employee เป็น virtual — ไม่ ALTER ตาราง employees (preview SQL ยืนยัน)
- UX: อย่ากลืน error เงียบ — 401 ที่แสดงเป็น "ไม่มีข้อมูล" ทำให้เข้าใจผิด ต้องแยก auth/error/empty
- auto-holiday: default ช่วง=ทั้งสัปดาห์ อาจครอบวันหยุดเกินคาด → เพิ่ม preview ก่อนยืนยัน

### v1.29.1 (July 2026) — Fix: หน้าจัดการประกันสังคมนับยอด auto ไม่หัก isPaused (OBS-1)

ต่อเนื่องจาก v1.29.0 ที่เพิ่ม `isPaused` แยกสถานะ "ปิด" ออกจากตัวเลขเงินเดือน — พบว่าหน้า
"จัดการประกันสังคม" ยังคำนวณยอด auto จากเงินเดือนดิบ ไม่ได้หักคนที่ถูกปิด ทำให้เลข 2 หน้าไม่ตรงกัน

- **อาการ:** หน้าจัดการประกันสังคมแสดงยอดรวม auto (`calculatedTotal`) เกินจริง เมื่อมีพนักงาน
  ที่ถูกปิด (`isPaused=true`) แต่ยังมีประกันสังคมค้างเปิดอยู่ — ต่างจาก Dashboard/`summary` ที่หัก isPaused อยู่แล้ว
- **ต้นเหตุ:** `GET /api/social-security` สร้าง `msMap` จาก `Number(ms.salary)` โดยไม่เช็ค `isPaused`
- **วิธีแก้ (1 บรรทัด):** `msMap` ใช้ `ms.isPaused ? 0 : Number(ms.salary)` ให้ตรงกับ `summary/route.ts:285`
- **ผลกระทบ:** แก้เฉพาะยอด auto ที่ **แสดงผล** บนหน้าจัดการประกันสังคม — **ไม่กระทบ** ยอดที่บันทึกจริง,
  carry forward, หรือ Dashboard/กำไรขาดทุน (ที่คำนวณถูกอยู่แล้ว) — เลขเงินจริงไม่เปลี่ยน
- **ผลทดสอบ:** เคสจริง EMP ถูกปิด+มีประกันสังคมค้าง 875 → ยอดเก่า 2,500 (นับผิด) เป็น 1,625 ✅;
  หน้า SS ตอบสนอง isPaused เท่ากับ Dashboard แล้ว
- **ยืนยันไม่ทำของเดิมพัง (regression):** static audit 10/10, unit 31/31, reconciliation 80/80
  (5 อาคาร × 2 เดือน — ยอด summary/Dashboard ไม่เปลี่ยน), live integration 18/18, SS-fix 8/8
- **ไฟล์แก้:** `src/app/api/social-security/route.ts` (1 บรรทัด)

### v1.29.0 (June 2026) — Salary: แยกสถานะ "ปิด" ออกจากตัวเลขเงินเดือน — ใส่ 0 บาทได้โดยไม่ปิด

แก้ปัญหาที่ใส่เงินเดือน = 0 ไม่ได้ เพราะระบบเดิมตีความ "0 = ปิด" เสมอ ทำให้พนักงานรายวัน
ที่จ่ายสิ้นเดือน (เช่น โบตั๋น) ตั้งยอด 0 ชั่วคราวโดยที่ยังถือว่าทำงานอยู่ไม่ได้

- **ต้นเหตุ:** หน้าเงินเดือนมี toggle ปิด/เปิด เพียงตัวเดียวที่ผูกกับค่าตัวเลข — โค้ดเช็ค
  `isDisabledThisMonth = hasMonthlyOverride && monthlySalary === 0` จึงทำให้ยอด 0 = ปิดเสมอ
  ความหมายของ "ปิด (ลาออก/ไม่จ่าย)" กับ "ยอด 0 แต่ยังทำงาน" ถูกเหมารวมเป็นค่าเดียว
- **วิธีแก้ — เพิ่มฟิลด์ `isPaused` แยกสถานะออกจากตัวเลข:**
  - **schema:** `MonthlySalary.isPaused Boolean @default(false)` + `prisma db push` (ใช้ db push ไม่ใช่ migrate)
  - **แปลงข้อมูลเดิม (one-off script):** record ที่ `salary=0` (ความหมายเดิม = ปิด) → ตั้ง `isPaused=true`
    11 รายการ เพื่อคงหน้าตา "ปิด" เดิมไว้ ไม่ให้พลิกเป็น "0 active" โดยไม่ตั้งใจ
  - **`/api/employees/monthly-salary`:** GET ส่ง `isPaused` + คำนวณ `effectiveSalary = isPaused ? 0 : salary`
    (carry forward สืบทอด isPaused ด้วย); POST รับ `isPaused`, `salary=-1` = ลบ record (กลับ default), upsert ตัวเลขจริง (รวม 0)
  - **`/api/summary` + `/api/summary/history`:** `msMap` นับ record ที่ `isPaused` เป็น 0 (กัน record ปิดแต่มีตัวเลขค้าง)
  - **หน้า `/employees` (ฝั่งซ้าย):** แยก state `editingPaused` ออกจาก `editingMonthlySalary`;
    ปุ่ม toggle คุมปิด/เปิด, ช่องตัวเลขใส่ 0 ได้โดยไม่ปิด, ป้าย "ยอด 0 (ยังทำงานอยู่)" สีเทา, นับรายการแก้ไขรวม 2 แหล่ง
- **ทดสอบ:** สคริปต์ชั่วคราว 3 กรณี (ยอด 0+เปิด / ปิด / ยอดปกติ) ผ่านทั้งหมด แล้วลบสคริปต์ทิ้ง
- **ไฟล์แก้:** `prisma/schema.prisma`, `src/app/api/employees/monthly-salary/route.ts`,
  `src/app/api/summary/route.ts`, `src/app/api/summary/history/route.ts`, `src/app/employees/page.tsx`

### v1.28.1 (June 2026) — Fix: ปิด toggle ประกันสังคมแล้วไม่บันทึก (carry forward ดึงค่าเดือนก่อนกลับมา)

- **อาการ:** ปิด toggle ประกันสังคมของพนักงานแล้วกดบันทึก หน้าจอยังแสดงว่าเปิดอยู่เหมือนเดิม
- **ต้นเหตุ:** POST `/api/social-security` เมื่อ amount=0 จะ **ลบ record ทิ้ง** (หรือไม่สร้าง) →
  เดือนนั้น "ว่าง" → ฟีเจอร์ carry forward ใน GET ไปดึง amount ของเดือนก่อน (ที่ยัง > 0) มาแสดงว่าเปิด
- **วิธีแก้:** เปลี่ยน POST ให้ **บันทึกค่า amount=0 ไว้จริง** (upsert ไม่ลบ) → GET เจอ record แล้วหยุด carry forward
- **ไฟล์แก้:** `src/app/api/social-security/route.ts`

### v1.28.0 (June 2026) — Transactions: ขยายการ์ดรายรับเป็น 2/3 จอ แก้ช่องกรอกแคบบนโน้ตบุ๊ก 14"

แก้ปัญหา UX ที่พนักงาน (เจมส์) เจอ — ช่อง "หมายเหตุ" และ "จำนวนเงิน" ในฟอร์มกรอกรายรับ
แคบเกินไปบนโน้ตบุ๊ก 14 นิ้ว (~1366px) จนกรอกลำบาก

- **ต้นเหตุ:** การ์ด "รายรับ" และ "รายจ่าย" อยู่ใน `grid lg:grid-cols-2` (แบ่งจอครึ่ง-ครึ่ง)
  ทำให้การ์ดรายรับเหลือพื้นที่แค่ ~655px ทั้งที่ตารางกรอกรายรับมีหลายคอลัมน์
  (ไอคอน + ชื่อ + วันที่ + ห้อง + หมายเหตุ + จำนวนเงิน + ปุ่ม ≈ ต้องการ ~860px) จึงเบียดกัน
  ขณะที่การ์ดรายจ่ายมีแค่ 3 คอลัมน์ read-only ไม่ต้องการพื้นที่มาก — แบ่ง 50/50 จึงไม่สมดุล
- **วิธีแก้ (ระดับ layout ไม่แตะความกว้างช่องทีละจุด):**
  - เปลี่ยน grid wrapper จาก `lg:grid-cols-2` → `lg:grid-cols-3`
  - การ์ดรายรับเพิ่ม `lg:col-span-2` (กิน 2/3 จอ ≈ 880px เพียงพอ) — รายจ่ายเหลือ 1/3
  - เพิ่ม `overflow-x-auto` ที่ `CardContent` รายจ่าย เป็น safety net กันล้นเมื่อแคบลง
- **ผลลัพธ์:** ช่องหมายเหตุ/จำนวนเงินกรอกสบายขึ้น ไม่ต้อง scroll แนวนอน ยังเห็นรายรับ-รายจ่าย
  ข้างกันบนจอเดียว และมือถือยัง stack แนวตั้งปกติ
- **ไฟล์แก้:** `src/app/transactions/page.tsx` (3 บรรทัด)

### v1.27.0 (June 2026) — Income: เพิ่ม "ค่าทำความสะอาด Bitterwell" + "ค่าเช่าอาคารชั้น 1" (smart fallback)

เพิ่มหมวดรายได้ใหม่ 2 รายการ — ใช้ 2 pattern ต่างกันตามคุณสมบัติ ค่าคงที่ทั้งหมดอยู่ที่
`src/lib/income-defaults.ts` (แก้ที่เดียวเพื่อปรับยอด default หรือ eligible buildings)

- **ค่าทำความสะอาด Bitterwell** — Generic Income Category + UI gate
  - เพิ่ม Category row (`type=INCOME`, name="ค่าทำความสะอาด Bitterwell") ผ่าน `prisma/add-income-categories.ts`
    (script idempotent ใช้ `findFirst` + `create` — ไม่ลบ categories เดิม)
  - UI gate ใน `otherIncomeCategories.filter()` — แสดงเฉพาะ CT/YW/NANA (ซ่อนจาก FUNNLP/FUNNS81)
  - Bitterwell เป็นผู้จ่ายค่าทำความสะอาดให้เรา (เป็นรายได้)
  - Summary route ทำงานอัตโนมัติผ่าน generic flow — ไม่ต้องแก้ backend
- **ค่าเช่าอาคารชั้น 1** — Special Field `floor1RentIncome` (pattern เดียวกับ coVanKesselIncome) — เฉพาะ NANA
  - **Smart fallback ใน summary** — ถ้า NANA เดือนนั้นไม่มี record ใน ExpenseHistory ใช้ค่า default 23,000 อัตโนมัติ
    (ผู้ใช้ไม่ต้องกรอกทุกเดือน) ถ้ามี record ใช้ยอดจริง override default
  - **UI Card สี amber** — render เฉพาะ NANA, prefill input 23,000 (แก้ก่อนบันทึกได้), badge "ค่าเริ่มต้น" ถ้ายังไม่มี record
  - **ไม่มี dropdown ห้อง** — เพิ่ม optional param `skipRoom` ใน helper `saveSpecialIncome` เพื่อข้าม validation roomId
    (รายได้ระดับอาคาร ไม่ผูกห้อง)
  - แสดงใน `incomeByChannel["ค่าเช่าอาคารชั้น 1"]` ใน summary route + summary/history route
- **Constants ที่ `src/lib/income-defaults.ts`:** `FLOOR1_RENT_DEFAULT=23000`, `FLOOR1_RENT_ELIGIBLE_BUILDINGS=['NANA']`,
  `BITTERWELL_ELIGIBLE_BUILDINGS=['CT','YW','NANA']`, `BITTERWELL_CATEGORY_NAME`, `FLOOR1_RENT_CHANNEL_NAME`, `FLOOR1_RENT_FIELD_NAME`
- **ไฟล์แก้:** `src/lib/income-defaults.ts` (new), `prisma/add-income-categories.ts` (new),
  `src/app/api/summary/route.ts`, `src/app/api/summary/history/route.ts`, `src/app/transactions/page.tsx`

### v1.26.0 (May 2026) — Holiday: auto-sync ExpenseHistory หลังจ่าย + fix double-count

ปิด accounting gap จาก v1.24.0 — รายการที่จ่ายผ่าน flow ใหม่ตอนนี้บันทึกลง `ExpenseHistory`
ของ aswreport อัตโนมัติ ทำให้รายงาน `/summary` ช่อง "ค่าแรงวันหยุดชดเชย" รวมยอดถูก

- **Auto-sync ExpenseHistory ใน `POST /api/holidays/pay`** (best-effort, ไม่ rollback):
  - หลัง leave-bay `/pay` success → เรียก `GET /api/public/compensatory/history`
    (filter `startDate=today` + `employeeId` hint เพื่อลด payload) → ดึง details ของ records ที่จ่าย
  - คำนวณ `perBuilding = totalAllBuildings / 3` (precise Decimal — ไม่ปัด)
  - สร้าง `description` JSON เหมือนระบบเก่า + เพิ่ม flag `syncedFromLeaveBay: true` + `paidAt` timestamp
  - INSERT 3 records ใน `prisma.$transaction` (CT/YW/NANA จาก `code IN (...)` — ไม่ hardcode id)
  - **ถ้า fail (history/buildings/INSERT)** → return success + `warning` field พร้อม details ครบ
    (employeeName, totals, items[], groupId) ให้ user copy ไปกรอกมือ — ไม่ rollback leave-bay
- **Frontend `handlePayConfirm`**:
  - ส่ง `employeeId` ของ leave-bay ใน body (ลด payload ฝั่ง backend)
  - ตรวจ `data.warning` → format text → copy ไป `navigator.clipboard` → DOM toast amber 12 วินาที
    พร้อมข้อความ "✓ คัดลอกรายละเอียดไปคลิปบอร์ดแล้ว"
  - ขยาย `notify()` รองรับ variant `'warning'` (`#d97706`) + custom `durationMs` + click-to-close
- **Fix double-count ใน `dashboard-summary`** (commit ตามมาทันที):
  - หลัง auto-sync — record เดียวกันถูกนับ 2 ที่: leave-bay history (`paidAt`) + aswreport ExpenseHistory
    → Card "จ่ายแล้วเดือนนี้" แสดงผิด (e.g. 20,000 แทน 13,466.67)
  - แก้: เพิ่ม where clause `description: { not: { contains: '"syncedFromLeaveBay":true' } }`
    ใน query ExpenseHistory → DB-side filter (NOT LIKE) — ไม่ false-positive
    เพราะ string รวม quote คู่ของ key มาจาก `JSON.stringify` เท่านั้น
  - กระทบเฉพาะ Card 2 (paidThisMonth) + Card 3 (paidThisYear) — Card 1/4 ไม่ใช้ ExpenseHistory
- **ผลลัพธ์ลำดับใหม่:**
  - User กดยืนยันจ่ายเงิน → leave-bay mark `isPaid` → aswreport INSERT 3 records
  - Card "จ่ายแล้วเดือนนี้" รวม yอดจากแหล่งเดียว (leave-bay history filter `paidAt` ในเดือน) — ไม่ซ้ำ
  - หน้า `/summary` ช่อง "ค่าแรงวันหยุดชดเชย" รวมยอด ExpenseHistory (รวม synced records) ปกติ
- **ไฟล์แก้:** `src/app/api/holidays/pay/route.ts`, `src/app/holidays/page.tsx`, `src/app/api/holidays/dashboard-summary/route.ts`

### v1.25.0 (May 2026) — Holiday Phase B: 4 tabs + summary cards + ประวัติการจ่ายรวม 2 แหล่ง

ขยายหน้า `/holidays` จาก Phase A ให้เป็น dashboard เต็มรูปแบบ — ปิด accounting gap
ที่เปิดไว้ใน v1.24.0 (รายการจ่ายผ่าน flow ใหม่ไม่นับเข้ารายงาน) โดยสร้างหน้า
"ประวัติการจ่าย" ที่รวมข้อมูลจากทั้ง leave-bay (ระบบใหม่) และ ExpenseHistory (ระบบเก่า) ใน UI เดียว

- **Backend proxy 2 routes ใหม่:**
  - `GET /api/holidays/history` — forward query (`startDate`/`endDate`/`employeeId`) ไป leave-bay
    `/api/public/compensatory/history` (เพิ่งเปิดฝั่ง leave-bay พร้อม wrapper `{success, records, summary}` และ field `paymentMethod`, `paymentReference`, `paidByName`, `paidAt`, `paidOtAmount` — parse จาก note สำเร็จฝั่ง leave-bay)
  - `GET /api/holidays/dashboard-summary` — รวม 3 sources ใน server-side ครั้งเดียว
    (leave-bay pending + leave-bay history ทั้งปี + Prisma `ExpenseHistory`
    `fieldName=holidayCompensation`) คืนยอดของ 4 cards ใน response เดียว ลด round-trip
- **UI: refactor หน้า /holidays เป็น 4 tabs** (shadcn `Tabs`):
  - "รายการวันหยุด" — Section 1 เดิม (เพิ่ม/แก้/ลบวันหยุดราชการ)
  - "รอจ่ายเงิน" — เปิด Dialog ของ Phase A (`openPayDialog`)
  - "ประวัติการจ่าย" — Section A (ระบบใหม่) + Section B (ระบบเก่า opacity 0.85) แต่ละ section
    มี pagination 20 rows · filter bar: เดือน/ปี/พนักงาน/ที่มา (ทั้งหมด/ระบบใหม่/ระบบเก่า)
    · employee dropdown derive จาก records (Thai-locale sort) · ระบบเก่า match ด้วยชื่อ
    · pill สี payment method (PromptPay น้ำเงิน / เงินสด เขียว / โอน ม่วง)
  - "รายงาน" — placeholder "Coming soon"
- **Summary cards 4 ใบ ด้านบนของหน้า:**
  - "รอจ่าย" (amber) — `pendingTotal` + "X พนักงาน · Y วัน"
  - "จ่ายแล้วเดือนนี้" (green) — รวม leave-bay history (filter `paidAt`) + ExpenseHistory
    (filter `month`) — "ใหม่ X + เก่า Y" breakdown
  - "จ่ายแล้วปีนี้" (กลาง) — เหมือน Card 2 filter ทั้งปี
  - "พนักงานค้างจ่าย" (กลาง) — จำนวน + "เฉลี่ย Z บาท/คน"
- **Refresh hooks หลังกดยืนยันจ่ายเงิน** — เรียก `Promise.all([loadPayEmployees, loadDashboard, loadHistory])` พร้อมกัน
  → summary cards + tab "ประวัติการจ่าย" + dropdown พนักงาน อัปเดต realtime
- **ไม่แตะ:** Phase A flow ของการจ่ายเงิน + schema + `/api/holiday-compensation/*` + ระบบนอก `/holidays`
- **ไฟล์ใหม่:** `src/app/api/holidays/history/route.ts`, `src/app/api/holidays/dashboard-summary/route.ts`
- **ไฟล์แก้:** `src/app/holidays/page.tsx` (refactor ใหญ่ — 4 tabs + summary + history tab)

### v1.24.0 (May 2026) — Holiday compensation: ดึงรายการค้างจ่ายจริงจาก leave-bay

แก้บั๊กที่ Dialog "จ่ายค่าแรง" ใน `/holidays` แสดงวันหยุดราชการ**ทั้งปี**ของระบบ แทนที่จะแสดงเฉพาะวันที่พนักงานคนนั้นมาทำงานจริง (เพราะ aswreport schema ไม่มี relation `Employee ↔ Holiday`)

- **Source of truth:** leave-bay (https://leave-bay.vercel.app) เก็บข้อมูลจริง — เปิด public API ใหม่ 3 endpoints ภายใต้ `/api/public/compensatory/*` ใช้ key เดียวกับ v1.18.0 (`ASWREPORT_SHARED_API_KEY`)
- **Architecture (aswreport):** browser ไม่เรียก leave-bay ตรง — ผ่าน proxy 3 routes:
  - `GET /api/holidays/employees-with-pending` → list พนักงานที่มีรายการค้างจ่าย
  - `GET /api/holidays/pending/[employeeId]` → list records ของพนักงานคนนั้น
  - `POST /api/holidays/pay` → mark `isPaid=true` ใน leave-bay
- **Helper `src/lib/leave-bay-client.ts`:** wrapper `fetch()` อ่าน env `LEAVE_API_BASE_URL` + `LEAVE_SHARED_API_KEY` (ตัวเดียวกับ extra-work-sync), header `x-api-key`, timeout 10s, error mapping (401 → 500 "API key ผิด", 5xx/network → 503 "เชื่อมต่อ leave-bay ไม่ได้")
- **UI Dialog ใหม่:**
  - dropdown พนักงาน "ชื่อ — N วัน, X.XX บาท" (เฉพาะที่มี pending > 0)
  - ตาราง 4 คอลัมน์: checkbox / วันที่ / ชื่อวันหยุด / ยอดเงิน — default ติ๊กทุกแถว + checkbox header "เลือก/ยกเลิกทั้งหมด" + ยอดรวม realtime + ตัวนับ "(เลือก/รายการ)"
  - ช่องกรอก: ชื่อผู้อนุมัติ (required) / วิธีจ่าย (PromptPay/เงินสด/โอน) / เลขอ้างอิง (optional)
  - confirm dialog ก่อนยิง POST + DOM toast (เขียว success / แดง error) + error code mapping (`ALREADY_PAID` → "รายการนี้จ่ายไปแล้ว", `RECORD_NOT_FOUND`, `RECORD_EXPIRED`)
  - หลัง success → refresh dropdown + reload records ของพนักงานปัจจุบัน (หรือ reset ถ้าจ่ายหมด)
- **ไม่แตะ:** schema (`Holiday` table) + Section 1 (รายการวันหยุดราชการ) + `/api/holidays/*` + `/api/holiday-compensation/*` — ตาราง hcItems ใน Section 2 ยังแสดง + ลบรายการเก่าได้ (ลบเฉพาะปุ่ม "แก้ไข" — ระบบใหม่ไม่ลง `ExpenseHistory` ดังนั้นการแก้ไม่มีความหมาย)
- **ผลกระทบ accounting:** รายการที่จ่ายผ่าน flow ใหม่ **ไม่ลง** `ExpenseHistory` ของ aswreport — ไม่นับเข้ารายงานสรุป (`/summary`) ระบบ Phase B (paused) จะเพิ่ม tab "ประวัติการจ่าย" + summary cards ที่รวม 2 แหล่ง (leave-bay history + ExpenseHistory เดิม) — ดู `plans/holidays-cuddly-umbrella.md`
- **ไฟล์ใหม่:** `src/lib/leave-bay-client.ts`, `src/app/api/holidays/employees-with-pending/route.ts`, `src/app/api/holidays/pending/[employeeId]/route.ts`, `src/app/api/holidays/pay/route.ts`
- **ไฟล์แก้:** `src/app/holidays/page.tsx`

### v1.23.0 (May 2026) — Audit log: แสดงผู้กรอก + เวลาบันทึก ในตารางตรวจสอบ

เพิ่ม audit log ในระบบกรอกข้อมูล เพื่อให้หุ้นส่วนเช็คได้ว่าใครทำอะไรตอนไหน:

- **Schema:** เพิ่ม `ExpenseHistory.userId` (Int?, nullable) + relation `User` + `@@index([userId])` — ใช้ `npx prisma db push` apply กับ production
- **API:**
  - POST `/api/expense-history` บันทึก `userId` จาก session ที่ login ทุกครั้ง (จาก `requireMenuAccess('/transactions')` ที่ return AuthUser)
  - GET include `user { id, username, name }` ใน response (พร้อม `otaSource`, `room`)
- **UI Dialog "ตรวจสอบ":**
  - เปลี่ยนคอลัมน์สุดท้าย "รายละเอียด" → "ผู้กรอก / เวลาบันทึก" แสดง 2-3 บรรทัด:
    - บรรทัด 1: ชื่อผู้กรอก (`user.name` หรือ `user.username` หรือ "—" สำหรับ rows เก่า)
    - บรรทัด 2: timestamp `DD/MM/YYYY HH:mm` จาก `createdAt`
    - บรรทัด 3: หมายเหตุที่ user กรอกเอง (เฉพาะที่ไม่ใช่ default "กรอกข้อมูลรายวัน - YYYY-MM-DD")
  - แก้ format วันที่คอลัมน์แรก `YYYY-MM-DD` → `DD/MM/YYYY` ให้เข้ากัน
- **ข้อจำกัด:** rows เก่า 837 รายการ (ธ.ค. 2025 - 18 พ.ค. 2026) ไม่มี userId เพราะ schema เดิมไม่มี column นี้ → แสดง "—" ตามที่ตกลงกับผู้ใช้ (ไม่ bulk update เป็นข้อมูลปลอม)
- **ไฟล์แก้:** `prisma/schema.prisma`, `src/app/api/expense-history/route.ts`, `src/app/transactions/page.tsx`

### v1.22.6 (May 2026) — ป้องกันบั๊ก "กดบันทึกแล้วเงียบ" ในหน้า Transactions

แก้บั๊กชุดใหญ่ที่ทำให้ผู้ใช้กดบันทึกในหน้า `/transactions` แล้วไม่มีอะไรเกิดขึ้น (validation error ถูก browser ระงับ + ปุ่มไม่มี visual feedback):

- **Permission API ผิด:** `POST` และ `DELETE` ของ `/api/expense-history` เรียก `requireMenuAccess('/settings')` ทั้งที่ฟอร์มอยู่หน้า `/transactions` — Partner ผ่านได้ แต่ Staff/Viewer ที่ admin set `allowedMenus` ไม่มี `/settings` จะถูก 403 → เปลี่ยนเป็น `requireMenuAccess('/transactions')`
- **`window.alert()` ถูก browser ระงับ:** Chrome/Edge มี feature *"Prevent this page from creating additional dialogs"* — ถ้าผู้ใช้เผลอติ๊ก alert จะหายไปทั้ง tab → เปลี่ยน `notify()` helper จาก `window.alert()` เป็น **DOM toast สีแดงมุมขวาบน** ที่ append เข้า `document.body` + auto-remove หลัง 4 วินาที (browser ระงับไม่ได้)
- **แทนที่ `alert()` 32 จุดในไฟล์ด้วย `notify()`** + เพิ่ม `console.warn('[transactions]', msg)` ทุกครั้ง เพื่อ debug จาก DevTools ได้
- **Visual hint ช่องห้อง:**
  - SelectTrigger ของช่อง "ห้อง" → กรอบสีแดง + ring (`border-red-400 ring-1 ring-red-200`) เมื่อยังไม่ได้เลือก
  - Placeholder เปลี่ยนจาก "ห้อง" → "เลือกห้อง *" บอกว่าจำเป็น
- **ปุ่ม "บันทึก" disabled เมื่อขาดห้อง:** ทุกปุ่มใน Direct Booking CHANNEL, OTA monthly, รายได้พิเศษ 3 รายการ — `disabled={saving || (buildingHasRooms && !input.roomId && !key.startsWith('DB:'))}` + `title="กรุณาเลือกห้องก่อนบันทึก"` (skip key ที่ขึ้นต้น 'DB:' เพราะ row นั้นไม่มีช่องห้อง)
- **อาคารที่ได้รับผลกระทบ:** ARUN SA WAD ทั้ง 3 อาคาร (NANA, CT, YW) บังคับเลือกห้อง — Funn D 2 อาคาร (FUNNLP, FUNNS81) ไม่มีห้อง ปุ่มทำงานปกติ
- **ไฟล์แก้:** `src/app/api/expense-history/route.ts`, `src/app/api/expense-history/[id]/route.ts`, `src/app/transactions/page.tsx`

### v1.22.5 (May 2026) — แก้บั๊ก toggle ปิดตอนพิมพ์เงินเดือนหลังเปิดกลับ

แก้บั๊กในหน้า `/employees` ที่ทำให้ไม่สามารถกรอกเงินเดือนให้พนักงานที่เคยถูก "ปิดเงินเดือน" ได้:

- **อาการ:** พนักงานที่มี monthlySalary = 0 (ปิดเงินเดือนไว้) — เมื่อกด toggle เพื่อเปิดกลับมาแก้ไข พอเริ่มพิมพ์ตัวเลขจริง input ถูก disable ทันที (toggle ปิดตัวเอง)
- **สาเหตุ:** logic `showAsDisabled` เดิมพึ่ง `editingMonthlySalary[id] === '-1'` เป็นตัวกำหนดว่ากำลัง "เปิดกลับ" — พอ user พิมพ์เลขจริง state เปลี่ยนจาก `'-1'` เป็น `'5'` เงื่อนไขจึง false ทันที → กลับไป disabled
- **แก้ไข:** เปลี่ยน logic เป็น "ถ้า isEditing ให้ดูแค่ค่าใน state ว่าเป็น `'0'` หรือไม่ — ค่าอื่นๆ ทั้งหมดถือว่าเปิด" ไม่ดู isDisabledThisMonth จาก DB ระหว่างแก้ไข
- **ผลกระทบ:** Partner สามารถกรอกเงินเดือนให้พนักงาน OUTSOURCE (เช่น มะแพง) ที่เคยถูกปิดเงินเดือนไว้ได้ตามปกติ
- **ไฟล์แก้:** `src/app/employees/page.tsx` (3 บรรทัด)

### v1.22.4 (May 2026) — Format วันที่ DD/MM/YYYY + reset state หลังบันทึก

ปรับ UX การกรอกข้อมูลให้สะอาดและพร้อมใช้งานครั้งถัดไปทันที:

- **Date picker — แสดง format DD/MM/YYYY:**
  - HTML `<input type="date">` ปกติแสดง format ตาม locale (เช่น mm/dd/yyyy หรือ yyyy-mm-dd)
  - สร้าง `<DateBox>` component ใหม่: readonly text input แสดง `DD/MM/YYYY` + ซ่อน native date picker ไว้ click → เปิดผ่าน `el.showPicker()` (HTML5 API ที่ Chrome/Edge/Firefox รุ่นใหม่รองรับ)
  - ไม่ต้องเพิ่ม dependency (ไม่ใช้ react-day-picker / date-fns)
  - Helper `formatDDMMYYYY(iso)` แปลง `YYYY-MM-DD` → `DD/MM/YYYY`
- **Reset state หลังบันทึก:**
  - Daily Entry (DB/CHANNEL/OTA) และ Special Income (รถรับส่ง/Thai Bus/Co Van Kessel) — เดิมเก็บ `day` กับ `roomId` ไว้หลังบันทึก
  - ใหม่: reset ทุก field → `{ day: today, amount: '', roomId: '', note: '' }`
  - พนักงานพร้อมกรอกครั้งถัดไป — dropdown ห้องกลับเป็น placeholder "ห้อง", date กลับเป็นวันนี้
- **จุดที่ใช้ DateBox:** Direct Booking 4 ช่องทาง / OTA monthly 5 รายการ / รถรับส่งสนามบิน / Thai Bus Tour / Co Van Kessel — รวม 5 sections (และ DB matrix branch ที่ยังคงโค้ดไว้สำหรับอนาคต)
- **ไฟล์แก้:** `src/app/transactions/page.tsx`

### v1.22.3 (May 2026) — เพิ่ม date picker ให้ OTA + รายได้พิเศษ

ขยาย date picker (ที่มีใน Direct Booking อยู่แล้ว) ให้กับทุก section ของรายได้รายวัน เพื่อให้พนักงานระบุวันที่จริงได้:

- **กรอกข้อมูลรายเดือน — OTA** (5 OTA: Agoda/Booking/AirBnB/Trip/Expedia):
  - เพิ่ม `<Input type="date">` ในแต่ละแถวระหว่างชื่อ OTA และ dropdown ห้อง
  - บังคับเลือกวันที่ก่อนบันทึก
  - บันทึกเข้า ExpenseHistory ด้วย `day/month/year` จากวันที่ที่เลือก (เดิม `day=null`, ใช้ month/year ของหน้าหลัก)
- **รายได้พิเศษ 3 รายการ** (รถรับส่งสนามบิน / Thai Bus Tour / Co Van Kessel):
  - เพิ่ม date picker เหมือน OTA — ตำแหน่งระหว่างชื่อรายการและ dropdown ห้อง
  - `saveSpecialIncome` parse `input.day` เป็น `day/month/year` ก่อน POST
- **saveDailyEntry refactor:**
  - รวม branch `OTA` กับ `DB`/`CHANNEL` — ทุก group ใช้ date picker เหมือนกัน
  - description default เปลี่ยนเป็น `กรอกข้อมูลรายวัน - YYYY-MM-DD` ทุก group
- **Backward-compatible:** entry เก่าที่มี `day=null` ยังแสดงในประวัติได้ (fallback ไป `createdAt`)
- **ไฟล์แก้:** `src/app/transactions/page.tsx`

### v1.22.2 (May 2026) — Inline form สำหรับรายได้พิเศษ 3 รายการ

ปรับ UI ของ "รายได้ค่าเช่า รถรับส่งสนามบิน / Thai Bus Tour / Co Van Kessel" จากรูปแบบ "ปุ่ม +/-/edit เปิด dialog" เปลี่ยนเป็น **inline form** เหมือน "กรอกข้อมูลรายเดือน — OTA" เพื่อให้รูปแบบการกรอกสอดคล้องกันทั้งหน้า:

- **UI ใหม่ของแต่ละรายการ** (1 แถวต่อรายการ):
  - ชื่อรายการ + ยอดรวมเดือน
  - Dropdown "ห้อง" (เฉพาะอาคารที่มีห้อง — FUNN ไม่แสดง column นี้)
  - Input "หมายเหตุ" (optional)
  - Input "จำนวนเงิน"
  - ปุ่ม "บันทึก" + "ตรวจสอบ"
- **ลบ:** ปุ่ม `Pencil` (edit), `Plus` (add), `Minus` (subtract) ที่เปิด Adjust Dialog ออก — ใช้ form ในแถวเดียวกันแทน
- **Helper functions ใหม่:**
  - `saveSpecialIncome(fieldName, fieldLabel)` — POST `/api/expense-history` แบบเดียวกับ Daily Entry แต่รับ field-based fieldName (string เช่น `airportShuttleRentIncome`) ไม่ใช่ category id
  - `openSpecialHistory(fieldName, titleSuffix)` — เปิด dialog ประวัติเดียวกับ Daily Entry, query โดย fieldName ตรงๆ ไม่ผ่าน category lookup
- **ใช้ state เดียวกันกับ Daily Entry** — `dailyEntryInputs[\`SPECIAL:\${fieldName}\`]` รองรับ `roomId` + `note` + `amount` ที่มีอยู่แล้ว (ไม่ใช้ `day` เพราะรายการเหล่านี้เป็นรายเดือน)
- **บังคับเลือกห้อง** — สำหรับ CT/YW/NANA, ถ้าไม่ได้เลือก → alert "กรุณาเลือกห้องก่อนบันทึก" เหมือน Direct Booking/OTA
- **ผลกระทบ:** Adjust Dialog ยังคงใช้กับ category-based income/expense อื่นๆ (รายได้อื่นๆ, ค่าเช่าอาคาร, salary etc.) ไม่กระทบ
- **ไฟล์แก้:** `src/app/transactions/page.tsx`

### v1.22.1 (May 2026) — เพิ่มหมายเหตุ Daily Entry + ห้องใน Adjust Dialog

ขยายฟีเจอร์ห้องและเพิ่มความยืดหยุ่นในการกรอกข้อมูล:

- **Daily Entry — เพิ่มช่อง "หมายเหตุ":**
  - หน้า `/transactions` ทั้ง section "กรอกข้อมูลรายวัน — Direct Booking" (4 ช่องทาง) และ "กรอกข้อมูลรายเดือน — OTA" (5 OTA)
  - เพิ่ม `<TableCell>` ใหม่ระหว่าง room dropdown และ amount — Input ข้อความ optional
  - ถ้ากรอกหมายเหตุ → ใช้แทน auto description (`กรอกข้อมูลรายวัน - YYYY-MM-DD`)
  - ถ้าเว้นว่าง → ใช้ auto description เดิม (backward-compat 100%)
  - หลังบันทึก: clear `amount + note` เก็บ `day + roomId` ไว้ (ลด friction การกรอกซ้ำ)
- **State change:**
  - `dailyEntryInputs` shape: เพิ่ม `note: string` → `{ day, amount, roomId, note }`
  - `setDailyInputField` รับ field `'note'` ด้วย
- **Adjust Dialog — เพิ่ม dropdown "ห้อง" (สำหรับ "รายได้อื่นๆ" และทุก section ที่ใช้ dialog นี้):**
  - หน้า `/transactions` ส่วน "รายได้อื่นๆ" (รวมถึง รับส่งสนามบิน / Thai Bus Tour / Co Van Kessel ฯลฯ) เปิด Adjust Dialog เพื่อกรอก
  - เพิ่ม Select "เลือกห้อง" ในตัว dialog (ไม่บังคับ — เลือกหรือไม่เลือกก็ได้)
  - แสดงเฉพาะอาคารที่มีห้อง (`buildingHasRooms`) — FUNN ไม่แสดง
  - description ในตัว dialog ยังบังคับเหมือนเดิม (ผู้ใช้กรอกเองอยู่แล้ว)
  - state ใหม่: `adjustRoomId: string` — reset ใน `openAdjustDialog`, ส่งใน POST body ของ `handleAdjustConfirm`
- **API expense-history:**
  - ไม่ต้องแก้ — POST รับ `roomId` จาก v1.22.0 อยู่แล้ว ทั้ง daily entry และ adjust dialog ใช้ field เดียวกัน
- **ไฟล์แก้:** `src/app/transactions/page.tsx`

### v1.22.0 (May 2026) — เพิ่มระบบ "ห้อง" ให้พนักงานเลือกตอนกรอกข้อมูล

เพิ่มมิติ "ห้อง" (Room) ในการบันทึกรายได้รายวัน/รายเดือน เพื่อให้ track ได้ว่ายอดของห้องไหน:

- **ฟีเจอร์ใหม่:**
  - **Schema:** เพิ่ม model `Room` (id, buildingId, name, note, order, isActive, timestamps) — `@@unique([buildingId, name])` — relation `Building hasMany Room` + `ExpenseHistory.roomId Int?` (nullable, onDelete: SetNull) เก็บข้อมูลเก่าที่ยังไม่มี roomId เป็น null
  - **API ใหม่:**
    - `/api/rooms` GET (public, filter `?buildingId=&includeInactive=`) / POST (Partner)
    - `/api/rooms/[id]` PUT / DELETE (Partner, soft delete `isActive=false`)
  - **Seed:** `prisma/seed-rooms.ts` — 19 ห้องใน 3 อาคาร (CT: 7, YW: 6, NANA: 6) — idempotent ผ่าน upsert
  - **Menu:** เพิ่ม `/rooms` ใน `MENU_ITEMS` + `PARTNER_ONLY_MENUS` + `DEFAULT_MENUS_BY_ROLE.PARTNER` + Sidebar (icon `DoorOpen`)
  - **หน้า `/rooms` (Partner only):**
    - เลือกอาคารผ่าน Select → ตารางห้อง (name + note + ปุ่ม edit/delete)
    - Dialog "+ เพิ่มห้อง" / "แก้ไขห้อง" — รองรับ note (textarea optional)
    - Soft delete: ห้องถูกซ่อนจาก dropdown แต่ประวัติเก่ายังอยู่ — มีปุ่ม "เปิดใช้งานอีกครั้ง"
    - **อาคาร FUNN** (FUNNLP/FUNNS81): แสดงข้อความ "อาคารนี้ไม่มีห้องแยก" — ไม่มีตาราง/ปุ่มเพิ่ม
- **ผลกับหน้า `/transactions`:**
  - เพิ่ม dropdown "เลือกห้อง" ในทุกแถวของ "กรอกข้อมูลรายวัน — Direct Booking" (4 ช่องทาง) และ "กรอกข้อมูลรายเดือน — OTA" (5 OTA)
  - ดึงห้องผ่าน `useEffect` เมื่อ `selectedBuilding` เปลี่ยน (`/api/rooms?buildingId=`)
  - Helper `buildingHasRooms` = `code !== '' && !['FUNNLP', 'FUNNS81'].includes(code)` — ใช้แสดง column และ validate
  - **Validation ตอนบันทึก:** ถ้า `buildingHasRooms` แต่ไม่ได้เลือกห้อง → alert "กรุณาเลือกห้องก่อนบันทึก"
  - Dialog "ตรวจสอบ" เพิ่ม column "ห้อง" (ดึงจาก `entry.room?.name` — fallback "—" สำหรับ entry เก่าก่อนเพิ่มฟีเจอร์)
- **State + types:**
  - `dailyEntryInputs` shape เพิ่ม `roomId: string` — `setDailyInputField` รับ field `'roomId'`
  - `interface ExpenseHistoryItem` เพิ่ม `roomId?: number | null` + `room?: { id, name, buildingId } | null`
- **API expense-history:**
  - POST destructure `roomId` + ใส่ใน `prisma.expenseHistory.create({ data: { ..., roomId: roomId ? parseInt(roomId) : null } })`
  - GET include `room: true` (เดิม include แค่ `otaSource`)
  - ไม่กระทบ logic ยอดรวม — `/api/expense-history/totals` ไม่ filter ตาม roomId (ยังรวมทุกห้องเข้าด้วยกันเหมือนเดิม)
- **ข้อมูลเก่า (ก่อนเพิ่มฟีเจอร์):**
  - `roomId = NULL` — ไม่ migrate ย้อนหลัง
  - แสดงเป็น "—" ใน column "ห้อง" ของ dialog ตรวจสอบ
- **ไฟล์ใหม่:** `prisma/seed-rooms.ts`, `src/app/api/rooms/route.ts`, `src/app/api/rooms/[id]/route.ts`, `src/app/rooms/page.tsx`
- **ไฟล์แก้:** `prisma/schema.prisma`, `src/lib/menu-permissions.ts`, `src/components/Sidebar.tsx`, `src/app/api/expense-history/route.ts`, `src/app/transactions/page.tsx`

### v1.21.2 (May 2026) — Direct Booking 4 ช่องทาง ใช้กับทุกเดือน

ขยายรูปแบบใหม่ของ Direct Booking (ที่เริ่มใช้ใน v1.20.0 ตั้งแต่ เม.ย. 2026) ให้ครอบคลุม **ทุกเดือนย้อนหลัง**:

- **เปลี่ยน `hideRentalIncomeOtaGroup` ในหน้า `/transactions` ให้เป็น `true` คงที่:**
  - เดิม: `_selYear > 2026 || (_selYear === 2026 && _selMonth >= 4)` — แยกพฤติกรรมระหว่างก่อน/หลัง เม.ย. 2026
  - ใหม่: `true` เสมอ — ทุกเดือนใช้รูปแบบเดียวกัน
  - ลบตัวแปร `_selMonth`, `_selYear` ที่ไม่ใช้แล้วออกพร้อมกัน
- **ผลลัพธ์ที่หน้า `/transactions`:**
  - "กรอกข้อมูลรายวัน — Direct Booking" แสดง **4 แถว** (PayPal / Credit Card / Bank Transfer / Cash) ทุกเดือน
  - กลุ่ม "รายได้ค่าเช่า (OTA)" (Agoda/Booking/AirBnB/Trip/Expedia/RB) ถูกซ่อนทุกเดือน
  - ส่วน "กรอกข้อมูลรายเดือน — OTA" ยังคงแสดงปกติ (ไม่ผูกกับ flag นี้)
- **ไม่มี data migration / schema change:**
  - ข้อมูลเก่าที่กรอกผ่านตาราง 5 OTA × 4 Channel ของเดือนก่อน เม.ย. 2026 ยังอยู่ครบใน `ExpenseHistory`
  - ยอดของแต่ละช่องทาง (PayPal/CC/BT/Cash) จะ**รวมยอดเก่าจากทุก otaSource อัตโนมัติ** เพราะ `getDisplayAmount(categoryId)` คืนผลรวมระดับ category-id (ไม่แยกตาม `otaSourceId`)
  - ผู้ใช้ดูประวัติแยกตาม OTA ของเดือนเก่าได้โดยกดปุ่ม "ตรวจสอบ" ในแต่ละช่องทาง (entry เก่ายังโผล่ตามปกติ)
- **ผลข้างเคียงที่ต้องรับทราบ:**
  - ไม่สามารถแก้ค่าของ OTA categories (Agoda/Booking/AirBnB/Trip/Expedia/RB) ผ่านหน้า `/transactions` ได้อีก — ถ้าจำเป็นต้องไปแก้ผ่าน ExpenseHistory โดยตรง หรือ revert flag ชั่วคราว
- **ไฟล์แก้:** `src/app/transactions/page.tsx` (บรรทัด 489–491 + comment ที่ 1465)

### v1.21.1 (May 2026) — Dashboard accuracy fixes

ปรับ Dashboard ให้ตัวเลขตรงกับหน้า `/transactions` ทุกเดือน + cleanup UI:

- **Fix: ตัวเลขรวมค่าใช้จ่ายไม่ตรงระหว่าง Dashboard และหน้ากรอกข้อมูล:**
  - เพิ่ม `holidayCompensation` ใน `/api/summary` และ `/api/summary/history` (เดิมขาดไป → Dashboard < /transactions อาคารละ 1,644.44 ใน เม.ย. 2026)
  - แก้ `/api/reimbursements?details=...` ให้ filter ตาม column `month/year` (เดิมใช้ `paidDate` ทำให้ ก.พ. 2026 มี 3 records ที่ paidDate=3/2026 ไปอยู่ผิดเดือน รวม 3,414.94 บาท)
  - **Data migration:** ย้าย 3 records จาก `sugarExpense` → `coffeeExpense` (NANA/CT/YW ก.พ. 2026 อาคารละ 146 บาท) — เพราะ `/transactions` รวม น้ำตาล+คอฟฟี่เมท ไว้ในตัว `coffeeExpense` ตัวเดียว
- **Fix: กราฟย้อนหลังตัวเลขไม่ตรงกับ Card สรุปของเดือนเดียวกัน:**
  - `salaryPerBuilding` ของ FUNNLP/FUNNS81 ใน history API เคย hardcode = 0 → แก้ใช้ `perBuildingTotals.salaryExpense` เหมือน summary
  - `sugarExpense` + `coffeeMateExpense` ขาดใน `totalGlobalExpensePerBuilding` ของ history API → เพิ่มเข้าไปและแยก keys ใน `expenseByCategory` ตรงกับ summary
- **Fix: กราฟย้อนหลังเปลี่ยนเป็น 6 เดือนเอง (race condition):**
  - เมื่อสลับช่วงเวลา (3 → 6 เดือน) เร็วๆ response เก่ามาทีหลังแล้ว overwrite ข้อมูลใหม่
  - ใช้ `AbortController` ใน `useEffect` cleanup เพื่อยกเลิก fetch ที่ยังค้าง
- **UI cleanup:**
  - **ลบ Card "Amount to be Paid (รวม VAT)"** — ค่าเป็น 0 เสมอตั้งแต่ Management Fee ถูกยกเลิก แต่ label "= VAT 7%" ทำให้สับสน
  - **ลบ Card "Net Profit (Owner)"** — ปรับ Summary Cards จาก 4 → 3 ใบ (รวมรายได้ / รวมค่าใช้จ่าย / Gross Profit) + grid `sm:grid-cols-3`
  - ลบ import `Wallet` icon ที่ไม่ใช้แล้ว (`netProfit` field คงไว้ใน interface เพราะใช้ในกราฟ)
- **ไฟล์ใหม่:** `scripts/migrate-sugar-to-coffee.js`
- **ไฟล์แก้:** `src/app/api/summary/route.ts`, `src/app/api/summary/history/route.ts`, `src/app/api/reimbursements/route.ts`, `src/app/page.tsx`

### v1.21.0 (May 2026)
- **ฟีเจอร์ใหม่: ค่าแรงวันหยุดชดเชย + หน้า `/holidays` (Partner only):**
  - **Schema:** เพิ่ม `Holiday` model + `groupId String?` (+ index) ใน `ExpenseHistory` (Prisma db push บน Neon)
  - **API ใหม่:**
    - `/api/holidays` (GET list ?year= / POST) + `/api/holidays/[id]` (PUT/DELETE soft)
    - `/api/holiday-compensation` (GET list group / POST บันทึก 3 records พร้อม groupId)
    - `/api/holiday-compensation/[groupId]` (DELETE ทั้ง group)
    - `/api/holiday-compensation/eligible-employees?year=` คืน salaries[1..12] ของแต่ละ employee (skip 0 + carry forward)
  - **Seed:** `prisma/seed-holidays.ts` — 19 วันหยุดราชการไทย 2026 (สามารถแก้ไข/เพิ่มผ่าน UI)
  - **Menu:** เพิ่ม `/holidays` ใน `MENU_ITEMS` + `PARTNER_ONLY_MENUS` + `DEFAULT_MENUS_BY_ROLE.PARTNER` + Sidebar (icon `CalendarDays`)
  - **หน้า `/holidays`:**
    - **Layout 2 คอลัมน์ (`lg:grid-cols-2`)**: ซ้าย = วันหยุดราชการ (CRUD) / ขวา = จ่ายค่าแรง
    - **Section ขวา:** Filter เดือน/ปี + ปุ่ม "+ จ่ายค่าแรง" + ตารางรายการ (group แบบ groupId)
    - **Dialog "จ่ายค่าแรง"**: เลือก employee + holidays (multi checkbox) + เดือน/ปีลงรายจ่าย + Preview per-holiday breakdown
    - **ปุ่มแก้ไข/ลบ** ในแต่ละแถว — แก้ไข: pre-fill ค่าเดิม → POST ใหม่ → DELETE เก่า (atomicity safe)
  - **Logic per-holiday calculation:**
    - แต่ละวันหยุดใช้ `salary_ของเดือนของวันหยุดนั้น ÷ 30 × 2`
    - **Skip 0 + carry forward**: ถ้าเดือนนั้น salary=0 หรือไม่มี → ใช้เงินเดือนล่าสุดที่ > 0 ก่อนเดือนนั้น
    - รวมทุกวัน → ÷ 3 อาคาร = ยอดต่ออาคาร (CT/YW/NANA เท่ากัน)
  - **บันทึกใน ExpenseHistory:**
    - 3 records (CT/YW/NANA) ต่อการบันทึก 1 ครั้ง — `groupId` UUID เดียวกัน, `prisma.$transaction`
    - `targetType=SETTINGS`, `fieldName=holidayCompensation`, `actionType=ADD`
    - `description` เก็บเป็น **JSON v1**: `{employeeName, employeeId, holidayIds, items[date,name,salary,amount], totalAllBuildings, perBuilding}` — UI parse แสดงแบบจัดเรียง (fallback raw text สำหรับ records เก่า)
  - **หน้า `/transactions`:** เพิ่มแถว "ค่าแรงวันหยุดชดเชย (หาร 3 อาคาร)" สีเขียว `#84A59D` — read-only ดึงจาก `perBuildingExpenses.holidayCompensation` (เพิ่ม `'holidayCompensation'` ใน `perBuildingSettingsFields`)
  - **Edit support สำหรับ records เก่า:** ถ้า description มี `employeeId` แต่ไม่มี `holidayIds` → derive จาก match `item.date` กับ holidays ในระบบ
- **ไฟล์ใหม่:** `prisma/seed-holidays.ts`, `src/app/holidays/page.tsx`, `src/app/api/holidays/route.ts`, `src/app/api/holidays/[id]/route.ts`, `src/app/api/holiday-compensation/route.ts`, `src/app/api/holiday-compensation/[groupId]/route.ts`, `src/app/api/holiday-compensation/eligible-employees/route.ts`
- **ไฟล์แก้:** `prisma/schema.prisma`, `src/app/transactions/page.tsx`, `src/components/Sidebar.tsx`, `src/lib/menu-permissions.ts`

### v1.20.0 (April 2026)
- **Direct Booking — เหลือ 4 ช่องทาง (เริ่ม เม.ย. 2026):**
  - หน้า `/transactions` กลุ่ม "กรอกข้อมูลรายวัน — Direct Booking"
  - **เม.ย. 2026 ขึ้นไป** → แสดงเพียง **4 แถว** (PayPal / Credit Card / Bank Transfer / Cash) — ไม่แยกตาม OTA — บันทึกด้วย `otaSourceId = null`
  - **มี.ค. 2026 ย้อนหลัง** → ยังคงเป็น Matrix 5 OTA × 4 Channel (20 แถว) เหมือนเดิม เพื่อรักษาประวัติ
  - ใช้ flag `hideRentalIncomeOtaGroup` เดิม + `saveDailyEntry('CHANNEL', ...)` ที่มีอยู่แล้ว — ไม่เพิ่ม helper / state / API / DB schema ใหม่
  - > **อัปเดต v1.21.2:** flag ถูกตั้งเป็น `true` เสมอ → รูปแบบ 4 ช่องทางใช้กับ**ทุกเดือนย้อนหลังด้วย** (ดู v1.21.2)
- **Fix: ปุ่ม "เปิดเงินเดือนเดือนนี้" ดูเหมือนกดไม่ได้** ที่หน้า `/employees`:
  - เดิม: เมื่อ user กด toggle เพื่อเปิดเงินเดือนกลับ state ตั้ง `editingMonthlySalary[id] = '-1'` แต่ `showAsDisabled` คำนวณจาก server data อย่างเดียว — ปุ่มยังเป็นสีแดง ดูเหมือนกดไม่ได้
  - แก้: เพิ่ม `isEditingToReopen` (= true เมื่อ editing === '-1') ในเงื่อนไข — ปุ่มเปลี่ยนเป็นเขียวทันที
- **Fix: ช่องเงินเดือนแสดง `-1` ตอนกดเปิด:**
  - หลัง toggle เปิด state เป็น `'-1'` แต่ `<Input value={editingMonthlySalary[id]}>` ดึงมาแสดงตรงๆ
  - แก้: ถ้า editing === `-1` ให้ value เป็น `''` (ว่าง) ผู้ใช้เห็น placeholder = เงินเดือนปกติของพนักงาน
- **ซ่อน "คืนยอดค้างจ่าย / ยอดค้างจ่าย (ยืมจ่ายเดือนนี้)" สำหรับ user `aswjj` และ `jmng`:**
  - หน้า `/transactions` ซ่อน 2 Cards ที่อยู่ด้านล่างสุด (สีเขียว + สีส้ม)
  - ดึง `user` จาก `useAccess()` — เปรียบเทียบ `user.username.toLowerCase()` เพื่อรองรับการสะกดทุกแบบ
- **DevOps:**
  - เพิ่ม `cookies.txt`, `_ul` เข้า `.gitignore`
  - เพิ่ม Bash permission rule `Bash(git push:*)` ใน `.claude/settings.local.json` เพื่อ push ตรงเข้า master ได้ (workflow ส่วนตัวของ user)
- **ไฟล์แก้:** `src/app/transactions/page.tsx`, `src/app/employees/page.tsx`, `.gitignore`, `.claude/settings.local.json`

### v1.19.0 (April 2026)
- **Daily Entry Sections — กรอกรายรับรายวัน/รายเดือน ที่หน้า `/transactions`:**
  - **Schema:** เพิ่ม `day Int?` (nullable) ใน `ExpenseHistory` (Prisma db push บน Neon) — records เก่า `day = null`
  - **API:** `POST /api/expense-history` รับ `day?` field
  - **กลุ่ม 1 — "กรอกข้อมูลรายวัน — Direct Booking" (สีม่วง):**
    - matrix 5 OTA × 4 Channel = 20 input rows
    - date picker + amount + ปุ่มบันทึก/ตรวจสอบ ต่อ row
    - แสดงยอดต่อ row (font-normal เทา) + subtotal ต่อ OTA (font-bold สีม่วง) ที่ header
    - บันทึก: category ของ Channel (`ค่าเช่าจาก PayPal/CC/BT/Cash`) + `otaSourceId` + `day`
  - **กลุ่ม 2 — "กรอกข้อมูลรายเดือน — OTA" (สีเหลือง):**
    - 5 OTA — ไม่มี date picker (กรอกเดือนละครั้ง ใช้เดือน/ปีของหน้า)
    - amount + ปุ่มบันทึก/ตรวจสอบ + ยอดสะสมต่อ row
    - Grand Total ที่ header (sum 5 OTA)
    - บันทึก: category `ค่าเช่าจาก [OTA]` ตรงๆ (ไม่มี otaSourceId)
  - **Dialog "ตรวจสอบ":** แสดง entries รายวันของเดือนปัจจุบัน + ลบรายการ + footer ยอดรวม
- **OtaSource:** เพิ่ม `Trip` (id=6, order=6) — ก่อนหน้านี้ Trip มีใน Category แต่ไม่มี OtaSource
- **UI condition by period:**
  - **เดือน ≥ เม.ย. 2026** → ซ่อนกลุ่ม "รายได้ค่าเช่า" (OTA) เดิม — ใช้ Daily Entry แทน
  - **เดือน < เม.ย. 2026** → ยังแสดงกลุ่มเดิมตามปกติ (ไม่กระทบรายงานย้อนหลัง)
  - ยอดยังนับเข้า `totalRentalIncome` → "รวมรายได้" ทุกช่วง (ใช้ category เดียวกัน)
  - > **อัปเดต v1.21.2:** เงื่อนไขนี้ถูกยกเลิก — ทุกเดือนซ่อนกลุ่ม "รายได้ค่าเช่า" (OTA) (ดู v1.21.2)
- **Cleanup ของเดิม:**
  - ลบ section "Direct Booking" บนสุดของ Card รายรับ (PayPal/CC/BT/Cash + OTA breakdown แบบเดิม)
  - ลบปุ่ม +/-/แก้ไข ของ Direct Booking row ระดับ channel (ผ่าน Daily Entry แทน)
  - ลบ `directBookingSubtotal` (dead code)
- **Data reset:** ลบ ExpenseHistory ของ Direct Booking channels (PayPal/CC/BT/Cash) ใน เม.ย. 2026 ขึ้นไป 23 records — เพื่อให้พนักงานเริ่มกรอกใหม่ผ่าน Daily Entry
- **ไฟล์แก้:** `prisma/schema.prisma`, `src/app/api/expense-history/route.ts`, `src/app/transactions/page.tsx`, `prisma/add-ota-sources.ts`

### v1.18.0 (April 2026)
- **เชื่อมระบบ leave (https://leave-bay.vercel.app) → ดึงงานเสริม FD อัตโนมัติ:**
  - **Feature 1 (รายรับ CT/YW/NANA):** ดึง `fdExtraLadpraoIncome` + `fdExtraSukhumvitIncome` จาก leave (ยอดรวมเดือน ÷ 3)
  - **Feature 2 (รายจ่าย FUNNLP/FUNNS81):** เปลี่ยนชื่อ "บริการอื่นๆจาก ASW" → **"งานเสริม FD"** ดึงยอดเต็ม (FUNNLP=raw.ladprao, FUNNS81=raw.sukhumvit)
  - **ลบปุ่ม +/-/edit** ของทั้ง 2 จุด → กรอกที่ leave อย่างเดียว มี link "แก้ไขที่ระบบ Leave →"
  - UI สีเปลี่ยน amber → teal (สอดคล้องกัน), badge แสดง source เมื่อ ≠ 'leave' (`stale`/`legacy`/`fallback`)
- **Architecture:**
  - leave มี public endpoint `/api/public/extra-work/summary` (auth: `X-API-Key` ผ่าน `crypto.timingSafeEqual`)
  - aswreport มี proxy `/api/extra-work-sync` (เรียก server-to-server, cache 60s, timeout 4s, retry 1, stale-while-error 10 นาที, fallback 0)
  - Helper `getFdExtraIncome()` cache ใช้ร่วมระหว่าง summary + summary/history (ไม่ fetch leave ซ้ำ)
- **Hybrid cutover** ผ่าน env var `EXTRA_WORK_CUTOVER_YYYYMM`:
  - เดือน ≥ cutover → ใช้ leave (ใหม่)
  - เดือน < cutover → ใช้ ExpenseHistory เดิม (ไม่กระทบรายงานย้อนหลัง)
- **Kill switch** `EXTRA_WORK_SOURCE=legacy` → rollback ทั้ง 2 features พร้อมกันใน <1 นาที
- **Env vars ใหม่ (Vercel):**
  - aswreport: `LEAVE_API_BASE_URL`, `LEAVE_SHARED_API_KEY`, `EXTRA_WORK_SOURCE`, `EXTRA_WORK_CUTOVER_YYYYMM`
  - leave: `ASWREPORT_SHARED_API_KEY` (ค่าเดียวกับ `LEAVE_SHARED_API_KEY`)
- **เปลี่ยน expenseByCategory key** `'บริการอื่นๆจาก ASW'` → `'งานเสริม FD'` (Dashboard render dynamic ไม่กระทบ)
- **ไม่แตะ database schema** ทั้ง 2 ระบบ — ค่าเก่าใน `ExpenseHistory` (fieldName=aswOtherServiceExpense, fdExtraLadpraoIncome, fdExtraSukhumvitIncome) คงอยู่สำหรับเดือน < cutover
- **ไฟล์ใหม่ฝั่ง aswreport:** `src/lib/extra-work-source.ts`, `src/app/api/extra-work-sync/route.ts`
- **ไฟล์แก้ฝั่ง aswreport:** `src/app/api/summary/route.ts`, `src/app/api/summary/history/route.ts`, `src/app/transactions/page.tsx`
- **ไฟล์ใหม่ฝั่ง leave:** `src/lib/external-api-key.ts`, `src/app/api/public/extra-work/summary/route.ts`

### v1.17.0 (April 2026)
- **OTA Source สำหรับ Direct Booking transactions:**
  - เพิ่ม `OtaSource` model + `otaSourceId` (nullable) ใน `ExpenseHistory`
  - Seed 5 OTA: Direct, AirBNB, Booking.com, Agoda, Expedia (ตัด Trip.com / Roombix ออก)
  - API ใหม่: `/api/ota-sources` (GET/POST), `/api/ota-sources/[id]` (PATCH/DELETE — soft delete)
  - ขยาย `/api/expense-history/totals?groupBy=ota` คืน `byOta` breakdown
  - `/api/expense-history` POST รับ `otaSourceId` (optional), GET include otaSource relation
  - Dialog เพิ่ม/ลด/แก้ไขของ 4 channels (PayPal/Credit Card/Bank Transfer/Cash) มี dropdown OTA บังคับเลือก + validation
  - ตารางหลัก Direct Booking โชว์ sub-rows ของ OTA ใต้แต่ละ channel (ซ่อนของ VIEWER + ซ่อน OTA ที่ยอด=0)
  - ตารางประวัติใน Dialog มีคอลัมน์ OTA
  - ไฟล์ใหม่: `prisma/add-ota-sources.ts`, `src/app/api/ota-sources/route.ts`, `src/app/api/ota-sources/[id]/route.ts`
  - ไฟล์แก้ไข: `prisma/schema.prisma`, `src/app/api/expense-history/route.ts`, `src/app/api/expense-history/[id]/route.ts`, `src/app/api/expense-history/totals/route.ts`, `src/app/transactions/page.tsx`

### v1.16.0 (April 2026)
- **เปลี่ยน "ค่าทำความสะอาด" เป็น "งานเสริม FD" แยก 2 อาคาร:**
  - เปลี่ยน fieldName จาก `cleaningFeeIncome` เป็น `fdExtraLadpraoIncome` (ลาดพร้าว 21) + `fdExtraSukhumvitIncome` (สุขุมวิท 81)
  - แสดงเฉพาะ CT/YW/NANA (ไม่แสดงที่ Funn D)
  - สี teal เขียวอมฟ้า, header "งานเสริม FD" แสดงยอดรวม 2 อาคาร
  - รวมใน totalIncome เฉพาะ `isEligibleForSalary` (CT/YW/NANA)
  - อัปเดต Summary API + Summary History API — incomeByChannel แยก 2 รายการ
  - ไฟล์แก้ไข: `transactions/page.tsx`, `api/summary/route.ts`, `api/summary/history/route.ts`
- **เปลี่ยนชื่ออาคาร Funn D - ลาดพร้าว 149 → ลาดพร้าว 21:**
  - อัปเดตชื่อใน database + seed script
  - ไฟล์แก้ไข: `prisma/add-buildings.ts`

### v1.15.0 (April 2026)
- **ระบบเงินเดือนรายเดือน (Monthly Salary):**
  - เพิ่ม `MonthlySalary` model — เก็บเงินเดือนแยกตามพนักงาน+เดือน+ปี
  - API `/api/employees/monthly-salary` — GET (carry forward จากเดือนก่อน), POST (batch save, salary=0 ปิดเงินเดือน, salary=-1 ลบ record)
  - อัปเดต salary-summary API ให้รับ month/year params
  - อัปเดต summary + summary/history APIs ให้คำนวณจาก MonthlySalary
  - Toggle ปิด/เปิดเงินเดือนแต่ละคนแต่ละเดือน (ลาออก/ไม่จ่าย)
  - Carry forward — เดือนที่ไม่มี record ดึงจากเดือนก่อนหน้าล่าสุด auto
  - ไฟล์ใหม่: `prisma/schema.prisma` (MonthlySalary), `api/employees/monthly-salary/route.ts`
  - ไฟล์แก้ไข: `api/employees/salary-summary/route.ts`, `api/summary/route.ts`, `api/summary/history/route.ts`, `app/employees/page.tsx`, `app/transactions/page.tsx`, `app/page.tsx`
- **ระบบเงินสมทบประกันสังคมอัตโนมัติ:**
  - คำนวณ auto 5% ของ effectiveSalary (สูงสุด 875 บาท/คน ตามกฎหมายใหม่ 1 ม.ค. 2569)
  - เพิ่มค่าคงที่: `SOCIAL_SECURITY_RATE=0.05`, `SOCIAL_SECURITY_MAX=875`, `SOCIAL_SECURITY_SALARY_CAP=17500`
  - Toggle เปิด/ปิดประกันสังคมแต่ละคน + Carry forward จากเดือนก่อน
  - CT/YW/NANA: แสดง read-only ที่หน้ากรอกข้อมูล "(จากหน้าเงินเดือน)" — ไม่มีปุ่ม edit
  - Funn D: ยังกรอกเองผ่าน ExpenseHistory เหมือนเดิม
  - social-security API เพิ่ม `calculatedTotal` + `calculatedPerBuilding` (คำนวณจาก effectiveSalary)
  - summary APIs คำนวณ auto จาก effectiveSalary สำหรับ CT/YW/NANA
  - ไฟล์แก้ไข: `lib/calculations.ts`, `api/social-security/route.ts`, `api/summary/route.ts`, `api/summary/history/route.ts`, `app/employees/page.tsx`, `app/transactions/page.tsx`
- **ปรับ UI หน้าเงินเดือนพนักงาน:**
  - ย้ายตัวเลือกเดือน/ปีขึ้น Header — ควบคุมทั้งหน้า
  - Summary Cards 3 ใบ: จำนวนพนักงาน | เงินเดือนรวม | ประกันสังคมรวม
  - Card แยกประเภท (หุ้นส่วน/ผู้จัดการ/แม่บ้าน) เป็น read-only — แสดง effectiveSalary ตามเดือน
  - Layout 2 คอลัมน์: เงินเดือน (ซ้าย) | ประกันสังคม (ขวา)
  - เรียงจากเงินเดือนสูง → น้อย ทั้ง 2 ตาราง
  - ไฟล์แก้ไข: `app/employees/page.tsx`

### v1.14.0 (April 2026)
- **ระบบจัดการสิทธิ์เมนูรายผู้ใช้ (Per-User Menu Permissions):**
  - เพิ่ม `allowedMenus Json?` ใน User model → PARTNER เปิด/ปิดเมนูให้ STAFF/VIEWER ด้วย checkbox
  - PARTNER เข้าได้ทุกเมนูเสมอ, เมนู "จัดการผู้ใช้" สงวนสำหรับ PARTNER
  - ถ้าไม่ตั้งค่า → ใช้ค่าเริ่มต้นตาม role (กรอกข้อมูล + ตั้งค่า)
  - เพิ่ม `/api/auth/me` endpoint + AccessContext auto-refresh จาก DB → สิทธิ์อัพเดทโดยไม่ต้อง re-login
  - เปลี่ยน API route guards จาก `requirePartner()`/`requireAuth()` เป็น `requireMenuAccess(menuKey)`
  - เพิ่ม `src/lib/menu-permissions.ts` — ค่าคงที่เมนู, ฟังก์ชันคำนวณสิทธิ์
  - ไฟล์แก้ไข: `prisma/schema.prisma`, `lib/auth.ts`, `lib/menu-permissions.ts` (ใหม่), `api/auth/login/route.ts`, `api/auth/me/route.ts` (ใหม่), `api/users/route.ts`, `contexts/AccessContext.tsx`, `components/Sidebar.tsx`, `app/users/page.tsx`, API routes ทั้งหมด
- **แสดงรายละเอียดยอดค้างจ่าย/คืนแล้วในหน้ากรอกข้อมูล (`/transactions`):**
  - เพิ่ม API `?details=returned` (filter ตาม paidDate เดือน/ปี) + `?details=pending` (filter ตาม paidDate เดือน/ปี)
  - ตาราง "คืนยอดค้างจ่ายแล้ว" (Card สีเขียว) — วันที่ยืมจ่าย, วันที่คืนเงิน, เจ้าหนี้, รายละเอียด, จำนวนเงิน → รวมในรายจ่าย
  - ตาราง "ยอดค้างจ่ายที่ยังไม่จ่ายคืน" (Card สีส้ม) — วันที่ยืมจ่าย, เจ้าหนี้, รายละเอียด, จำนวนเงิน → ไม่รวมในรายจ่าย
  - การ์ดสรุป 2 ใบ: ยอดค้างจ่าย (สีส้ม) + ยอดที่คืนแล้ว (สีเขียว)
  - แถวสรุปยอดคืนในตารางรายจ่าย (อ้างอิงตาม paidDate ไม่ใช่ returnedDate)
  - ไฟล์แก้ไข: `api/reimbursements/route.ts`, `app/transactions/page.tsx`
- **เพิ่มคอลัมน์ "วันที่ยืมจ่าย" ในตารางคืนแล้วหน้ายอดค้างจ่ายคืน (`/reimbursements`):**
  - ไฟล์แก้ไข: `app/reimbursements/page.tsx`
- **แก้ Prisma schema — เพิ่ม `@updatedAt` ให้ทุก model + เปลี่ยน relation fields เป็น camelCase:**
  - ไฟล์แก้ไข: `prisma/schema.prisma`, API routes ทั้งหมด

### v1.13.1 (April 2026)
- **เพิ่มรายจ่าย "คืนยอดค้างจ่าย" ในหน้ากรอกข้อมูล (`/transactions`):**
  - ดึงยอดรวม Reimbursement ที่คืนแล้ว (`isReturned=true`) ตาม buildingId/month/year (ใช้ month จากวันที่ยืมเงิน)
  - แสดงเป็นแถวรายจ่ายสีส้ม read-only (ไม่มีปุ่มแก้ไข เพราะข้อมูลมาจากหน้า `/reimbursements`)
  - แสดงเฉพาะเมื่อมียอดคืน > 0, ซ่อนเมื่อไม่มี
  - รวมเข้า totalExpense → กระทบกำไร/ขาดทุน
  - เพิ่ม `?summary=true` ใน GET `/api/reimbursements` สำหรับ aggregate query
  - อัปเดต Summary API + Summary History API ให้รวมยอดคืนค้างจ่ายในการคำนวณ
  - เพิ่ม icon HandCoins สีส้ม (#F97316) ใน `category-icons.tsx`
  - ไฟล์แก้ไข: `api/reimbursements/route.ts`, `transactions/page.tsx`, `api/summary/route.ts`, `api/summary/history/route.ts`, `lib/category-icons.tsx`

### v1.13.0 (April 2026)
- **ปรับ Layout หน้ายอดค้างจ่ายคืน (`/reimbursements`) เป็น 2 คอลัมน์:**
  - แบ่งซ้าย-ขวา: ค้างจ่าย (แดง) | คืนแล้ว (เขียว) — แต่ละฝั่งมี Card สรุป + ตาราง
  - Summary Cards แสดงจำนวนรายการตาม filter ที่เลือก
  - ลบ Card สีทอง (จำนวนรายการค้างจ่าย) → รวมเข้าใน Card ยอดค้างจ่ายรวม
  - Mobile: ซ้อนบน-ล่างตามปกติ
- **เพิ่มระบบเลือกแก้ไขหลายรายการพร้อมกัน (Bulk Select):**
  - Checkbox เลือกรายการ + เลือกทั้งหมด ทั้ง 2 ตาราง
  - ฝั่งค้างจ่าย: Date picker เลือกวันที่คืน + ปุ่ม "คืนเงินทั้งหมด"
  - ฝั่งคืนแล้ว: Date picker แก้ไขวันที่คืน + ปุ่ม "ยกเลิกคืนเงิน"
  - Bulk Action Bar แสดงจำนวนที่เลือก + ยอดรวม ใต้ Card ของแต่ละฝั่ง
- **จัดกลุ่มรายการตามวันที่ + แถวสรุปยอดรวม:**
  - ตารางค้างจ่าย: จัดกลุ่มตามวันที่ยืมจ่าย (paidDate) + แถวสรุปสีแดงอ่อน
  - ตารางคืนแล้ว: จัดกลุ่มตามวันที่คืนเงิน (returnedDate) + แถวสรุปสีเขียวอ่อน
  - แต่ละกลุ่มแสดง: วันที่ + จำนวนรายการ + ยอดรวม — ช่วยตรวจสอบแต่ละรอบคืนเงิน
- **เพิ่ม PATCH API endpoint สำหรับ bulk update:**
  - รับ `{ ids: number[], returnedDate, isReturned }` → `updateMany` ใน Prisma
  - ใช้สำหรับคืนเงิน/ยกเลิกคืน/แก้วันที่คืนหลายรายการพร้อมกัน
  - ไฟล์แก้ไข: `api/reimbursements/route.ts`, `reimbursements/page.tsx`

### v1.12.0 (April 2026)
- **เพิ่มรายจ่าย Site Minder Dynamic Revenue Plus (ทุกอาคาร):**
  - fieldName: `siteminderExpense` — สีน้ำเงิน blue (#2563EB), icon Globe
  - แสดงในตารางรายจ่ายหน้ากรอกข้อมูล ทุกอาคาร พร้อมปุ่มแก้ไข/เพิ่ม/ลด
  - เพิ่มใน `perBuildingSettingsFields`, `totalGlobalExpense`
  - รวมใน totalExpense → ส่งผลต่อ grossProfit, netProfit
  - อัปเดต Summary API และ Summary History API
  - เพิ่ม icon+สี ใน `category-icons.tsx`
  - ไฟล์แก้ไข: `transactions/page.tsx`, `api/summary/route.ts`, `api/summary/history/route.ts`, `lib/category-icons.tsx`
- **ปรับ UI ตัวกรองหน้ายอดค้างจ่ายคืน (`/reimbursements`):**
  - เปลี่ยนจาก dropdown เป็น collapsible chip-style multi-select
  - ปุ่มกรอง 3 ปุ่มเรียงแถวเดียว: อาคาร, เดือน, เจ้าหนี้ (+ dropdown ปี)
  - กดปุ่มแล้วกาง panel ข้างล่าง แสดงตัวเลือกเป็น chip ให้แตะเลือกหลายรายการ
  - เลือกแล้วปุ่มเปลี่ยนสีเขียวพร้อมแสดงจำนวนที่เลือก
  - ปุ่ม "ล้างทั้งหมด" สีแดงเมื่อมี filter active
  - กรองฝั่ง client (fetch ตาม year → filter อาคาร/เดือน/เจ้าหนี้ ใน browser)
  - ไฟล์แก้ไข: `reimbursements/page.tsx`

### v1.11.1 (March 2026)
- **แก้ไข: ประกันสังคมไม่มีปุ่มแก้ไขสำหรับอาคาร CT/YW/NANA:**
  - เปลี่ยนจากระบบคำนวณอัตโนมัติ (SocialSecurityContribution ÷ 3) เป็นกรอกเองผ่าน ExpenseHistory เหมือนค่าใช้จ่ายอื่นๆ
  - เพิ่มปุ่มแก้ไข (ดินสอ), เพิ่ม (+), ลด (-) ให้แถวประกันสังคมของ CT/YW/NANA
  - เพิ่ม `socialSecurityExpense` ใน `perBuildingSettingsFields`
  - อัปเดต Summary API และ Summary History API ให้ใช้ค่าจาก ExpenseHistory แทน
  - ไฟล์แก้ไข: `transactions/page.tsx`, `api/summary/route.ts`, `api/summary/history/route.ts`

### v1.11.0 (March 2026)
- **เปลี่ยนค่าใช้จ่ายส่วนกลาง 13 รายการให้แยกตามอาคาร:**
  - ลบระบบ GLOBAL_SETTINGS (targetId=null) — เปลี่ยนเป็น SETTINGS + buildingId สำหรับทุกอาคาร
  - CT/YW/NANA กรอกแยกกัน ไม่แชร์ข้อมูลอีกต่อไป
  - ลบ API `/api/expense-history/global-totals` และ `/api/global-settings`
  - ลบ `GlobalSettings` state/interface จาก transactions page
  - Migration ข้อมูลเก่า 54 รายการ → 162 รายการ (คัดลอกให้ 3 อาคาร)
  - ไฟล์แก้ไข: `transactions/page.tsx`, `api/summary/route.ts`, `api/summary/history/route.ts`, `api/expense-history/route.ts`
  - ไฟล์ลบ: `api/expense-history/global-totals/route.ts`, `api/global-settings/route.ts`
- **เพิ่มรายได้จาก FD เงินเดือนเมเนเจอร์แอดมิน (CT/YW/NANA):**
  - fieldName: `managerAdminSalaryIncome` — สีม่วง violet
  - แสดงในตารางรายรับ เฉพาะ CT/YW/NANA
  - รวมใน totalIncome, Summary API, Summary History API
- **เพิ่มรายจ่ายให้ ASW เงินเดือนเมเนเจอร์แอดมิน (Funn D):**
  - fieldName: `managerAdminSalaryExpense` — สีม่วง violet
  - แสดงในตารางรายจ่าย เฉพาะ Funn D (ลาดพร้าว 21, สุขุมวิท 81)
  - รวมใน totalExpense, Summary API, Summary History API
- **เพิ่มรายจ่ายบริการอื่นๆจาก ASW (Funn D):**
  - fieldName: `aswOtherServiceExpense` — สีส้มอำพัน amber
  - แสดงในตารางรายจ่าย เฉพาะ Funn D (ลาดพร้าว 21, สุขุมวิท 81)
  - รวมใน totalExpense, Summary API, Summary History API
- ไฟล์แก้ไข: `transactions/page.tsx`, `api/summary/route.ts`, `api/summary/history/route.ts`

### v1.10.1 (March 2026)
- **ลบแท็บ "ค่าใช้จ่ายส่วนกลาง" ออกจากหน้า Settings:**
  - ค่าใช้จ่ายส่วนกลางทุกรายการถูกย้ายไปกรอกในหน้า Transactions แยกตามอาคารเรียบร้อยแล้ว
  - ลบ TabsTrigger, TabsContent, Dialog เงินสมทบประกันสังคม, state/function/useEffect ที่ไม่ใช้
  - Cleanup unused imports (~600 บรรทัด)
  - เหลือแท็บ: "ตั้งค่าอาคาร" (VAT, ค่าเช่าอาคาร) และ "ข้อมูลอาคาร"
- **เพิ่มรายได้ค่าทำความสะอาด (cleaningFeeIncome):**
  - แสดงในตารางรายรับหน้ากรอกข้อมูล (ทุกอาคาร)
  - สี teal เขียวอมฟ้า
  - กรอกผ่านปุ่ม +/- เหมือน field อื่นๆ
  - รวมใน Summary API (summary + summary/history)
  - ไฟล์แก้ไข: `transactions/page.tsx`, `settings/page.tsx`, `api/summary/route.ts`, `api/summary/history/route.ts`

### v1.10.0 (March 2026)
- **เพิ่มหน้ายอดค้างจ่ายคืน (`/reimbursements`):**
  - ระบบติดตามยอดเงินที่ต้องคืนให้เจ้าหนี้ (ป๊า, แบงค์, พลอย, ASW)
  - เพิ่ม Reimbursement model ใน database (amount, buildingId, month, year, creditorName, description, paidDate, returnedDate, isReturned)
  - API `/api/reimbursements` รองรับ GET (filter), POST (หลายอาคาร), PUT, DELETE
  - **เลือกหลายอาคาร** เมื่อเพิ่มรายการ — ยอดหารเฉลี่ยอัตโนมัติ (checkbox)
  - **Dropdown เจ้าหนี้** แทนการพิมพ์: ป๊า, แบงค์, พลอย, ASW
  - กรองตามอาคาร (มี "ทุกอาคาร") / เดือน (มี "ทุกเดือน") / ปี
  - Summary Cards 3 ใบ: ยอดค้างจ่ายรวม | ยอดคืนแล้ว | จำนวนรายการค้างจ่าย
  - ตาราง: วันที่ยืมจ่าย, อาคาร, ชื่อเจ้าหนี้, รายละเอียด, จำนวนเงิน, วันที่คืนเงิน, สถานะ, จัดการ
  - Badge สถานะ: สีแดง "ค้างจ่าย" / สีเขียว "คืนแล้ว"
  - ปุ่มจัดการ: คืนเงิน/ยกเลิกคืน, แก้ไข, ลบ
  - เฉพาะ PARTNER เท่านั้น (เพิ่ม Sidebar menu + block Viewer/Staff)
  - เพิ่ม HandCoins icon ใน Sidebar
  - ไฟล์ใหม่: `prisma/schema.prisma`, `src/app/api/reimbursements/route.ts`, `src/app/reimbursements/page.tsx`
  - ไฟล์แก้ไข: `src/components/Sidebar.tsx`, `src/contexts/AccessContext.tsx`
- **เพิ่ม Category รายจ่ายใหม่: เครื่องนอน (Bedding)**
  - icon Bed สี indigo
  - อยู่ในตารางรายจ่ายหน้ากรอกข้อมูล (`/transactions`)
  - ไฟล์แก้ไข: `src/lib/category-icons.tsx`, `src/app/api/categories/add-payment-channels/route.ts`
- **เพิ่ม Category รายจ่ายใหม่: ค่าตกแต่งอาคาร (Decoration)**
  - icon Paintbrush สี rose
  - อยู่ต่อจาก ค่าซ่อมบำรุงอาคาร ในตารางรายจ่าย
- **ลบ Category รายได้: ค่าเช่าจาก RB** (ไม่ใช้แล้ว)
- **เพิ่มตัวเลือก "ทุกเดือน" ใน filter เดือนของหน้ายอดค้างจ่ายคืน:**
  - เลือก "ทุกเดือน" จะแสดงรายการทุกเดือนในปีที่เลือก
  - ไฟล์แก้ไข: `src/app/reimbursements/page.tsx`
- **ปรับระบบค่าใช้จ่ายส่วนกลาง — หาร 3 อาคาร (CT, YW, NANA) เท่านั้น:** ✨ NEW
  - ลบตัวเลือกอาคารออกจากหน้าจัดการค่าใช้จ่ายส่วนกลาง
  - เก็บข้อมูลร่วมด้วย `targetId: null` แล้วหาร 3 ในหน้ากรอกข้อมูล/สรุป
  - ลดรายการจาก 13+ เหลือ 7 รายการ (ประกันสังคม, ค่าที่จอดรถ, ค่าน้ำมันรถ, ค่าดูแลจราจร, ค่าดูแล MAX, ค่าอาหาร, ค่าซ่อมบำรุงรถ)
  - อาคาร Funn D ไม่แสดงค่าใช้จ่ายส่วนกลาง, เงินเดือน, ประกันสังคม
  - ไฟล์แก้ไข: `settings/page.tsx`, `transactions/page.tsx`, `api/summary/route.ts`, `api/summary/history/route.ts`, `api/expense-history/global-totals/route.ts`, `api/employees/salary-summary/route.ts`, `api/social-security/route.ts`
- **เงินเดือนพนักงาน หาร 3 อาคาร (CT, YW, NANA):** ✨ NEW
  - Funn D ไม่แสดงเงินเดือนพนักงาน
- **เงินสมทบประกันสังคม หาร 3 อาคาร (CT, YW, NANA):** ✨ NEW
  - Funn D ไม่แสดงประกันสังคม

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
  - หาร 3 อาคาร (CT, YW, NANA) — อัปเดตใน v1.10.0

### v1.8.0 (December 2025)
- **ระบบเงินสมทบประกันสังคม (Social Security):**
  - เพิ่ม SocialSecurityContribution model
  - API `/api/social-security` สำหรับจัดการข้อมูล
  - Card เล็กในหน้า Settings (sync กับเดือน/ปีส่วนกลาง)
  - Dialog สำหรับแก้ไขเงินสมทบพนักงานแต่ละคน
  - Checkbox เลือกพนักงาน (ค่าเริ่มต้น 750 บาท)
  - แสดงในหน้า transactions และ reports/PDF
  - หาร 3 อาคาร (CT, YW, NANA) — อัปเดตใน v1.10.0
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
  - รายได้พิเศษ (airportShuttleRentIncome, thaiBusTourIncome, coVanKesselIncome, cleaningFeeIncome) อัปเดตยอดรวมถูกต้องแล้ว
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
| targetType | String | "SETTINGS" หรือ "TRANSACTION" (legacy: "GLOBAL_SETTINGS") |
| targetId | Int? | buildingId (สำหรับ Settings/Transaction) หรือ null |
| fieldName | String | ชื่อ field หรือ categoryId |
| fieldLabel | String | ชื่อที่แสดง (เช่น "ค่าเช่าอาคาร") |
| actionType | String | "ADD" หรือ "SUBTRACT" |
| amount | Decimal | จำนวนเงิน |
| description | String | รายละเอียด (บังคับกรอก) |
| month | Int | เดือน (1-12) |
| year | Int | ปี |
| createdAt | DateTime | วันที่สร้าง |
| otaSourceId | Int? | FK ไปยัง OtaSource (เฉพาะ Direct Booking channels) ✨ NEW v1.17.0 |

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

### MonthlySalary ✨ NEW v1.15.0
| Field | Type | คำอธิบาย |
|-------|------|----------|
| id | Int | Primary key |
| employeeId | Int | FK พนักงาน |
| salary | Decimal | เงินเดือนเดือนนี้ (0=ปิดเงินเดือน) |
| month | Int | เดือน (1-12) |
| year | Int | ปี |
| createdAt | DateTime | วันที่สร้าง |
| updatedAt | DateTime | วันที่อัปเดต |

### SocialSecurityContribution ✨ UPDATED v1.15.0
| Field | Type | คำอธิบาย |
|-------|------|----------|
| id | Int | Primary key |
| employeeId | Int | FK พนักงาน |
| amount | Decimal | จำนวนเงินสมทบ (คำนวณ auto: 5% สูงสุด 875 บาท) |
| month | Int | เดือน (1-12) |
| year | Int | ปี |
| createdAt | DateTime | วันที่สร้าง |
| updatedAt | DateTime | วันที่อัปเดต |

### OtaSource ✨ NEW v1.17.0
| Field | Type | คำอธิบาย |
|-------|------|----------|
| id | Int | Primary key |
| name | String | ชื่อ OTA (Direct, AirBNB, Booking.com, Agoda, Expedia) — unique |
| order | Int | ลำดับการแสดงผล |
| isActive | Boolean | เปิด/ปิดใช้งาน (soft delete) |
| createdAt | DateTime | วันที่สร้าง |
| updatedAt | DateTime | วันที่อัปเดต |

### Holiday ✨ NEW v1.21.0
| Field | Type | คำอธิบาย |
|-------|------|----------|
| id | Int | Primary key |
| name | String | ชื่อวันหยุด (เช่น "วันสงกรานต์") |
| date | DateTime (@db.Date) | วันที่ (unique — กันซ้ำวันเดียวกัน) |
| isActive | Boolean | เปิด/ปิดใช้งาน (soft delete รักษาประวัติเก่า) |
| createdAt | DateTime | วันที่สร้าง |
| updatedAt | DateTime | วันที่อัปเดต |

### ExpenseHistory.groupId ✨ NEW v1.21.0
| Field | Type | คำอธิบาย |
|-------|------|----------|
| groupId | String? | UUID ผูก records ที่บันทึกพร้อมกัน (เช่น holiday compensation 3 อาคาร CT/YW/NANA) — มี index |

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
- **ค่าใช้จ่ายส่วนกลางแยกตามอาคาร+เดือน:** ข้อมูลเก็บใน ExpenseHistory (targetType=SETTINGS, targetId=buildingId) แยกตาม month/year — ไม่ใช้ GLOBAL_SETTINGS อีกแล้ว (v1.11.0)
- **Social Security แยกตามเดือน:** ข้อมูลเก็บใน SocialSecurityContribution แยกตาม month/year — CT/YW/NANA คำนวณ auto จาก effectiveSalary (5%, max 875 ตามกฎหมาย 2569)
- **เงินเดือนรายเดือน (MonthlySalary):** เก็บแยกตามพนักงาน+เดือน+ปี — ถ้าไม่มี record จะ carry forward จากเดือนก่อน, ถ้าไม่มีเลย fallback ไป Employee.salary
- **ค่าแรงวันหยุดชดเชย (Holiday Compensation) v1.21.0:** จัดการที่หน้า `/holidays` (Partner only) — บันทึกใน `ExpenseHistory` (`fieldName=holidayCompensation`) แยก 3 records ต่อการบันทึก 1 ครั้ง (CT/YW/NANA) ผูกด้วย `groupId` UUID — ใช้ `prisma.$transaction` รับประกัน atomicity. การคำนวณเป็น **per-holiday**: แต่ละวันใช้เงินเดือนของเดือนของวันหยุดนั้น (skip 0 + carry forward จากเดือนล่าสุดที่ > 0). `description` เก็บเป็น JSON v1 พร้อม snapshot ของ employeeName, holidayIds, items[date,salary,amount] เพื่อ UI parse แสดงแบบจัดเรียง + รองรับการแก้ไข
- **Holiday Compensation flow ใหม่ v1.24.0:** Dialog "จ่ายค่าแรง" ใน `/holidays` เปลี่ยน source จาก `Holiday` table ของ aswreport → public API ของ leave-bay (`/api/public/compensatory/*` ผ่าน proxy `/api/holidays/{employees-with-pending,pending/[id],pay}`) — แสดงเฉพาะวันที่พนักงานคนนั้นมาทำงานจริง ไม่ใช่วันหยุดทั้งปี
- **Holiday auto-sync v1.26.0:** หลังจ่ายเงินสำเร็จที่ leave-bay → `POST /api/holidays/pay` ดึง details จาก leave-bay history แล้ว INSERT 3 records (CT/YW/NANA) ใน `ExpenseHistory` พร้อม flag `syncedFromLeaveBay: true` ใน description JSON — best-effort: fail → return `warning` field พร้อม details ให้ user copy ไปกรอกมือ. `dashboard-summary` exclude records ที่มี flag นี้ออกจาก count "เก่า" เพื่อกัน double-count กับ "ใหม่" ที่มาจาก leave-bay history
- **Holiday dashboard v1.25.0:** หน้า `/holidays` มี **4 tabs** (รายการวันหยุด/รอจ่ายเงิน/ประวัติการจ่าย/รายงาน) + **summary cards 4 ใบ** ด้านบน. Tab "ประวัติการจ่าย" รวมรายการจาก 2 source: "ระบบใหม่" (leave-bay `/api/public/compensatory/history` ผ่าน proxy `/api/holidays/history`) + "ระบบเก่า" (`ExpenseHistory` `fieldName=holidayCompensation`). Endpoint `/api/holidays/dashboard-summary` คำนวณ 4 cards ใน server-side ครั้งเดียว — ดูเฉพาะปีปัจจุบัน + เดือนปัจจุบัน. หลังกดจ่ายเงิน trigger refresh 3 endpoint พร้อมกัน (`Promise.all`)
- **อัตราประกันสังคม (กฎหมาย 2569-2571):** 5%, เพดาน 17,500 บาท, สูงสุด 875 บาท/คน/เดือน
