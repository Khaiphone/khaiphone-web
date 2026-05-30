"use server";

import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";

export async function trackEstimateEvent(params: {
  sessionId: string;
  event: "start" | "step_reached" | "price_seen" | "submit";
  model?: string;
  stepIndex?: number;
  stepName?: string;
  storage?: string;
  price?: number;
}): Promise<void> {
  const supabase = createServerClient();
  await supabase.from("estimate_events").insert({
    session_id: params.sessionId,
    event:      params.event,
    model:      params.model   ?? null,
    step_index: params.stepIndex ?? null,
    step_name:  params.stepName  ?? null,
    storage:    params.storage   ?? null,
    price:      params.price     ?? null,
  });
}

export interface DailyCount {
  date: string;
  starts: number;
  priceSeen: number;
  submits: number;
}

export interface FunnelStep {
  stepIndex: number;
  stepName: string;
  count: number;
  pct: number;
}

export interface ModelCount {
  model: string;
  starts: number;
  submits: number;
}

export interface ModelFunnel {
  model: string;
  funnel: FunnelStep[];
}

export interface HourlyCount {
  hour: number;
  count: number;
}

export interface WeekdayCount {
  day: number;
  label: string;
  count: number;
}

export interface StorageCount {
  model: string;
  storage: string;
  count: number;
}

export interface AvgPrice {
  model: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  count: number;
}

export interface EstimateAnalytics {
  daily: DailyCount[];
  funnel: FunnelStep[];
  models: ModelCount[];
  modelFunnels: ModelFunnel[];
  hourly: HourlyCount[];
  weekday: WeekdayCount[];
  storages: StorageCount[];
  avgPrices: AvgPrice[];
  todayStarts: number;
  todayPriceSeen: number;
  todaySubmits: number;
  totalStarts: number;
  completionRate: number;
  topDropStep: string;
}

const FUNNEL_STEP_NAMES = [
  "เริ่มต้น",
  "Model",
  "ประกัน",
  "ตัวเครื่อง",
  "หน้าจอ",
  "การแสดงภาพ",
  "แบตเตอรี่",
  "อุปกรณ์เสริม",
  "iCloud",
  "เห็นราคา",
  "นัดหมายสำเร็จ",
];

const WEEKDAY_LABELS = ["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์", "อาทิตย์"];

type Session = { maxStep: number; submitted: boolean; priceSeen: boolean; model: string; date: string };

function buildFunnel(sessions: Session[], total: number): FunnelStep[] {
  const counts = Array.from({ length: 11 }, (_, i) => {
    if (i === 0)  return total;
    if (i === 9)  return sessions.filter(s => s.priceSeen).length;
    if (i === 10) return sessions.filter(s => s.submitted).length;
    return sessions.filter(s => s.maxStep >= i).length;
  });
  return FUNNEL_STEP_NAMES.map((name, i) => ({
    stepIndex: i, stepName: name,
    count: counts[i],
    pct: total > 0 ? Math.round((counts[i] / total) * 100) : 0,
  }));
}

function toBkkDate(isoUtc: string): string {
  // Convert a UTC ISO timestamp to Bangkok date string (YYYY-MM-DD)
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date(isoUtc));
}

