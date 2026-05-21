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
} from 'recharts'
import KpiCard from '@/app/components/finance/KpiCard'
import { fetchFinanceDashboard } from '@/app/actions/finance'
import type { FinanceDashboard } from '@/app/actions/finance'

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

export default function DashboardPage() {
  const [data, setData] = useState<FinanceDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFinanceDashboard().then((d) => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
        <p style={{ color: TEXT3, fontSize: 14 }}>กำลังโหลด...</p>
      </div>
    )
  }

  const kpiMain = [
    { label: 'รายได้รวม', value: data.totalRevenue, delta: 0, deltaType: 'positive' as const, format: 'currency' as const },
    { label: 'ต้นทุนรวม', value: data.totalCost, delta: 0, deltaType: 'negative' as const, format: 'currency' as const },
    { label: 'กำไรสุทธิ', value: data.netProfit, delta: 0, deltaType: data.netProfit >= 0 ? 'positive' as const : 'negative' as const, format: 'currency' as const },
    { label: 'มูลค่าสต็อก', value: data.stockValue, delta: 0, deltaType: 'positive' as const, format: 'currency' as const },
  ]

  const kpiSecondary = [
    { label: 'เครื่องที่รับซื้อ', value: data.purchaseCount, format: 'number' as const },
    { label: 'เครื่องที่ขายแล้ว', value: data.soldCount, format: 'number' as const },
    { label: 'เครื่องในมือ', value: data.purchaseCount - data.soldCount, format: 'number' as const },
  ]

  return (
    <motion.div {...fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Main KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {kpiMain.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} delta={k.delta} deltaType={k.deltaType} format={k.format} size="lg" />
        ))}
      </div>

      {/* Secondary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {kpiSecondary.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} format={k.format} size="sm" />
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Revenue vs Cost Line Chart */}
        <div style={{ flex: '2 1 340px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 24px' }}>
          <p style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 15, margin: '0 0 16px' }}>
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
                  contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                  formatter={(value) => `฿${Number(value).toLocaleString('th-TH')}`}
                />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={false} name="รายรับ" />
                <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} dot={false} name="ต้นทุน" />
              </LineChart>
            </ResponsiveContainer>
          )}
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TEXT2 }}>
              <span style={{ width: 12, height: 3, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} />
              รายรับ
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TEXT2 }}>
              <span style={{ width: 12, height: 3, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} />
              ต้นทุน
            </span>
          </div>
        </div>

        {/* Profit Area Chart */}
        <div style={{ flex: '1.5 1 260px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 24px' }}>
          <p style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 15, margin: '0 0 16px' }}>
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
                  contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                  formatter={(value) => `฿${Number(value).toLocaleString('th-TH')}`}
                />
                <Area type="monotone" dataKey="profit" stroke={GOLD} strokeWidth={2} fill="url(#profitGrad)" name="กำไร" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Models */}
        <div style={{ flex: '1 1 200px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 24px' }}>
          <p style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 15, margin: '0 0 16px' }}>
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
                    <p style={{ margin: 0, color: '#FFFFFF', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.model}
                    </p>
                    <p style={{ margin: 0, color: '#22c55e', fontSize: 12, fontWeight: 600 }}>
                      ฿{m.profit.toLocaleString('th-TH')}
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
