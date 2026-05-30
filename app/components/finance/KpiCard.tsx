'use client'

import { useEffect, useState } from 'react'

type Props = {
  label: string
  value: number
  delta?: number | null
  deltaType?: 'positive' | 'negative'
  compareLabel?: string
  format?: 'currency' | 'number' | 'percent'
  size?: 'lg' | 'sm'
}

function formatValue(v: number, fmt: 'currency' | 'number' | 'percent'): string {
  if (fmt === 'currency') return '฿' + v.toLocaleString('th-TH')
  if (fmt === 'percent') return v.toFixed(1) + '%'
  return v.toLocaleString('th-TH')
}

export default function KpiCard({
  label,
  value,
  delta,
  deltaType,
  compareLabel,
  format = 'currency',
  size = 'lg',
}: Props) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let cur = 0
    const step = value / 40
    const t = setInterval(() => {
      cur += step
      if (cur >= value) {
        setDisplay(value)
        clearInterval(t)
      } else {
        setDisplay(Math.floor(cur))
      }
    }, 16)
    return () => clearInterval(t)
  }, [value])

  const isLg = size === 'lg'

  return (
    <div
      style={{
        background: 'var(--f-card)',
        border: '1px solid var(--f-border)',
        borderRadius: 16,
        padding: isLg ? '20px 24px' : '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <p
        style={{
          margin: 0,
          color: 'var(--f-text2)',
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          color: 'var(--f-text1)',
          fontSize: isLg ? 30 : 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {formatValue(display, format)}
      </p>
      {isLg && deltaType !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {delta == null ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: 'rgba(150,150,150,0.12)', color: 'var(--f-text3)', alignSelf: 'flex-start' }}>
              ไม่มีข้อมูลเปรียบเทียบ
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: (() => { const isUp = delta >= 0; const isGood = deltaType === 'positive' ? isUp : !isUp; return isGood ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'; })(),
                color: (() => { const isUp = delta >= 0; const isGood = deltaType === 'positive' ? isUp : !isUp; return isGood ? '#22c55e' : '#ef4444'; })(),
                alignSelf: 'flex-start',
              }}
            >
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {compareLabel && (
            <span style={{ fontSize: 11, color: 'var(--f-text3)' }}>vs {compareLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}
