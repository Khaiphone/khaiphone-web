"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, MapPin, Clock, Bell, Smartphone, Save, Send,
  CheckCircle2, XCircle, Loader2, RefreshCw, Target,
} from "lucide-react";
import {
  fetchRiderSystemSettings, updateRiderSystemSettings,
  fetchRiderPushStatus, broadcastToRiders,
} from "@/app/actions/rider-settings";
import type { RiderSystemSettings, RiderPushStatus } from "@/app/actions/rider-settings";

const BG     = "var(--admin-bg)";
const CARD   = "var(--admin-card)";
const BORDER = "var(--admin-border)";
const TEXT   = "var(--admin-text)";
const TEXT2  = "var(--admin-text2)";
const TEXT3  = "var(--admin-text3)";
const GOLD   = "var(--admin-gold)";
const GREEN  = "#10B981";
const RED    = "#EF4444";
const BLUE   = "#3B82F6";
const DARK   = "#1a1a2e";

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ color: GOLD }}>{icon}</div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TEXT }}>{title}</p>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: TEXT }}>{label}</p>
      {hint && <p style={{ margin: "0 0 6px", fontSize: 11, color: TEXT3 }}>{hint}</p>}
      {children}
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: BG, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
    />
  );
}

function SaveBtn({ loading, onClick, label = "บันทึก" }: { loading: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, border: "none", background: DARK, color: GOLD, fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.6 : 1, marginTop: 4 }}
    >
      {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
      {loading ? "กำลังบันทึก..." : label}
    </button>
  );
}

