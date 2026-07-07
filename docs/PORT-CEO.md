# พอร์ต CEO "Mission Control" Dashboard ไปโปรเจคอื่น (โค้ดเบสเดียวกัน)

คู่มือย้าย feature CEO Dashboard จากโปรเจคนี้ไปโปรเจคที่ copy ไปก่อนมี CEO
โค้ดเบสเดียวกัน (Next.js App Router + Supabase) → ก็อปไฟล์ + ต่อ DB ได้เลย ไม่ต้องเขียนใหม่

## 1. ก็อปไฟล์ CEO (ใหม่ทั้งหมด — วางได้เลย)
```
app/ceo/                                    # ทั้งโฟลเดอร์ (11 ไฟล์: layout, CeoLayoutClient, ui, MonthContext, 7 หน้า)
app/actions/ceo.ts                          # data engine (Business Score, funnel, ads perf, month picker)
public/ceo-manifest.json                    # PWA manifest ของ CEO
supabase/migrations/20260707000000_ceo_settings.sql
```

## 2. Merge เข้าไฟล์เดิม
`proxy.ts` → เพิ่มใน `SUBDOMAIN_MAP`:
```ts
ceo: "/ceo",
```
(+ ลอก logic pass-through ของ `/ceo` ถ้ามี)

## 3. Dependency ที่ `app/actions/ceo.ts` ต้องมี (ถ้าโปรเจคเก่าไม่มี → ก็อปตามมา)
- `app/actions/finance.ts` → `fetchFinanceDashboard`, `fetchFinanceCashFlow`, `fetchForecast`, `fetchStockAging`, `fetchExpenses`
- `app/actions/analytics.ts` → `fetchEstimateAnalytics` (+ `trackEstimateEvent`, ตาราง `estimate_events`)
- `app/actions/admin-users.ts` → `fetchMyProfile`
- `lib/require-auth`, `lib/supabase-server`, `app/components/AppSplash`

## 4. DB objects ใน Supabase ของโปรเจคปลายทาง
- ✅ รัน `supabase/migrations/20260707000000_ceo_settings.sql`
- ✅ รัน migration perf indexes ที่มีในโฟลเดอร์
- ⚠️ `estimate_events` (ตาราง) + `estimate_analytics` (RPC) — สำหรับหน้าโฆษณา estimate funnel
  ถ้าโปรเจคปลายทางยังไม่มี ต้องสร้าง (ขอ SQL จากเจ้าของโปรเจคต้นทาง)
- ต้องมีตารางหลักอยู่แล้ว: `requests`, `stocks`, `expenses`, `admin_users`

## 5. Infra / เข้าใช้งาน
- เพิ่ม subdomain `ceo.<domain>` ใน Vercel + DNS
- ต้องมีผู้ใช้ `admin_users.role = 'owner'` (ไม่งั้นเข้า `/ceo` ไม่ได้ → เด้งไป admin)

## หมายเหตุสถาปัตยกรรม
- CEO เข้าได้เฉพาะ role = owner (gate ใน `CeoLayoutClient.tsx`)
- ทุกหน้าอ่านข้อมูลจริงจาก Finance / Stock / Requests — ไม่มี mock
- Business Score ถ่วงน้ำหนัก: เงินทุน .30 / สต็อก .20 / มาร์จิ้น .15 / เป้าหมาย .15 / กำไร .10 / โฆษณา .10
- Month picker default = เดือนปัจจุบัน; หน้าโฆษณา default = "เดือนนี้"
