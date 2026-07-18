// แก้ jobs_completed ใน rider_shifts ที่ถูก trigger นับซ้ำ (x2) ตั้งแต่ 5 มิ.ย.
// นับใหม่จากความจริง: งานของไรเดอร์ที่มี status_log "completed" ในช่วงเวลากะ
// ใช้: node scripts/backfill-shift-jobs.mjs        (dry-run)
//      node scripts/backfill-shift-jobs.mjs --apply
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const get = k => (env.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "");
const url = get("NEXT_PUBLIC_SUPABASE_URL"), key = get("SUPABASE_SERVICE_ROLE_KEY") || get("SUPABASE_SERVICE_KEY");
const H = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
const APPLY = process.argv.includes("--apply");

const fetchAll = async base => { let all = [], off = 0; for (;;) { const r = await (await fetch(url + "/rest/v1/" + base + `&offset=${off}&limit=1000`, { headers: H })).json(); all = all.concat(r); if (r.length < 1000) break; off += 1000; } return all; };

const shifts = await fetchAll("rider_shifts?select=id,rider_id,clocked_in_at,clocked_out_at,jobs_completed&order=clocked_in_at.asc");
const reqs = await fetchAll("requests?rider_id=not.is.null&select=rider_id,status_log");

// ดึงเวลา completed ทุกครั้งของแต่ละไรเดอร์
const completedAt = {};
for (const r of reqs) {
  for (const e of r.status_log ?? []) {
    if (e.status === "completed" && e.timestamp) {
      (completedAt[r.rider_id] ??= []).push(new Date(e.timestamp).getTime());
    }
  }
}

let changed = 0;
for (const s of shifts) {
  const from = new Date(s.clocked_in_at).getTime();
  const to = s.clocked_out_at ? new Date(s.clocked_out_at).getTime() : Date.now();
  const actual = (completedAt[s.rider_id] ?? []).filter(t => t >= from && t <= to).length;
  if (actual !== s.jobs_completed) {
    changed++;
    console.log(`${s.clocked_in_at.slice(0, 10)} | เก็บไว้ ${String(s.jobs_completed).padStart(3)} → จริง ${String(actual).padStart(3)}`);
    if (APPLY) {
      await fetch(url + `/rest/v1/rider_shifts?id=eq.${s.id}`, { method: "PATCH", headers: H, body: JSON.stringify({ jobs_completed: actual }) });
    }
  }
}
console.log(`\n${APPLY ? "แก้แล้ว" : "จะแก้"} ${changed} กะ จากทั้งหมด ${shifts.length} กะ${APPLY ? "" : " — รัน --apply เพื่อบันทึกจริง"}`);
