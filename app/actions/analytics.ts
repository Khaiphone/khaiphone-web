"use server";

import { createServerClient } from "@/lib/supabase-server";

export async function trackEstimateEvent(params: {
  sessionId: string;
  event: "start" | "step_reached" | "price_seen" | "submit";
  model?: string;
  stepIndex?: number;
  stepName?: string;
}): Promise<void> {
  const supabase = createServerClient();
  await supabase.from("estimate_events").insert({
    session_id: params.sessionId,
    event:      params.event,
    model:      params.model ?? null,
    step_index: params.stepIndex ?? null,
    step_name:  params.stepName ?? null,
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

export interface EstimateAnalytics {
  daily: DailyCount[];
  funnel: FunnelStep[];
  models: ModelCount[];
  todayStarts: number;
  todayPriceSeen: number;
  todaySubmits: number;
  totalStarts: number;
  completionRate: number;
  topDropStep: string;
}

const FUNNEL_STEP_NAMES = [
  "เริ่มต้น", "ความจุ", "Model", "ประกัน", "ตัวเครื่อง",
  "หน้าจอ", "การแสดงภาพ", "แบตเตอรี่", "อุปกรณ์", "iCloud",
  "เห็นราคา", "นัดหมายสำเร็จ",
];

export async function fetchEstimateAnalytics(): Promise<EstimateAnalytics> {
  const supabase = createServerClient();
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("estimate_events")
    .select("session_id, event, model, step_index, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  const rows = data ?? [];

  // Build per-session summary
  type Session = { maxStep: number; submitted: boolean; priceSeen: boolean; model: string; date: string };
  const sessionMap = new Map<string, Session>();
  for (const row of rows) {
    if (!sessionMap.has(row.session_id)) {
      sessionMap.set(row.session_id, {
        maxStep: -1, submitted: false, priceSeen: false,
        model: row.model ?? "", date: row.created_at.slice(0, 10),
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

  // Daily counts — last 30 days
  const dailyMap = new Map<string, DailyCount>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
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

  // Funnel: index 0=started, 1-9=reached wizard step, 10=price_seen, 11=submitted
  const funnelCounts = Array.from({ length: 12 }, (_, i) => {
    if (i === 0)  return totalStarts;
    if (i === 10) return sessions.filter(s => s.priceSeen).length;
    if (i === 11) return sessions.filter(s => s.submitted).length;
    return sessions.filter(s => s.maxStep >= i).length;
  });
  const funnel: FunnelStep[] = FUNNEL_STEP_NAMES.map((name, i) => ({
    stepIndex: i, stepName: name,
    count: funnelCounts[i],
    pct: totalStarts > 0 ? Math.round((funnelCounts[i] / totalStarts) * 100) : 0,
  }));

  // Top drop-off step
  let topDropStep = "ไม่มีข้อมูล";
  let maxDrop = 0;
  for (let i = 1; i < funnelCounts.length; i++) {
    const drop = funnelCounts[i - 1] - funnelCounts[i];
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

  const today = new Date().toISOString().slice(0, 10);
  const todayData = dailyMap.get(today) ?? { starts: 0, priceSeen: 0, submits: 0, date: today };

  return {
    daily, funnel, models,
    todayStarts: todayData.starts,
    todayPriceSeen: todayData.priceSeen,
    todaySubmits: todayData.submits,
    totalStarts,
    completionRate: totalStarts > 0 ? Math.round((sessions.filter(s => s.submitted).length / totalStarts) * 100) : 0,
    topDropStep,
  };
}
