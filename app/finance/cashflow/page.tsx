'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchFinanceCashFlow } from '@/app/actions/finance'
import type { FinanceCashFlowEntry, FinanceCashFlowSummary } from '@/app/actions/finance'

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

const TABS = ['ทั้งหมด', 'รับเข้า', 'จ่ายออก']

export default function CashFlowPage() {
  const [entries, setEntries] = useState<FinanceCashFlowEntry[]>([])
  const [summary, setSummary] = useState<FinanceCashFlowSummary>({ totalIn: 0, totalOut: 0, closing: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    fetchFinanceCashFlow().then((d) => {
      setEntries(d.entries)
      setSummary(d.summary)
      setLoading(false)
    })
  }, [])

  const filtered = entries.filter((e: FinanceCashFlowEntry) => {
    if (activeTab === 0) return true
    if (activeTab === 1) return e.entryType === 'in'
    return e.entryType === 'out'
  })

  const summaryCards = [
    { label: 'รับเข้ารวม', value: summary.totalIn, color: '#22c55e' },
    { label: 'จ่ายออกรวม', value: summary.totalOut, color: '#ef4444' },
    { label: 'ยอดสุทธิ', value: summary.closing, color: GOLD },
  ]

  return (
    <motion.div {...fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        {summaryCards.map((s) => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '16px 20px' }}>
            <p style={{ margin: '0 0 6px', color: TEXT2, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</p>
            <p style={{ margin: 0, color: s.color, fontSize: 22, fontWeight: 700 }}>
              {s.value < 0 ? '-' : ''}฿{Math.abs(s.value).toLocaleString('th-TH')}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${BORDER}` }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            style={{
              padding: '10px 18px', background: 'none', border: 'none',
              borderBottom: activeTab === i ? `2px solid ${GOLD}` : '2px solid transparent',
              color: activeTab === i ? GOLD : TEXT2, fontWeight: activeTab === i ? 600 : 400,
              fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['วันที่/เวลา', 'รายการ', 'รับเข้า', 'จ่ายออก', 'ยอดคงเหลือ'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: TEXT3, fontSize: 14 }}>กำลังโหลด...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: TEXT3, fontSize: 14 }}>ไม่พบรายการ</td>
                </tr>
              ) : (
                filtered.map((e, idx) => (
                  <tr
                    key={e.id}
                    style={{ borderBottom: idx < filtered.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                    onMouseEnter={(ev) => ((ev.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={(ev) => ((ev.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', color: TEXT2, fontSize: 13, whiteSpace: 'nowrap' }}>{e.datetime}</td>
                    <td style={{ padding: '12px 16px', color: '#FFFFFF', fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: e.entryType === 'in' ? '#22c55e' : '#ef4444',
                        }} />
                        {e.description}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {e.amountIn != null
                        ? <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 14 }}>+฿{e.amountIn.toLocaleString('th-TH')}</span>
                        : <span style={{ color: TEXT3 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {e.amountOut != null
                        ? <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 14 }}>−฿{e.amountOut.toLocaleString('th-TH')}</span>
                        : <span style={{ color: TEXT3 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: e.balance >= 0 ? GOLD : '#ef4444', fontWeight: 700, fontSize: 14 }}>
                        {e.balance < 0 ? '-' : ''}฿{Math.abs(e.balance).toLocaleString('th-TH')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}