export async function fetchEstimateAnalytics(days = 30): Promise<EstimateAnalytics> {
  await requireAuth();
  const supabase = createServerClient();

  // Bangkok midnight as UTC — e.g. "2026-05-31T00:00:00+07:00" = "2026-05-30T17:00:00Z"
  const bkkToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const bkkMidnightUTC = new Date(bkkToday + "T00:00:00+07:00");
  // Go back (days-1) full days from Bangkok midnight
  const since = new Date(bkkMidnightUTC.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

  const { data } = await supabase
    .from("estimate_events")
    .select("session_id, event, model, step_index, created_at, storage, price")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  const rows = data ?? [];

  // Build per-session summary
  const sessionMap = new Map<string, Session>();
  for (const row of rows) {
    if (!sessionMap.has(row.session_id)) {
      sessionMap.set(row.session_id, {
        maxStep: -1, submitted: false, priceSeen: false,
        model: row.model ?? "", date: toBkkDate(row.created_at),
      });
    }
    const s = sessionMap.get(row.session_id)!;
    if (row.event === "submit")     s.submitted = true;
    if (row.event === "price_seen") s.priceSeen = true;
    if (row.model)                  s.model = row.model;
    if (row.step_index !== null)    s.maxStep = Math.max(s.maxStep, row.step_index);
  }
  const sessions = Array.from(sessionMap.values());
  const totalStarts = sessions.length;

  // Daily counts — keyed by Bangkok date
  const dailyMap = new Map<string, DailyCount>();
  for (let i = days - 1; i >= 0; i--) {
    const dayUTC = new Date(bkkMidnightUTC.getTime() - i * 24 * 60 * 60 * 1000);
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(dayUTC);
    dailyMap.set(key, { date: key, starts: 0, priceSeen: 0, submits: 0 });
  }
  for (const s of sessions) {
    const d = dailyMap.get(s.date);
    if (!d) continue;
    d.starts++;
    if (s.priceSeen) d.priceSeen++;
    if (s.submitted) d.submits++;
  }
  const daily = Array.from(dailyMap.values());

  // Overall funnel
  const funnel = buildFunnel(sessions, totalStarts);

  // Top drop-off step
  let topDropStep = "ไม่มีข้อมูล";
  let maxDrop = 0;
  for (let i = 1; i < funnel.length; i++) {
    const drop = funnel[i - 1].count - funnel[i].count;
    if (drop > maxDrop) { maxDrop = drop; topDropStep = FUNNEL_STEP_NAMES[i]; }
  }

  // Models
  const modelMap = new Map<string, { starts: number; submits: number }>();
  for (const s of sessions) {
    if (!s.model) continue;
    if (!modelMap.has(s.model)) modelMap.set(s.model, { starts: 0, submits: 0 });
    const m = modelMap.get(s.model)!;
    m.starts++;
    if (s.submitted) m.submits++;
  }
  const models: ModelCount[] = Array.from(modelMap.entries())
    .map(([model, v]) => ({ model, ...v }))
    .sort((a, b) => b.starts - a.starts)
    .slice(0, 10);

  // Per-model funnel (top 10)
  const modelFunnels: ModelFunnel[] = models.map(m => {
    const mSessions = sessions.filter(s => s.model === m.model);
    return { model: m.model, funnel: buildFunnel(mSessions, mSessions.length) };
  });

  // Hourly distribution (Bangkok UTC+7) — from start events
  const hourlyCounts = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
  for (const row of rows) {
    if (row.event !== "start") continue;
    const bkkHour = (new Date(row.created_at).getUTCHours() + 7) % 24;
    hourlyCounts[bkkHour].count++;
  }
  const hourly = hourlyCounts;

  // Day of week (0=Mon … 6=Sun) — from start events
  const weekdayCounts = Array.from({ length: 7 }, (_, d) => ({ day: d, label: WEEKDAY_LABELS[d], count: 0 }));
  for (const row of rows) {
    if (row.event !== "start") continue;
    // JS getDay: 0=Sun,1=Mon…6=Sat → convert to 0=Mon…6=Sun
    const jsDay = new Date(row.created_at).getDay();
    const idx = jsDay === 0 ? 6 : jsDay - 1;
    weekdayCounts[idx].count++;
  }
  const weekday = weekdayCounts;

  // Storage breakdown — from price_seen events with storage column
  const storageMap = new Map<string, number>();
  for (const row of rows) {
    if (row.event !== "price_seen" || !row.storage || !row.model) continue;
    const key = `${row.model}||${row.storage}`;
    storageMap.set(key, (storageMap.get(key) ?? 0) + 1);
  }
  const storages: StorageCount[] = Array.from(storageMap.entries())
    .map(([k, count]) => { const [model, storage] = k.split("||"); return { model, storage, count }; })
    .sort((a, b) => b.count - a.count);

  // Average price per model — from price_seen events with price column
  const priceMap = new Map<string, number[]>();
  for (const row of rows) {
    if (row.event !== "price_seen" || !row.price || !row.model) continue;
    if (!priceMap.has(row.model)) priceMap.set(row.model, []);
    priceMap.get(row.model)!.push(row.price);
  }
  const avgPrices: AvgPrice[] = Array.from(priceMap.entries())
    .map(([model, prices]) => ({
      model,
      avgPrice: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      count: prices.length,
    }))
    .sort((a, b) => b.count - a.count);

  const today = bkkToday;
  const todayData = dailyMap.get(today) ?? { starts: 0, priceSeen: 0, submits: 0, date: today };

  return {
    daily, funnel, models, modelFunnels,
    hourly, weekday, storages, avgPrices,
    todayStarts:    todayData.starts,
    todayPriceSeen: todayData.priceSeen,
    todaySubmits:   todayData.submits,
    totalStarts,
    completionRate: totalStarts > 0 ? Math.round((sessions.filter(s => s.submitted).length / totalStarts) * 100) : 0,
    topDropStep,
  };
}
