-- บัญชี "ของเรา" ที่จ่ายเงินซื้อเครื่อง (เงินออก) — อ่านจากสลิปอัตโนมัติ หรือกรอกเอง
-- แยกจาก payment_bank / payment_account_* เดิม ซึ่งเป็นบัญชี "ลูกค้า" (ผู้รับเงิน)
ALTER TABLE requests ADD COLUMN IF NOT EXISTS paid_from_bank text;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS paid_from_owner text;
