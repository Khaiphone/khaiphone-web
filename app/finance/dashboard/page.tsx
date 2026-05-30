'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import KpiCard from '@/app/components/finance/KpiCard'
import { fetchFinanceDashboard } from '@/app/actions/finance'
import type { FinanceDashboard } from '@/app/actions/finance'
import { useFinanceDate } from '@/app/components/finance/FinanceDateContext'

const CARD = 'var(--f-card)'
const BORDER = 'var(--f-border)'
const GOLD = '#B8860B'
const TEXT2 = 'var(--f-text2)'
const TEXT3 = 'var(--f-text3)'

const CATEGORY_COLORS = ['#B8860B', '#3b82f6', '#a855f7', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4']

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25 },
}

function fmt(v: number) {
  return `฿${v.toLocaleString('th-TH')}`
}

export default function DashboardPage() {
  const [data, setData] = useState<FinanceDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const { dateFrom, dateTo } = useFinanceDate()

  useEffect(() => {
    setLoading(true)
    fetchFinanceDashboard(dateFrom, dateTo).then((d) => { setData(d); setLoading(false) })
  }, [dateFrom, dateTo])

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
        <p style={{ color: TEXT3, fontSize: 14 }}>กำลังโหลด...</p>
      </div>
    )
  }

  const kpiMain = [
    { label: 'รายได้รวม',        value: data.totalRevenue,   delta: data.deltaRevenue,   deltaType: 'positive' as const },
    { label: 'ต้นทุนเครื่อง',    value: data.totalCost,      delta: data.deltaCost,      deltaType: 'negative' as const },
    { label: 'ค่าใช้จ่าย',       value: data.totalExpenses,  delta: data.deltaExpenses,  deltaType: 'negative' as const },
    { label: 'กำไรสุทธิแท้จริง', value: data.trueNetProfit,  delta: data.deltaProfit,    deltaType: 'positive' as const },
  ]

  const kpiSecondary = [
    { label: 'กำไรจากเครื่อง (ก่อนหักค่าใช้จ่าย)', value: data.netProfit, format: 'currency' as const },
    { label: 'มูลค่าสต็อก',     value: data.stockValue,   format: 'currency' as const },
    { label: 'เครื่องที่รับซื้อ', value: data.purchaseCount, format: 'number' as const },
    { label: 'เครื่องที่ขายแล้ว', value: data.soldCount,    format: 'number' as const },
    { label: 'เครื่องในมือ',      value: data.purchaseCount - data.soldCount, format: 'number' as const },
    { label: 'รออนุมัติค่าใช้จ่าย', value: data.pendingExpensesCount, format: 'number' as const },
  ]

  const maxExpense = Math.max(...data.expenseByCategory.map((e) => e.amount), 1)

  return (
    <motion.div {...fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Main KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {kpiMain.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} delta={k.delta} deltaType={k.deltaType} format="currency" size="lg" />
        ))}
      </div>

      {/* Secondary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {kpiSecondary.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} format={k.format} size="sm" />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Revenue vs Cost Line Chart */}
        <div style={{ flex: '2 1 340px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 24px' }}>
          <p style={{ color: 'var(--f-text1)', fontWeight: 700, fontSize: 15, margin: '0 0 16px' }}>
            รายรับ vs ต้นทุน (รายเดือน)
          </p>
          {data.revenueByMonth.length === 0 ? (
            <p style={{ color: TEXT3, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>ยังไม่มีข้อมูล</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.revenueByMonth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: TEXT3, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: TEXT3, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `฿${(v / 1000).toFixed(0)}K`} width={52} />
                <Tooltip
                  contentStyle={{ background: 'var(--f-card2)', border: '1px solid var(--f-border)', borderRadius: 8, color: 'var(--f-text1)' }}
                  formatter={(value) => fmt(Number(value))}
                />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={false} name="รายรับ" />
                <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} dot={false} name="ต้นทุน" />
              </LineChart>
            </ResponsiveContainer>
          )}
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TEXT2 }}>
              <span style={{ width: 12, height: 3, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} /> รายรับ
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TEXT2 }}>
              <span style={{ width: 12, height: 3, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} /> ต้นทุน
            </span>
          </div>
        </div>

        {/* Profit Area Chart */}
        <div style={{ flex: '1.5 1 260px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 24px' }}>
          <p style={{ color: 'var(--f-text1)', fontWeight: 700, fontSize: 15, margin: '0 0 16px' }}>
            กำไรสุทธิ (รายเดือน)
          </p>
          {data.profitByMonth.length === 0 ? (
            <p style={{ color: TEXT3, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>ยังไม่มีข้อมูล</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.profitByMonth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: TEXT3, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: TEXT3, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `฿${(v / 1000).toFixed(0)}K`} width={52} />
                <Tooltip
                  contentStyle={{ background: 'var(--f-card2)', border: '1px solid var(--f-border)', borderRadius: 8, color: 'var(--f-text1)' }}
                  formatter={(value) => fmt(Number(value))}
                />
                <Area type="monotone" dataKey="profit" stroke={GOLD} strokeWidth={2} fill="url(#profitGrad)" name="กำไร" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Expense by Category */}
        <div style={{ flex: '1 1 280px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 24px' }}>
          <p style={{ color: 'var(--f-text1)', fontWeight: 700, fontSize: 15, margin: '0 0 16px' }}>
            ค่าใช้จ่ายแยกตามประเภท
          </p>
          {data.expenseByCategory.length === 0 ? (
            <p style={{ color: TEXT3, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>ยังไม่มีข้อมูล</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.expenseByCategory} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fill: TEXT3, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `฿${(v / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="category" tick={{ fill: TEXT2, fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip
                    contentStyle={{ background: 'var(--f-card2)', border: '1px solid var(--f-border)', borderRadius: 8, color: 'var(--f-text1)' }}
                    formatter={(value) => fmt(Number(value))}
                  />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]} name="จำนวน">
                    {data.expenseByCategory.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Summary list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {data.expenseByCategory.map((e, i) => (
                  <div key={e.category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length], flexShrink: 0 }} />
                      <span style={{ color: TEXT2, fontSize: 13 }}>{e.category}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--f-text1)', fontSize: 13, fontWeight: 600 }}>{fmt(e.amount)}</span>
                      <span style={{ color: TEXT3, fontSize: 12 }}>{Math.round((e.amount / maxExpense) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top Models */}
        <div style={{ flex: '1 1 200px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 24px' }}>
          <p style={{ color: 'var(--f-text1)', fontWeight: 700, fontSize: 15, margin: '0 0 16px' }}>
            Top รุ่นกำไรสูงสุด
          </p>
          {data.topModels.length === 0 ? (
            <p style={{ color: TEXT3, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>ยังไม่มีข้อมูล</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data.topModels.map((m, i) => (
                <div key={m.model} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: i === 0 ? GOLD : 'rgba(184,134,11,0.2)',
                    color: i === 0 ? '#fff' : GOLD,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: 'var(--f-text1)', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.model}
                    </p>
                    <p style={{ margin: 0, color: '#22c55e', fontSize: 12, fontWeight: 600 }}>
                      {fmt(m.profit)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
