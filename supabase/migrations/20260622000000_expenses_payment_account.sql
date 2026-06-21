-- เพิ่มช่อง "ชำระจากบัญชีไหน" ให้รายจ่าย (additive, nullable — ไม่กระทบข้อมูลเดิม)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_account text;
