'use client'

import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import KpiCard from '@/app/components/finance/KpiCard'
import { profitKpi, profitByModel, profitDonut } from '@/mock/finance/profit'

const CARD = '#0D0D0D'
const BORDER = 'rgba(255,255,255,0.08)'
const TEXT2 = 'rgba(255,255,255,0.65)'
const TEXT3 = 'rgba(255,255,255,0.35)'

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25 },
}

export default function ProfitPage() {
  return (
    <motion.div {...fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
        }}
      >
        {profitKpi.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            delta={k.delta}
            deltaType={k.deltaType}
            format={k.format}
            size="lg"
          />
        ))}
      </div>

      {/* Table + Donut */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Model Table */}
        <div
          style={{
            flex: '2 1 320px',
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ margin: 0, color: '#FFFFFF', fontWeight: 700, fontSize: 15 }}>
              กำไรตามรุ่น (Profit by Model)
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['รุ่น', 'ต้นทุนเฉลี่ย', 'ราคาขายเฉลี่ย', 'กำไรเฉลี่ย', 'Margin %'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 16px',
                        textAlign: 'left',
                        color: TEXT3,
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profitByModel.map((m, idx) => (
                  <tr
                    key={m.model}
                    style={{
                      borderBottom:
                        idx < profitByModel.length - 1 ? `1px solid ${BORDER}` : 'none',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLTableRowElement).style.background =
                        'rgba(255,255,255,0.02)')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')
                    }
                  >
                    <td style={{ padding: '12px 16px', color: '#FFFFFF', fontSize: 13, fontWeight: 500 }}>
                      {m.model}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#ef4444', fontSize: 13, whiteSpace: 'nowrap' }}>
                      ฿{m.costAvg.toLocaleString('th-TH')}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#22c55e', fontSize: 13, whiteSpace: 'nowrap' }}>
                      ฿{m.sellAvg.toLocaleString('th-TH')}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 14 }}>
                        +฿{m.profitAvg.toLocaleString('th-TH')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            flex: 1,
                            height: 6,
                            borderRadius: 3,
                            background: 'rgba(255,255,255,0.08)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${m.margin}%`,
                              height: '100%',
                              background: '#B8860B',
                              borderRadius: 3,
                            }}
                          />
                        </div>
                        <span style={{ color: '#B8860B', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                          {m.margin.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Donut Chart */}
        <div
          style={{
            flex: '1 1 260px',
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            padding: '20px 24px',
          }}
        >
          <p style={{ margin: '0 0 16px', color: '#FFFFFF', fontWeight: 700, fontSize: 15 }}>
            สัดส่วนกำไรตามรุ่น
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={profitDonut}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {profitDonut.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1A1A1A',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#fff',
                }}
                formatter={(value) => `฿${Number(value).toLocaleString('th-TH')}`}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ color: TEXT2, fontSize: 12 }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {profitDonut.map((d) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: d.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: TEXT2, fontSize: 12, flex: 1 }}>{d.name}</span>
                <span style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 600 }}>
                  ฿{d.value.toLocaleString('th-TH')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
