"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Phone, ChevronRight, Search } from "lucide-react";
import { fetchRequests } from "@/app/actions/admin-requests";
import type { AdminRequest } from "@/lib/types/admin";

const BG     = "#F5F5F7";
const CARD   = "#FFFFFF";
const BORDER = "#E5E5E5";
const TEXT   = "#111111";
const TEXT2  = "#666666";
const TEXT3  = "#AAAAAA";
const GOLD   = "#B8860B";

type Customer = {
  name: string;
  phone: string;
  email: string;
  requestCount: number;
  latestRequest: AdminRequest;
  totalValue: number;
};

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchRequests().then(requests => {
      const map = new Map<string, Customer>();
      requests.forEach(r => {
        const key = r.customer.phone.replace(/\D/g, "");
        if (!key) return;
        const existing = map.get(key);
        if (existing) {
          existing.requestCount++;
          existing.totalValue += r.device.actualPrice ?? r.device.estimatedPrice ?? 0;
          if (r.createdAt > existing.latestRequest.createdAt) existing.latestRequest = r;
        } else {
          map.set(key, {
            name: r.customer.name,
            phone: r.customer.phone,
            email: r.customer.email,
            requestCount: 1,
            latestRequest: r,
            totalValue: r.device.actualPrice ?? r.device.estimatedPrice ?? 0,
          });
        }
      });
      setCustomers(Array.from(map.values()).sort((a, b) => b.latestRequest.createdAt.localeCompare(a.latestRequest.createdAt)));
      setLoading(false);
    });
  }, []);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ padding: "52px 16px 32px", maxWidth: 680, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT2, display: "flex", padding: 4 }}>
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 style={{ color: TEXT, fontSize: 20, fontWeight: 700, margin: 0 }}>ลูกค้า</h1>
            <p style={{ color: TEXT3, fontSize: 12, margin: "2px 0 0" }}>{customers.length} คนทั้งหมด</p>
          </div>
        </div>

        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: TEXT3 }} />
          <input
            type="text"
            placeholder="ค้นหาชื่อหรือเบอร์โทร..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 12px 10px 36px",
              border: `1px solid ${BORDER}`, borderRadius: 10,
              fontSize: 14, color: TEXT, background: CARD,
              fontFamily: "inherit", outline: "none",
            }}
          />
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
          {loading ? (
            <p style={{ color: TEXT3, textAlign: "center", padding: "32px 0", fontSize: 14 }}>กำลังโหลด...</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: TEXT3, textAlign: "center", padding: "32px 0", fontSize: 14 }}>ไม่พบลูกค้า</p>
          ) : filtered.map((c, i) => (
            <div
              key={c.phone}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "14px 16px",
                borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : "none",
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                background: `${GOLD}18`, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: GOLD, fontWeight: 700, fontSize: 15 }}>{c.name.charAt(0)}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: TEXT, fontSize: 14, fontWeight: 600, margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Phone size={11} color={TEXT3} />
                  <p style={{ color: TEXT3, fontSize: 12, margin: 0 }}>{c.phone}</p>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ color: TEXT2, fontSize: 12, margin: "0 0 2px" }}>{c.requestCount} คำขอ</p>
                <p style={{ color: TEXT3, fontSize: 11, margin: 0 }}>
                  {new Date(c.latestRequest.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                </p>
              </div>
              <ChevronRight size={14} color={TEXT3} />
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
