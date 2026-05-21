'use client'

import { useEffect, useState } from 'react'

type Props = {
  label: string
  value: number
  delta?: number
  deltaType?: 'positive' | 'negative'
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
        background: '#0D0D0D',
        border: '1px solid rgba(255,255,255,0.08)',
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
          color: 'rgba(255,255,255,0.65)',
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
          color: '#FFFFFF',
          fontSize: isLg ? 30 : 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {formatValue(display, format)}
      </p>
      {isLg && delta !== undefined && deltaType !== undefined && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            background:
              deltaType === 'positive'
                ? 'rgba(34,197,94,0.15)'
                : 'rgba(239,68,68,0.15)',
            color: deltaType === 'positive' ? '#22c55e' : '#ef4444',
            alignSelf: 'flex-start',
          }}
        >
          {deltaType === 'positive' ? '▲' : '▼'} {delta.toFixed(1)}%
        </span>
      )}
    </div>
  )
}
