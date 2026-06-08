"use client";

import { useState, useRef, useCallback } from "react";
import {
  Smartphone, Shield, Wifi, CheckCircle, XCircle, AlertCircle,
  Loader2, Search, ScanLine, Calendar, Lock, Unlock, Radio,
} from "lucide-react";
import StockTopbar from "@/components/stock/Topbar";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { scanDeviceInfo, checkSickw } from "@/app/actions/device-scan";
import type { SickwResult } from "@/app/actions/device-scan";

type PageStatus = "idle" | "scanning" | "checking" | "done" | "error";

function StatusChip({ value }: { value: string | undefined }) {
  if (!value) return <span style={{ color: "#64748b", fontSize: 13 }}>—</span>;
  const v = value.toLowerCase();
  const isGood = /(clean|active|yes|unlocked|limited warranty|in warranty|pass|ok|enabled|no problem|ไม่ติด)/i.test(v);
  const isBad  = /(lost|stolen|locked|blocked|expired|invalid|out of warranty|icloud on|blacklisted|locked to|ติด)/i.test(v);
  const color  = isGood ? "#22c55e" : isBad ? "#ef4444" : "#f59e0b";
  const Icon   = isGood ? CheckCircle : isBad ? XCircle : AlertCircle;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color }}>
      <Icon size={14} />
      <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
    </span>
  );
}

const ROWS: Array<{ key: keyof SickwResult; label: string; icon: React.ReactNode }> = [
  { key: "device",        label: "รุ่น / Model",        icon: <Smartphone size={15} /> },
  { key: "color",         label: "สี",                  icon: <Radio size={15} /> },
  { key: "carrier",       label: "เครือข่าย",           icon: <Wifi size={15} /> },
  { key: "carrierLock",   label: "สถานะ SIM Lock",      icon: <Unlock size={15} /> },
  { key: "icloudStatus",  label: "iCloud / Find My",    icon: <Lock size={15} /> },
  { key: "blacklist",     label: "บัญชีดำ / Blacklist", icon: <Shield size={15} /> },
  { key: "warrantyStatus",label: "ประกันศูนย์",         icon: <CheckCircle size={15} /> },
  { key: "warrantyDate",  label: "หมดประกัน",           icon: <Calendar size={15} /> },
];

