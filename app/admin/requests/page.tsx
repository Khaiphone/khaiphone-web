"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search, SlidersHorizontal, X } from "lucide-react";
import { fetchDashboardData, fetchRequests } from "@/app/actions/admin-requests";
import { supabase } from "@/lib/supabase";
import type { AdminRequest, RequestStatus } from "@/lib/types/admin";
import RequestCard from "../../components/admin/RequestCard";
import FilterBottomSheet, { type FilterState } from "../../components/admin/FilterBottomSheet";
import { useAdminRole } from "@/app/admin/role-context";
import { cacheGet, cacheSet } from "@/app/admin/cache";

const BG     = "var(--admin-bg)";
const CARD   = "var(--admin-card)";
const BORDER = "var(--admin-border)";
const TEXT   = "var(--admin-text)";
const TEXT2  = "var(--admin-text2)";
const GOLD   = "var(--admin-gold)";

const STATUS_TABS: Array<{ value: RequestStatus | "all"; label: string }> = [
  { value: "all",               label: "ทั้งหมด"          },
  { value: "new",               label: "คำขอใหม่"         },
  { value: "pending",           label: "รอตรวจสอบ"        },
  { value: "contacted",         label: "ติดต่อกลับแล้ว"   },
  { value: "confirmed",         label: "ยืนยันนัดหมาย"    },
  { value: "price_negotiation", label: "รอยืนยันราคา"     },
  { value: "awaiting_transfer", label: "รอโอนเงิน"        },
  { value: "completed",         label: "เสร็จสิ้น"        },
  { value: "cancelled",         label: "ยกเลิกนัดหมาย"   },
  { value: "no_show",           label: "ลูกค้าไม่อยู่"   },
  { value: "rejected",          label: "ไม่เข้าเงื่อนไข" },
  { value: "unreachable",       label: "ติดต่อไม่ได้"    },
  { value: "out_of_area",       label: "นอกพื้นที่"      },
];

const INIT_FILTER: FilterState = { statuses: [], model: "", priceMin: "", priceMax: "" };

