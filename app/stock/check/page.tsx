"use client";

import { useState, useRef, useCallback } from "react";
import { Smartphone, Shield, WifiOff, CheckCircle, XCircle, AlertCircle, Loader2, Search, ScanLine } from "lucide-react";
import StockTopbar from "@/components/stock/Topbar";
import { useThemeColors } from "@/components/stock/ThemeContext";

type CheckStatus = "idle" | "loading" | "done" | "error";

interface SickwResult {
  status?: string;
  service_name?: string;
  order_id?: string;
  imei?: string;
  result?: string | Record<string, unknown>;
  error?: string;
}

function parseResult(raw: string | Record<string, unknown> | undefined): Array<{ label: string; value: string; ok?: boolean | null }> {
  if (!raw) return [];
  const text = typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);

  const lines = text.split(/\n|<br\s*\/?>|,\s*(?=[A-Z])/gi)
    .map(l => l.trim())
    .filter(Boolean);

  return lines.map(line => {
    const [rawKey, ...rest] = line.split(/:\s*/);
    const value = rest.join(": ").trim() || line;
    const key = rawKey.trim();

    let ok: boolean | null = null;
    const vLower = value.toLowerCase();
    if (/(clean|active|yes|unlocked|valid|pass|ok|warranted|enabled)/i.test(vLower)) ok = true;
    if (/(lost|stolen|locked|no|blocked|expired|invalid|fail|barred|icloud on)/i.test(vLower)) ok = false;

    return { label: key, value, ok };
  });
}

const STATUS_ICON = {
  true: <CheckCircle size={16} color="#22c55e" />,
  false: <XCircle size={16} color="#ef4444" />,
  null: <AlertCircle size={16} color="#f59e0b" />,
};

