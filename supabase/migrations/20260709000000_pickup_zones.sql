-- Pickup zones: จังหวัด + โซนรับถึงที่ + ค่าบริการเข้ารับ (เฉพาะช่องทาง Rider)
-- Additive/nullable — ของเดิมไม่กระทบ

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS appt_province text,
  ADD COLUMN IF NOT EXISTS pickup_zone   text,   -- 'core' | 'round' | 'far'
  ADD COLUMN IF NOT EXISTS service_fee   integer; -- ค่าบริการเข้ารับ (บาท) หักจากยอด; null = ไม่มี

-- ช่วยแอดมินกรอง/จัดรอบตามพื้นที่
CREATE INDEX IF NOT EXISTS idx_requests_pickup_zone ON requests (pickup_zone) WHERE pickup_zone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requests_appt_province ON requests (appt_province) WHERE appt_province IS NOT NULL;
