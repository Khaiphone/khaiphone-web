"use client";

import { useState, useEffect } from "react";
import { Bell, MessageCircle, Calendar, ChevronDown, Search } from "lucide-react";
import GlobalSearch from "./GlobalSearch";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

export default function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const [period, setPeriod] = useState("7 วันที่ผ่านมา");
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const periods = ["7 วันที่ผ่านมา", "30 วัน", "90 วัน"];

  const now = new Date();
  const thaiDate = now.toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <div
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #E5E7EB",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1 style={{ color: "#111111", fontSize: "20px", fontWeight: 700, margin: 0 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ color: "#9CA3AF", fontSize: "13px", margin: "2px 0 0" }}>
              {subtitle}
            </p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#F9FAFB",
              border: "1px solid #E5E7EB",
              borderRadius: 8,
              padding: "7px 12px",
              cursor: "pointer",
              color: "#9CA3AF",
              fontSize: 13,
              minWidth: 200,
            }}
          >
            <Search size={14} />
            <span style={{ flex: 1, textAlign: "left" }}>ค้นหาคำขอ ลูกค้า...</span>
            <kbd style={{
              backgroundColor: "#F3F4F6",
              border: "1px solid #E5E7EB",
              borderRadius: 5,
              padding: "1px 6px",
              fontSize: 11,
              fontFamily: "monospace",
              color: "#9CA3AF",
            }}>⌘K</kbd>
          </button>

          {/* Date display */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#F9FAFB",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              padding: "7px 12px",
            }}
          >
            <Calendar size={14} color="#9CA3AF" />
            <span style={{ color: "#374151", fontSize: "12px" }}>{thaiDate}</span>
          </div>

          {/* Period selector */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#F9FAFB",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "7px 12px",
                color: "#374151",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {period}
              <ChevronDown size={14} color="#9CA3AF" />
            </button>
            {showPeriodDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  backgroundColor: "#ffffff",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  overflow: "hidden",
                  zIndex: 20,
                  minWidth: "140px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              >
                {periods.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPeriod(p);
                      setShowPeriodDropdown(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "9px 14px",
                      textAlign: "left",
                      backgroundColor: p === period ? "rgba(184,134,11,0.08)" : "transparent",
                      color: p === period ? "#B8860B" : "#374151",
                      fontSize: "13px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bell */}
          <button
            style={{
              position: "relative",
              backgroundColor: "#F9FAFB",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              padding: "8px",
              cursor: "pointer",
              color: "#6B7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bell size={16} />
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                backgroundColor: "#EF4444",
                color: "#ffffff",
                borderRadius: "9999px",
                fontSize: "9px",
                fontWeight: 700,
                width: "16px",
                height: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              5
            </span>
          </button>

          {/* Message */}
          <button
            style={{
              backgroundColor: "#F9FAFB",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              padding: "8px",
              cursor: "pointer",
              color: "#6B7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MessageCircle size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
