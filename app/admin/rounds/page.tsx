"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Phone, Check, MapPin } from "lucide-react";
import { fetchPickupRounds, assignPickupRound, updatePickupZone, type RoundRequest } from "@/app/actions/pickup-rounds";
import { classifyZone, PROVINCE_GROUPS, ROUND_ETA_LABEL } from "@/lib/zones";

const BG     = "var(--admin-bg)";
const CARD   = "var(--admin-card)";
const CARD2  = "var(--admin-bg)";
const BORDER = "var(--admin-border)";
const GOLD   = "var(--admin-gold)";
const GOLDBG = "var(--admin-gold-bg)";
const GOLDTX = "var(--admin-gold-text)";
const TEXT   = "var(--admin-text)";
const TEXT2  = "var(--admin-text2)";
const TEXT3  = "var(--admin-text3)";
const AMBER  = "#B45309";
const AMBERBG= "#FFF7ED";
const AMBERBD= "#F59E0B";
const GREEN  = "#15803D";
const GREENBG= "#F0FDF4";

const baht = (n: number) => "฿" + n.toLocaleString("en-US");
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function PickupRoundsPage() {
  const router = useRouter();
  const [rounds, setRounds] = useState<RoundRequest[]>([]);
  const [counts, setCounts] = useState<{ core: number; round: number; far: number }>({ core: 0, round: 0, far: 0 });
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [roundDate, setRoundDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [editZone, setEditZone] = useState<string | null>(null); // request id being edited
  const [msg, setMsg] = useState("");

  async function load() {
    const data = await fetchPickupRounds();
    setRounds(data.rounds);
    setCounts(data.counts);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const toggle = (id: string) => setSel(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const provinces = [...new Set(rounds.map(r => r.province))];
  const selArr = rounds.filter(r => sel.has(r.id));
  const feeSum = selArr.reduce((s, r) => s + r.serviceFee, 0);

  async function confirmRound() {
    if (!selArr.length || saving) return;
    setSaving(true);
    const res = await assignPickupRound([...sel], roundDate);
    setSaving(false);
    if (!res.success) { setMsg(res.error ?? "ผิดพลาด"); return; }
    setMsg(`✓ จัดรอบวันที่ ${roundDate} · ${selArr.length} ราย`);
    setSel(new Set());
    await load();
    setTimeout(() => setMsg(""), 3000);
  }

  async function saveZone(id: string, province: string) {
    const z = classifyZone(province);
    setSaving(true);
    const res = await updatePickupZone(id, { province, zone: z.zone, serviceFee: z.fee });
    setSaving(false);
    setEditZone(null);
    if (!res.success) { setMsg(res.error ?? "ผิดพลาด"); return; }
    setMsg(`✓ ปรับเป็น ${province}${z.fee ? ` · ค่าบริการ ${baht(z.fee)}` : " · ฟรี"}`);
    await load();
    setTimeout(() => setMsg(""), 3000);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, background: CARD, zIndex: 10, borderBottom: `1px solid ${BORDER}`, paddingTop: "env(safe-area-inset-top)" }}>
        <div style={{ padding: "12px 16px", maxWidth: 820, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 4, display: "flex" }}>
            <ArrowLeft size={22} />
          </button>
          <h1 style={{ color: TEXT, fontSize: 18, fontWeight: 700, margin: 0, flex: 1 }}>จัดรอบเข้าพื้นที่</h1>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "14px 16px 150px" }}>
        {/* Zone summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          {([
            { k: "โซนหลัก (ฟรี)", n: counts.core, u: "รอดำเนินการ", c: GREEN },
            { k: "เข้ารับเป็นรอบ", n: counts.round, u: "รอจัดรอบ", c: AMBER },
            { k: "นอกพื้นที่", n: counts.far, u: "รอส่งพัสดุ", c: "#1D4ED8" },
          ]).map(s => (
            <div key={s.k} style={{ background: CARD, border: `1px solid ${s.c === AMBER ? AMBERBD : BORDER}`, borderRadius: 13, padding: 11 }}>
              <p style={{ margin: "0 0 5px", fontSize: 10.5, color: TEXT2, fontWeight: 600 }}>{s.k}</p>
              <p style={{ margin: 0, fontSize: 23, fontWeight: 800, color: s.c, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{s.n}</p>
              <p style={{ margin: "3px 0 0", fontSize: 10, color: TEXT3 }}>{s.u}</p>
            </div>
          ))}
        </div>

        {msg && (
          <div style={{ background: GREENBG, border: `1px solid ${GREEN}`, color: GREEN, fontSize: 13, fontWeight: 700, padding: "9px 12px", borderRadius: 10, marginBottom: 12 }}>{msg}</div>
        )}

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={22} color={GOLD} style={{ animation: "spin 0.8s linear infinite" }} /></div>
        ) : rounds.length === 0 ? (
          <p style={{ fontSize: 13, color: TEXT2, textAlign: "center", padding: 30 }}>ยังไม่มีคำขอโซน &ldquo;เข้ารับเป็นรอบ&rdquo; ที่รอจัดรอบ</p>
        ) : (
          provinces.map(pv => {
            const group = rounds.filter(r => r.province === pv);
            const allSel = group.every(r => sel.has(r.id));
            return (
              <div key={pv}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, margin: "16px 0 9px" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: TEXT, display: "flex", alignItems: "center", gap: 7 }}>
                    📅 {pv}
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: AMBER, background: AMBERBG, border: `1px solid ${AMBERBD}`, borderRadius: 20, padding: "2px 8px" }}>{group.length} รอคิว</span>
                  </div>
                  <button onClick={() => setSel(prev => { const n = new Set(prev); group.forEach(r => allSel ? n.delete(r.id) : n.add(r.id)); return n; })}
                    style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "7px 12px", borderRadius: 9, border: "none", background: AMBERBD, color: "#3d2600", cursor: "pointer", whiteSpace: "nowrap" }}>
                    {allSel ? "เอาออกทั้งกลุ่ม" : "เลือกทั้งกลุ่ม"}
                  </button>
                </div>

                {group.map(r => {
                  const on = sel.has(r.id);
                  const editing = editZone === r.id;
                  return (
                    <div key={r.id} style={{ background: CARD, border: `1px solid ${on ? GOLD : BORDER}`, borderRadius: 12, padding: "11px 12px", marginBottom: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <button onClick={() => toggle(r.id)} aria-label="เลือก"
                        style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${on ? GOLD : BORDER}`, background: on ? GOLD : CARD, flexShrink: 0, marginTop: 2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                        {on && <Check size={12} color="#fff" strokeWidth={3} />}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: TEXT }}>{r.name}</span>
                          <span style={{ fontSize: 13.5, fontWeight: 800, color: GOLD, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{baht(r.price)}</span>
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: 11.5, color: TEXT2 }}>{r.model}{r.storage ? ` · ${r.storage}` : ""} · #{r.orderNumber}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7, alignItems: "center" }}>
                          {r.serviceFee > 0 ? (
                            <>
                              <span style={tag(AMBER, AMBERBG, AMBERBD)}>ค่าบริการ {baht(r.serviceFee)}</span>
                              <span style={tag(GREEN, GREENBG, GREEN)}>สุทธิ {baht(r.price - r.serviceFee)}</span>
                            </>
                          ) : <span style={tag(GREEN, GREENBG, GREEN)}>ฟรี</span>}
                          {r.apptDate && <span style={tag(TEXT2, CARD2, BORDER)}>สะดวก {r.apptDate}</span>}
                          <a href={`tel:${r.phone}`} style={{ ...tag(GOLDTX, GOLDBG, GOLD), textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}><Phone size={10} /> {r.phone}</a>
                          <button onClick={() => setEditZone(editing ? null : r.id)} style={{ ...tag(TEXT2, CARD2, BORDER), cursor: "pointer", fontFamily: "inherit" }}>
                            <MapPin size={10} style={{ verticalAlign: "-1px", marginRight: 2 }} />แก้โซน
                          </button>
                        </div>

                        {editing && (
                          <div style={{ marginTop: 9, borderTop: `1px dashed ${BORDER}`, paddingTop: 9 }}>
                            <p style={{ margin: "0 0 6px", fontSize: 11, color: TEXT2, fontWeight: 600 }}>เปลี่ยนจังหวัด (คำนวณโซน/ค่าบริการใหม่อัตโนมัติ)</p>
                            <select defaultValue={r.province} onChange={e => e.target.value && saveZone(r.id, e.target.value)}
                              style={{ width: "100%", padding: "9px 10px", borderRadius: 9, border: `1px solid ${BORDER}`, background: CARD, color: TEXT, fontSize: 13, fontFamily: "inherit", appearance: "none" }}>
                              {PROVINCE_GROUPS.map(g => (
                                <optgroup key={g.label} label={g.label}>
                                  {g.provinces.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </optgroup>
                              ))}
                            </select>
                            <p style={{ margin: "6px 0 0", fontSize: 10.5, color: TEXT3 }}>เลือกแล้วบันทึกทันที · โทรยืนยันกับลูกค้าก่อนถ้ากระทบค่าบริการ</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}

        <p style={{ marginTop: 18, fontSize: 11, color: TEXT3, lineHeight: 1.6 }}>
          เลือกหลายรายที่จะเข้ารอบเดียวกัน → เลือกวันรอบ → &ldquo;ยืนยันจัดรอบ&rdquo; · ระบบตั้งวันนัด + เลื่อนสถานะเป็นยืนยันแล้ว (โทรแจ้งลูกค้าเอง) · โซนเข้ารับ ปกติภายใน {ROUND_ETA_LABEL}
        </p>
      </div>

      {/* Batch bar */}
      {selArr.length > 0 && (
        <div style={{ position: "fixed", bottom: "calc(62px + env(safe-area-inset-bottom))", left: 0, right: 0, background: CARD, borderTop: `1px solid ${BORDER}`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", boxShadow: "0 -6px 20px rgba(0,0,0,0.10)", zIndex: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: TEXT, flex: 1, minWidth: 120 }}>
            เลือก {selArr.length} ราย
            <span style={{ display: "block", fontWeight: 500, color: TEXT2, fontSize: 10.5 }}>รวมค่าบริการ {baht(feeSum)} · {[...new Set(selArr.map(r => r.province))].join(", ")}</span>
          </div>
          <input type="date" value={roundDate} min={todayISO()} onChange={e => setRoundDate(e.target.value)}
            style={{ fontFamily: "inherit", fontSize: 12, padding: "7px 8px", borderRadius: 8, border: `1px solid ${BORDER}`, background: BG, color: TEXT }} />
          <button onClick={() => setSel(new Set())} style={{ fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, padding: "8px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD, color: TEXT2, cursor: "pointer" }}>ล้าง</button>
          <button onClick={confirmRound} disabled={saving} style={{ fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, padding: "9px 13px", borderRadius: 9, border: "none", background: GOLD, color: "#231a00", cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "กำลังบันทึก..." : "ยืนยันจัดรอบ →"}
          </button>
        </div>
      )}
    </div>
  );
}

function tag(color: string, bg: string, border: string): React.CSSProperties {
  return { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap", color, background: bg, border: `1px solid ${border}` };
}
