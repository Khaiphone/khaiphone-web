-- ตาราง config ของ CEO Dashboard (แถวเดียว id=1) — ใช้ใน getCeoSettings/saveCeoSettings
create table if not exists ceo_settings (
  id              integer primary key default 1,
  target_revenue  numeric  default 0,   -- เป้ารายได้/เดือน
  target_profit   numeric  default 0,   -- เป้ากำไรขั้นต้น/เดือน
  target_acquired integer  default 0,   -- เป้าจำนวนเครื่องรับซื้อ/เดือน
  target_sold     integer  default 0,   -- เป้าจำนวนเครื่องขาย/เดือน
  ads_budget      numeric  default 0,   -- งบโฆษณา/เดือน
  ad_spend        numeric  default 0,   -- ยอดใช้จ่ายโฆษณา (fallback ถ้าไม่ผูกหมวด)
  ads_category    text     default '',  -- หมวดค่าใช้จ่ายใน Finance ที่ถือเป็นค่าโฆษณา
  safe_buffer     numeric  default 0,   -- เงินกันชนที่ต้องเหลือ
  updated_at      timestamptz default now(),
  constraint ceo_settings_single_row check (id = 1)
);

-- เข้าถึงผ่าน server action (service role) เท่านั้น
alter table ceo_settings enable row level security;
