'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link2, Check, AlertCircle } from 'lucide-react'

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

type BankTx = { id: string; date: string; desc: string; amount: number; matched: boolean }
type SysTx = { id: string; refNumber: string; date: string; desc: string; amount: number; matched: boolean }

const bankTxs: BankTx[] = [
  { id: 'b1', date: '21/05/2024', desc: 'โอนเงิน LINE OA - คุณสมชาย', amount: 32000, matched: true },
  { id: 'b2', date: '20/05/2024', desc: 'รับชำระค่าสินค้า - PromptPay', amount: 18500, matched: true },
  { id: 'b3', date: '20/05/2024', desc: 'โอนเงิน LINE OA - คุณนภา', amount: 28500, matched: false },
  { id: 'b4', date: '19/05/2024', desc: 'รับชำระ Facebook Pay', amount: 1000, matched: false },
  { id: 'b5', date: '19/05/2024', desc: 'ค่าเช่าสำนักงาน', amount: -18000, matched: true },
]

const sysTxs: SysTx[] = [
  { id: 's1', refNumber: 'INC-240521-001', date: '21/05/2024', desc: 'ขาย iPhone 15 Pro Max', amount: 32000, matched: true },
  { id: 's2', refNumber: 'INC-240520-002', date: '20/05/2024', desc: 'ขาย iPhone 14 Pro', amount: 18500, matched: true },
  { id: 's3', refNumber: 'INC-240520-004', date: '20/05/2024', desc: 'ขาย iPhone 15 256GB', amount: 28500, matched: false },
  { id: 's4', refNumber: 'INC-240519-005', date: '19/05/2024', desc: 'ขาย AirPods Pro', amount: 1000, matched: false },
  { id: 's5', refNumber: 'EXP-240520-003', date: '20/05/2024', desc: 'ค่าเช่าสำนักงาน พ.ค.', amount: -18000, matched: true },
]

