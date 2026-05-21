"use client";

import { useState, useEffect } from "react";
import { Save, Sun, Moon, Bell, User, Store } from "lucide-react";
import StockTopbar from "@/components/stock/Topbar";
import { useThemeColors, useStockTheme } from "@/components/stock/ThemeContext";

interface StockSettings {
  defaultInspector: string;
  defaultChannel: string;
  storeName: string;
  notifyNewRequest: boolean;
  notifyLowStock: boolean;
  lowStockThreshold: number;
}

const DEFAULT_SETTINGS: StockSettings = {
  defaultInspector: "",
  defaultChannel: "หน้าร้าน",
  storeName: "KHAIPHONE",
  notifyNewRequest: true,
  notifyLowStock: true,
  lowStockThreshold: 5,
};

const CHANNELS = ["หน้าร้าน", "เว็บไซต์", "LINE OA", "Facebook", "Shopee", "โทรศัพท์"];

export default function SettingsPage() {
  const c = useThemeColors();
  const { theme, toggle } = useStockTheme();
  const [settings, setSettings] = useState<StockSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("stock-settings");
    if (raw) {
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }); } catch { /* ignore */ }
    }
  }, []);

  function update<K extends keyof StockSettings>(key: K, value: StockSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    localStorage.setItem("stock-settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const inputStyle: React.CSSProperties = {
    background: c.card2, border: `1px solid ${c.border}`, borderRadius: 10,
    padding: "10px 14px", color: c.text, fontSize: 14, fontFamily: "inherit",
    outline: "none", width: "100%", boxSizing: "border-box",
  };

  const sectionStyle: React.CSSProperties = {
    background: c.card, border: `1px solid ${c.border}`, borderRadius: 16,
    padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16,
  };

  const labelStyle: React.CSSProperties = {
    color: c.text2, fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6,
  };

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title="Settings" subtitle="ตั้งค่าระบบสต็อก">
        <button
          onClick={handleSave}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, background: saved ? "#22c55e" : c.gold, border: "none", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "background 200ms" }}
        >
          <Save size={14} /> {saved ? "บันทึกแล้ว ✓" : "บันทึก"}
        </button>
      </StockTopbar>

      <div style={{ padding: 24, maxWidth: 640, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Appearance */}
        <div style={sectionStyle}>
          <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            {theme === "dark" ? <Moon size={16} color={c.gold} /> : <Sun size={16} color={c.gold} />}
            ธีมและการแสดงผล
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ color: c.text, fontSize: 13, fontWeight: 600, margin: 0 }}>โหมดสีปัจจุบัน</p>
              <p style={{ color: c.text3, fontSize: 12, margin: "2px 0 0" }}>{theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
            </div>
            <button
              onClick={toggle}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, background: c.card2, border: `1px solid ${c.border}`, color: c.text2, fontSize: 13, cursor: "pointer" }}
            >
              {theme === "dark" ? <><Sun size={15} /> Light Mode</> : <><Moon size={15} /> Dark Mode</>}
            </button>
          </div>
        </div>

        {/* Store Info */}
        <div style={sectionStyle}>
          <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Store size={16} color={c.gold} /> ข้อมูลร้าน
          </p>
          <div>
            <label style={labelStyle}>ชื่อร้าน</label>
            <input value={settings.storeName} onChange={e => update("storeName", e.target.value)} style={inputStyle} placeholder="ชื่อร้าน" />
          </div>
        </div>

        {/* Stock Defaults */}
        <div style={sectionStyle}>
          <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <User size={16} color={c.gold} /> ค่าเริ่มต้นสต็อก
          </p>
          <div>
            <label style={labelStyle}>ชื่อผู้ตรวจ (default inspector)</label>
            <input value={settings.defaultInspector} onChange={e => update("defaultInspector", e.target.value)} style={inputStyle} placeholder="ชื่อผู้ตรวจเครื่องเริ่มต้น" />
            <p style={{ color: c.text3, fontSize: 11, margin: "4px 0 0" }}>ใช้ auto-fill ช่อง inspector เมื่อเพิ่มสต็อกใหม่</p>
          </div>
          <div>
            <label style={labelStyle}>ช่องทางรับซื้อ (default channel)</label>
            <select value={settings.defaultChannel} onChange={e => update("defaultChannel", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </div>
        </div>

        {/* Notifications */}
        <div style={sectionStyle}>
          <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Bell size={16} color={c.gold} /> การแจ้งเตือน
          </p>
          {[
            { key: "notifyNewRequest" as const, label: "แจ้งเตือนเมื่อมีคำขอใหม่", sub: "แสดง badge ใน Requests" },
            { key: "notifyLowStock" as const, label: "แจ้งเตือนเมื่อสต็อกต่ำ", sub: `เมื่อจำนวน < ${settings.lowStockThreshold} เครื่อง` },
          ].map(({ key, label, sub }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ color: c.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{label}</p>
                <p style={{ color: c.text3, fontSize: 11, margin: "2px 0 0" }}>{sub}</p>
              </div>
              <button
                onClick={() => update(key, !settings[key])}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative", transition: "background 200ms",
                  background: settings[key] ? c.gold : c.card2,
                }}
              >
                <span style={{
                  position: "absolute", top: 2, left: settings[key] ? 22 : 2,
                  width: 20, height: 20, borderRadius: "50%", background: settings[key] ? "#000" : c.text3,
                  transition: "left 200ms",
                }} />
              </button>
            </div>
          ))}
          {settings.notifyLowStock && (
            <div>
              <label style={labelStyle}>จำนวนขั้นต่ำ (เครื่อง)</label>
              <input
                type="number" min={1} max={50} value={settings.lowStockThreshold}
                onChange={e => update("lowStockThreshold", parseInt(e.target.value) || 5)}
                style={{ ...inputStyle, width: 100 }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
