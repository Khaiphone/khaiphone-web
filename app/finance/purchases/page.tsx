'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { fetchFinancePurchases } from '@/app/actions/finance'
import type { FinancePurchase } from '@/app/actions/finance'

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

const STOCK_LABELS: Record<string, { label: string; color: string }> = {
  in_stock: { label: 'ในสต็อก', color: '#3B82F6' },
  repairing: { label: 'ซ่อม', color: '#facc15' },
  sold: { label: 'ขายแล้ว', color: '#22c55e' },
}

function formatDate(iso: string) {
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function PurchasesPage() {
  const [items, setItems] = useState<FinancePurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10

  useEffect(() => {
    fetchFinancePurchases().then((d) => { setItems(d); setLoading(false) })
  }, [])

  const filtered = items.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.refNumber.toLowerCase().includes(q) ||
      r.model.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paged = filtered.slice((page - 1) * perPage, page * perPage)
  const totalCost = filtered.reduce((s, r) => s + r.costPrice, 0)
  const soldProfit = filtered.filter((r) => r.stockStatus === 'sold' && r.sellPrice != null)
    .reduce((s, r) => s + (r.sellPrice ?? 0) - r.costPrice, 0)

  return (
    <motion.div {...fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header bar */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 180 }}>
          <Search size={14} color={TEXT3} />
          <input
            type="text"
            placeholder="ค้นหา เลขรายการ / รุ่น / ผู้ขาย..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            style={{ background: 'none', border: 'none', outline: 'none', color: '#FFFFFF', fontSize: 13, width: '100%', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 20px', flex: 1 }}>
          <p style={{ margin: '0 0 4px', color: TEXT2, fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>จำนวนเครื่อง</p>
          <p style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>{filtered.length}</p>
        </div>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 20px', flex: 1 }}>
          <p style={{ margin: '0 0 4px', color: TEXT2, fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>ต้นทุนรวม</p>
          <p style={{ margin: 0, color: '#ef4444', fontSize: 22, fontWeight: 700 }}>฿{totalCost.toLocaleString('th-TH')}</p>
        </div>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 20px', flex: 1 }}>
          <p style={{ margin: '0 0 4px', color: TEXT2, fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>กำไรที่ขายแล้ว</p>
          <p style={{ margin: 0, color: soldProfit >= 0 ? '#22c55e' : '#ef4444', fontSize: 22, fontWeight: 700 }}>
            {soldProfit >= 0 ? '+' : ''}฿{soldProfit.toLocaleString('th-TH')}
          </p>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['วันที่รับซื้อ', 'เลขรายการ', 'รุ่น', 'ต้นทุน', 'ผู้ขาย', 'ราคาขาย', 'กำไร', 'สถานะ'].map((h) => (
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
                paged.map((r, idx) => {
                  const profit = r.sellPrice != null ? r.sellPrice - r.costPrice : null
                  const stockInfo = STOCK_LABELS[r.stockStatus] ?? { label: r.stockStatus, color: TEXT3 }
                  return (
                    <tr
                      key={r.id}
                      style={{ borderBottom: idx < paged.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', color: TEXT2, fontSize: 13, whiteSpace: 'nowrap' }}>{formatDate(r.date)}</td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: GOLD, fontSize: 13, fontWeight: 600 }}>{r.refNumber}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#FFFFFF', fontSize: 13 }}>{r.model} {r.storage}</td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 14 }}>฿{r.costPrice.toLocaleString('th-TH')}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: TEXT2, fontSize: 13 }}>{r.customerName || '—'}</td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {r.sellPrice != null
                          ? <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 14 }}>฿{r.sellPrice.toLocaleString('th-TH')}</span>
                          : <span style={{ color: TEXT3, fontSize: 13 }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {profit != null
                          ? <span style={{ color: profit >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 14 }}>
                              {profit >= 0 ? '+' : ''}฿{profit.toLocaleString('th-TH')}
                            </span>
                          : <span style={{ color: TEXT3, fontSize: 13 }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 6, background: `${stockInfo.color}20`, color: stockInfo.color, fontSize: 12, fontWeight: 600 }}>
                          {stockInfo.label}
                        </span>
                      </td>
                    </tr>
                  )
                })
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
              style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, color: page === 1 ? TEXT3 : TEXT2, fontSize: 13, cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              ก่อนหน้า
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, color: page === totalPages ? TEXT3 : TEXT2, fontSize: 13, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              ถัดไป
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