export default function ReconcilePage() {
  const [bankList, setBankList] = useState<BankTx[]>(bankTxs)
  const [sysList, setSysList] = useState<SysTx[]>(sysTxs)
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const [selectedSys, setSelectedSys] = useState<string | null>(null)

  const unmatchedBank = bankList.filter((b) => !b.matched).length
  const unmatchedSys = sysList.filter((s) => !s.matched).length

  function handleMatch() {
    if (!selectedBank || !selectedSys) return
    setBankList((prev) => prev.map((b) => (b.id === selectedBank ? { ...b, matched: true } : b)))
    setSysList((prev) => prev.map((s) => (s.id === selectedSys ? { ...s, matched: true } : s)))
    setSelectedBank(null)
    setSelectedSys(null)
  }

  function handleAutoMatch() {
    setBankList((prev) => prev.map((b) => ({ ...b, matched: true })))
    setSysList((prev) => prev.map((s) => ({ ...s, matched: true })))
    setSelectedBank(null)
    setSelectedSys(null)
  }

  return (
    <motion.div {...fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary bar */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p style={{ margin: '0 0 2px', color: TEXT3, fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>
            รอจับคู่ (ธนาคาร)
          </p>
          <p style={{ margin: 0, color: unmatchedBank > 0 ? '#facc15' : '#22c55e', fontSize: 22, fontWeight: 700 }}>
            {unmatchedBank} รายการ
          </p>
        </div>
        <div style={{ width: 1, height: 40, background: BORDER }} />
        <div>
          <p style={{ margin: '0 0 2px', color: TEXT3, fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>
            รอจับคู่ (ระบบ)
          </p>
          <p style={{ margin: 0, color: unmatchedSys > 0 ? '#facc15' : '#22c55e', fontSize: 22, fontWeight: 700 }}>
            {unmatchedSys} รายการ
          </p>
        </div>
        <div style={{ flex: 1 }} />
        {selectedBank && selectedSys && (
          <button
            onClick={handleMatch}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              borderRadius: 8,
              background: '#22c55e',
              border: 'none',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Check size={16} />
            จับคู่ที่เลือก
          </button>
        )}
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Bank Transactions */}
        <div
          style={{
            flex: '1 1 280px',
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ margin: 0, color: '#FFFFFF', fontWeight: 700, fontSize: 14 }}>
              รายการธนาคาร
            </p>
            <p style={{ margin: '2px 0 0', color: TEXT2, fontSize: 12 }}>คลิกเลือกเพื่อจับคู่</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {bankList.map((b, idx) => (
              <div
                key={b.id}
                onClick={() => !b.matched && setSelectedBank(b.id === selectedBank ? null : b.id)}
                style={{
                  padding: '12px 20px',
                  borderBottom: idx < bankList.length - 1 ? `1px solid ${BORDER}` : 'none',
                  cursor: b.matched ? 'default' : 'pointer',
                  background:
                    selectedBank === b.id
                      ? 'rgba(184,134,11,0.12)'
                      : b.matched
                        ? 'rgba(34,197,94,0.05)'
                        : 'transparent',
                  transition: 'background 0.1s',
                  opacity: b.matched ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: b.matched ? '#22c55e' : '#facc15',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {b.desc}
                  </p>
                  <p style={{ margin: 0, color: TEXT3, fontSize: 12 }}>{b.date}</p>
                </div>
                <span
                  style={{
                    color: b.amount > 0 ? '#22c55e' : '#ef4444',
                    fontWeight: 700,
                    fontSize: 14,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {b.amount > 0 ? '+' : ''}฿{Math.abs(b.amount).toLocaleString('th-TH')}
                </span>
                {b.matched ? (
                  <Check size={14} color="#22c55e" />
                ) : (
                  <AlertCircle size={14} color="#facc15" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Match arrow column */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 60,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: selectedBank && selectedSys ? GOLD : 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
          >
            <Link2 size={18} color={selectedBank && selectedSys ? '#fff' : TEXT3} />
          </div>
        </div>

        {/* System Transactions */}
        <div
          style={{
            flex: '1 1 280px',
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ margin: 0, color: '#FFFFFF', fontWeight: 700, fontSize: 14 }}>
              รายการในระบบ
            </p>
            <p style={{ margin: '2px 0 0', color: TEXT2, fontSize: 12 }}>คลิกเลือกเพื่อจับคู่</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sysList.map((s, idx) => (
              <div
                key={s.id}
                onClick={() => !s.matched && setSelectedSys(s.id === selectedSys ? null : s.id)}
                style={{
                  padding: '12px 20px',
                  borderBottom: idx < sysList.length - 1 ? `1px solid ${BORDER}` : 'none',
                  cursor: s.matched ? 'default' : 'pointer',
                  background:
                    selectedSys === s.id
                      ? 'rgba(184,134,11,0.12)'
                      : s.matched
                        ? 'rgba(34,197,94,0.05)'
                        : 'transparent',
                  transition: 'background 0.1s',
                  opacity: s.matched ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: s.matched ? '#22c55e' : '#facc15',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.desc}
                  </p>
                  <p style={{ margin: 0, color: TEXT3, fontSize: 12 }}>
                    {s.refNumber} · {s.date}
                  </p>
                </div>
                <span
                  style={{
                    color: s.amount > 0 ? '#22c55e' : '#ef4444',
                    fontWeight: 700,
                    fontSize: 14,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.amount > 0 ? '+' : ''}฿{Math.abs(s.amount).toLocaleString('th-TH')}
                </span>
                {s.matched ? (
                  <Check size={14} color="#22c55e" />
                ) : (
                  <AlertCircle size={14} color="#facc15" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Auto-match button */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
        <button
          onClick={handleAutoMatch}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 32px',
            borderRadius: 10,
            background: GOLD,
            border: 'none',
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <Link2 size={18} />
          จับคู่อัตโนมัติ
        </button>
      </div>
    </motion.div>
  )
}
