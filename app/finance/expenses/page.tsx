'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'
import StatusBadge from '@/app/components/finance/StatusBadge'
import { expensesData } from '@/mock/finance/expenses'
import type { Transaction } from '@/types/finance'

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

const TABS = ['ทั้งหมด', 'อนุมัติแล้ว', 'รออนุมัติ', 'ปฏิเสธ']

function formatDate(d: string) {
  const dt = new Date(d)
  return dt.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10

  const filtered = expensesData.filter((r: Transaction) => {
    const tabMatch =
      activeTab === 0 ||
      (activeTab === 1 && r.status === 'approved') ||
      (activeTab === 2 && r.status === 'pending') ||
      (activeTab === 3 && r.status === 'rejected')
    const searchMatch =
      !search ||
      r.refNumber.toLowerCase().includes(search.toLowerCase()) ||
      (r.product ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.category ?? '').toLowerCase().includes(search.toLowerCase())
    return tabMatch && searchMatch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paged = filtered.slice((page - 1) * perPage, page * perPage)
  const totalAmount = filtered.reduce((s, r) => s + r.amount, 0)

  return (
    <motion.div {...fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header bar */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${BORDER}`,
              color: TEXT2,
              fontSize: 13,
              whiteSpace: 'nowrap',
            }}
          >
            01/05/2024 – 21/05/2024
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: '8px 12px',
            flex: 1,
            minWidth: 180,
          }}
        >
          <Search size={14} color={TEXT3} />
          <input
            type="text"
            placeholder="ค้นหา เลขรายการ / รายการ / หมวดหมู่..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#FFFFFF',
              fontSize: 13,
              width: '100%',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 16px',
            borderRadius: 8,
            background: GOLD,
            border: 'none',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Plus size={16} />
          เพิ่มรายการ
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${BORDER}` }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => { setActiveTab(i); setPage(1) }}
            style={{
              padding: '10px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === i ? `2px solid ${GOLD}` : '2px solid transparent',
              color: activeTab === i ? GOLD : TEXT2,
              fontWeight: activeTab === i ? 600 : 400,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ alignSelf: 'center', color: TEXT2, fontSize: 13, paddingRight: 8 }}>
          รวม{' '}
          <strong style={{ color: '#ef4444' }}>
            ฿{totalAmount.toLocaleString('th-TH')}
          </strong>
        </span>
      </div>

      {/* Table */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['วันที่', 'เลขรายการ', 'รายการ', 'หมวดหมู่', 'จำนวนเงิน', 'สถานะ', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      color: TEXT3,
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: TEXT3, fontSize: 14 }}>
                    ไม่พบรายการ
                  </td>
                </tr>
              ) : (
                paged.map((r, idx) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: idx < paged.length - 1 ? `1px solid ${BORDER}` : 'none',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')
                    }
                  >
                    <td style={{ padding: '12px 16px', color: TEXT2, fontSize: 13, whiteSpace: 'nowrap' }}>
                      {formatDate(r.date)}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: GOLD, fontSize: 13, fontWeight: 600 }}>{r.refNumber}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#FFFFFF', fontSize: 13 }}>{r.product}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '2px 10px',
                          borderRadius: 20,
                          background: 'rgba(255,255,255,0.06)',
                          color: TEXT2,
                          fontSize: 12,
                        }}
                      >
                        {r.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 14 }}>
                        ฿{r.amount.toLocaleString('th-TH')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            color: TEXT3,
                            cursor: 'pointer',
                            padding: 4,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            color: TEXT3,
                            cursor: 'pointer',
                            padding: 4,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: `1px solid ${BORDER}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: TEXT3, fontSize: 13 }}>
            แสดง {Math.min((page - 1) * perPage + 1, filtered.length)}–
            {Math.min(page * perPage, filtered.length)} จาก {filtered.length} รายการ
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${BORDER}`,
                color: page === 1 ? TEXT3 : TEXT2,
                fontSize: 13,
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              ก่อนหน้า
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${BORDER}`,
                color: page === totalPages ? TEXT3 : TEXT2,
                fontSize: 13,
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
