'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { fetchQuoteDocument } from '@/app/actions/quotes'
import type { QuoteDocument } from '@/app/actions/quotes'

function fmt(n: number) { return '฿' + n.toLocaleString('th-TH') }
function thDate(s: string) {
  if (!s) return ''
  return new Date(s + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', sent: 'ส่งแล้ว', accepted: 'รับ Order แล้ว',
  rejected: 'ปฏิเสธ', expired: 'หมดอายุ', cancelled: 'ยกเลิก',
}

export default function QuotePrintPage() {
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<QuoteDocument | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuoteDocument(id).then(d => { setDoc(d); setLoading(false) })
  }, [id])

  if (loading) return <div style={{ padding: 60, textAlign: 'center', fontFamily: 'sans-serif', color: '#666' }}>กำลังโหลด...</div>
  if (!doc) return <div style={{ padding: 60, textAlign: 'center', fontFamily: 'sans-serif', color: '#ef4444' }}>ไม่พบข้อมูล</div>

  const afterDiscount = Math.max(0, doc.subtotal - doc.discountAmount)

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .page { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; }
        }
        body { background: #f5f5f5; margin: 0; font-family: 'Sarabun', sans-serif; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ background: '#1a1a1a', padding: '12px 24px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={() => window.history.back()} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #555', color: '#ccc', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>← กลับ</button>
        <button onClick={() => window.print()} style={{ padding: '8px 20px', background: '#B8860B', border: 'none', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🖨 พิมพ์ / บันทึก PDF</button>
        <span style={{ color: '#888', fontSize: 12 }}>{doc.id} · {STATUS_LABEL[doc.status] ?? doc.status}</span>
      </div>

      {/* Document */}
      <div style={{ padding: '32px 16px', display: 'flex', justifyContent: 'center' }}>
        <div className="page" style={{ background: '#fff', width: '100%', maxWidth: 760, padding: '48px 56px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', borderRadius: 4 }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 24, borderBottom: '2px solid #111' }}>
            <div>
              <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#111', letterSpacing: '-0.5px' }}>{doc.businessName}</h1>
              {doc.businessAddress && <p style={{ margin: '2px 0', fontSize: 12, color: '#555' }}>{doc.businessAddress}</p>}
              {doc.businessPhone && <p style={{ margin: '2px 0', fontSize: 12, color: '#555' }}>โทร {doc.businessPhone}</p>}
              {doc.businessTaxId && <p style={{ margin: '2px 0', fontSize: 12, color: '#555' }}>เลขที่ผู้เสียภาษี {doc.businessTaxId}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#111' }}>ใบเสนอราคา</h2>
              <p style={{ margin: '2px 0', fontSize: 12, color: '#555' }}>เลขที่ <strong style={{ color: '#111' }}>{doc.id}</strong></p>
              <p style={{ margin: '2px 0', fontSize: 12, color: '#555' }}>วันที่ <strong style={{ color: '#111' }}>{thDate(doc.date)}</strong></p>
              {doc.validUntil && (
                <p style={{ margin: '2px 0', fontSize: 12, color: '#555' }}>
                  มีอายุถึง <strong style={{ color: '#B8860B' }}>{thDate(doc.validUntil)}</strong>
                </p>
              )}
            </div>
          </div>

          {/* ── Customer info ── */}
          <div style={{ marginBottom: 28, background: '#f9f9f9', border: '1px solid #e5e5e5', borderRadius: 8, padding: '14px 18px' }}>
            <p style={{ margin: '0 0 2px', fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>เสนอราคาให้กับ</p>
            <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: '#111' }}>{doc.customerName}</p>
            {doc.customerPhone && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>โทร {doc.customerPhone}</p>}
            {doc.customerEmail && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>{doc.customerEmail}</p>}
            {doc.customerAddress && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>{doc.customerAddress}</p>}
            {doc.customerTaxId && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>เลขผู้เสียภาษี: {doc.customerTaxId}</p>}
          </div>

          {/* ── Items table ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ background: '#111', color: '#fff' }}>
                {['#', 'รายละเอียดสินค้า', 'IMEI / Serial', 'ราคา/หน่วย', 'ส่วนลด', 'จำนวนเงิน'].map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 12px',
                    textAlign: i >= 3 ? 'right' : 'left',
                    fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doc.items.map((item, i) => (
                <tr key={item.stockId} style={{ borderBottom: '1px solid #e5e5e5' }}>
                  <td style={{ padding: '12px 12px', fontSize: 12, color: '#888', verticalAlign: 'top' }}>{i + 1}</td>
                  <td style={{ padding: '12px 12px', fontSize: 13, fontWeight: 600, color: '#111', verticalAlign: 'top' }}>
                    {item.description}
                    <div style={{ fontSize: 11, color: '#888', fontFamily: 'monospace', marginTop: 2 }}>{item.stockId}</div>
                  </td>
                  <td style={{ padding: '12px 12px', fontSize: 11, color: '#888', fontFamily: 'monospace', verticalAlign: 'top' }}>
                    {item.imei || '—'}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontSize: 13, color: '#333', verticalAlign: 'top' }}>{fmt(item.unitPrice)}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontSize: 13, color: item.discount > 0 ? '#16a34a' : '#aaa', verticalAlign: 'top' }}>
                    {item.discount > 0 ? `-${fmt(item.discount)}` : '—'}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#111', verticalAlign: 'top' }}>{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Totals ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 40 }}>
            <div style={{ width: 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e5e5e5' }}>
                <span style={{ fontSize: 13, color: '#555' }}>ยอดรวมสินค้า</span>
                <span style={{ fontSize: 13 }}>{fmt(doc.subtotal)}</span>
              </div>
              {doc.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e5e5e5' }}>
                  <span style={{ fontSize: 13, color: '#555' }}>ส่วนลดรวม</span>
                  <span style={{ fontSize: 13, color: '#16a34a' }}>-{fmt(doc.discountAmount)}</span>
                </div>
              )}
              {doc.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e5e5e5' }}>
                  <span style={{ fontSize: 13, color: '#555' }}>ยอดหลังหักส่วนลด</span>
                  <span style={{ fontSize: 13 }}>{fmt(afterDiscount)}</span>
                </div>
              )}
              {doc.vatRate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e5e5e5' }}>
                  <span style={{ fontSize: 13, color: '#555' }}>VAT {doc.vatRate}%</span>
                  <span style={{ fontSize: 13 }}>+{fmt(doc.vatAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 10px', borderBottom: '2px solid #111', marginTop: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>ยอดรวมสุทธิ</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>{fmt(doc.total)}</span>
              </div>
              {doc.vatRate > 0 && (
                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#888', textAlign: 'right' }}>
                  (รวมภาษีมูลค่าเพิ่ม {doc.vatRate}% เป็นเงิน {fmt(doc.vatAmount)})
                </p>
              )}
            </div>
          </div>

          {/* ── Note ── */}
          {doc.note && (
            <div style={{ marginBottom: 20, padding: '10px 14px', background: '#fafafa', border: '1px solid #eee', borderRadius: 6 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>หมายเหตุ</p>
              <p style={{ margin: 0, fontSize: 12, color: '#555' }}>{doc.note}</p>
            </div>
          )}

          {/* ── Terms ── */}
          {doc.terms && (
            <div style={{ marginBottom: 32 }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>เงื่อนไขและข้อตกลง</p>
              <pre style={{ margin: 0, fontSize: 12, color: '#666', whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.8 }}>{doc.terms}</pre>
            </div>
          )}

          {/* ── Signatures ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48, gap: 24 }}>
            {[
              { label: 'ผู้เสนอราคา', name: doc.createdBy?.split('@')[0] ?? '' },
              { label: 'ผู้มีอำนาจอนุมัติ', name: '' },
              { label: 'ลูกค้า / ผู้รับใบเสนอราคา', name: doc.customerName },
            ].map(({ label, name }) => (
              <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #999', marginTop: 52, paddingTop: 8 }}>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>{label}</p>
                  {name && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>({name})</p>}
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#aaa' }}>วันที่ ........../........../..........​</p>
                </div>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: '#bbb' }}>
            ใบเสนอราคานี้ออกโดย {doc.businessName} · เลขที่ {doc.id}
          </p>
        </div>
      </div>
    </>
  )
}