export default function CheckPage() {
  const c = useThemeColors();
  const [identifier, setIdentifier] = useState("");
  const [status, setStatus]   = useState<PageStatus>("idle");
  const [result, setResult]   = useState<SickwResult | null>(null);
  const [errMsg, setErrMsg]   = useState("");
  const scanRef = useRef<HTMLInputElement>(null!);

  const runCheck = useCallback(async (id: string) => {
    const clean = id.trim();
    if (!clean) return;
    setStatus("checking");
    setResult(null);
    setErrMsg("");
    const res = await checkSickw(clean);
    if (res.success && res.data) {
      setResult(res.data);
      setStatus("done");
    } else {
      setErrMsg(res.error ?? "ไม่พบข้อมูล");
      setStatus("error");
    }
  }, []);

  const handleScan = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("scanning");
    setErrMsg("");
    try {
      const reader = new FileReader();
      const b64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const ocr = await scanDeviceInfo(b64);
      if (ocr.error || !ocr.serial) {
        setErrMsg(ocr.error ?? "อ่าน Serial ไม่ได้ — ลองถ่ายใหม่ให้ชัดขึ้น");
        setStatus("error");
        return;
      }
      setIdentifier(ocr.serial);
      await runCheck(ocr.serial);
    } catch {
      setErrMsg("เกิดข้อผิดพลาดในการอ่านรูป");
      setStatus("error");
    } finally {
      if (scanRef.current) scanRef.current.value = "";
    }
  }, [runCheck]);

  const isLoading = status === "scanning" || status === "checking";
  const loadingLabel = status === "scanning" ? "กำลังอ่าน Serial..." : "กำลังดึงข้อมูล...";

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 100 }}>
      <StockTopbar title="IMEI Check" subtitle="เช็คจากฐานข้อมูล Apple" />

      <input
        ref={scanRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleScan}
      />

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>

        {/* Input card */}
        <div style={{ background: c.card, borderRadius: 20, padding: 20, border: `1px solid ${c.border}`, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `${c.gold}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Smartphone size={21} color={c.gold} />
            </div>
            <div>
              <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: 0 }}>ตรวจสอบเครื่อง</p>
              <p style={{ color: c.text3, fontSize: 12, margin: 0 }}>พิมพ์ IMEI / Serial หรือถ่ายหน้า About</p>
            </div>
          </div>

          <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
            IMEI / Serial Number
          </label>
          <input
            value={identifier}
            onChange={e => setIdentifier(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
            onKeyDown={e => e.key === "Enter" && !isLoading && runCheck(identifier)}
            placeholder="F2LJH0X7XY หรือ 359724850373343"
            inputMode="text"
            autoCapitalize="characters"
            style={{
              width: "100%", background: c.card2, border: `1.5px solid ${identifier ? c.gold : c.border}`,
              borderRadius: 12, padding: "11px 14px", color: c.text, fontSize: 15,
              fontFamily: "monospace", outline: "none", letterSpacing: 1.5,
              boxSizing: "border-box", transition: "border-color 150ms",
            }}
          />
          <p style={{ color: c.text3, fontSize: 11, margin: "5px 0 18px" }}>
            Settings → General → About → Serial Number
          </p>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => scanRef.current?.click()}
              disabled={isLoading}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "11px 0", borderRadius: 12, border: `1px solid ${c.border}`,
                background: c.card2, color: c.text2, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              <ScanLine size={17} />
              ถ่ายภาพ
            </button>
            <button
              onClick={() => runCheck(identifier)}
              disabled={isLoading || identifier.length < 8}
              style={{
                flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "11px 0", borderRadius: 12, border: "none",
                background: identifier.length >= 8 && !isLoading ? c.gold : c.card2,
                color: identifier.length >= 8 && !isLoading ? "#000" : c.text3,
                cursor: identifier.length >= 8 && !isLoading ? "pointer" : "default",
                fontSize: 14, fontWeight: 700, fontFamily: "inherit", transition: "all 150ms",
              }}
            >
              {isLoading
                ? <><Loader2 size={17} className="animate-spin" /> {loadingLabel}</>
                : <><Search size={17} /> ตรวจสอบ</>
              }
            </button>
          </div>
        </div>

        {/* Error */}
        {status === "error" && errMsg && (
          <div style={{ background: "#ef444415", borderRadius: 16, padding: 20, border: "1px solid #ef444430", display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
            <XCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: "#ef4444", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{errMsg}</p>
          </div>
        )}

        {/* Results */}
        {status === "done" && result && (
          <div style={{ background: c.card, borderRadius: 20, overflow: "hidden", border: `1px solid ${c.border}` }}>
            {/* Header */}
            <div style={{ background: `linear-gradient(135deg, ${c.gold}18, transparent)`, padding: "18px 20px", borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: `${c.gold}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Shield size={22} color={c.gold} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: 0 }}>ผลการตรวจสอบ</p>
                <p style={{ color: c.text3, fontSize: 12, margin: "2px 0 0", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {result.imei ?? identifier}
                </p>
              </div>
            </div>

            {/* Rows */}
            <div>
              {ROWS.map((row, i) => {
                const val = result[row.key] as string | undefined;
                if (!val) return null;
                return (
                  <div key={row.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", borderBottom: i < ROWS.length - 1 ? `1px solid ${c.border}` : "none" }}>
                    <span style={{ color: c.text3, flexShrink: 0 }}>{row.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: c.text3, fontSize: 10, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{row.label}</p>
                      <div style={{ marginTop: 2 }}>
                        <StatusChip value={val} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Raw text toggle */}
            {result.rawText && (
              <details style={{ borderTop: `1px solid ${c.border}` }}>
                <summary style={{ padding: "12px 20px", cursor: "pointer", color: c.text3, fontSize: 12, fontWeight: 600, listStyle: "none", display: "flex", alignItems: "center", gap: 6 }}>
                  ▸ ดูข้อมูลดิบทั้งหมด
                </summary>
                <pre style={{ margin: 0, padding: "0 20px 16px", color: c.text2, fontSize: 11, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-all", fontFamily: "monospace" }}>
                  {result.rawText}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
