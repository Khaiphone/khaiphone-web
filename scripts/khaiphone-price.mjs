// ราคารับซื้ออ้างอิงของ khaiphone ต่อรุ่น (จากตาราง products) — ใช้โดย skill market-prices
// วิธีใช้:  node scripts/khaiphone-price.mjs "iPhone 15 Pro Max"   (เว้นว่าง = ทุกรุ่น)

import fs from "node:fs";
const env = fs.readFileSync(process.cwd() + "/.env.local", "utf8");
const get = (k) => (env.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "");
const url = get("NEXT_PUBLIC_SUPABASE_URL") || get("SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY") || get("SUPABASE_SERVICE_KEY");
const H = { apikey: key, Authorization: "Bearer " + key };

const q = (process.argv[2] || "").trim();
const filter = q ? "&model=ilike.*" + encodeURIComponent(q) + "*" : "";
const res = await fetch(url + "/rest/v1/products?select=model,price_good,storage_prices,updated_at" + filter + "&order=price_good.desc", { headers: H });
const rows = JSON.parse(await res.text());
if (!Array.isArray(rows) || rows.length === 0) { console.log("ไม่พบรุ่น:", q); process.exit(0); }
for (const r of rows) {
  const sp = r.storage_prices ? Object.entries(r.storage_prices).map(([k, v]) => `${k}:฿${Number(v).toLocaleString()}`).join("  ") : "";
  console.log(`${r.model}  |  price_good ฿${Number(r.price_good).toLocaleString()}  ${sp ? "| " + sp : ""}`);
}
