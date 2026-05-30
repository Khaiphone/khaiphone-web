'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchFinanceDashboard } from '@/app/actions/finance'

const TEXT1 = 'var(--f-text1)'
const TEXT2 = 'var(--f-text2)'
const TEXT3 = 'var(--f-text3)'
const CARD  = 'var(--f-card)'
const BORDER = 'var(--f-border)'
const GOLD  = '#B8860B'

function fmt(n: number) { return '฿' + n.toLocaleString('th-TH') }

function monthKey(offset = 0) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthRange(key: string): { from: string; to: string } {
  const [y, m] = key.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return { from: `${key}-01`, to: `${key}-${String(lastDay).padStart(2, '0')}` }
}
function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  return `${months[m - 1]} ${y + 543}`
}

type Target = { revenue: number; profit: number; units: number }

function loadTargets(): Record<string, Target> {
  try { return JSON.parse(localStorage.getItem('finance_targets') ?? '{}') } catch { return {} }
}
function saveTargets(t: Record<string, Target>) {
  localStorage.setItem('finance_targets', JSON.stringify(t))
}

function ProgressBar({ value, target, color }: { value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(Math.round((value / target) * 100), 100) : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: TEXT2, fontSize: 12 }}>{typeof value === 'number' && value > 1000 ? fmt(value) : value} / {typeof target === 'number' && target > 1000 ? fmt(target) : target}</span>
        <span style={{ color, fontSize: 12, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 8, background: BORDER, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

export default function TargetsPage() {
  const [selectedMonth, setSelectedMonth] = useState(monthKey(0))
  const [targets, setTargets] = useState<Record<string, Target>>({})
  const [actual, setActual] = useState<{ revenue: number; profit: number; units: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Target>({ revenue: 0, profit: 0, units: 0 })

  useEffect(() => { setTargets(loadTargets()) }, [])

  useEffect(() => {
    setLoading(true)
    const { from, to } = monthRange(selectedMonth)
    fetchFinanceDashboard(from, to).then(d => {
      setActual({ revenue: d.totalRevenue, profit: d.trueNetProfit, units: d.soldCount })
      setLoading(false)
    })
  }, [selectedMonth])

  const currentTarget = targets[selectedMonth] ?? { revenue: 0, profit: 0, units: 0 }

  function startEdit() { setDraft(currentTarget); setEditing(true) }
  function saveEdit() {
    const updated = { ...targets, [selectedMonth]: draft }
    setTargets(updated)
    saveTargets(updated)
    setEditing(false)
  }

  const months = [monthKey(-2), monthKey(-1), monthKey(0), monthKey(1)]

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Month picker */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {months.map(m => (
          <button key={m} onClick={() => setSelectedMonth(m)} style={{ padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${selectedMonth === m ? GOLD : BORDER}`, background: selectedMonth === m ? GOLD : 'transparent', color: selectedMonth === m ? '#fff' : TEXT2 }}>
            {monthLabel(m)}
          </button>
        ))}
      </div>

      {/* Target cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {[
          { label: 'รายได้',    key: 'revenue' as const, color: '#22c55e' },
          { label: 'กำไรสุทธิ', key: 'profit'  as const, color: '#3b82f6' },
          { label: 'จำนวนขาย', key: 'units'   as const, color: GOLD      },
        ].map(({ label, key, color }) => {
          const t = currentTarget[key]
          const a = actual?.[key] ?? 0
          return (
            <div key={key} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 24px' }}>
              <p style={{ margin: '0 0 4px', color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
              <p style={{ margin: '0 0 16px', color: color, fontSize: 28, fontWeight: 700 }}>{key === 'units' ? `${a} เครื่อง` : fmt(a)}</p>
              {t > 0 ? (
                <ProgressBar value={a} target={t} color={color} />
              ) : (
                <p style={{ color: TEXT3, fontSize: 12 }}>ยังไม่ได้ตั้งเป้าหมาย</p>
              )}
              {t > 0 && (
                <p style={{ margin: '8px 0 0', color: TEXT3, fontSize: 11 }}>เป้า: {key === 'units' ? `${t} เครื่อง` : fmt(t)}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Edit targets */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ margin: 0, color: TEXT1, fontWeight: 700, fontSize: 15 }}>ตั้งเป้าหมาย {monthLabel(selectedMonth)}</p>
          {!editing && (
            <button onClick={startEdit} style={{ padding: '8px 18px', borderRadius: 10, background: GOLD, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {currentTarget.revenue > 0 ? 'แก้ไข' : 'ตั้งเป้าหมาย'}
            </button>
          )}
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'เป้ารายได้ (บาท)', key: 'revenue' as const },
              { label: 'เป้ากำไรสุทธิ (บาท)', key: 'profit' as const },
              { label: 'เป้าจำนวนขาย (เครื่อง)', key: 'units' as const },
            ].map(({ label, key }) => (
              <div key={key}>
                <label style={{ display: 'block', color: TEXT2, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{label}</label>
                <input
                  type="number"
                  value={draft[key] || ''}
                  onChange={e => setDraft(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'var(--f-input-bg)', color: TEXT1, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="0"
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'transparent', border: `1px solid ${BORDER}`, color: TEXT2, fontSize: 13, cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={saveEdit} style={{ flex: 2, padding: '10px', borderRadius: 10, background: GOLD, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>บันทึกเป้าหมาย</button>
            </div>
          </div>
        ) : (
          currentTarget.revenue === 0 && currentTarget.profit === 0 && currentTarget.units === 0 ? (
            <p style={{ color: TEXT3, fontSize: 13 }}>กดปุ่ม "ตั้งเป้าหมาย" เพื่อกำหนดเป้าหมายของเดือนนี้</p>
          ) : (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <span style={{ color: TEXT2, fontSize: 13 }}>รายได้: <strong style={{ color: TEXT1 }}>{fmt(currentTarget.revenue)}</strong></span>
              <span style={{ color: TEXT2, fontSize: 13 }}>กำไร: <strong style={{ color: TEXT1 }}>{fmt(currentTarget.profit)}</strong></span>
              <span style={{ color: TEXT2, fontSize: 13 }}>ขาย: <strong style={{ color: TEXT1 }}>{currentTarget.units} เครื่อง</strong></span>
            </div>
          )
        )}
      </div>

      <p style={{ color: TEXT3, fontSize: 11, textAlign: 'center', margin: 0 }}>เป้าหมายบันทึกในเบราว์เซอร์นี้เท่านั้น</p>
    </motion.div>
  )
}