export default function RiderSettingsPage() {
  const router = useRouter();

  // ── Settings state ──
  const [loaded,   setLoaded]   = useState(false);
  const [settings, setSettings] = useState<RiderSystemSettings | null>(null);

  // Section saving flags
  const [savingOffice,    setSavingOffice]    = useState(false);
  const [savingTracking,  setSavingTracking]  = useState(false);
  const [savingSLA,       setSavingSLA]       = useState(false);
  const [savedOffice,     setSavedOffice]     = useState(false);
  const [savedTracking,   setSavedTracking]   = useState(false);
  const [savedSLA,        setSavedSLA]        = useState(false);

  // Local editable copies
  const [officeName,        setOfficeName]        = useState("");
  const [officeLat,         setOfficeLat]         = useState("");
  const [officeLng,         setOfficeLng]         = useState("");
  const [timeout,           setTimeout_]          = useState("");
  const [interval,          setInterval_]         = useState("");
  const [radius,            setRadius]            = useState("");
  const [arriveRadius,      setArriveRadius]      = useState("");
  const [dispatchGood,      setDispatchGood]      = useState("");
  const [dispatchWarn,      setDispatchWarn]      = useState("");
  const [arriveOntime,      setArriveOntime]      = useState("");
  const [arriveSlight,      setArriveSlight]      = useState("");
  const [jobFast,           setJobFast]           = useState("");
  const [jobSlight,         setJobSlight]         = useState("");

  // ── Push / Notification state ──
  const [pushStatus,    setPushStatus]    = useState<RiderPushStatus[]>([]);
  const [pushLoading,   setPushLoading]   = useState(false);
  const [bTitle,        setBTitle]        = useState("");
  const [bBody,         setBBody]         = useState("");
  const [broadcasting,  setBroadcasting]  = useState(false);
  const [broadcastMsg,  setBroadcastMsg]  = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchRiderSystemSettings(), fetchRiderPushStatus()]).then(([s, ps]) => {
      setSettings(s);
      setOfficeName(s.office_name);
      setOfficeLat(String(s.office_lat));
      setOfficeLng(String(s.office_lng));
      setTimeout_(String(s.shift_auto_timeout_min));
      setInterval_(String(s.location_interval_sec));
      setRadius(String(s.return_radius_m));
      setArriveRadius(String(s.sla_arrive_radius_m));
      setDispatchGood(String(s.sla_dispatch_good_min));
      setDispatchWarn(String(s.sla_dispatch_warn_min));
      setArriveOntime(String(s.sla_arrive_ontime_min));
      setArriveSlight(String(s.sla_arrive_slight_min));
      setJobFast(String(s.sla_job_fast_min));
      setJobSlight(String(s.sla_job_slight_min));
      setPushStatus(ps);
      setLoaded(true);
    });
  }, []);

  async function saveOffice() {
    setSavingOffice(true);
    const res = await updateRiderSystemSettings({
      office_name: officeName,
      office_lat:  parseFloat(officeLat),
      office_lng:  parseFloat(officeLng),
    });
    setSavingOffice(false);
    if (res.success) { setSavedOffice(true); setTimeout(() => setSavedOffice(false), 3000); }
    else alert(res.error);
  }

  async function saveTracking() {
    setSavingTracking(true);
    const res = await updateRiderSystemSettings({
      shift_auto_timeout_min: parseInt(timeout),
      location_interval_sec:  parseInt(interval),
      return_radius_m:        parseInt(radius),
    });
    setSavingTracking(false);
    if (res.success) { setSavedTracking(true); setTimeout(() => setSavedTracking(false), 3000); }
    else alert(res.error);
  }

  async function saveSLA() {
    setSavingSLA(true);
    const res = await updateRiderSystemSettings({
      sla_arrive_radius_m:   parseInt(arriveRadius),
      sla_dispatch_good_min: parseInt(dispatchGood),
      sla_dispatch_warn_min: parseInt(dispatchWarn),
      sla_arrive_ontime_min: parseInt(arriveOntime),
      sla_arrive_slight_min: parseInt(arriveSlight),
      sla_job_fast_min:      parseInt(jobFast),
      sla_job_slight_min:    parseInt(jobSlight),
    });
    setSavingSLA(false);
    if (res.success) { setSavedSLA(true); setTimeout(() => setSavedSLA(false), 3000); }
    else alert(res.error);
  }

  async function handleBroadcast() {
    if (!bTitle.trim() || !bBody.trim()) return;
    setBroadcasting(true);
    setBroadcastMsg(null);
    const res = await broadcastToRiders(bTitle.trim(), bBody.trim());
    setBroadcasting(false);
    if (res.success) {
      setBroadcastMsg(`✅ ส่งสำเร็จ ${res.sent} อุปกรณ์`);
      setBTitle(""); setBBody("");
    } else {
      setBroadcastMsg(`❌ ${res.error}`);
    }
  }

  async function refreshPush() {
    setPushLoading(true);
    const ps = await fetchRiderPushStatus();
    setPushStatus(ps);
    setPushLoading(false);
  }

  const riderAppUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host.replace("admin.", "")}/rider`
    : "https://admin.khaiphone.com/rider";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(riderAppUrl)}&color=1a1a2e&bgcolor=ffffff&qzone=1&format=svg`;

  const subscribedCount = pushStatus.filter(r => r.hasSubscription).length;

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={28} color={GOLD} style={{ animation: "spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: BG }}>

      {/* ── Header ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "14px 20px", paddingTop: "calc(env(safe-area-inset-top) + 14px)", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 4, display: "flex" }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: TEXT }}>ตั้งค่าระบบไรเดอร์</h1>
          <p style={{ margin: 0, fontSize: 12, color: TEXT3 }}>จัดการการตั้งค่าแอพและระบบ PWA ไรเดอร์</p>
        </div>
      </div>

      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16, maxWidth: 700, margin: "0 auto" }}>

        {/* ══ 1. ออฟฟิศ ══ */}
        <SectionCard icon={<MapPin size={16} />} title="ข้อมูลออฟฟิศ">
          <Field label="ชื่อออฟฟิศ" hint="แสดงในแอพไรเดอร์เมื่อเดินทางกลับ">
            <Input value={officeName} onChange={setOfficeName} placeholder="สำนักงาน Khaiphone" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Latitude" hint="พิกัด GPS แกน Y">
              <Input value={officeLat} onChange={setOfficeLat} type="number" placeholder="14.0100" />
            </Field>
            <Field label="Longitude" hint="พิกัด GPS แกน X">
              <Input value={officeLng} onChange={setOfficeLng} type="number" placeholder="100.7197" />
            </Field>
          </div>
          <a
            href={`https://www.google.com/maps?q=${officeLat},${officeLng}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: BLUE, marginBottom: 14, textDecoration: "none" }}
          >
            <MapPin size={12} /> ดูบน Google Maps
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SaveBtn loading={savingOffice} onClick={saveOffice} />
            {savedOffice && <span style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>✓ บันทึกแล้ว</span>}
          </div>
        </SectionCard>

        {/* ══ 2. Shift & Tracking ══ */}
        <SectionCard icon={<Clock size={16} />} title="Shift & Tracking">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Auto-timeout (นาที)" hint="ปิด shift อัตโนมัติถ้าไม่มี heartbeat">
              <Input value={timeout} onChange={setTimeout_} type="number" placeholder="60" />
            </Field>
            <Field label="Location interval (วินาที)" hint="ความถี่ส่งพิกัดของไรเดอร์">
              <Input value={interval} onChange={setInterval_} type="number" placeholder="30" />
            </Field>
            <Field label="รัศมีถึงออฟฟิศ (เมตร)" hint="ระยะที่ถือว่าถึงออฟฟิศแล้ว">
              <Input value={radius} onChange={setRadius} type="number" placeholder="500" />
            </Field>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SaveBtn loading={savingTracking} onClick={saveTracking} />
            {savedTracking && <span style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>✓ บันทึกแล้ว</span>}
          </div>
          <div style={{ marginTop: 16, padding: "12px 14px", background: `${GOLD}10`, border: `1px solid ${GOLD}30`, borderRadius: 10 }}>
            <p style={{ margin: 0, fontSize: 12, color: TEXT2, lineHeight: 1.7 }}>
              ⚠️ การเปลี่ยนค่า <strong>location interval</strong> และ <strong>รัศมีออฟฟิศ</strong> มีผลเมื่อไรเดอร์เปิดแอพใหม่ครั้งถัดไป
            </p>
          </div>
        </SectionCard>

        {/* ══ 3. SLA ══ */}
        <SectionCard icon={<Target size={16} />} title="SLA Threshold">
          <p style={{ margin: "0 0 14px", fontSize: 12, color: TEXT3, lineHeight: 1.6 }}>
            กำหนดเกณฑ์เวลาและระยะทางสำหรับรายงาน SLA
          </p>
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: TEXT2 }}>ตรวจสอบพิกัด GPS</p>
          <div style={{ marginBottom: 16 }}>
            <Field label="รัศมีที่ยอมรับได้ (เมตร)" hint="ถ้ากด ถึงแล้ว ขณะห่างจากพิกัดลูกค้าเกินนี้ = flag ใน SLA report">
              <Input value={arriveRadius} onChange={setArriveRadius} type="number" placeholder="500" />
            </Field>
          </div>
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: TEXT2 }}>Planner SLA — จ่ายงานล่วงหน้า</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <Field label="ล่วงหน้า (นาที)" hint="จ่ายงานก่อนนัดอย่างน้อยเท่านี้ = จัดการล่วงหน้าดี">
              <Input value={dispatchGood} onChange={setDispatchGood} type="number" placeholder="120" />
            </Field>
            <Field label="กระทันหัน (นาที)" hint="จ่ายงานก่อนนัดน้อยกว่านี้ = กระทันหัน">
              <Input value={dispatchWarn} onChange={setDispatchWarn} type="number" placeholder="30" />
            </Field>
          </div>
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: TEXT2 }}>Rider SLA — ถึงที่นัดตรงเวลา</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <Field label="ถึงตรงเวลา (นาที)" hint="ถ้ามาช้าไม่เกินนี้ = ตรงเวลา">
              <Input value={arriveOntime} onChange={setArriveOntime} type="number" placeholder="5" />
            </Field>
            <Field label="สายเล็กน้อย (นาที)" hint="ช้าเกินนี้แต่ไม่เกินช่องถัดไป = สายเล็กน้อย">
              <Input value={arriveSlight} onChange={setArriveSlight} type="number" placeholder="20" />
            </Field>
          </div>
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: TEXT2 }}>Rider SLA — เวลาทำงานหลังถึงที่นัด</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="เสร็จเร็ว (นาที)" hint="เสร็จไม่เกินนี้ = เสร็จเร็ว">
              <Input value={jobFast} onChange={setJobFast} type="number" placeholder="30" />
            </Field>
            <Field label="ล่าช้าเล็กน้อย (นาที)" hint="เกินนี้ขึ้นไป = ช้าเกินไป">
              <Input value={jobSlight} onChange={setJobSlight} type="number" placeholder="60" />
            </Field>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
            <SaveBtn loading={savingSLA} onClick={saveSLA} />
            {savedSLA && <span style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>✓ บันทึกแล้ว</span>}
          </div>
        </SectionCard>

        {/* ══ 3. การแจ้งเตือน ══ */}
        <SectionCard icon={<Bell size={16} />} title="การแจ้งเตือน (Push Notification)">

          {/* Broadcast */}
          <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: TEXT }}>ส่งข้อความหาไรเดอร์ทุกคน</p>
          <Field label="หัวข้อ">
            <Input value={bTitle} onChange={setBTitle} placeholder="เช่น: แจ้งเตือนสำคัญ" />
          </Field>
          <Field label="ข้อความ">
            <textarea
              value={bBody}
              onChange={e => setBBody(e.target.value)}
              placeholder="เช่น: กรุณาส่งเครื่องคืนภายในวันนี้"
              rows={3}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: BG, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }}
            />
          </Field>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={handleBroadcast}
              disabled={broadcasting || !bTitle.trim() || !bBody.trim()}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, border: "none", background: broadcasting || !bTitle.trim() || !bBody.trim() ? "#e5e7eb" : DARK, color: broadcasting || !bTitle.trim() || !bBody.trim() ? TEXT3 : GOLD, fontSize: 13, fontWeight: 700, cursor: (broadcasting || !bTitle.trim() || !bBody.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit" }}
            >
              {broadcasting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
              {broadcasting ? "กำลังส่ง..." : `ส่งหาไรเดอร์ (${subscribedCount} คน)`}
            </button>
            {broadcastMsg && <span style={{ fontSize: 12, color: broadcastMsg.startsWith("✅") ? GREEN : RED, fontWeight: 600 }}>{broadcastMsg}</span>}
          </div>

          {/* Rider subscription status */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TEXT }}>
                สถานะการรับแจ้งเตือน
                <span style={{ marginLeft: 8, fontSize: 12, color: TEXT3, fontWeight: 400 }}>({subscribedCount}/{pushStatus.length} คน เปิดแจ้งเตือน)</span>
              </p>
              <button onClick={refreshPush} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", color: TEXT2 }}>
                <RefreshCw size={14} style={pushLoading ? { animation: "spin 1s linear infinite" } : {}} />
              </button>
            </div>
            {pushStatus.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: TEXT3 }}>ยังไม่มีไรเดอร์ในระบบ</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pushStatus.map(r => (
                  <div key={r.userId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: BG, borderRadius: 10, border: `1px solid ${BORDER}` }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: r.hasSubscription ? `${GREEN}20` : `${RED}10`, border: `1.5px solid ${r.hasSubscription ? GREEN : RED}40`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: r.hasSubscription ? GREEN : RED, flexShrink: 0 }}>
                      {r.name.slice(0, 1)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TEXT }}>{r.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: TEXT3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.email}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                      {r.hasSubscription
                        ? <><CheckCircle2 size={14} color={GREEN} /><span style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>เปิดแจ้งเตือน</span></>
                        : <><XCircle size={14} color={RED} /><span style={{ fontSize: 12, color: RED, fontWeight: 600 }}>ปิดแจ้งเตือน</span></>
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        {/* ══ 4. PWA Install ══ */}
        <SectionCard icon={<Smartphone size={16} />} title="PWA Install — แอพไรเดอร์">
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>

            {/* QR code */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ padding: 8, background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="QR Code ไรเดอร์" width={160} height={160} />
              </div>
              <p style={{ margin: 0, fontSize: 11, color: TEXT3, textAlign: "center" }}>สแกนเพื่อติดตั้งแอพ</p>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: TEXT }}>ลิงก์ติดตั้งแอพไรเดอร์</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <code style={{ flex: 1, padding: "8px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: TEXT2, wordBreak: "break-all" }}>
                  {riderAppUrl}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(riderAppUrl)}
                  style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD, fontSize: 12, color: TEXT2, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                >
                  คัดลอก
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: TEXT2 }}>วิธีแนะนำให้ไรเดอร์ติดตั้ง</p>
                {[
                  "iPhone (Safari): กด Share → Add to Home Screen",
                  "Android (Chrome): กด ⋮ → Add to Home Screen / Install App",
                  "หรือส่งลิงก์ผ่าน LINE/WhatsApp",
                ].map((s, i) => (
                  <p key={i} style={{ margin: 0, fontSize: 12, color: TEXT3, display: "flex", gap: 6 }}>
                    <span style={{ color: GOLD, fontWeight: 700 }}>{i + 1}.</span> {s}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Per-rider install status */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
            <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: TEXT }}>
              สถานะการติดตั้ง PWA
              <span style={{ marginLeft: 8, fontSize: 12, color: TEXT3, fontWeight: 400 }}>
                (ประมาณจาก push subscription)
              </span>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pushStatus.map(r => (
                <div key={r.userId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: BG, borderRadius: 10, border: `1px solid ${BORDER}` }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TEXT }}>{r.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: TEXT3 }}>{r.subCount > 0 ? `${r.subCount} อุปกรณ์` : "ยังไม่มีการลงทะเบียน"}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: r.hasSubscription ? `${GREEN}15` : `${RED}10`, color: r.hasSubscription ? GREEN : RED }}>
                    {r.hasSubscription ? `✓ ติดตั้งแล้ว (${r.subCount})` : "ยังไม่ติดตั้ง"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
