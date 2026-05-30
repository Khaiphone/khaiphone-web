'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchTaxSummary } from '@/app/actions/finance'
import type { TaxSummary } from '@/app/actions/finance'
import { useFinanceDate } from '@/app/components/finance/FinanceDateContext'

const TEXT1 = 'var(--f-text1)'
const TEXT2 = 'var(--f-text2)'
const TEXT3 = 'var(--f-text3)'
const CARD  = 'var(--f-card)'
const BORDER = 'var(--f-border)'

function fmt(n: number) { return '฿' + n.toLocaleString('th-TH') }

export default function TaxPage() {
  const { dateFrom, dateTo } = useFinanceDate()
  const [data, setData] = useState<TaxSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchTaxSummary(dateFrom, dateTo).then(d => { setData(d); setLoading(false) })
  }, [dateFrom, dateTo])

  if (loading || !data) return <div style={{ padding: 40, color: TEXT3, textAlign: 'center' }}>กำลังโหลด...</div>

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Config note */}
      <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '12px 16px', color: '#3b82f6', fontSize: 13 }}>
        อัตราที่ใช้: VAT {data.vatRate}% · ภาษีหัก ณ ที่จ่าย {data.whtRate}% — แก้ไขได้ที่{' '}
        <a href="/finance/settings" style={{ color: '#3b82f6', fontWeight: 600 }}>ตั้งค่าการเงิน</a>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {[
          { label: 'รายได้รวม (ก่อนภาษี)', value: fmt(data.totalRevenue), color: '#22c55e' },
          { label: `VAT ${data.vatRate}%`,           value: fmt(data.totalVat),     color: '#f59e0b' },
          { label: `ภาษีหัก ณ ที่จ่าย ${data.whtRate}%`, value: fmt(data.totalWht), color: '#3b82f6' },
          { label: 'รายได้สุทธิหลังภาษี', value: fmt(data.totalRevenue - data.totalVat - data.totalWht), color: 'var(--f-text1)' },
        ].map(m => (
          <div key={m.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px 20px' }}>
            <p style={{ margin: '0 0 8px', color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</p>
            <p style={{ margin: 0, color: m.color, fontSize: 26, fontWeight: 700 }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly breakdown */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
          <p style={{ margin: 0, color: TEXT1, fontWeight: 700, fontSize: 15 }}>รายละเอียดรายเดือน</p>
        </div>

        {data.rows.length === 0 ? (
          <p style={{ padding: '40px 20px', textAlign: 'center', color: TEXT3 }}>ไม่มีข้อมูลในช่วงนี้</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['เดือน', 'รายได้', `VAT (${data.vatRate}%)`, `หัก ณ ที่จ่าย (${data.whtRate}%)`, 'สุทธิ'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={row.month} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? 'transparent' : 'var(--f-hover)' }}>
                    <td style={{ padding: '12px 16px', color: TEXT1, fontWeight: 600 }}>{row.month}</td>
                    <td style={{ padding: '12px 16px', color: TEXT1, fontSize: 13 }}>{fmt(row.revenue)}</td>
                    <td style={{ padding: '12px 16px', color: '#f59e0b', fontSize: 13 }}>{fmt(row.vat)}</td>
                    <td style={{ padding: '12px 16px', color: '#3b82f6', fontSize: 13 }}>{fmt(row.withholdingTax)}</td>
                    <td style={{ padding: '12px 16px', color: TEXT1, fontWeight: 600, fontSize: 13 }}>{fmt(row.revenue - row.vat - row.withholdingTax)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: `2px solid ${BORDER}`, background: 'var(--f-hover)' }}>
                  <td style={{ padding: '12px 16px', color: TEXT1, fontWeight: 700 }}>รวม</td>
                  <td style={{ padding: '12px 16px', color: TEXT1, fontWeight: 700 }}>{fmt(data.totalRevenue)}</td>
                  <td style={{ padding: '12px 16px', color: '#f59e0b', fontWeight: 700 }}>{fmt(data.totalVat)}</td>
                  <td style={{ padding: '12px 16px', color: '#3b82f6', fontWeight: 700 }}>{fmt(data.totalWht)}</td>
                  <td style={{ padding: '12px 16px', color: '#22c55e', fontWeight: 700 }}>{fmt(data.totalRevenue - data.totalVat - data.totalWht)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}
