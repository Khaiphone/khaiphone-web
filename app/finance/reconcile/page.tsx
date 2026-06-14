'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, Check, AlertCircle, Plus, X } from 'lucide-react'
import { fetchFinanceIncome } from '@/app/actions/finance'
import type { FinanceIncome } from '@/app/actions/finance'
import { useFinanceDate } from '@/app/components/finance/FinanceDateContext'
import { thaiDateStr } from '@/lib/thai-date'

const CARD = 'var(--f-card)'
const BORDER = 'var(--f-border)'
const GOLD = '#B8860B'
const TEXT2 = 'var(--f-text2)'
const TEXT3 = 'var(--f-text3)'
const BANK_LS = 'khaiphone_bank_txs'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } }

type BankTx = { id: string; date: string; desc: string; amount: number; matched: boolean }
type SysTx = { id: string; refNumber: string; date: string; desc: string; amount: number; matched: boolean }

const EMPTY_BANK = { desc: '', amount: '', date: thaiDateStr() }

function fmtDate(s: string) {
  const d = new Date(s.length === 10 ? s + 'T00:00:00' : s)
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function ReconcilePage() {
  const { dateFrom, dateTo } = useFinanceDate()
  const [bankList, setBankList] = useState<BankTx[]>([])
  const [sysList, setSysList] = useState<SysTx[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const [selectedSys, setSelectedSys] = useState<string | null>(null)
  const [showAddBank, setShowAddBank] = useState(false)
  const [bankForm, setBankForm] = useState(EMPTY_BANK)

  useEffect(() => {
    try { setBankList(JSON.parse(localStorage.getItem(BANK_LS) ?? '[]')) } catch { setBankList([]) }
    setLoading(true)
    fetchFinanceIncome(dateFrom, dateTo).then((income: FinanceIncome[]) => {
      setSysList(income.map(r => ({
        id: r.id,
        refNumber: r.refNumber,
        date: r.date,
        desc: `ขาย ${r.model} ${r.storage}`,
        amount: r.sellPrice,
        matched: false,
      })))
      setLoading(false)
    })
  }, [dateFrom, dateTo])

  function saveBank(next: BankTx[]) {
    setBankList(next)
    localStorage.setItem(BANK_LS, JSON.stringify(next))
  }

  function addBankTx() {
    if (!bankForm.desc.trim() || !bankForm.amount) return
    const amount = Number(bankForm.amount)
    if (isNaN(amount)) return
    const tx: BankTx = { id: crypto.randomUUID(), date: bankForm.date, desc: bankForm.desc.trim(), amount, matched: false }
    saveBank([tx, ...bankList])
    setBankForm(EMPTY_BANK)
    setShowAddBank(false)
  }

  function removeBankTx(id: string) {
    saveBank(bankList.filter(b => b.id !== id))
    if (selectedBank === id) setSelectedBank(null)
  }

  function handleMatch() {
    if (!selectedBank || !selectedSys) return
    saveBank(bankList.map(b => b.id === selectedBank ? { ...b, matched: true } : b))
    setSysList(prev => prev.map(s => s.id === selectedSys ? { ...s, matched: true } : s))
    setSelectedBank(null)
    setSelectedSys(null)
  }

  function handleUnmatch(bankId: string) {
    saveBank(bankList.map(b => b.id === bankId ? { ...b, matched: false } : b))
  }

  function handleAutoMatch() {
    const unmatchedBank = bankList.filter(b => !b.matched)
    const unmatchedSys = [...sysList.filter(s => !s.matched)]
    const newBank = [...bankList]
    const newSys = [...sysList]
    for (const b of unmatchedBank) {
      const sIdx = unmatchedSys.findIndex(s => !s.matched && s.amount === b.amount)
      if (sIdx >= 0) {
        const bIdx = newBank.findIndex(x => x.id === b.id)
        const sysIdx = newSys.findIndex(x => x.id === unmatchedSys[sIdx].id)
        if (bIdx >= 0) newBank[bIdx] = { ...newBank[bIdx], matched: true }
        if (sysIdx >= 0) newSys[sysIdx] = { ...newSys[sysIdx], matched: true }
        unmatchedSys[sIdx].matched = true
      }
    }
    saveBank(newBank)
    setSysList(newSys)
    setSelectedBank(null)
    setSelectedSys(null)
  }

  const unmatchedBank = bankList.filter(b => !b.matched).length
  const unmatchedSys = sysList.filter(s => !s.matched).length

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--f-input-bg)', border: `1px solid ${BORDER}`, color: 'var(--f-text1)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  return (
    <motion.div {...fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary bar */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 2px', color: TEXT3, fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>รอจับคู่ (ธนาคาร)</p>
          <p style={{ margin: 0, color: unmatchedBank > 0 ? '#facc15' : '#22c55e', fontSize: 22, fontWeight: 700 }}>{unmatchedBank} รายการ</p>
        </div>
        <div style={{ width: 1, height: 40, background: BORDER }} />
        <div>
          <p style={{ margin: '0 0 2px', color: TEXT3, fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>รอจับคู่ (ระบบ)</p>
          <p style={{ margin: 0, color: unmatchedSys > 0 ? '#facc15' : '#22c55e', fontSize: 22, fontWeight: 700 }}>{unmatchedSys} รายการ</p>
        </div>
        <div style={{ flex: 1 }} />
        {selectedBank && selectedSys && (
          <button onClick={handleMatch} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, background: '#22c55e', border: 'none', color: 'var(--f-text1)', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Check size={16} /> จับคู่ที่เลือก
          </button>
        )}
        <button onClick={handleAutoMatch} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, background: GOLD, border: 'none', color: 'var(--f-text1)', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Link2 size={16} /> จับคู่อัตโนมัติ
        </button>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Bank side */}
        <div style={{ flex: '1 1 280px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--f-text1)', fontWeight: 700, fontSize: 14 }}>รายการธนาคาร</p>
              <p style={{ margin: '2px 0 0', color: TEXT2, fontSize: 12 }}>เพิ่มรายการจากสเตทเมนต์ธนาคาร</p>
            </div>
            <button onClick={() => setShowAddBank(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'var(--f-hover)', border: `1px solid ${BORDER}`, color: TEXT2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={13} /> เพิ่ม
            </button>
          </div>
          {bankList.length === 0 ? (
            <p style={{ color: TEXT3, textAlign: 'center', padding: '32px 0', fontSize: 13 }}>ยังไม่มีรายการ<br />กด "+ เพิ่ม" เพื่อเพิ่มรายการจากธนาคาร</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {bankList.map((b, idx) => (
                <div key={b.id} onClick={() => !b.matched && setSelectedBank(b.id === selectedBank ? null : b.id)}
                  style={{ padding: '12px 20px', borderBottom: idx < bankList.length - 1 ? `1px solid ${BORDER}` : 'none', cursor: b.matched ? 'default' : 'pointer', background: selectedBank === b.id ? 'rgba(184,134,11,0.12)' : b.matched ? 'rgba(34,197,94,0.05)' : 'transparent', transition: 'background 0.1s', opacity: b.matched ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.matched ? '#22c55e' : '#facc15', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: 'var(--f-text1)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.desc}</p>
                    <p style={{ margin: 0, color: TEXT3, fontSize: 12 }}>{fmtDate(b.date)}</p>
                  </div>
                  <span style={{ color: b.amount > 0 ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>
                    {b.amount > 0 ? '+' : ''}฿{Math.abs(b.amount).toLocaleString('th-TH')}
                  </span>
                  {b.matched
                    ? <button onClick={e => { e.stopPropagation(); handleUnmatch(b.id) }} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', padding: 0, display: 'flex' }}><Check size={14} /></button>
                    : <button onClick={e => { e.stopPropagation(); removeBankTx(b.id) }} style={{ background: 'none', border: 'none', color: TEXT3, cursor: 'pointer', padding: 0, display: 'flex' }}><X size={13} /></button>
                  }
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Match icon */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: selectedBank && selectedSys ? GOLD : 'var(--f-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
            <Link2 size={18} color={selectedBank && selectedSys ? '#fff' : TEXT3} />
          </div>
        </div>

        {/* System side */}
        <div style={{ flex: '1 1 280px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ margin: 0, color: 'var(--f-text1)', fontWeight: 700, fontSize: 14 }}>รายการในระบบ</p>
            <p style={{ margin: '2px 0 0', color: TEXT2, fontSize: 12 }}>รายการขายออกจากฐานข้อมูล</p>
          </div>
          {loading ? (
            <p style={{ color: TEXT3, textAlign: 'center', padding: '32px 0', fontSize: 13 }}>กำลังโหลด...</p>
          ) : sysList.length === 0 ? (
            <p style={{ color: TEXT3, textAlign: 'center', padding: '32px 0', fontSize: 13 }}>ยังไม่มีรายการขาย</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sysList.map((s, idx) => (
                <div key={s.id} onClick={() => !s.matched && setSelectedSys(s.id === selectedSys ? null : s.id)}
                  style={{ padding: '12px 20px', borderBottom: idx < sysList.length - 1 ? `1px solid ${BORDER}` : 'none', cursor: s.matched ? 'default' : 'pointer', background: selectedSys === s.id ? 'rgba(184,134,11,0.12)' : s.matched ? 'rgba(34,197,94,0.05)' : 'transparent', transition: 'background 0.1s', opacity: s.matched ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.matched ? '#22c55e' : '#facc15', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: 'var(--f-text1)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.desc}</p>
                    <p style={{ margin: 0, color: TEXT3, fontSize: 12 }}>{s.refNumber} · {fmtDate(s.date)}</p>
                  </div>
                  <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>+฿{s.amount.toLocaleString('th-TH')}</span>
                  {s.matched ? <Check size={14} color="#22c55e" /> : <AlertCircle size={14} color="#facc15" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add bank tx modal */}
      <AnimatePresence>
        {showAddBank && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'var(--f-card)', border: `1px solid ${BORDER}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 400 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <p style={{ margin: 0, color: 'var(--f-text1)', fontWeight: 700, fontSize: 15 }}>เพิ่มรายการธนาคาร</p>
                <button onClick={() => setShowAddBank(false)} style={{ background: 'none', border: 'none', color: TEXT3, cursor: 'pointer', padding: 4, display: 'flex' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', color: TEXT2, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>วันที่</label>
                  <input type="date" value={bankForm.date} onChange={e => setBankForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', color: TEXT2, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>รายการ</label>
                  <input type="text" placeholder="รายละเอียด เช่น โอนเงิน LINE OA" value={bankForm.desc} onChange={e => setBankForm(f => ({ ...f, desc: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', color: TEXT2, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>จำนวนเงิน (บวก=รับเข้า, ลบ=จ่ายออก)</label>
                  <input type="number" placeholder="เช่น 32000 หรือ -18000" value={bankForm.amount} onChange={e => setBankForm(f => ({ ...f, amount: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAddBank(false)} style={{ padding: '9px 18px', borderRadius: 8, background: 'var(--f-hover)', border: `1px solid ${BORDER}`, color: TEXT2, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
                <button onClick={addBankTx} style={{ padding: '9px 20px', borderRadius: 8, background: GOLD, border: 'none', color: 'var(--f-text1)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>เพิ่ม</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
