'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Receipt, ShoppingCart, ExternalLink } from 'lucide-react'
import { fetchFinanceIncome, fetchFinancePurchases, fetchVatEnabled } from '@/app/actions/finance'
import type { FinanceIncome, FinancePurchase } from '@/app/actions/finance'

const CARD  = 'var(--f-card)'
const BORDER = 'var(--f-border)'
const GOLD  = '#B8860B'
const TEXT1 = 'var(--f-text1)'
const TEXT2 = 'var(--f-text2)'
const TEXT3 = 'var(--f-text3)'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } }

function fmt(d: string) {
  const dt = new Date(d.length === 10 ? d + 'T00:00:00' : d)
  return dt.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const TABS = ['ใบเสร็จ / ใบกำกับภาษี', 'ใบรับสินค้า']

export default function DocumentsPage() {
  const [tab, setTab] = useState(0)
  const [sales, setSales] = useState<FinanceIncome[]>([])
  const [purchases, setPurchases] = useState<FinancePurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [vatEnabled, setVatEnabled] = useState(false)

  useEffect(() => {
    Promise.all([fetchFinanceIncome(), fetchFinancePurchases()]).then(([s, p]) => {
      setSales(s)
      setPurchases(p)
      setLoading(false)
    })
    fetchVatEnabled().then(setVatEnabled)
  }, [])

  const filteredSales = sales.filter(r => {
    const q = search.toLowerCase()
    return !q || r.model.toLowerCase().includes(q) || r.refNumber.toLowerCase().includes(q) || r.customerName.toLowerCase().includes(q)
  })

  const filteredPurchases = purchases.filter(r => {
    const q = search.toLowerCase()
    return !q || r.model.toLowerCase().includes(q) || r.refNumber.toLowerCase().includes(q) || r.customerName.toLowerCase().includes(q)
  })

  return (
    <motion.div {...fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Info banner */}
      <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '12px 16px', color: '#3b82f6', fontSize: 13 }}>
        เลือกรายการที่ต้องการ แล้วกด "ออกเอกสาร" — เปิดหน้าพิมพ์ได้ทันที สามารถบันทึกเป็น PDF ผ่านเมนูพิมพ์ของเบราว์เซอร์
      </div>
      {!vatEnabled && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '12px 16px', color: '#b45309', fontSize: 13 }}>
          🔒 ยังไม่ได้เปิด VAT — ออกได้เฉพาะ <strong>ใบเสร็จรับเงิน</strong> (การออกใบกำกับภาษีโดยไม่จด VAT ผิดกฎหมาย). เมื่อจด VAT แล้วเปิดที่ <strong>ตั้งค่าการเงิน → ภาษี</strong> ปุ่มใบกำกับภาษีจะแสดงให้อัตโนมัติ
        </div>
      )}

      {/* Search + Tabs */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="ค้นหา รุ่น / เลขที่ / ชื่อ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 8, background: 'var(--f-input-bg)', border: `1px solid ${BORDER}`, color: TEXT1, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
          />
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: tab === i ? `2px solid ${GOLD}` : '2px solid transparent', color: tab === i ? GOLD : TEXT2, fontWeight: tab === i ? 600 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 }}>
              {t}
            </button>
          ))}
        </div>

        {/* Sales table */}
        {tab === 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['วันที่', 'เลขที่', 'รุ่น', 'ผู้ซื้อ', 'ราคาขาย', 'เอกสาร'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: TEXT3 }}>กำลังโหลด...</td></tr>
                ) : filteredSales.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: TEXT3 }}>ไม่พบรายการ</td></tr>
                ) : filteredSales.map((r, idx) => (
                  <tr key={r.id} style={{ borderBottom: idx < filteredSales.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <td style={{ padding: '12px 16px', color: TEXT2, fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(r.date)}</td>
                    <td style={{ padding: '12px 16px', color: GOLD, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.refNumber}</td>
                    <td style={{ padding: '12px 16px', color: TEXT1, fontSize: 13 }}>{r.model} {r.storage}</td>
                    <td style={{ padding: '12px 16px', color: TEXT2, fontSize: 13 }}>{r.customerName || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#22c55e', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>฿{r.sellPrice.toLocaleString('th-TH')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => window.open(`${window.location.origin.replace(/^(https?:\/\/)stock\./, '$1')}/print/receipt/${r.id}`, '_blank')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, background: 'var(--f-hover)', border: `1px solid ${BORDER}`, color: TEXT1, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          <Receipt size={11} /> ใบเสร็จ
                        </button>
                        {vatEnabled && (
                          <button onClick={() => window.open(`${window.location.origin.replace(/^(https?:\/\/)stock\./, '$1')}/print/tax-invoice/${r.id}`, '_blank')}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, background: 'rgba(184,134,11,0.12)', border: `1px solid rgba(184,134,11,0.3)`, color: GOLD, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <FileText size={11} /> ใบกำกับภาษี
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Purchases table */}
        {tab === 1 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['วันที่', 'เลขที่', 'รุ่น', 'ผู้ขาย', 'ราคารับซื้อ', 'เอกสาร'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: TEXT3 }}>กำลังโหลด...</td></tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: TEXT3 }}>ไม่พบรายการ</td></tr>
                ) : filteredPurchases.map((r, idx) => (
                  <tr key={r.id} style={{ borderBottom: idx < filteredPurchases.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <td style={{ padding: '12px 16px', color: TEXT2, fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(r.date)}</td>
                    <td style={{ padding: '12px 16px', color: GOLD, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.refNumber}</td>
                    <td style={{ padding: '12px 16px', color: TEXT1, fontSize: 13 }}>{r.model} {r.storage}</td>
                    <td style={{ padding: '12px 16px', color: TEXT2, fontSize: 13 }}>{r.customerName || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#ef4444', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>฿{r.costPrice.toLocaleString('th-TH')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => window.open(`${window.location.origin.replace(/^(https?:\/\/)stock\./, '$1')}/print/purchase/${r.id}`, '_blank')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <ShoppingCart size={11} /> ใบรับสินค้า
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}
