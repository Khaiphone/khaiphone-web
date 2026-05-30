/**
 * One-time backfill: populate physical_checks, battery_health, cycle_count,
 * and grade on stock entries that were created before the inspection-mapping fix.
 *
 * Run: node scripts/backfill-inspection.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Load .env.local if running locally
try {
  const env = readFileSync(".env.local", "utf8");
  for (const line of env.split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  }
} catch { /* no .env.local, rely on process.env */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function mapInspection(insp, stock) {
  return {
    grade: insp.result === "matched" ? "A" : insp.result === "adjusted" ? "B" : "A",
    battery_health: insp.batteryHealth ?? 0,
    cycle_count: insp.batteryCycles ?? 0,
    physical_checks: [
      ...(insp.criteria ?? []).map((c) => ({
        label: c.label,
        condition: c.pass ? "ปกติ" : (c.actual?.trim() || "มีตำหนิ"),
      })),
      ...(insp.functionalTests ?? []).map((t) => ({
        label: t.label,
        condition: t.pass ? "ปกติ" : "มีปัญหา",
      })),
    ],
    inspection_snapshot: {
      ...(stock.inspection_snapshot ?? {}),
      result:          insp.result          ?? null,
      batteryHealth:   insp.batteryHealth   ?? null,
      batteryCycles:   insp.batteryCycles   ?? null,
      criteria:        insp.criteria        ?? [],
      functionalTests: insp.functionalTests ?? [],
      issues:          insp.issues          ?? [],
    },
  };
}

async function run() {
  // 1. Fetch all stocks that have a request_ref
  const { data: stocks, error: stockErr } = await supabase
    .from("stocks")
    .select("id, request_ref, grade, battery_health, cycle_count, physical_checks, inspection_snapshot")
    .not("request_ref", "is", null);

  if (stockErr) {
    console.error("Failed to fetch stocks:", stockErr.message);
    process.exit(1);
  }

  console.log(`Found ${stocks.length} stock entries with request_ref\n`);

  let updated = 0;
  let skipped = 0;
  let noInspection = 0;

  for (const stock of stocks) {
    // 2. Find the matching request
    const { data: req, error: reqErr } = await supabase
      .from("requests")
      .select("inspection")
      .eq("order_number", stock.request_ref)
      .single();

    if (reqErr || !req) {
      console.log(`  [SKIP] ${stock.id} — request not found for ref ${stock.request_ref}`);
      skipped++;
      continue;
    }

    const insp = req.inspection;
    if (!insp || (!insp.criteria?.length && !insp.functionalTests?.length && !insp.batteryHealth && !insp.batteryCycles)) {
      console.log(`  [SKIP] ${stock.id} — no inspection data in request`);
      noInspection++;
      continue;
    }

    const patch = mapInspection(insp, stock);

    const { error: updateErr } = await supabase
      .from("stocks")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", stock.id);

    if (updateErr) {
      console.error(`  [FAIL] ${stock.id} — ${updateErr.message}`);
      skipped++;
    } else {
      console.log(`  [OK]   ${stock.id} → grade=${patch.grade}, battery=${patch.battery_health}%, cycles=${patch.cycle_count}, checks=${patch.physical_checks.length}`);
      updated++;
    }
  }

  console.log(`\n─── Done ───`);
  console.log(`  Updated:      ${updated}`);
  console.log(`  No inspection: ${noInspection}`);
  console.log(`  Skipped/Error: ${skipped}`);
}

run();
