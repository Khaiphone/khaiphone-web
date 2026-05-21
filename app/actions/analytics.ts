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

export interface ModelFunnel {
  model: string;
  funnel: FunnelStep[];
}

export interface EstimateAnalytics {
  daily: DailyCount[];
  funnel: FunnelStep[];
  models: ModelCount[];
  modelFunnels: ModelFunnel[];
  todayStarts: number;
  todayPriceSeen: number;
  todaySubmits: number;
  totalStarts: number;
  completionRate: number;
  topDropStep: string;
}

// 11 steps: started → 8 wizard steps → price seen → submitted
// step_reached fires at stepIndex 1-8 (step 0 = storage = fires "start" event)
// so maxStep 1 = passed storage+model, maxStep 8 = passed iCloud
const FUNNEL_STEP_NAMES = [
  "เริ่มต้น",      // 0 — start event (at storage step)
  "Model",         // 1 — maxStep >= 1
  "ประกัน",        // 2 — maxStep >= 2
  "ตัวเครื่อง",   // 3 — maxStep >= 3
  "หน้าจอ",        // 4 — maxStep >= 4
  "การแสดงภาพ",   // 5 — maxStep >= 5
  "แบตเตอรี่",    // 6 — maxStep >= 6
  "อุปกรณ์เสริม", // 7 — maxStep >= 7
  "iCloud",        // 8 — maxStep >= 8
  "เห็นราคา",     // 9 — price_seen event
  "นัดหมายสำเร็จ", // 10 — submit event
];

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

export async function fetchEstimateAnalytics(days = 30): Promise<EstimateAnalytics> {
  const supabase = createServerClient();
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("estimate_events")
    .select("session_id, event, model, step_index, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  const rows = data ?? [];

  // Build per-session summary
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

  // Daily counts
  const dailyMap = new Map<string, DailyCount>();
  for (let i = days - 1; i >= 0; i--) {
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

  const today = new Date().toISOString().slice(0, 10);
  const todayData = dailyMap.get(today) ?? { starts: 0, priceSeen: 0, submits: 0, date: today };

  return {
    daily, funnel, models, modelFunnels,
    todayStarts:    todayData.starts,
    todayPriceSeen: todayData.priceSeen,
    todaySubmits:   todayData.submits,
    totalStarts,
    completionRate: totalStarts > 0 ? Math.round((sessions.filter(s => s.submitted).length / totalStarts) * 100) : 0,
    topDropStep,
  };
}