export default function SickwCheckPage() {
  const c = useThemeColors();
  const [imei, setImei] = useState("");
  const [status, setStatus] = useState<CheckStatus>("idle");
  const [result, setResult] = useState<SickwResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCheck = useCallback(async (val?: string) => {
    const target = (val ?? imei).replace(/\s/g, "");
    if (!target) return;
    setStatus("loading");
    setResult(null);
    try {
      const res = await fetch("/api/stock/sickw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imei: target }),
      });
      const data: SickwResult = await res.json();
      setResult(data);
      setStatus(res.ok && !data.error ? "done" : "error");
    } catch {
      setResult({ error: "ไม่สามารถเชื่อมต่อ SICKW ได้" });
      setStatus("error");
    }
  }, [imei]);

  const handleScan = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      alert("ไม่สามารถเปิดกล้องได้ กรุณาพิมพ์ IMEI โดยตรง");
      return;
    }

    const video = document.createElement("video");
    video.setAttribute("playsinline", "true");
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
    video.play();

    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px";
    overlay.innerHTML = `<p style="color:#fff;font-size:14px;text-align:center">กรอบให้ตรงกับ barcode / IMEI<br><small style="opacity:.6">แตะเพื่อปิด</small></p>`;
    video.style.cssText = "width:min(90vw,360px);border-radius:16px;";
    overlay.prepend(video);
    document.body.appendChild(overlay);

    const cleanup = () => { stream.getTracks().forEach(t => t.stop()); overlay.remove(); };
    overlay.addEventListener("click", cleanup);

    if ("BarcodeDetector" in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats: ["code_128", "code_39", "ean_13", "qr_code", "data_matrix"] });
      const scan = async () => {
        if (!overlay.isConnected) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            const raw: string = codes[0].rawValue;
            const imeiMatch = raw.match(/\d{14,16}/);
            if (imeiMatch) {
              cleanup();
              setImei(imeiMatch[0]);
              handleCheck(imeiMatch[0]);
              return;
            }
          }
        } catch { /* ignore */ }
        requestAnimationFrame(scan);
      };
      requestAnimationFrame(scan);
    } else {
      const msg = document.createElement("p");
      msg.style.cssText = "color:#fbbf24;font-size:13px;text-align:center;padding:0 24px";
      msg.textContent = "เบราว์เซอร์นี้ไม่รองรับ auto-scan — บันทึก IMEI แล้วพิมพ์เอง";
      overlay.appendChild(msg);
    }
  }, [handleCheck]);

  const parsed = status === "done" && result?.result ? parseResult(result.result) : [];

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 100 }}>
      <StockTopbar title="IMEI Check" subtitle="ตรวจสอบสถานะเครื่อง" />

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>

        {/* Input card */}
        <div style={{ background: c.card, borderRadius: 20, padding: 24, border: `1px solid ${c.border}`, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${c.gold}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Smartphone size={22} color={c.gold} />
            </div>
            <div>
              <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: 0 }}>ตรวจสอบ IMEI / Serial</p>
              <p style={{ color: c.text3, fontSize: 12, margin: 0 }}>ผ่าน SICKW API</p>
            </div>
          </div>

          <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>IMEI / Serial Number</label>
          <input
            ref={inputRef}
            value={imei}
            onChange={e => setImei(e.target.value.replace(/[^\d\s]/g, ""))}
            onKeyDown={e => e.key === "Enter" && handleCheck()}
            placeholder="พิมพ์ IMEI 15 หลัก..."
            inputMode="numeric"
            style={{
              width: "100%", background: c.card2, border: `1.5px solid ${imei ? c.gold : c.border}`,
              borderRadius: 12, padding: "12px 16px", color: c.text, fontSize: 16,
              fontFamily: "monospace", outline: "none", letterSpacing: 2,
              boxSizing: "border-box", transition: "border-color 150ms",
            }}
          />
          <p style={{ color: c.text3, fontSize: 11, margin: "6px 0 20px" }}>
            *กด Settings → General → About เพื่อดู IMEI
          </p>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleScan}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "12px 0", borderRadius: 12, border: `1px solid ${c.border}`,
                background: c.card2, color: c.text2, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
              }}
            >
              <ScanLine size={18} />
              สแกน
            </button>
            <button
              onClick={() => handleCheck()}
              disabled={status === "loading" || imei.replace(/\s/g, "").length < 14}
              style={{
                flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "12px 0", borderRadius: 12, border: "none",
                background: imei.replace(/\s/g, "").length >= 14 ? c.gold : c.card2,
                color: imei.replace(/\s/g, "").length >= 14 ? "#000" : c.text3,
                cursor: imei.replace(/\s/g, "").length >= 14 ? "pointer" : "default",
                fontSize: 14, fontWeight: 700, fontFamily: "inherit", transition: "all 150ms",
              }}
            >
              {status === "loading" ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              {status === "loading" ? "กำลังตรวจสอบ..." : "ตรวจสอบ"}
            </button>
          </div>
        </div>

        {/* Loading */}
        {status === "loading" && (
          <div style={{ background: c.card, borderRadius: 20, padding: 40, border: `1px solid ${c.border}`, textAlign: "center" }}>
            <Loader2 size={36} color={c.gold} className="animate-spin" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: c.text, fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>กำลังดึงข้อมูลจาก SICKW...</p>
            <p style={{ color: c.text3, fontSize: 12, margin: 0 }}>อาจใช้เวลา 5–15 วินาที</p>
          </div>
        )}

        {/* Error */}
        {status === "error" && result?.error && (
          <div style={{ background: "#ef444415", borderRadius: 20, padding: 24, border: "1px solid #ef444440" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <XCircle size={22} color="#ef4444" />
              <p style={{ color: "#ef4444", fontSize: 15, fontWeight: 700, margin: 0 }}>เกิดข้อผิดพลาด</p>
            </div>
            <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>{result.error}</p>
          </div>
        )}

        {/* Results */}
        {status === "done" && result && (
          <div style={{ background: c.card, borderRadius: 20, padding: 0, border: `1px solid ${c.border}`, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ background: `linear-gradient(135deg, ${c.gold}22, transparent)`, padding: "20px 24px", borderBottom: `1px solid ${c.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${c.gold}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Shield size={24} color={c.gold} />
                </div>
                <div>
                  <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: 0 }}>{result.service_name ?? "SICKW Result"}</p>
                  <p style={{ color: c.text3, fontSize: 12, margin: 0, fontFamily: "monospace" }}>{result.imei ?? imei}</p>
                </div>
                <span style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: result.status?.toLowerCase().includes("complet") ? "#22c55e20" : "#f59e0b20", color: result.status?.toLowerCase().includes("complet") ? "#22c55e" : "#f59e0b" }}>
                  {result.status ?? "–"}
                </span>
              </div>
            </div>

            {/* Parsed rows */}
            {parsed.length > 0 ? (
              <div style={{ padding: "8px 0" }}>
                {parsed.map((row, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 24px", borderBottom: i < parsed.length - 1 ? `1px solid ${c.border}` : "none" }}>
                    <div style={{ paddingTop: 2, flexShrink: 0 }}>
                      {STATUS_ICON[String(row.ok) as "true" | "false" | "null"]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: c.text3, fontSize: 11, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>{row.label}</p>
                      <p style={{ color: row.ok === true ? "#22c55e" : row.ok === false ? "#ef4444" : c.text, fontSize: 14, fontWeight: 600, margin: "2px 0 0", wordBreak: "break-word" }}>{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 24 }}>
                <p style={{ color: c.text2, fontSize: 13, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", fontFamily: "monospace", lineHeight: 1.6 }}>
                  {typeof result.result === "string" ? result.result : JSON.stringify(result.result, null, 2)}
                </p>
              </div>
            )}

            {/* Footer */}
            {result.order_id && (
              <div style={{ padding: "12px 24px", borderTop: `1px solid ${c.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                <WifiOff size={13} color={c.text3} />
                <p style={{ color: c.text3, fontSize: 11, margin: 0 }}>Order ID: {result.order_id}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
