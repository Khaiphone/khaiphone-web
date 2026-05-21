'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, TrendingUp, TrendingDown, BarChart2, Banknote, ShoppingCart, Download, Loader } from 'lucide-react'
import { fetchFinanceIncome, fetchFinancePurchases, fetchFinanceProfitByModel, fetchFinanceCashFlow } from '@/app/actions/finance'

const CARD = '#0D0D0D'
const BORDER = 'rgba(255,255,255,0.08)'
const GOLD = '#B8860B'
const TEXT2 = 'rgba(255,255,255,0.65)'
const TEXT3 = 'rgba(255,255,255,0.35)'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } }

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function thaiDate() {
  return new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '')
}

type ReportKey = 'income' | 'expenses' | 'profit' | 'cashflow' | 'purchases' | 'financial'

export default function ReportsPage() {
  const [loading, setLoading] = useState<ReportKey | null>(null)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleGenerate(key: ReportKey) {
    setLoading(key)
    try {
      if (key === 'income') {
        const data = await fetchFinanceIncome()
        const rows = [
          ['วันที่ขาย', 'เลขรายการ', 'ลูกค้า', 'สินค้า', 'ช่องทาง', 'ต้นทุน', 'ราคาขาย', 'กำไร'],
          ...data.map(r => [r.date, r.refNumber, r.customerName, `${r.model} ${r.storage}`, r.source, String(r.costPrice), String(r.sellPrice), String(r.profit)]),
        ]
        downloadCSV(rows, `รายงานรายรับ_${thaiDate()}.csv`)
        showToast('ดาวน์โหลดรายงานรายรับสำเร็จ')
      } else if (key === 'purchases') {
        const data = await fetchFinancePurchases()
        const rows = [
          ['วันที่รับซื้อ', 'เลขรายการ', 'รุ่น', 'ต้นทุน', 'ผู้ขาย', 'ราคาขาย', 'กำไร', 'สถานะ'],
          ...data.map(r => {
            const profit = r.sellPrice != null ? r.sellPrice - r.costPrice : ''
            return [r.date, r.refNumber, `${r.model} ${r.storage}`, String(r.costPrice), r.customerName, r.sellPrice != null ? String(r.sellPrice) : '', String(profit), r.stockStatus]
          }),
        ]
        downloadCSV(rows, `รายงานการรับซื้อ_${thaiDate()}.csv`)
        showToast('ดาวน์โหลดรายงานการรับซื้อสำเร็จ')
      } else if (key === 'profit') {
        const { kpi, byModel } = await fetchFinanceProfitByModel()
        const rows = [
          ['รุ่น', 'จำนวนเครื่อง', 'ต้นทุนเฉลี่ย', 'ราคาขายเฉลี่ย', 'กำไรเฉลี่ย', 'Margin %', 'กำไรรวม'],
          ...byModel.map(m => [m.model, String(m.count), String(m.costAvg), String(m.sellAvg), String(m.profitAvg), `${m.margin.toFixed(1)}%`, String(m.totalProfit)]),
          [],
          ['สรุป', '', '', '', '', '', ''],
          ['รายได้รวม', String(kpi.totalRevenue), '', '', '', '', ''],
          ['ต้นทุนรวม', String(kpi.totalCost), '', '', '', '', ''],
          ['กำไรสุทธิ', String(kpi.netProfit), '', '', '', '', ''],
          ['Gross Margin', `${kpi.margin.toFixed(1)}%`, '', '', '', '', ''],
        ]
        downloadCSV(rows, `รายงานกำไร_${thaiDate()}.csv`)
        showToast('ดาวน์โหลดรายงานกำไรสำเร็จ')
      } else if (key === 'cashflow') {
        const { summary, entries } = await fetchFinanceCashFlow()
        const rows = [
          ['วันที่/เวลา', 'รายการ', 'รับเข้า', 'จ่ายออก', 'ยอดคงเหลือ'],
          ...entries.map(e => [e.datetime, e.description, e.amountIn != null ? String(e.amountIn) : '', e.amountOut != null ? String(e.amountOut) : '', String(e.balance)]),
          [],
          ['รับเข้ารวม', String(summary.totalIn), '', '', ''],
          ['จ่ายออกรวม', String(summary.totalOut), '', '', ''],
          ['ยอดสุทธิ', String(summary.closing), '', '', ''],
        ]
        downloadCSV(rows, `รายงานกระแสเงินสด_${thaiDate()}.csv`)
        showToast('ดาวน์โหลดรายงานกระแสเงินสดสำเร็จ')
      } else if (key === 'financial') {
        const [income, purchases, { kpi }] = await Promise.all([fetchFinanceIncome(), fetchFinancePurchases(), fetchFinanceProfitByModel()])
        const rows = [
          ['งบการเงิน', '', ''],
          ['', '', ''],
          ['รายได้', '', ''],
          ['รายได้จากการขาย', String(kpi.totalRevenue), ''],
          ['', '', ''],
          ['ต้นทุน', '', ''],
          ['ต้นทุนขาย', String(kpi.totalCost), ''],
          ['', '', ''],
          ['กำไรขั้นต้น', String(kpi.netProfit), ''],
          ['Gross Margin', `${kpi.margin.toFixed(1)}%`, ''],
          ['', '', ''],
          ['จำนวนเครื่องที่รับซื้อ', String(purchases.length), ''],
          ['จำนวนเครื่องที่ขาย', String(income.length), ''],
        ]
        downloadCSV(rows, `งบการเงิน_${thaiDate()}.csv`)
        showToast('ดาวน์โหลดงบการเงินสำเร็จ')
      } else {
        showToast('ยังไม่มีข้อมูลสำหรับรายงานนี้')
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(null)
    }
  }

  const REPORTS: { key: ReportKey; icon: React.ElementType; title: string; desc: string; color: string }[] = [
    { key: 'income',    icon: TrendingUp,   title: 'รายงานรายรับ',           desc: 'รายการขายออกทั้งหมด ราคาขาย ต้นทุน และกำไรต่อรายการ',          color: '#22c55e' },
    { key: 'expenses',  icon: TrendingDown,  title: 'รายงานรายจ่าย',           desc: 'สรุปรายจ่ายแยกหมวดหมู่ (ดาวน์โหลดจากหน้า Expenses)',            color: '#ef4444' },
    { key: 'profit',    icon: BarChart2,     title: 'รายงานกำไร / Margin',     desc: 'กำไรตามรุ่น ต้นทุนเฉลี่ย ราคาขายเฉลี่ย และ Gross Margin',       color: GOLD },
    { key: 'cashflow',  icon: Banknote,      title: 'รายงานกระแสเงินสด',       desc: 'รายการรับเข้า-จ่ายออกทั้งหมด พร้อมยอดคงเหลือ',                  color: '#3b82f6' },
    { key: 'purchases', icon: ShoppingCart,  title: 'รายงานการรับซื้อ',         desc: 'รายการรับซื้อเครื่องทั้งหมด ต้นทุน ราคาขาย และสถานะสต็อก',     color: '#a855f7' },
    { key: 'financial', icon: FileText,      title: 'งบการเงินสรุป',           desc: 'งบรายได้-รายจ่าย กำไรขั้นต้น Gross Margin และสถิติรวม',         color: '#06b6d4' },
  ]

  return (
    <motion.div {...fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ margin: '0 0 4px', color: '#FFF', fontWeight: 700, fontSize: 16 }}>รายงานการเงิน</p>
          <p style={{ margin: 0, color: TEXT2, fontSize: 13 }}>เลือกประเภทรายงาน แล้วกด &ldquo;สร้างรายงาน&rdquo; เพื่อดาวน์โหลด CSV</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {REPORTS.map(r => {
          const Icon = r.icon
          const isLoading = loading === r.key
          return (
            <div key={r.key} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${r.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={22} color={r.color} />
                </div>
                <p style={{ margin: 0, color: '#FFF', fontWeight: 700, fontSize: 14 }}>{r.title}</p>
              </div>
              <p style={{ margin: 0, color: TEXT2, fontSize: 13, lineHeight: 1.5, flex: 1 }}>{r.desc}</p>
              <button
                onClick={() => handleGenerate(r.key)}
                disabled={isLoading || loading !== null}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', borderRadius: 10, background: isLoading ? 'rgba(184,134,11,0.5)' : GOLD, border: 'none', color: '#FFF', fontSize: 13, fontWeight: 600, cursor: isLoading || loading !== null ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 'auto' }}>
                {isLoading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
                {isLoading ? 'กำลังสร้าง...' : 'สร้างรายงาน'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: '#1A1A1A', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 24px', color: '#FFF', fontSize: 14, fontWeight: 500, zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}
