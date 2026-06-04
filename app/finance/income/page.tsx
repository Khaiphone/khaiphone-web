'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { fetchFinanceIncome } from '@/app/actions/finance'
import type { FinanceIncome } from '@/app/actions/finance'
import { useFinanceDate } from '@/app/components/finance/FinanceDateContext'

const CARD = 'var(--f-card)'
const BORDER = 'var(--f-border)'
const GOLD = '#B8860B'
const TEXT2 = 'var(--f-text2)'
const TEXT3 = 'var(--f-text3)'

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25 },
}

const CHANNEL_LABELS: Record<string, string> = {
  website: 'เว็บไซต์',
  line: 'LINE',
  facebook: 'Facebook',
  phone: 'โทรศัพท์',
  manual: 'Manual',
}

function formatDate(d: string) {
  const dt = new Date(d.length === 10 ? d + 'T00:00:00' : d)
  return dt.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function IncomePage() {
  const { dateFrom, dateTo } = useFinanceDate()
  const [items, setItems] = useState<FinanceIncome[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10

  useEffect(() => {
    setLoading(true)
    fetchFinanceIncome(dateFrom, dateTo).then((d) => { setItems(d); setLoading(false) })
  }, [dateFrom, dateTo])

  const filtered = items.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.refNumber.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.model.toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paged = filtered.slice((page - 1) * perPage, page * perPage)
  const totalAmount = filtered.reduce((s, r) => s + r.sellPrice, 0)
  const totalProfit = filtered.reduce((s, r) => s + r.profit, 0)

  return (
    <motion.div {...fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header bar */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--f-input-bg)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 180 }}>
          <Search size={14} color={TEXT3} />
          <input
            type="text"
            placeholder="ค้นหา เลขรายการ / ลูกค้า / รุ่น..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--f-text1)', fontSize: 13, width: '100%', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 20px', flex: 1 }}>
          <p style={{ margin: '0 0 4px', color: TEXT2, fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>จำนวนที่ขาย</p>
          <p style={{ margin: 0, color: 'var(--f-text1)', fontSize: 22, fontWeight: 700 }}>{filtered.length} เครื่อง</p>
        </div>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 20px', flex: 1 }}>
          <p style={{ margin: '0 0 4px', color: TEXT2, fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>รายรับรวม</p>
          <p style={{ margin: 0, color: '#22c55e', fontSize: 22, fontWeight: 700 }}>฿{totalAmount.toLocaleString('th-TH')}</p>
        </div>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 20px', flex: 1 }}>
          <p style={{ margin: '0 0 4px', color: TEXT2, fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>กำไรรวม</p>
          <p style={{ margin: 0, color: totalProfit >= 0 ? '#22c55e' : '#ef4444', fontSize: 22, fontWeight: 700 }}>
            {totalProfit >= 0 ? '+' : ''}฿{totalProfit.toLocaleString('th-TH')}
          </p>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['วันที่ขาย', 'เลขรายการ', 'ลูกค้า', 'สินค้า', 'ช่องทาง', 'ต้นทุน', 'ราคาขาย', 'กำไร'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: TEXT3, fontSize: 14 }}>กำลังโหลด...</td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: TEXT3, fontSize: 14 }}>ไม่พบรายการ</td>
                </tr>
              ) : (
                paged.map((r, idx) => (
                  <tr
                    key={r.id}
                    style={{ borderBottom: idx < paged.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'var(--f-hover)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', color: TEXT2, fontSize: 13, whiteSpace: 'nowrap' }}>{formatDate(r.date)}</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: GOLD, fontSize: 13, fontWeight: 600 }}>{r.refNumber}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--f-text1)', fontSize: 13 }}>{r.customerName || '—'}</td>
                    <td style={{ padding: '12px 16px', color: TEXT2, fontSize: 13 }}>{r.model} {r.storage}</td>
                    <td style={{ padding: '12px 16px', color: TEXT2, fontSize: 13, whiteSpace: 'nowrap' }}>{CHANNEL_LABELS[r.source] ?? r.source}</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 13 }}>฿{r.costPrice.toLocaleString('th-TH')}</span>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 14 }}>฿{r.sellPrice.toLocaleString('th-TH')}</span>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: r.profit >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 14 }}>
                        {r.profit >= 0 ? '+' : ''}฿{r.profit.toLocaleString('th-TH')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: TEXT3, fontSize: 13 }}>
            แสดง {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} จาก {filtered.length} รายการ
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: 8, background: 'var(--f-hover)', border: `1px solid ${BORDER}`, color: page === 1 ? TEXT3 : TEXT2, fontSize: 13, cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              ก่อนหน้า
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '6px 14px', borderRadius: 8, background: 'var(--f-hover)', border: `1px solid ${BORDER}`, color: page === totalPages ? TEXT3 : TEXT2, fontSize: 13, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              ถัดไป
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
