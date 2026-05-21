'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Save } from 'lucide-react'

const CARD = '#0D0D0D'
const BORDER = 'rgba(255,255,255,0.08)'
const GOLD = '#B8860B'
const TEXT2 = 'rgba(255,255,255,0.65)'
const TEXT3 = 'rgba(255,255,255,0.35)'

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25 },
}

const TABS = ['ข้อมูลธุรกิจ', 'ภาษี', 'บัญชีธนาคาร', 'การแจ้งเตือน']

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: 'block',
        color: TEXT2,
        fontSize: 13,
        fontWeight: 500,
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '10px 14px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${BORDER}`,
        color: '#FFFFFF',
        fontSize: 14,
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
      }}
    />
  )
}

function BusinessTab() {
  const [form, setForm] = useState({
    name: 'KHAIPHONE',
    taxId: '0107567890123',
    address: '123 ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพ 10110',
    phone: '02-123-4567',
    email: 'info@khaiphone.com',
    website: 'khaiphone.com',
  })

  const field = (key: keyof typeof form, label: string, placeholder?: string) => (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <TextInput value={form[key]} onChange={(v) => setForm((f) => ({ ...f, [key]: v }))} placeholder={placeholder} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {field('name', 'ชื่อธุรกิจ', 'ชื่อร้าน / บริษัท')}
        {field('taxId', 'เลขประจำตัวผู้เสียภาษี', '13 หลัก')}
      </div>
      <div>
        <FieldLabel>ที่อยู่</FieldLabel>
        <textarea
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          rows={2}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${BORDER}`,
            color: '#FFFFFF',
            fontSize: 14,
            outline: 'none',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {field('phone', 'เบอร์โทรศัพท์')}
        {field('email', 'อีเมล')}
        {field('website', 'เว็บไซต์')}
      </div>
    </div>
  )
}

function TaxTab() {
  const [form, setForm] = useState({
    vatEnabled: true,
    vatRate: '7',
    withholdingTax: '3',
    fiscalYear: 'มกราคม',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* VAT Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${BORDER}`,
        }}
      >
        <div>
          <p style={{ margin: 0, color: '#FFFFFF', fontSize: 14, fontWeight: 600 }}>เปิดใช้งาน VAT</p>
          <p style={{ margin: 0, color: TEXT2, fontSize: 12, marginTop: 2 }}>ระบบจะคำนวณ VAT อัตโนมัติในทุกรายการ</p>
        </div>
        <button
          onClick={() => setForm((f) => ({ ...f, vatEnabled: !f.vatEnabled }))}
          style={{
            width: 48,
            height: 26,
            borderRadius: 13,
            border: 'none',
            background: form.vatEnabled ? GOLD : 'rgba(255,255,255,0.15)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 3,
              left: form.vatEnabled ? 24 : 3,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#FFFFFF',
              transition: 'left 0.2s',
            }}
          />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div>
          <FieldLabel>อัตรา VAT (%)</FieldLabel>
          <TextInput value={form.vatRate} onChange={(v) => setForm((f) => ({ ...f, vatRate: v }))} placeholder="7" />
        </div>
        <div>
          <FieldLabel>ภาษีหัก ณ ที่จ่าย (%)</FieldLabel>
          <TextInput
            value={form.withholdingTax}
            onChange={(v) => setForm((f) => ({ ...f, withholdingTax: v }))}
            placeholder="3"
          />
        </div>
        <div>
          <FieldLabel>ปีการเงิน (เริ่มต้น)</FieldLabel>
          <select
            value={form.fiscalYear}
            onChange={(e) => setForm((f) => ({ ...f, fiscalYear: e.target.value }))}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${BORDER}`,
              color: '#FFFFFF',
              fontSize: 14,
              outline: 'none',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {['มกราคม', 'เมษายน', 'ตุลาคม'].map((m) => (
              <option key={m} value={m} style={{ background: '#1A1A1A' }}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '60px 0',
        color: TEXT3,
      }}
    >
      <p style={{ margin: 0, fontSize: 36 }}>🔧</p>
      <p style={{ margin: 0, fontSize: 16, color: TEXT2, fontWeight: 600 }}>{title}</p>
      <p style={{ margin: 0, fontSize: 14, color: TEXT3 }}>กำลังพัฒนา — จะพร้อมใช้งานเร็วๆ นี้</p>
    </div>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <motion.div {...fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${BORDER}` }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            style={{
              padding: '10px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === i ? `2px solid ${GOLD}` : '2px solid transparent',
              color: activeTab === i ? GOLD : TEXT2,
              fontWeight: activeTab === i ? 600 : 400,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content card */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: '24px',
        }}
      >
        {activeTab === 0 && <BusinessTab />}
        {activeTab === 1 && <TaxTab />}
        {activeTab === 2 && <PlaceholderTab title="บัญชีธนาคาร" />}
        {activeTab === 3 && <PlaceholderTab title="การแจ้งเตือน" />}

        {/* Save button for active tabs */}
        {activeTab < 2 && (
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 24px',
                borderRadius: 10,
                background: GOLD,
                border: 'none',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Save size={16} />
              บันทึกการตั้งค่า
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
