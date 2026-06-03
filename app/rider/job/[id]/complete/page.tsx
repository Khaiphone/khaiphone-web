"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { fetchRiderJob } from "@/app/actions/rider";
import type { AdminRequest } from "@/lib/types/admin";

const BG     = "#0B0B0D";
const CARD   = "#1A1A1C";
const BORDER = "#2C2C2E";
const GOLD   = "#D4A843";
const GREEN  = "#30D158";
const TEXT   = "#F2F2F7";
const TEXT2  = "#8E8E93";

function fmt(n: number) { return n.toLocaleString("th-TH"); }

export default function CompletePage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [job, setJob] = useState<AdminRequest | null>(null);

  useEffect(() => { fetchRiderJob(id).then(setJob); }, [id]);

  const price = job ? (job.device.actualPrice ?? job.device.estimatedPrice) : 0;

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>

      {/* Success icon */}
      <div style={{ marginBottom: 24, animation: "pop 0.4s ease" }}>
        <CheckCircle2 size={72} color={GREEN} strokeWidth={1.5} />
      </div>
      <style>{`@keyframes pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>

      <p style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: TEXT }}>จบงานแล้ว!</p>
      <p style={{ margin: "0 0 32px", fontSize: 14, color: TEXT2 }}>งานเสร็จสมบูรณ์</p>

      {job && (
        <div style={{ width: "100%", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "คำขอ",    value: job.orderNumber },
            { label: "ลูกค้า",  value: job.customer.name },
            { label: "เครื่อง", value: `${job.device.model} ${job.device.storage}` },
            { label: "ราคา",    value: `฿${fmt(price)}`, gold: true },
            { label: "การชำระ", value: job.payment.method === "cash" ? "เงินสด" : "โอนเงิน" },
          ].map(({ label, value, gold }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: TEXT2 }}>{label}</span>
              <span style={{ fontSize: 13, color: gold ? GOLD : TEXT, fontWeight: gold ? 700 : 400 }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
        <a
          href={`/print/receipt/${id}`}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: 14, borderRadius: 14, background: CARD, border: `1px solid ${BORDER}`,
            color: TEXT, fontSize: 14, fontWeight: 600, textDecoration: "none",
          }}
        >
          <ExternalLink size={16} />
          ดูใบสำคัญรับเงิน
        </a>

        <button
          onClick={() => router.replace("/rider")}
          style={{
            padding: 16, borderRadius: 14, background: GOLD, border: "none",
            fontSize: 16, fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "inherit",
          }}
        >
          กลับหน้าหลัก
        </button>
      </div>
    </div>
  );
}
