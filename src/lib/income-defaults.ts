// ค่าคงที่สำหรับหมวดรายได้ที่มีค่าเริ่มต้น/มี gate ตามอาคาร
// แก้ค่าที่นี่ที่เดียวเพื่อปรับ default ที่ใช้ทั่วระบบ

// ค่าเช่าอาคารชั้น 1 (เฉพาะ NANA) — เติมอัตโนมัติทุกเดือนถ้าไม่มี record
export const FLOOR1_RENT_DEFAULT = 23000

// อาคารที่อนุญาตให้แสดง/บันทึก "ค่าเช่าอาคารชั้น 1"
export const FLOOR1_RENT_ELIGIBLE_BUILDINGS = ['NANA'] as const

// อาคารที่อนุญาตให้แสดง/บันทึก "ค่าทำความสะอาด Bitterwell"
export const BITTERWELL_ELIGIBLE_BUILDINGS = ['CT', 'YW', 'NANA'] as const

// ชื่อหมวด/ช่องทางที่ใช้ใน Category table และ incomeByChannel
export const BITTERWELL_CATEGORY_NAME = 'ค่าทำความสะอาด Bitterwell'
export const FLOOR1_RENT_CHANNEL_NAME = 'ค่าเช่าอาคารชั้น 1'

// fieldName ที่ใช้ใน ExpenseHistory สำหรับ special income "ค่าเช่าอาคารชั้น 1"
export const FLOOR1_RENT_FIELD_NAME = 'floor1RentIncome'
