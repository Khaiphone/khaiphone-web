"use server";

import { createServerClient } from "@/lib/supabase-server";

export interface HealthCheck {
  name: string;
  status: "ok" | "warn" | "error";
  message: string;
  latencyMs?: number;
}

export interface HealthReport {
  checks: HealthCheck[];
  checkedAt: string;
  overallStatus: "ok" | "warn" | "error";
  stats: {
    todayRequests: number;
    todayEstimates: number;
    openRequests: number;
    totalStock: number;
  };
}

export async function fetchHealthReport(): Promise<HealthReport> {
  const supabase = createServerClient();
  const checks: HealthCheck[] = [];

  // ── DB ping ──────────────────────────────────────────────────────────────────
  const dbStart = Date.now();
  try {
    const { error } = await supabase.from("requests").select("id", { count: "exact", head: true });
    checks.push({
      name: "Database",
      status: error ? "error" : "ok",
      message: error ? error.message : "เชื่อมต่อสำเร็จ",
      latencyMs: Date.now() - dbStart,
    });
  } catch (e) {
    checks.push({ name: "Database", status: "error", message: String(e), latencyMs: Date.now() - dbStart });
  }

  // ── Storage bucket: inspection-photos ───────────────────────────────────────
  const s1Start = Date.now();
  try {
    const { error } = await supabase.storage.from("inspection-photos").list("", { limit: 1 });
    checks.push({
      name: "Storage: inspection-photos",
      status: error ? "error" : "ok",
      message: error ? error.message : "เข้าถึงได้",
      latencyMs: Date.now() - s1Start,
    });
  } catch (e) {
    checks.push({ name: "Storage: inspection-photos", status: "error", message: String(e), latencyMs: Date.now() - s1Start });
  }

  // ── Storage bucket: stock-photos ─────────────────────────────────────────────
  const s2Start = Date.now();
  try {
    const { error } = await supabase.storage.from("stock-photos").list("", { limit: 1 });
    checks.push({
      name: "Storage: stock-photos",
      status: error ? "error" : "ok",
      message: error ? error.message : "เข้าถึงได้",
      latencyMs: Date.now() - s2Start,
    });
  } catch (e) {
    checks.push({ name: "Storage: stock-photos", status: "error", message: String(e), latencyMs: Date.now() - s2Start });
  }

  // ── Estimate events in last hour (warn if zero during business hours) ────────
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const bkkHour = (new Date().getUTCHours() + 7) % 24;
    const { count } = await supabase
      .from("estimate_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since);
    const isDayTime = bkkHour >= 9 && bkkHour < 22;
    const isZero = (count ?? 0) === 0;
    checks.push({
      name: "Estimate Events (1h)",
      status: isDayTime && isZero ? "warn" : "ok",
      message: isDayTime && isZero
        ? "ไม่มี event ในช่วง 1 ชั่วโมงที่ผ่านมา — ระหว่างเวลาทำการ"
        : `${count ?? 0} events ใน 1 ชั่วโมงที่ผ่านมา`,
    });
  } catch (e) {
    checks.push({ name: "Estimate Events (1h)", status: "error", message: String(e) });
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const [reqToday, estToday, openReqs, stockCount] = await Promise.all([
    supabase.from("requests").select("*", { count: "exact", head: true }).gte("created_at", today + "T00:00:00"),
    supabase.from("estimate_events").select("*", { count: "exact", head: true }).eq("event", "start").gte("created_at", today + "T00:00:00"),
    supabase.from("requests").select("*", { count: "exact", head: true }).not("status", "in", '("completed","cancelled","rejected")'),
    supabase.from("stocks").select("*", { count: "exact", head: true }),
  ]);

  const overall = checks.some(c => c.status === "error") ? "error"
    : checks.some(c => c.status === "warn") ? "warn"
    : "ok";

  return {
    checks,
    checkedAt: new Date().toISOString(),
    overallStatus: overall,
    stats: {
      todayRequests: reqToday.count ?? 0,
      todayEstimates: estToday.count ?? 0,
      openRequests: openReqs.count ?? 0,
      totalStock: stockCount.count ?? 0,
    },
  };
}
