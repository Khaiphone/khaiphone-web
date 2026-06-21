'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Edit2, Trash2, X, RefreshCw } from 'lucide-react'
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '@/app/actions/finance'
import type { Expense, ExpenseStatus } from '@/app/actions/finance'
import { thaiDateStr } from '@/lib/thai-date'
import { useFinanceDate } from '@/app/components/finance/FinanceDateContext'

const CARD = 'var(--f-card)'
const BORDER = 'var(--f-border)'
const GOLD = '#B8860B'
const TEXT2 = 'var(--f-text2)'
const TEXT3 = 'var(--f-text3)'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } }

const CATEGORIES = ['Ads', 'ขนส่ง', 'สำนักงาน', 'ซอฟต์แวร์', 'บุคคล', 'สื่อสาร', 'ซ่อมบำรุง', 'ซื้อคืน', 'อื่นๆ']
const ACCOUNTS = ['เงินสด', 'กสิกรไทย', 'ไทยพาณิชย์', 'กรุงเทพ', 'กรุงไทย', 'พร้อมเพย์']
const STATUSES: ExpenseStatus[] = ['pending', 'approved', 'rejected']
const STATUS_LABELS: Record<ExpenseStatus, string> = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธ' }
const STATUS_COLORS: Record<ExpenseStatus, { bg: string; text: string }> = {
  pending:  { bg: 'rgba(250,204,21,0.15)',  text: '#facc15' },
  approved: { bg: 'rgba(34,197,94,0.15)',   text: '#22c55e' },
  rejected: { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444' },
}

const TABS = ['ทั้งหมด', 'อนุมัติแล้ว', 'รออนุมัติ', 'ปฏิเสธ']
const CAT_COLORS = ['#B8860B', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#ef4444', '#ec4899', '#14b8a6']

function fmt(d: string) {
  const dt = new Date(d.length === 10 ? d + 'T00:00:00' : d)
  return dt.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function genRef() {
  const now = new Date()
  const y = String(now.getFullYear()).slice(2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const n = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
  return `EXP-${y}${m}${d}-${n}`
}

const EMPTY_FORM = {
  product: '',
  category: 'Ads',
  amount: '',
  status: 'pending' as ExpenseStatus,
  notes: '',
  date: thaiDateStr(),
  paymentAccount: '',
  accountOwner: '',
}

export default function ExpensesPage() {
  const { dateFrom, dateTo } = useFinanceDate()
  const [items, setItems] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [customCat, setCustomCat] = useState(false) // กำลังพิมพ์หมวดใหม่เองอยู่ไหม
  const [customAcct, setCustomAcct] = useState(false) // กำลังพิมพ์บัญชีใหม่เองอยู่ไหม
  const [catFilter, setCatFilter] = useState<string | null>(null) // กรองตารางเฉพาะหมวดที่เลือก

  const load = useCallback(async () => {
    setLoading(true)
    setItems(await fetchExpenses(dateFrom, dateTo))
    setLoading(false)
  }, [dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setErrorMsg('')
    setCustomCat(false)
    setCustomAcct(false)
    setModal('add')
  }

  function openEdit(item: Expense) {
    setForm({ product: item.product, category: item.category, amount: String(item.amount), status: item.status, notes: item.notes, date: item.date, paymentAccount: item.paymentAccount, accountOwner: item.accountOwner })
    setEditing(item)
    setErrorMsg('')
    setCustomCat(false)
    setCustomAcct(false)
    setModal('edit')
  }

  async function handleSubmit() {
    if (!form.product.trim() || !form.amount) return
    if (!form.category.trim()) { setErrorMsg('กรุณาเลือกหรือพิมพ์หมวดหมู่'); return }
    const amount = Number(form.amount)
    if (isNaN(amount) || amount <= 0) return
    setSaving(true)
    setErrorMsg('')
    if (modal === 'add') {
      const res = await createExpense({ date: form.date, refNumber: genRef(), product: form.product.trim(), category: form.category, amount, status: form.status, notes: form.notes.trim(), paymentAccount: form.paymentAccount.trim(), accountOwner: form.accountOwner.trim() })
      if (!res.success) { setErrorMsg(res.error); setSaving(false); return }
    } else if (editing) {
      const res = await updateExpense(editing.id, { date: form.date, product: form.product.trim(), category: form.category, amount, status: form.status, notes: form.notes.trim(), paymentAccount: form.paymentAccount.trim(), accountOwner: form.accountOwner.trim() })
      if (!res.success) { setErrorMsg(res.error); setSaving(false); return }
    }
    setSaving(false)
    setModal(null)
    await load()
  }

  async function handleDelete(id: string) {
    setSaving(true)
    await deleteExpense(id)
    setSaving(false)
    setDeleteId(null)
    await load()
  }

  const filtered = items.filter(r => {
    const tabMatch = activeTab === 0 || (activeTab === 1 && r.status === 'approved') || (activeTab === 2 && r.status === 'pending') || (activeTab === 3 && r.status === 'rejected')
    const q = search.toLowerCase()
    const searchMatch = !search || r.refNumber.toLowerCase().includes(q) || r.product.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
    return tabMatch && searchMatch
  })

  const filteredTotal = filtered.reduce((s, r) => s + r.amount, 0)

  // สรุปยอดต่อหมวดหมู่ (ตามแท็บ/ค้นหาที่กำลังดู — ไม่อิงตัวกรองหมวด เพื่อให้คลิกสลับได้) เรียงมาก→น้อย
  const byCategory = Object.entries(
    filtered.reduce<Record<string, { amount: number; count: number }>>((acc, r) => {
      const k = r.category || 'อื่นๆ'
      acc[k] = acc[k] || { amount: 0, count: 0 }
      acc[k].amount += r.amount
      acc[k].count += 1
      return acc
    }, {}),
  ).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.amount - a.amount)

  // ตารางด้านล่าง: กรองเพิ่มตามหมวดที่กดเลือก
  const displayed = catFilter ? filtered.filter(r => r.category === catFilter) : filtered
  const totalPages = Math.max(1, Math.ceil(displayed.length / perPage))
  const paged = displayed.slice((page - 1) * perPage, page * perPage)
  const totalAmount = displayed.reduce((s, r) => s + r.amount, 0)

  // หมวด/บัญชี พื้นฐาน + ที่เคยใช้จริงจาก DB (พิมพ์เองครั้งเดียวแล้วจำอัตโนมัติ)
  const categoryOptions = Array.from(new Set([...CATEGORIES, ...items.map(i => i.category).filter(Boolean)]))
  const accountOptions = Array.from(new Set([...ACCOUNTS, ...items.map(i => i.paymentAccount).filter(Boolean)]))
  const ownerOptions = Array.from(new Set(items.map(i => i.accountOwner).filter(Boolean))) // ชื่อเจ้าของที่เคยใช้

  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, background: 'var(--f-input-bg)', border: `1px solid ${BORDER}`, color: 'var(--f-text1)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', color: TEXT2, fontSize: 12, fontWeight: 600, marginBottom: 5 }

  return (
    <motion.div {...fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--f-input-bg)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 180 }}>
          <Search size={14} color={TEXT3} />
          <input type="text" placeholder="ค้นหา รายการ / หมวดหมู่..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--f-text1)', fontSize: 13, width: '100%', fontFamily: 'inherit' }} />
        </div>
        <button onClick={load} title="รีเฟรช" style={{ display: 'flex', alignItems: 'center', padding: '9px', borderRadius: 8, background: 'var(--f-hover)', border: `1px solid ${BORDER}`, color: TEXT2, cursor: 'pointer' }}>
          <RefreshCw size={15} />
        </button>
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: GOLD, border: 'none', color: 'var(--f-text1)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
          <Plus size={16} /> เพิ่มรายจ่าย
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${BORDER}` }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => { setActiveTab(i); setPage(1); setCatFilter(null) }} style={{ padding: '10px 18px', background: 'none', border: 'none', borderBottom: activeTab === i ? `2px solid ${GOLD}` : '2px solid transparent', color: activeTab === i ? GOLD : TEXT2, fontWeight: activeTab === i ? 600 : 400, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 }}>
            {t}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ alignSelf: 'center', color: TEXT2, fontSize: 13, paddingRight: 8 }}>
          รวม <strong style={{ color: '#ef4444' }}>฿{totalAmount.toLocaleString('th-TH')}</strong>
        </span>
      </div>

      {/* Category summary */}
      {!loading && byCategory.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ margin: 0, color: 'var(--f-text1)', fontWeight: 700, fontSize: 15 }}>สรุปตามหมวดหมู่</p>
            {catFilter ? (
              <button onClick={() => { setCatFilter(null); setPage(1) }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: 'var(--f-hover)', border: `1px solid ${BORDER}`, color: TEXT2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                <X size={12} /> กรอง: {catFilter}
              </button>
            ) : (
              <p style={{ margin: 0, color: TEXT3, fontSize: 12 }}>{byCategory.length} หมวด · กดเพื่อกรอง</p>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {byCategory.map((c, i) => {
              const pct = filteredTotal > 0 ? Math.round((c.amount / filteredTotal) * 100) : 0
              const color = CAT_COLORS[i % CAT_COLORS.length]
              const active = catFilter === c.name
              return (
                <button key={c.name} onClick={() => { setCatFilter(active ? null : c.name); setPage(1) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 8px', borderRadius: 8, background: active ? 'var(--f-hover)' : 'transparent', border: active ? `1px solid ${color}` : '1px solid transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', opacity: catFilter && !active ? 0.5 : 1, transition: 'opacity 0.15s' }}>
                  <div style={{ width: 110, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--f-text1)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${c.name} · ${c.count} รายการ`}>{c.name}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 40, height: 8, background: 'var(--f-hover)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
                  </div>
                  <span style={{ color: TEXT3, fontSize: 12, width: 34, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
                  <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 13, width: 92, textAlign: 'right', flexShrink: 0 }}>฿{c.amount.toLocaleString('th-TH')}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['วันที่', 'เลขรายการ', 'รายการ', 'หมวดหมู่', 'บัญชี', 'จำนวนเงิน', 'สถานะ', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: TEXT3, fontSize: 14 }}>กำลังโหลด...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: TEXT3, fontSize: 14 }}>
                  {items.length === 0 ? 'ยังไม่มีรายจ่าย กด "+ เพิ่มรายจ่าย" เพื่อเริ่มต้น' : 'ไม่พบรายการ'}
                </td></tr>
              ) : paged.map((r, idx) => (
                <tr key={r.id} style={{ borderBottom: idx < paged.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--f-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px', color: TEXT2, fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(r.date)}</td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}><span style={{ color: GOLD, fontSize: 13, fontWeight: 600 }}>{r.refNumber}</span></td>
                  <td style={{ padding: '12px 16px', color: 'var(--f-text1)', fontSize: 13 }}>
                    <div>{r.product}</div>
                    {r.notes && <div style={{ color: TEXT3, fontSize: 11, marginTop: 2 }}>{r.notes}</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}><span style={{ padding: '2px 10px', borderRadius: 20, background: 'var(--f-hover)', color: TEXT2, fontSize: 12 }}>{r.category}</span></td>
                  <td style={{ padding: '12px 16px', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {r.paymentAccount || r.accountOwner ? (
                      <div>
                        <div style={{ color: TEXT2 }}>{r.paymentAccount || '—'}</div>
                        {r.accountOwner && <div style={{ color: TEXT3, fontSize: 11, marginTop: 2 }}>{r.accountOwner}</div>}
                      </div>
                    ) : <span style={{ color: TEXT3 }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}><span style={{ color: '#ef4444', fontWeight: 700, fontSize: 14 }}>฿{r.amount.toLocaleString('th-TH')}</span></td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 6, background: STATUS_COLORS[r.status].bg, color: STATUS_COLORS[r.status].text, fontSize: 12, fontWeight: 600 }}>{STATUS_LABELS[r.status]}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => openEdit(r)} style={{ background: 'none', border: 'none', color: TEXT3, cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteId(r.id)} style={{ background: 'none', border: 'none', color: TEXT3, cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: TEXT3, fontSize: 13 }}>แสดง {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} จาก {filtered.length} รายการ</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 14px', borderRadius: 8, background: 'var(--f-hover)', border: `1px solid ${BORDER}`, color: page === 1 ? TEXT3 : TEXT2, fontSize: 13, cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>ก่อนหน้า</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 14px', borderRadius: 8, background: 'var(--f-hover)', border: `1px solid ${BORDER}`, color: page === totalPages ? TEXT3 : TEXT2, fontSize: 13, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>ถัดไป</button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'var(--f-card)', border: `1px solid ${BORDER}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 480 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <p style={{ margin: 0, color: 'var(--f-text1)', fontWeight: 700, fontSize: 16 }}>{modal === 'add' ? 'เพิ่มรายจ่าย' : 'แก้ไขรายจ่าย'}</p>
                <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: TEXT3, cursor: 'pointer', padding: 4, display: 'flex' }}><X size={20} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>วันที่</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>หมวดหมู่</label>
                    {customCat ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="text" autoFocus placeholder="พิมพ์ชื่อหมวดใหม่" value={form.category}
                          onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputStyle} />
                        <button type="button" title="เลือกจากรายการ"
                          onClick={() => { setCustomCat(false); setForm(f => ({ ...f, category: categoryOptions[0] })) }}
                          style={{ display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: 8, background: 'var(--f-hover)', border: `1px solid ${BORDER}`, color: TEXT2, cursor: 'pointer' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <select value={form.category}
                        onChange={e => {
                          if (e.target.value === '__new__') { setCustomCat(true); setForm(f => ({ ...f, category: '' })) }
                          else setForm(f => ({ ...f, category: e.target.value }))
                        }}
                        style={{ ...inputStyle, cursor: 'pointer' }}>
                        {categoryOptions.map(c => <option key={c} value={c} style={{ background: 'var(--f-card2)' }}>{c}</option>)}
                        <option value="__new__" style={{ background: 'var(--f-card2)', color: GOLD }}>+ เพิ่มหมวดใหม่…</option>
                      </select>
                    )}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>รายการ *</label>
                  <input type="text" placeholder="ชื่อรายจ่าย" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>จำนวนเงิน (บาท) *</label>
                    <input type="number" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inputStyle} min="0" />
                  </div>
                  <div>
                    <label style={labelStyle}>สถานะ</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ExpenseStatus }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                      {STATUSES.map(s => <option key={s} value={s} style={{ background: 'var(--f-card2)' }}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>ธนาคาร</label>
                    {customAcct ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="text" autoFocus placeholder="พิมพ์ชื่อธนาคารใหม่" value={form.paymentAccount}
                          onChange={e => setForm(f => ({ ...f, paymentAccount: e.target.value }))} style={inputStyle} />
                        <button type="button" title="เลือกจากรายการ"
                          onClick={() => { setCustomAcct(false); setForm(f => ({ ...f, paymentAccount: '' })) }}
                          style={{ display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: 8, background: 'var(--f-hover)', border: `1px solid ${BORDER}`, color: TEXT2, cursor: 'pointer' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <select value={form.paymentAccount}
                        onChange={e => {
                          if (e.target.value === '__new__') { setCustomAcct(true); setForm(f => ({ ...f, paymentAccount: '' })) }
                          else setForm(f => ({ ...f, paymentAccount: e.target.value }))
                        }}
                        style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="" style={{ background: 'var(--f-card2)' }}>— ไม่ระบุ —</option>
                        {accountOptions.map(a => <option key={a} value={a} style={{ background: 'var(--f-card2)' }}>{a}</option>)}
                        <option value="__new__" style={{ background: 'var(--f-card2)', color: GOLD }}>+ เพิ่มธนาคารใหม่…</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>ชื่อเจ้าของบัญชี</label>
                    <input type="text" list="owner-list" placeholder="เช่น ปนุพันธ์" value={form.accountOwner}
                      onChange={e => setForm(f => ({ ...f, accountOwner: e.target.value }))} style={inputStyle} />
                    <datalist id="owner-list">
                      {ownerOptions.map(o => <option key={o} value={o} />)}
                    </datalist>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>หมายเหตุ</label>
                  <input type="text" placeholder="รายละเอียดเพิ่มเติม" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} />
                </div>
                {errorMsg && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{errorMsg}</p>}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                <button onClick={() => setModal(null)} disabled={saving} style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--f-hover)', border: `1px solid ${BORDER}`, color: TEXT2, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
                <button onClick={handleSubmit} disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, background: GOLD, border: 'none', color: 'var(--f-text1)', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'กำลังบันทึก...' : modal === 'add' ? 'เพิ่มรายการ' : 'บันทึก'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'var(--f-card)', border: `1px solid ${BORDER}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px', color: 'var(--f-text1)', fontWeight: 700, fontSize: 16 }}>ลบรายการ?</p>
              <p style={{ margin: '0 0 24px', color: TEXT2, fontSize: 14 }}>การกระทำนี้ไม่สามารถย้อนกลับได้</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setDeleteId(null)} disabled={saving} style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--f-hover)', border: `1px solid ${BORDER}`, color: TEXT2, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
                <button onClick={() => handleDelete(deleteId)} disabled={saving} style={{ padding: '10px 20px', borderRadius: 8, background: '#ef4444', border: 'none', color: 'var(--f-text1)', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'กำลังลบ...' : 'ลบ'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
