-- เพิ่มช่อง "ชื่อเจ้าของบัญชี" ให้รายจ่าย (additive, nullable — ไม่กระทบข้อมูลเดิม)
-- payment_account = ธนาคาร, account_owner = ชื่อเจ้าของบัญชี (เพราะใช้บัญชีส่วนตัวหลายคน)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS account_owner text;
