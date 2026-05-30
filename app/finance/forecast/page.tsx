'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchForecast } from '@/app/actions/finance'
import type { ForecastData } from '@/app/actions/finance'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

const TEXT1 = 'var(--f-text1)'
const TEXT2 = 'var(--f-text2)'
const TEXT3 = 'var(--f-text3)'
const CARD  = 'var(--f-card)'
const BORDER = 'var(--f-border)'
const GOLD  = '#B8860B'

function fmt(n: number) { return '฿' + n.toLocaleString('th-TH') }
function fmtShort(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export default function ForecastPage() {
  const [data, setData] = useState<ForecastData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchForecast().then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) return <div style={{ padding: 40, color: TEXT3, textAlign: 'center' }}>กำลังโหลด...</div>

  const chartData = data.points.map(p => ({
    date: fmtShort(p.date),
    actual: p.actual,
    forecast: p.forecast,
  }))

  const todayIdx = data.points.findIndex(p => !p.actual && p.forecast)
  const todayLabel = todayIdx >= 0 ? fmtShort(data.points[todayIdx].date) : undefined

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* info */}
      <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '12px 16px', color: '#3b82f6', fontSize: 13 }}>
        คาดการณ์จากค่าเฉลี่ยรายวันของ 30 วันล่าสุด ({fmt(data.avgDailyRevenue)}/วัน)
      </div>

      {/* Projection cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'รายได้คาดการณ์ 30 วัน',  value: fmt(data.projected30),  color: '#22c55e' },
          { label: 'รายได้คาดการณ์ 60 วัน',  value: fmt(data.projected60),  color: '#3b82f6' },
          { label: 'รายได้คาดการณ์ 90 วัน',  value: fmt(data.projected90),  color: GOLD },
          { label: 'รายได้เฉลี่ยต่อวัน',     value: fmt(data.avgDailyRevenue), color: 'var(--f-text1)' },
        ].map(m => (
          <div key={m.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px 20px' }}>
            <p style={{ margin: '0 0 8px', color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.4 }}>{m.label}</p>
            <p style={{ margin: 0, color: m.color, fontSize: 22, fontWeight: 700 }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 24px' }}>
        <p style={{ margin: '0 0 4px', color: TEXT1, fontWeight: 700, fontSize: 15 }}>ยอดขายรายวัน + คาดการณ์ 30 วันข้างหน้า</p>
        <p style={{ margin: '0 0 20px', color: TEXT3, fontSize: 12 }}>เส้นสีเขียว = ข้อมูลจริง · เส้นสีฟ้า = คาดการณ์</p>
        {data.points.length === 0 ? (
          <p style={{ color: TEXT3, textAlign: 'center', padding: '40px 0' }}>ไม่มีข้อมูลเพียงพอสำหรับการคาดการณ์</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--f-grid)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: TEXT3, fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: TEXT3, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `฿${(Number(v) / 1000).toFixed(0)}K`} width={48} />
              <Tooltip
                contentStyle={{ background: 'var(--f-card2)', border: '1px solid var(--f-border)', borderRadius: 8, color: TEXT1 }}
                formatter={(v: unknown) => v ? [fmt(Number(v)), ''] : []}
              />
              {todayLabel && <ReferenceLine x={todayLabel} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'วันนี้', fill: '#f59e0b', fontSize: 11 }} />}
              <Area type="monotone" dataKey="actual" stroke="#22c55e" fill="url(#gActual)" strokeWidth={2} name="ยอดจริง" connectNulls={false} dot={false} />
              <Area type="monotone" dataKey="forecast" stroke="#3b82f6" fill="url(#gForecast)" strokeWidth={2} strokeDasharray="5 3" name="คาดการณ์" connectNulls={false} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <p style={{ color: TEXT3, fontSize: 11, textAlign: 'center', margin: 0 }}>
        การคาดการณ์นี้ใช้ค่าเฉลี่ยเชิงเส้น — ไม่ได้คำนึงถึง seasonality หรือปัจจัยภายนอก
      </p>
    </motion.div>
  )
}
