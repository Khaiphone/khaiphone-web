// เติม requests.distance_km ให้งานปิดแล้วที่ค่าเป็น null ผ่าน Routes API
// (พิกัดหมุดก่อน ไม่มีค่อยใช้ที่อยู่ข้อความ)
// วิธีใช้:  node scripts/backfill-distance.mjs           ← dry-run (แสดงอย่างเดียว)
//          node scripts/backfill-distance.mjs --apply   ← เขียนลง DB จริง

import fs from "node:fs";

const APPLY = process.argv.includes("--apply");
const OFFICE = { latitude: 14.0100, longitude: 100.7197 }; // lib/geo-utils.ts

const env = fs.readFileSync(process.cwd() + "/.env.local", "utf8");
const get = (k) => (env.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "");
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const skey = get("SUPABASE_SERVICE_ROLE_KEY") || get("SUPABASE_SERVICE_KEY");
const gkey = get("GOOGLE_MAPS_SERVER_KEY") || get("NEXT_PUBLIC_GOOGLE_MAPS_KEY");
const H = { apikey: skey, Authorization: "Bearer " + skey, "Content-Type": "application/json" };

async function routesKm(destSpec) {
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": gkey, "X-Goog-FieldMask": "routes.distanceMeters" },
    body: JSON.stringify({ origin: { location: { latLng: OFFICE } }, destination: destSpec, travelMode: "DRIVE" }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message?.slice(0, 120) ?? "routes error");
  const m = data?.routes?.[0]?.distanceMeters;
  return typeof m === "number" && m > 0 ? Math.round(m / 100) / 10 : null;
}

const rows = JSON.parse(await (await fetch(
  url + "/rest/v1/requests?rider_id=not.is.null&distance_km=is.null" +
  "&status=in.(completed,cancelled,no_show,rejected)" +
  "&select=id,order_number,appt_lat,appt_lng,appt_location&order=created_at.asc&limit=1000",
  { headers: H },
)).text());

console.log((APPLY ? "APPLY" : "DRY-RUN") + " — งานปิดที่ distance_km = null:", rows.length, "รายการ\n");

// ทดสอบ key ก่อน 1 ครั้ง
try {
  await routesKm({ location: { latLng: { latitude: 13.7563, longitude: 100.5018 } } });
  console.log("✅ Routes API ใช้ได้\n");
} catch (e) {
  console.error("❌ Routes API ใช้ไม่ได้:", e.message);
  console.error("   → เปิด \"Routes API\" ใน Google Cloud Console + เพิ่มใน API restrictions ของ key ฝั่ง server");
  console.error("   → ตั้ง GOOGLE_MAPS_SERVER_KEY ใน .env.local / Vercel แล้วรันใหม่");
  process.exit(1);
}

let ok = 0, fail = 0;
for (const r of rows) {
  const via = r.appt_lat != null && r.appt_lng != null ? "pin" : (r.appt_location ? "address" : "none");
  if (via === "none") { console.log(`  - ${r.order_number}: ข้าม (ไม่มีหมุด/ที่อยู่)`); fail++; continue; }
  const destSpec = via === "pin"
    ? { location: { latLng: { latitude: r.appt_lat, longitude: r.appt_lng } } }
    : { address: r.appt_location };
  try {
    const km = await routesKm(destSpec);
    if (km == null) { console.log(`  - ${r.order_number}: หาเส้นทางไม่ได้ (${via})`); fail++; continue; }
    console.log(`  - ${r.order_number}: ${km} กม. (${via})${APPLY ? " → เขียนแล้ว" : ""}`);
    if (APPLY) {
      await fetch(url + `/rest/v1/requests?id=eq.${r.id}`, {
        method: "PATCH", headers: H, body: JSON.stringify({ distance_km: km }),
      });
    }
    ok++;
    await new Promise(res => setTimeout(res, 120)); // เบรกกัน rate limit
  } catch (e) { console.log(`  - ${r.order_number}: ERROR ${e.message}`); fail++; }
}
console.log(`\nสรุป: สำเร็จ ${ok} · ข้าม/พลาด ${fail}${APPLY ? "" : "  (dry-run — ยังไม่เขียน DB, ใช้ --apply เพื่อเขียนจริง)"}`);
