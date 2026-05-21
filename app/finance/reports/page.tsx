'use client'

import { motion } from 'framer-motion'
import { FileText, TrendingUp, TrendingDown, BarChart2, Banknote, ShoppingCart, Download } from 'lucide-react'

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

const REPORTS = [
  {
    icon: TrendingUp,
    title: 'รายงานรายรับ',
    desc: 'สรุปรายรับทั้งหมดแบ่งตามช่องทาง วันที่ และสถานะ',
    color: '#22c55e',
  },
  {
    icon: TrendingDown,
    title: 'รายงานรายจ่าย',
    desc: 'สรุปรายจ่ายแยกหมวดหมู่ พร้อมกราฟแนวโน้ม',
    color: '#ef4444',
  },
  {
    icon: BarChart2,
    title: 'รายงานกำไร / Margin',
    desc: 'วิเคราะห์กำไรสุทธิ Gross Margin ตามรุ่นและช่วงเวลา',
    color: GOLD,
  },
  {
    icon: Banknote,
    title: 'รายงานกระแสเงินสด',
    desc: 'Cash Flow Statement รับเข้า-จ่ายออก ยอดคงเหลือรายวัน',
    color: '#3b82f6',
  },
  {
    icon: ShoppingCart,
    title: 'รายงานการรับซื้อ',
    desc: 'สรุปต้นทุนการรับซื้อเครื่อง เทียบราคาขาย และกำไรคาดการณ์',
    color: '#a855f7',
  },
  {
    icon: FileText,
    title: 'งบการเงินรายเดือน',
    desc: 'สรุปงบกำไรขาดทุน งบดุล และงบกระแสเงินสด ครบทุกหน้า',
    color: '#06b6d4',
  },
]

export default function ReportsPage() {
  return (
    <motion.div {...fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <p style={{ margin: '0 0 4px', color: '#FFFFFF', fontWeight: 700, fontSize: 16 }}>
            รายงานการเงิน
          </p>
          <p style={{ margin: 0, color: TEXT2, fontSize: 13 }}>
            เลือกประเภทรายงาน แล้วกด &ldquo;สร้างรายงาน&rdquo; เพื่อดาวน์โหลด
          </p>
        </div>
        <span
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${BORDER}`,
            color: TEXT2,
            fontSize: 13,
          }}
        >
          01/05/2024 – 21/05/2024
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {REPORTS.map((r) => {
          const Icon = r.icon
          return (
            <div
              key={r.title}
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 16,
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `${r.color}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={22} color={r.color} />
                </div>
                <div>
                  <p style={{ margin: 0, color: '#FFFFFF', fontWeight: 700, fontSize: 14 }}>{r.title}</p>
                </div>
              </div>
              <p style={{ margin: 0, color: TEXT2, fontSize: 13, lineHeight: 1.5 }}>{r.desc}</p>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 0',
                  borderRadius: 10,
                  background: GOLD,
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  marginTop: 'auto',
                }}
              >
                <Download size={14} />
                สร้างรายงาน
              </button>
            </div>
          )
        })}
      </div>

      {/* Recent Reports */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: '20px 24px',
        }}
      >
        <p style={{ margin: '0 0 16px', color: '#FFFFFF', fontWeight: 700, fontSize: 15 }}>
          รายงานล่าสุด
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { name: 'รายงานรายรับ_พ.ค.2024.pdf', date: '21/05/2024', size: '245 KB' },
            { name: 'รายงานกำไร_เม.ย.2024.pdf', date: '01/05/2024', size: '312 KB' },
            { name: 'งบการเงิน_มี.ค.2024.pdf', date: '01/04/2024', size: '568 KB' },
          ].map((f, i, arr) => (
            <div
              key={f.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
              }}
            >
              <FileText size={16} color={GOLD} />
              <span style={{ color: '#FFFFFF', fontSize: 14, flex: 1 }}>{f.name}</span>
              <span style={{ color: TEXT3, fontSize: 12 }}>{f.size}</span>
              <span style={{ color: TEXT3, fontSize: 12 }}>{f.date}</span>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: TEXT2,
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Download size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
