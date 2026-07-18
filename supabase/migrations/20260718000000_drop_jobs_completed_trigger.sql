-- ลบ trigger นับงานซ้ำ: trg_rider_jobs_completed บวก jobs_completed ตอน status→completed
-- ซ้ำกับ finishJobCleanup (app/actions/rider.ts) ที่บวกตอนไรเดอร์ปิดงาน → ทุกงาน +2
-- เหลือ writer เดียวคือฝั่งแอพ (พิสูจน์จากข้อมูล: jobs_attempted ฝั่งแอพตรงกับงานจริงเป๊ะ)

DROP TRIGGER IF EXISTS trg_rider_jobs_completed ON requests;
DROP FUNCTION IF EXISTS increment_rider_jobs_completed();
