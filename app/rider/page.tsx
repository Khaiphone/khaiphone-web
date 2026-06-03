"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Phone, ChevronRight, Banknote, ArrowUpDown, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchRiderJobs, fetchRiderStats } from "@/app/actions/rider";
import type { AdminRequest } from "@/lib/types/admin";

const BG     = "#0B0B0D";
const CARD   = "#1A1A1C";
const CARD2  = "#222224";
const BORDER = "#2C2C2E";
const GOLD   = "#D4A843";
const GREEN  = "#30D158";
const TEXT   = "#F2F2F7";
const TEXT2  = "#8E8E93";

const STATUS_STEP: Record<string, number> = {
  confirmed: 0, en_route: 1, inspecting: 2,
  price_negotiation: 3, contracting: 3, completed: 4,
};

const STATUS_LABEL: Record<string, string> = {
  confirmed:         "รอออกเดินทาง",
  en_route:          "กำลังเดินทาง",
  inspecting:        "กำลังตรวจเครื่อง",
  price_negotiation: "รอยืนยันราคา",
  contracting:       "กำลังทำสัญญา",
  completed:         "เสร็จสิ้น",
};

function fmt(n: number) { return n.toLocaleString("th-TH"); }

function StatusBadge({ status }: { status: string }) {
  const isActive = ["en_route", "inspecting", "price_negotiation", "contracting"].includes(status);
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
      background: isActive ? "rgba(212,168,67,0.15)" : "rgba(142,142,147,0.15)",
      color: isActive ? GOLD : TEXT2,
    }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function JobCard({ job, onClick }: { job: AdminRequest; onClick: () => void }) {
  const isCash = job.payment.method === "cash";
  const price  = job.device.actualPrice ?? job.device.estimatedPrice;

  return (
    <button onClick={onClick} style={{
      width: "100%", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
      padding: 20, textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 14,
    }}>
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: TEXT }}>{job.customer.name}</p>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: TEXT2 }}>{job.orderNumber}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Device */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: CARD2, borderRadius: 10, padding: "10px 14px" }}>
        <Package size={16} color={GOLD} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: TEXT }}>{job.device.model} {job.device.storage}</p>
          <p style={{ margin: 0, fontSize: 13, color: GOLD, fontWeight: 700 }}>฿{fmt(price)}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: isCash ? "rgba(48,209,88,0.12)" : "rgba(10,132,255,0.12)", borderRadius: 8, padding: "4px 10px" }}>
          {isCash ? <Banknote size={13} color={GREEN} /> : <ArrowUpDown size={13} color="#0A84FF" />}
          <span style={{ fontSize: 12, fontWeight: 600, color: isCash ? GREEN : "#0A84FF" }}>{isCash ? "สด" : "โอน"}</span>
        </div>
      </div>

      {/* Location + Time */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
          <MapPin size={13} color={TEXT2} style={{ flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12, color: TEXT2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {job.appointment.location || "ไม่ระบุที่อยู่"}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>{job.appointment.time}</p>
          <ChevronRight size={14} color={TEXT2} />
        </div>
      </div>
    </button>
  );
}

export default function RiderHomePage() {
  const router = useRouter();
  const [jobs, setJobs]   = useState<AdminRequest[]>([]);
  const [stats, setStats] = useState({ completedJobs: 0, totalEarnings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const [j, s] = await Promise.all([
        fetchRiderJobs(session.user.id),
        fetchRiderStats(session.user.id),
      ]);
      setJobs(j);
      setStats(s);
      setLoading(false);
    });
  }, []);

  const cashTotal = jobs
    .filter(j => j.payment.method === "cash" && j.status !== "completed")
    .reduce((s, j) => s + (j.device.actualPrice ?? j.device.estimatedPrice), 0);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #2C2C2E", borderTopColor: GOLD, animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "งานเดือนนี้", value: `${stats.completedJobs} งาน`, color: TEXT },
          { label: "รายได้เดือนนี้", value: `฿${fmt(stats.totalEarnings)}`, color: GOLD },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>{label}</p>
            <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Cash to carry */}
      {cashTotal > 0 && (
        <div style={{ background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.2)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <Banknote size={20} color={GREEN} />
          <div>
            <p style={{ margin: 0, fontSize: 12, color: GREEN }}>เตรียมเงินสดสำหรับวันนี้</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: GREEN }}>฿{fmt(cashTotal)}</p>
          </div>
        </div>
      )}

      {/* Job list */}
      <div>
        <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>
          งานที่ได้รับมอบหมาย ({jobs.length})
        </p>
        {jobs.length === 0 ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 40, textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 15, color: TEXT2 }}>ไม่มีงานในขณะนี้</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {jobs.map(job => (
              <JobCard key={job.id} job={job} onClick={() => router.push(`/rider/job/${job.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
