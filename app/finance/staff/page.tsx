'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchStaffPerformance } from '@/app/actions/finance'
import type { StaffPerf } from '@/app/actions/finance'
import { useFinanceDate } from '@/app/components/finance/FinanceDateContext'

const TEXT1 = 'var(--f-text1)'
const TEXT2 = 'var(--f-text2)'
const TEXT3 = 'var(--f-text3)'
const CARD  = 'var(--f-card)'
const BORDER = 'var(--f-border)'
const GOLD  = '#B8860B'

function fmt(n: number) { return '฿' + n.toLocaleString('th-TH') }

const COLORS = ['#B8860B', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4']

export default function StaffPage() {
  const { dateFrom, dateTo } = useFinanceDate()
  const [staff, setStaff] = useState<StaffPerf[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchStaffPerformance(dateFrom, dateTo).then(d => { setStaff(d); setLoading(false) })
  }, [dateFrom, dateTo])

  const totalRevenue = staff.reduce((s, r) => s + r.revenue, 0)
  const totalProfit  = staff.reduce((s, r) => s + r.profit, 0)
  const totalCount   = staff.reduce((s, r) => s + r.count, 0)

  if (loading) return <div style={{ padding: 40, color: TEXT3, textAlign: 'center' }}>กำลังโหลด...</div>

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'จำนวนที่ขาย',  value: `${totalCount} เครื่อง`, color: GOLD },
          { label: 'รายได้รวม',    value: fmt(totalRevenue),       color: '#22c55e' },
          { label: 'กำไรรวม',      value: fmt(totalProfit),        color: '#3b82f6' },
          { label: 'จำนวนพนักงาน', value: `${staff.length} คน`,   color: '#a855f7' },
        ].map(m => (
          <div key={m.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px 20px' }}>
            <p style={{ margin: '0 0 6px', color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</p>
            <p style={{ margin: 0, color: m.color, fontSize: 24, fontWeight: 700 }}>{m.value}</p>
          </div>
        ))}
      </div>

      {staff.length === 0 ? (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '60px 20px', textAlign: 'center', color: TEXT3 }}>
          ไม่มีข้อมูลการขายในช่วงนี้ (ตรวจสอบว่าเลือกพนักงานขายตอนบันทึกการขาย)
        </div>
      ) : (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ margin: 0, color: TEXT1, fontWeight: 700, fontSize: 15 }}>อันดับพนักงาน</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['อันดับ', 'พนักงาน', 'จำนวน', 'รายได้รวม', 'กำไรรวม', 'กำไร/เครื่อง', 'สัดส่วนกำไร'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map((s, i) => {
                  const shareWidth = totalProfit > 0 ? Math.round((s.profit / totalProfit) * 100) : 0
                  const color = COLORS[i % COLORS.length]
                  return (
                    <tr key={s.name} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ width: 28, height: 28, borderRadius: '50%', background: color, color: '#fff', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {i + 1}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: TEXT1, fontSize: 14, fontWeight: 600 }}>{s.name}</td>
                      <td style={{ padding: '14px 16px', color: TEXT2, fontSize: 13 }}>{s.count} เครื่อง</td>
                      <td style={{ padding: '14px 16px', color: TEXT1, fontSize: 13, fontWeight: 600 }}>{fmt(s.revenue)}</td>
                      <td style={{ padding: '14px 16px', color: s.profit >= 0 ? '#22c55e' : '#ef4444', fontSize: 13, fontWeight: 600 }}>{fmt(s.profit)}</td>
                      <td style={{ padding: '14px 16px', color: TEXT2, fontSize: 13 }}>{fmt(s.avgProfit)}</td>
                      <td style={{ padding: '14px 16px', minWidth: 140 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--f-border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${shareWidth}%`, height: '100%', background: color, borderRadius: 3 }} />
                          </div>
                          <span style={{ color: TEXT3, fontSize: 11, minWidth: 32 }}>{shareWidth}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  )
}
