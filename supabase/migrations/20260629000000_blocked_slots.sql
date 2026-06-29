-- ปิดช่วงเวลารับถึงที่ (rider) แบบ manual ต่อวันที่ระบุ
-- block_time = 'HH:MM'      → ปิดเฉพาะช่วงเวลานั้น
-- block_time = '__ALLDAY__' → ปิดทั้งวัน (sentinel, ไม่ใช้ NULL เพื่อให้ upsert/unique ทำงานง่าย)
create table if not exists blocked_slots (
  id         uuid primary key default gen_random_uuid(),
  block_date text not null,
  block_time text not null,
  created_at timestamptz default now()
);

-- กันบันทึกซ้ำ (วัน+เวลาเดียวกัน) — ตรงกับ onConflict ใน setSlotBlock
create unique index if not exists blocked_slots_uniq
  on blocked_slots (block_date, block_time);

create index if not exists blocked_slots_date_idx on blocked_slots (block_date);

-- เข้าถึงผ่าน server action (service role) เท่านั้น
alter table blocked_slots enable row level security;
