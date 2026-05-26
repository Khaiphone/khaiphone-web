"use client";

import { useState } from "react";
import { Send } from "lucide-react";

const GOLD = "#B8860B";

const SUBJECTS = ["ประเมินราคา", "นัดหมาย", "สอบถามทั่วไป", "อื่นๆ"];

interface FormData {
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactForm() {
  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    email: "",
    subject: "ประเมินราคา",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    fontSize: "0.9375rem",
    border: "1.5px solid #E5E7EB",
    borderRadius: "10px",
    background: "#F9FAFB",
    color: "#111111",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "#374151",
    marginBottom: "6px",
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Row 1: Name + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>
            ชื่อ-นามสกุล <span style={{ color: GOLD }}>*</span>
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="ชื่อของคุณ"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>
            เบอร์โทรศัพท์ <span style={{ color: GOLD }}>*</span>
          </label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
            type="tel"
            placeholder="08X-XXX-XXXX"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Row 2: Email + Subject */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>
            อีเมล{" "}
            <span style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 400 }}>
              (ไม่บังคับ)
            </span>
          </label>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            type="email"
            placeholder="example@email.com"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>หัวข้อ</label>
          <select
            name="subject"
            value={form.subject}
            onChange={handleChange}
            style={{
              ...inputStyle,
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
            }}
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Message */}
      <div>
        <label style={labelStyle}>ข้อความ</label>
        <textarea
          name="message"
          value={form.message}
          onChange={handleChange}
          rows={4}
          placeholder="ระบุอุปกรณ์ สภาพ หรือคำถามที่อยากถามเรา..."
          style={{ ...inputStyle, resize: "vertical", minHeight: "100px" }}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || submitted}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          background: submitted ? "#15803D" : loading ? "#C9971F" : GOLD,
          color: "#ffffff",
          border: "none",
          borderRadius: "9999px",
          padding: "13px 32px",
          fontSize: "0.9375rem",
          fontWeight: 600,
          cursor: loading || submitted ? "not-allowed" : "pointer",
          width: "100%",
          fontFamily: "inherit",
          transition: "background 0.2s",
        }}
      >
        {loading ? "กำลังส่ง..." : submitted ? "✓ ส่งข้อความเรียบร้อย" : <><Send size={16} style={{ marginRight: "8px" }} />ส่งข้อความ</>}
      </button>

      {/* Inline success notice */}
      {submitted && (
        <div
          className="flex items-center gap-2.5 rounded-xl px-4 py-3"
          style={{
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
          }}
        >
          <span style={{ fontSize: "1rem", lineHeight: 1 }}>✅</span>
          <p style={{ fontSize: "0.875rem", color: "#15803D", margin: 0, lineHeight: 1.55 }}>
            ส่งข้อความเรียบร้อย ทีมงานจะติดต่อกลับภายใน 30 นาที
          </p>
        </div>
      )}
    </form>
  );
}
