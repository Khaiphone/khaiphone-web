'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchBreakeven } from '@/app/actions/finance'
import type { BreakevenResult } from '@/app/actions/finance'

const TEXT1 = 'var(--f-text1)'
const TEXT2 = 'var(--f-text2)'
const TEXT3 = 'var(--f-text3)'
const CARD  = 'var(--f-card)'
const BORDER = 'var(--f-border)'

function fmt(n: number) { return '฿' + n.toLocaleString('th-TH') }

export default function BreakevenPage() {
  const [result, setResult] = useState<BreakevenResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [months, setMonths] = useState<1 | 3>(3)
  const [filter, setFilter] = useState<'all' | 'risk'>('all')

  useEffect(() => {
    setLoading(true)
    fetchBreakeven(months).then(d => { setResult(d); setLoading(false) })
  }, [months])

  const items = result?.items ?? []
  const displayed = filter === 'risk' ? items.filter(i => i.belowBreakeven || i.avgSellPrice === 0) : items
  const riskCount = items.filter(i => i.belowBreakeven).length
  const noPrice   = items.filter(i => i.avgSellPrice === 0).length

  if (loading) return <div style={{ padding: 40, color: TEXT3, textAlign: 'center' }}>กำลังโหลด...</div>

  const overhead = result?.overheadPerUnit ?? 0
  const totalExp = result?.totalExpenses ?? 0
  const unitsSold = result?.unitsSold ?? 0

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* info banner */}
      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '12px 16px', color: '#f59e0b', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span>
          Break-even = ต้นทุนต่อเครื่อง + overhead <strong>{fmt(overhead)}/เครื่อง</strong>
          <span style={{ opacity: 0.75, fontWeight: 400 }}>
            {' '}(รายจ่าย {fmt(totalExp)} ÷ {unitsSold} เครื่องที่ขาย ใน {months} เดือน)
          </span>
        </span>
        {/* 1M / 3M toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(245,158,11,0.12)', borderRadius: 8, padding: 3 }}>
          {([1, 3] as const).map(m => (
            <button key={m} onClick={() => setMonths(m)} style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: months === m ? '#f59e0b' : 'transparent',
              color: months === m ? '#000' : '#f59e0b',
            }}>
              {m}M
            </button>
          ))}
        </div>
      </div>

      {/* summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'รุ่นทั้งหมด',       value: `${items.length} รุ่น`,  color: 'var(--f-text1)' },
          { label: 'เสี่ยงขาดทุน',      value: `${riskCount} รุ่น`,    color: riskCount > 0 ? '#ef4444' : '#22c55e' },
          { label: 'ยังไม่มีราคาขาย',   value: `${noPrice} รุ่น`,      color: noPrice > 0 ? '#f59e0b' : TEXT3 },
        ].map(m => (
          <div key={m.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px 20px' }}>
            <p style={{ margin: '0 0 6px', color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</p>
            <p style={{ margin: 0, color: m.color, fontSize: 26, fontWeight: 700 }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <p style={{ margin: 0, color: TEXT1, fontWeight: 700, fontSize: 15 }}>วิเคราะห์ Break-even ตามรุ่น</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ key: 'all', label: 'ทั้งหมด' }, { key: 'risk', label: '⚠️ เสี่ยง' }].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key as 'all' | 'risk')} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${BORDER}`, background: filter === f.key ? '#ef4444' : 'transparent', color: filter === f.key ? '#fff' : TEXT2 }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {unitsSold === 0 && (
          <div style={{ padding: '16px 20px', color: '#f59e0b', fontSize: 13, background: 'rgba(245,158,11,0.05)', borderBottom: `1px solid ${BORDER}` }}>
            ⚠️ ยังไม่มีการขายใน {months} เดือนที่ผ่านมา — overhead คำนวณไม่ได้ Break-even จะแสดงเฉพาะต้นทุนต่อเครื่อง
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['รุ่น', 'จำนวน', 'ต้นทุนเฉลี่ย', 'Overhead', 'Break-even', 'ราคาขายเฉลี่ย', 'Margin', 'สถานะ'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((item, i) => {
                const status = item.avgSellPrice === 0
                  ? { label: 'ยังไม่มีราคา', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' }
                  : item.belowBreakeven
                  ? { label: 'ต่ำกว่า Break-even', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
                  : { label: 'ปกติ', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' }
                return (
                  <tr key={item.model} style={{ borderBottom: `1px solid ${BORDER}`, background: item.belowBreakeven ? 'rgba(239,68,68,0.03)' : i % 2 === 0 ? 'transparent' : 'var(--f-hover)' }}>
                    <td style={{ padding: '12px 16px', color: TEXT1, fontSize: 13, fontWeight: 600 }}>{item.model}</td>
                    <td style={{ padding: '12px 16px', color: TEXT2, fontSize: 13 }}>{item.count}</td>
                    <td style={{ padding: '12px 16px', color: '#ef4444', fontSize: 13 }}>{fmt(item.avgCost)}</td>
                    <td style={{ padding: '12px 16px', color: TEXT3, fontSize: 13 }}>{overhead > 0 ? fmt(overhead) : '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#f59e0b', fontSize: 13, fontWeight: 600 }}>{fmt(item.breakevenPrice)}</td>
                    <td style={{ padding: '12px 16px', color: TEXT1, fontSize: 13, fontWeight: 600 }}>
                      {item.avgSellPrice > 0 ? fmt(item.avgSellPrice) : <span style={{ color: TEXT3 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: item.margin >= 0 ? '#22c55e' : '#ef4444', fontSize: 13, fontWeight: 600 }}>
                      {item.avgSellPrice > 0 ? `${item.margin}%` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}
