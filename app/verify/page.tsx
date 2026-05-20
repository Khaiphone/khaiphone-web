import { createServerClient } from "@/lib/supabase-server";
import { CheckCircle2, XCircle, ShieldCheck, Smartphone, User, Banknote, Calendar } from "lucide-react";

const DARK  = "#1a1a2e";
const GOLD  = "#c9a84c";

async function fetchForVerify(docId: string) {
  const orderNumber = docId.replace(/-R$/, "");
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("requests")
    .select("order_number, status, created_at, contract_signed_at, customer_name, device_model, device_storage, device_color, actual_price, estimated_price")
    .ilike("order_number", orderNumber)
    .single();
  if (error || !data) return null;
  return data;
}

function maskName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0] + "***";
  return parts[0] + " " + parts[1][0] + "***";
}

function thDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams;

  if (!id) {
    return <NotFound reason="ไม่ระบุเลขที่เอกสาร" />;
  }

  const data = await fetchForVerify(id);

  if (!data) {
    return <NotFound reason={`ไม่พบเอกสารเลขที่ "${id}"`} />;
  }

  const isReceipt    = id.toUpperCase().endsWith("-R");
  const price        = data.actual_price ?? data.estimated_price ?? 0;
  const signedAt     = data.contract_signed_at ?? data.created_at;
  const isCompleted  = data.status === "completed";
  const docLabel     = isReceipt ? "ใบสำคัญรับเงิน" : "สัญญาซื้อขายโทรศัพท์มือถือมือสอง";

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F7", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px 48px" }}>

      {/* Header */}
      <div style={{ width: "100%", maxWidth: 500, background: DARK, borderRadius: 16, padding: "18px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 46, height: 46, background: GOLD, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 800, color: DARK, textAlign: "center", lineHeight: 1.3 }}>
          ขาย<br />iPhone
        </div>
        <div>
          <div style={{ color: GOLD, fontSize: 16, fontWeight: 800 }}>ขายไอโฟน.com</div>
          <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11, marginTop: 1 }}>ตรวจสอบความถูกต้องเอกสาร</div>
        </div>
        <ShieldCheck size={22} color={GOLD} style={{ marginLeft: "auto", flexShrink: 0 }} />
      </div>

      {/* Status card */}
      <div style={{ width: "100%", maxWidth: 500, background: "#FFFFFF", borderRadius: 16, border: `1px solid ${isCompleted ? "#86efac" : "#E5E5E5"}`, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ background: isCompleted ? "#f0fdf4" : "#fef2f2", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          {isCompleted
            ? <CheckCircle2 size={28} color="#16a34a" />
            : <XCircle size={28} color="#dc2626" />
          }
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: isCompleted ? "#15803d" : "#991b1b" }}>
              {isCompleted ? "เอกสารถูกต้อง — ธุรกรรมสำเร็จ" : "ธุรกรรมยังไม่เสร็จสิ้น"}
            </div>
            <div style={{ fontSize: 12, color: isCompleted ? "#166534" : "#b91c1c", marginTop: 2 }}>
              {docLabel}
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Doc number */}
          <Row icon={<ShieldCheck size={16} color={GOLD} />} label="เลขที่เอกสาร">
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: DARK, fontSize: 15 }}>{id.toUpperCase()}</span>
          </Row>

          {/* Device */}
          <Row icon={<Smartphone size={16} color={GOLD} />} label="อุปกรณ์">
            <span style={{ fontWeight: 600, color: DARK }}>
              {data.device_model} {data.device_storage}
              {data.device_color ? ` · ${data.device_color}` : ""}
            </span>
          </Row>

          {/* Customer (masked) */}
          <Row icon={<User size={16} color={GOLD} />} label="ผู้ขาย">
            <span style={{ color: "#444" }}>{maskName(data.customer_name)}</span>
          </Row>

          {/* Price */}
          <Row icon={<Banknote size={16} color={GOLD} />} label="ราคาซื้อขาย">
            <span style={{ fontWeight: 700, color: DARK, fontSize: 16 }}>
              ฿{price.toLocaleString("th-TH")}
            </span>
          </Row>

          {/* Date */}
          <Row icon={<Calendar size={16} color={GOLD} />} label={isReceipt ? "วันที่รับเงิน" : "วันที่ทำสัญญา"}>
            <span style={{ color: "#444" }}>{thDate(signedAt)}</span>
          </Row>

        </div>
      </div>

      {/* Footer note */}
      <div style={{ width: "100%", maxWidth: 500, background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 12, padding: "12px 16px", fontSize: 12, color: "#92400E", lineHeight: 1.6 }}>
        <strong>หมายเหตุ:</strong> หน้านี้แสดงข้อมูลสรุปเพื่อยืนยันความถูกต้องของเอกสารเท่านั้น
        ชื่อลูกค้าแสดงบางส่วนเพื่อคุ้มครองข้อมูลส่วนบุคคล (PDPA)
      </div>

    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <div style={{ width: 28, height: 28, background: "rgba(201,168,76,.1)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "#AAAAAA", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}

function NotFound({ reason }: { reason: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F7", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 400, background: "#FFFFFF", borderRadius: 16, border: "1px solid #fecaca", overflow: "hidden" }}>
        <div style={{ background: "#fef2f2", padding: "20px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <XCircle size={40} color="#dc2626" />
          <div style={{ fontSize: 16, fontWeight: 700, color: "#991b1b", textAlign: "center" }}>ไม่พบเอกสาร</div>
          <div style={{ fontSize: 13, color: "#b91c1c", textAlign: "center" }}>{reason}</div>
        </div>
        <div style={{ padding: "14px 20px", fontSize: 13, color: "#666", textAlign: "center", lineHeight: 1.6 }}>
          กรุณาตรวจสอบ QR Code อีกครั้ง หรือติดต่อ{" "}
          <a href="tel:0955535167" style={{ color: "#1a1a2e", fontWeight: 600 }}>095-553-5167</a>
        </div>
      </div>
    </div>
  );
}
