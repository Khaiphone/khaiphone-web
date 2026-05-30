'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchStockAging } from '@/app/actions/finance'
import type { StockAgingItem } from '@/app/actions/finance'

const TEXT1 = 'var(--f-text1)'
const TEXT2 = 'var(--f-text2)'
const TEXT3 = 'var(--f-text3)'
const CARD  = 'var(--f-card)'
const BORDER = 'var(--f-border)'

function fmt(n: number) { return '฿' + n.toLocaleString('th-TH') }

function agingBucket(days: number) {
  if (days <= 7)  return { label: 'สดใหม่',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)' }
  if (days <= 14) return { label: 'ปกติ',       color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' }
  if (days <= 30) return { label: 'เริ่มค้าง',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
  return             { label: 'ค้างนาน',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
}

export default function AgingPage() {
  const [items, setItems] = useState<StockAgingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'days' | 'cost'>('days')

  useEffect(() => {
    fetchStockAging().then(d => { setItems(d); setLoading(false) })
  }, [])

  const sorted = [...items].sort((a, b) => sort === 'days' ? b.daysInStock - a.daysInStock : b.totalCost - a.totalCost)

  const buckets = [
    { label: 'สดใหม่ (0–7 วัน)',    color: '#22c55e', count: items.filter(i => i.daysInStock <= 7).length,  cost: items.filter(i => i.daysInStock <= 7).reduce((s, i) => s + i.totalCost, 0) },
    { label: 'ปกติ (8–14 วัน)',      color: '#3b82f6', count: items.filter(i => i.daysInStock > 7 && i.daysInStock <= 14).length, cost: items.filter(i => i.daysInStock > 7 && i.daysInStock <= 14).reduce((s, i) => s + i.totalCost, 0) },
    { label: 'เริ่มค้าง (15–30 วัน)', color: '#f59e0b', count: items.filter(i => i.daysInStock > 14 && i.daysInStock <= 30).length, cost: items.filter(i => i.daysInStock > 14 && i.daysInStock <= 30).reduce((s, i) => s + i.totalCost, 0) },
    { label: 'ค้างนาน (30+ วัน)',    color: '#ef4444', count: items.filter(i => i.daysInStock > 30).length,  cost: items.filter(i => i.daysInStock > 30).reduce((s, i) => s + i.totalCost, 0) },
  ]

  if (loading) return <div style={{ padding: 40, color: TEXT3, textAlign: 'center' }}>กำลังโหลด...</div>

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {buckets.map(b => (
          <div key={b.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px 20px', borderLeft: `4px solid ${b.color}` }}>
            <p style={{ margin: '0 0 6px', color: TEXT2, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{b.label}</p>
            <p style={{ margin: 0, color: b.color, fontSize: 26, fontWeight: 700 }}>{b.count} เครื่อง</p>
            <p style={{ margin: '4px 0 0', color: TEXT3, fontSize: 12 }}>ต้นทุนรวม {fmt(b.cost)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <p style={{ margin: 0, color: TEXT1, fontWeight: 700, fontSize: 15 }}>รายการสต็อกทั้งหมด ({items.length} เครื่อง)</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['days', 'cost'] as const).map(s => (
              <button key={s} onClick={() => setSort(s)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${BORDER}`, background: sort === s ? '#B8860B' : 'transparent', color: sort === s ? '#fff' : TEXT2 }}>
                {s === 'days' ? 'เรียงตามวัน' : 'เรียงตามต้นทุน'}
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <p style={{ padding: '40px 20px', textAlign: 'center', color: TEXT3 }}>ไม่มีสต็อกค้างอยู่</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['รหัส', 'รุ่น · ความจุ', 'เกรด', 'สถานะ', 'วันที่รับ', 'อายุในสต็อก', 'ต้นทุน'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((item, i) => {
                  const bucket = agingBucket(item.daysInStock)
                  return (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? 'transparent' : 'var(--f-hover)' }}>
                      <td style={{ padding: '12px 16px', color: '#B8860B', fontSize: 12, fontFamily: 'monospace' }}>{item.id}</td>
                      <td style={{ padding: '12px 16px', color: TEXT1, fontSize: 13 }}>{item.model}{item.storage ? ` · ${item.storage}` : ''}</td>
                      <td style={{ padding: '12px 16px', color: '#22c55e', fontWeight: 700 }}>{item.grade}</td>
                      <td style={{ padding: '12px 16px', color: TEXT2, fontSize: 12 }}>{item.status}</td>
                      <td style={{ padding: '12px 16px', color: TEXT3, fontSize: 12 }}>{new Date(item.receivedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: bucket.bg, color: bucket.color }}>
                          {item.daysInStock} วัน · {bucket.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: TEXT1, fontWeight: 600, fontSize: 13 }}>{fmt(item.totalCost)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}
