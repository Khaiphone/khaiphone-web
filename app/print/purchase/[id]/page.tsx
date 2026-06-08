'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { fetchPurchaseDocument } from '@/app/actions/finance'
import type { PurchaseDocument } from '@/app/actions/finance'

function getLoginUrl() {
  const { hostname, protocol } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') return '/admin/login'
  return `${protocol}//stock.${hostname.replace(/^stock\./, '')}/admin/login`
}

function AuthError() {
  return (
    <div style={{ padding: 60, textAlign: 'center', fontFamily: 'sans-serif' }}>
      <p style={{ fontSize: 18, color: '#111', fontWeight: 700, margin: '0 0 8px' }}>ไม่ได้รับอนุญาต</p>
      <p style={{ fontSize: 13, color: '#888', margin: '0 0 24px' }}>กรุณาเข้าสู่ระบบก่อนเปิดเอกสาร</p>
      <button
        onClick={() => { window.location.href = getLoginUrl() }}
        style={{ padding: '10px 24px', background: '#B8860B', border: 'none', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
      >
        เข้าสู่ระบบ
      </button>
    </div>
  )
}

function fmt(n: number) { return '฿' + n.toLocaleString('th-TH') }
function thDate(s: string) {
  if (!s) return ''
  const d = new Date(s + 'T00:00:00')
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PurchaseReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<PurchaseDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    fetchPurchaseDocument(id)
      .then(d => { setDoc(d); setLoading(false) })
      .catch(() => { setLoading(false); setUnauthorized(true) })
  }, [id])

  if (loading) return <div style={{ padding: 60, textAlign: 'center', fontFamily: 'sans-serif', color: '#666' }}>กำลังโหลด...</div>
  if (unauthorized) return <AuthError />
  if (!doc) return <div style={{ padding: 60, textAlign: 'center', fontFamily: 'sans-serif', color: '#ef4444' }}>ไม่พบข้อมูล</div>

  const docNumber = `PUR-${doc.refNumber}`

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

      <div className="no-print" style={{ background: '#1a1a1a', padding: '12px 24px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={() => window.history.back()} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #555', color: '#ccc', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>← กลับ</button>
        <button onClick={() => window.print()} style={{ padding: '8px 20px', background: '#B8860B', border: 'none', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🖨 พิมพ์ / บันทึก PDF</button>
      </div>

      <div style={{ padding: '32px 16px', display: 'flex', justifyContent: 'center' }}>
        <div className="page" style={{ background: '#fff', width: '100%', maxWidth: 720, padding: '48px 56px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', borderRadius: 4 }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 24, borderBottom: '2px solid #3b82f6' }}>
            <div>
              <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#111' }}>{doc.businessName}</h1>
              {doc.address && <p style={{ margin: '2px 0', fontSize: 12, color: '#555' }}>{doc.address}</p>}
              {doc.businessPhone && <p style={{ margin: '2px 0', fontSize: 12, color: '#555' }}>โทร {doc.businessPhone}</p>}
              {doc.taxId && <p style={{ margin: '2px 0', fontSize: 12, color: '#555' }}>เลขที่ผู้เสียภาษี {doc.taxId}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>ใบรับสินค้า</h2>
              <p style={{ margin: '1px 0', fontSize: 11, color: '#888' }}>Purchase Receipt</p>
              <p style={{ margin: '8px 0 2px', fontSize: 13, color: '#555' }}>เลขที่ <strong style={{ color: '#111' }}>{docNumber}</strong></p>
              <p style={{ margin: '2px 0', fontSize: 13, color: '#555' }}>วันที่ <strong style={{ color: '#111' }}>{thDate(doc.date)}</strong></p>
            </div>
          </div>

          {/* Seller info */}
          <div style={{ marginBottom: 28, background: '#eff6ff', border: '1px solid #3b82f6', borderRadius: 8, padding: '14px 18px' }}>
            <p style={{ margin: '0 0 2px', fontSize: 11, color: '#1d4ed8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>ข้อมูลผู้ขาย / Seller</p>
            <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: '#111' }}>{doc.sellerName || '—'}</p>
            {doc.sellerPhone && <p style={{ margin: '2px 0 0', fontSize: 13, color: '#555' }}>โทร {doc.sellerPhone}</p>}
          </div>

          {/* Item table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ background: '#3b82f6', color: '#fff' }}>
                {['รายการ', 'รายละเอียด', 'ราคารับซื้อ'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: h === 'ราคารับซื้อ' ? 'right' : 'left', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
                <td style={{ padding: '14px 14px', fontSize: 14, fontWeight: 600, color: '#111', verticalAlign: 'top' }}>
                  {doc.model} {doc.storage}
                  {doc.color && <span style={{ color: '#666', fontWeight: 400 }}> · {doc.color}</span>}
                </td>
                <td style={{ padding: '14px 14px', fontSize: 12, color: '#555', verticalAlign: 'top' }}>
                  {doc.grade && <div>เกรด {doc.grade}</div>}
                  {doc.imei && <div>IMEI: {doc.imei}</div>}
                  {doc.serial && <div>S/N: {doc.serial}</div>}
                </td>
                <td style={{ padding: '14px 14px', textAlign: 'right', fontSize: 15, fontWeight: 700, color: '#111', verticalAlign: 'top' }}>{fmt(doc.amount)}</td>
              </tr>
            </tbody>
          </table>

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 40 }}>
            <div style={{ width: 260 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid #3b82f6' }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>ยอดรับซื้อรวม</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>{fmt(doc.amount)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, gap: 24 }}>
            {[
              { label: 'ผู้รับสินค้า', name: doc.businessName },
              { label: 'ผู้ขาย', name: doc.sellerName },
            ].map(({ label, name }) => (
              <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #999', marginTop: 48, paddingTop: 8 }}>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>{label}</p>
                  {name && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>({name})</p>}
                </div>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: '#aaa' }}>เอกสารนี้ออกโดย {doc.businessName} · {thDate(doc.date)}</p>
        </div>
      </div>
    </>
  )
}
