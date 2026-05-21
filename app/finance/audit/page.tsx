'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { auditLogs } from '@/mock/finance/audit'
import type { AuditLog } from '@/types/finance'

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

const TABS = ['ทั้งหมด', 'การเงิน', 'สต็อก', 'ระบบ', 'ผู้ใช้']

const CATEGORY_MAP: Record<string, string> = {
  finance: 'การเงิน',
  stock: 'สต็อก',
  system: 'ระบบ',
  user: 'ผู้ใช้',
}

const CATEGORY_COLORS: Record<string, string> = {
  finance: '#B8860B',
  stock: '#3b82f6',
  system: '#a855f7',
  user: '#22c55e',
}

export default function AuditPage() {
  const [activeTab, setActiveTab] = useState(0)

  const filtered = auditLogs.filter((log: AuditLog) => {
    if (activeTab === 0) return true
    const categories: AuditLog['category'][] = ['finance', 'stock', 'system', 'user']
    return log.category === categories[activeTab - 1]
  })

  return (
    <motion.div {...fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {(['finance', 'stock', 'system', 'user'] as const).map((cat) => {
          const count = auditLogs.filter((l) => l.category === cat).length
          return (
            <div
              key={cat}
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: '14px 18px',
                borderLeft: `3px solid ${CATEGORY_COLORS[cat]}`,
              }}
            >
              <p style={{ margin: '0 0 4px', color: TEXT2, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                {CATEGORY_MAP[cat]}
              </p>
              <p style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>{count}</p>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${BORDER}` }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
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
                {['วันที่/เวลา', 'ผู้ใช้', 'การกระทำ', 'เลขอ้างอิง', 'ก่อน', 'หลัง', 'หมวด'].map((h) => (
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: TEXT3, fontSize: 14 }}>
                    ไม่พบรายการ
                  </td>
                </tr>
              ) : (
                filtered.map((log, idx) => (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: idx < filtered.length - 1 ? `1px solid ${BORDER}` : 'none',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLTableRowElement).style.background =
                        'rgba(255,255,255,0.02)')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')
                    }
                  >
                    <td style={{ padding: '12px 16px', color: TEXT2, fontSize: 13, whiteSpace: 'nowrap' }}>
                      {log.datetime}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#FFFFFF', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {log.user}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#FFFFFF', fontSize: 13 }}>{log.action}</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: GOLD, fontSize: 13, fontWeight: 600 }}>{log.refNumber}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: TEXT2, fontSize: 12 }}>
                      {log.before ?? <span style={{ color: TEXT3 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: TEXT2, fontSize: 12 }}>
                      {log.after ?? <span style={{ color: TEXT3 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '2px 10px',
                          borderRadius: 20,
                          background: `${CATEGORY_COLORS[log.category]}18`,
                          color: CATEGORY_COLORS[log.category],
                          fontSize: 12,
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {CATEGORY_MAP[log.category]}
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