export default function RequestsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [requests,      setRequests]      = useState<AdminRequest[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState<RequestStatus | "all">(() => {
    const t = searchParams.get("tab") as RequestStatus | "all" | null;
    return t ?? "all";
  });
  const [query,         setQuery]         = useState("");
  const [filter,        setFilter]        = useState<FilterState>(INIT_FILTER);
  const [showFilter,    setShowFilter]    = useState(false);
  const [assignedOnly,  setAssignedOnly]  = useState(false);
  const staffUserIdRef = useRef<string | undefined>(undefined);
  const lastRefetchRef = useRef(0);

  const { userId } = useAdminRole();

  useEffect(() => {
    if (!userId) return;
    const cached = cacheGet<AdminRequest[]>("admin:requests");
    if (cached) { setRequests(cached); setLoading(false); }
    fetchDashboardData(userId).then(data => {
      staffUserIdRef.current = data.staffUserId;
      if (data.staffUserId) setAssignedOnly(true);
      setRequests(data.requests);
      cacheSet("admin:requests", data.requests);
      setLoading(false);
    });
  }, [userId]);

  useEffect(() => {
    const refetch = () => {
      const now = Date.now();
      if (now - lastRefetchRef.current < 30_000) return;
      lastRefetchRef.current = now;
      fetchRequests(staffUserIdRef.current).then(d => { setRequests(d); cacheSet("admin:requests", d); });
    };

    // Realtime — รับคำขอใหม่ + สถานะเปลี่ยนทันที
    const channel = supabase
      .channel("admin-requests-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "requests" }, refetch)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "requests" }, refetch)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "requests" }, refetch)
      .subscribe();

    window.addEventListener("focus", refetch);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", refetch);
    };
  }, []);

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (tab !== "all" && r.status !== tab) return false;
      if (query) {
        const q = query.toLowerCase();
        const match = r.orderNumber.toLowerCase().includes(q)
          || r.customer.name.includes(q)
          || r.customer.phone.includes(q)
          || r.device.model.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filter.statuses.length && !filter.statuses.includes(r.status)) return false;
      if (filter.model && r.device.model !== filter.model) return false;
      if (filter.priceMin && r.device.estimatedPrice < Number(filter.priceMin)) return false;
      if (filter.priceMax && r.device.estimatedPrice > Number(filter.priceMax)) return false;
      return true;
    });
  }, [requests, tab, query, filter]);

  const activeFilters = filter.statuses.length + (filter.model ? 1 : 0) + (filter.priceMin || filter.priceMax ? 1 : 0);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: requests.length };
    requests.forEach(r => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [requests]);

  return (
    <div style={{ minHeight: "100vh", background: BG, overflowX: "hidden", maxWidth: "100vw" }}>
      {/* Sticky header */}
      <div style={{ position: "sticky", top: 0, background: CARD, zIndex: 10, borderBottom: `1px solid ${BORDER}`, overflowX: "hidden", paddingTop: "env(safe-area-inset-top)" }}>
        <div style={{ padding: "10px 12px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <button onClick={() => router.push("/admin/dashboard")} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 4, display: "flex" }}>
              <ArrowLeft size={20} />
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{ color: TEXT, fontSize: "17px", fontWeight: 700, margin: 0 }}>
                {assignedOnly ? "คำขอของฉัน" : "คำขอทั้งหมด"}
              </h1>
              {assignedOnly && (
                <p style={{ color: TEXT2, fontSize: 11, margin: "1px 0 0" }}>แสดงเฉพาะที่ถูก assign ให้</p>
              )}
            </div>
            <button
              onClick={() => setShowFilter(true)}
              style={{ position: "relative", background: "var(--admin-bg)", border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: TEXT2, fontFamily: "inherit", fontSize: "13px" }}
            >
              <SlidersHorizontal size={16} />
              {activeFilters > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, background: GOLD, color: "#fff", fontSize: "9px", fontWeight: 700, padding: "1px 4px", borderRadius: "999px" }}>
                  {activeFilters}
                </span>
              )}
            </button>
          </div>

          <div style={{ position: "relative", marginBottom: "10px" }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: TEXT2 }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ค้นหาเลขคำขอ ชื่อ เบอร์โทร"
              style={{ width: "100%", background: "var(--admin-bg)", border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "9px 36px", color: TEXT, fontSize: "16px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 0, display: "flex" }}>
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "5px", overflowX: "auto", paddingBottom: "10px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            {STATUS_TABS.map(({ value, label }) => {
              const active = tab === value;
              const count  = counts[value] ?? 0;
              return (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  style={{ flexShrink: 0, padding: "6px 11px", borderRadius: "999px", border: active ? "1px solid rgba(184,134,11,0.3)" : `1px solid ${BORDER}`, cursor: "pointer", fontSize: "12px", fontWeight: active ? 700 : 500, background: active ? "var(--admin-gold-bg)" : "var(--admin-bg)", color: active ? "var(--admin-gold-text)" : TEXT2, touchAction: "manipulation", fontFamily: "inherit", whiteSpace: "nowrap", minHeight: "34px" }}
                >
                  {label} {count > 0 && <span style={{ opacity: 0.7 }}>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ padding: "10px 12px" }}>
        {loading ? (
          <div style={{ textAlign: "center", paddingTop: "60px", color: TEXT2 }}>
            <p style={{ fontSize: "15px" }}>กำลังโหลด...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: "60px" }}>
            <p style={{ fontSize: "15px", color: TEXT2 }}>
              {requests.length === 0
                ? (assignedOnly ? "ยังไม่มีคำขอที่ถูก assign ให้คุณ" : "ยังไม่มีคำขอ")
                : "ไม่พบคำขอที่ตรงกัน"}
            </p>
          </div>
        ) : (
          filtered.map(r => <RequestCard key={r.id} request={r} />)
        )}
      </div>

      {showFilter && (
        <FilterBottomSheet
          initial={filter}
          totalCount={filtered.length}
          onApply={f => { setFilter(f); setShowFilter(false); }}
          onClose={() => setShowFilter(false)}
        />
      )}
    </div>
  );
}
