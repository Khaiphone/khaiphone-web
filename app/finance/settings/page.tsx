'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, Check } from 'lucide-react'
import { fetchFinanceSettings, saveFinanceSettings } from '@/app/actions/finance'
import type { FinanceSettings } from '@/app/actions/finance'

const CARD = '#0D0D0D'
const BORDER = 'rgba(255,255,255,0.08)'
const GOLD = '#B8860B'
const TEXT2 = 'rgba(255,255,255,0.65)'
const TEXT3 = 'rgba(255,255,255,0.35)'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } }

const TABS = ['ข้อมูลธุรกิจ', 'ภาษี', 'บัญชีธนาคาร', 'การแจ้งเตือน']

const DEFAULT: FinanceSettings = {
  businessName: 'KHAIPHONE', taxId: '', address: '', phone: '', email: '', website: '',
  vatEnabled: false, vatRate: '7', withholdingTax: '3', fiscalYear: 'มกราคม',
  bankName: '', accountName: '', accountNumber: '',
  notifyNewRequest: true, notifyLowStock: true, notifyLargeProfit: false,
}

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return { width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: '#FFF', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', ...extra }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', color: TEXT2, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{children}</label>
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} style={{ width: 48, height: 26, borderRadius: 13, border: 'none', background: value ? GOLD : 'rgba(255,255,255,0.15)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: value ? 24 : 3, width: 20, height: 20, borderRadius: '50%', background: '#FFF', transition: 'left 0.2s' }} />
    </button>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [settings, setSettings] = useState<FinanceSettings>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetchFinanceSettings().then(d => { setSettings(d); setLoading(false) })
  }, [])

  function set<K extends keyof FinanceSettings>(key: K, value: FinanceSettings[K]) {
    setSettings(s => ({ ...s, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setErrorMsg('')
    const res = await saveFinanceSettings(settings)
    setSaving(false)
    if (!res.success) { setErrorMsg(res.error); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const SaveBtn = () => (
    <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
      {errorMsg && <p style={{ margin: 0, color: '#ef4444', fontSize: 13 }}>{errorMsg}</p>}
      <button onClick={handleSave} disabled={saving || loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, background: saved ? '#22c55e' : GOLD, border: 'none', color: '#FFF', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.3s', opacity: saving ? 0.7 : 1 }}>
        {saved ? <Check size={16} /> : <Save size={16} />}
        {saving ? 'กำลังบันทึก...' : saved ? 'บันทึกแล้ว!' : 'บันทึกการตั้งค่า'}
      </button>
    </div>
  )

  return (
    <motion.div {...fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${BORDER}` }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)} style={{ padding: '10px 18px', background: 'none', border: 'none', borderBottom: activeTab === i ? `2px solid ${GOLD}` : '2px solid transparent', color: activeTab === i ? GOLD : TEXT2, fontWeight: activeTab === i ? 600 : 400, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1, whiteSpace: 'nowrap' }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '24px' }}>
        {loading ? (
          <p style={{ color: TEXT3, textAlign: 'center', padding: '40px 0', fontSize: 14 }}>กำลังโหลด...</p>
        ) : (
          <>
            {/* Business tab */}
            {activeTab === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div>
                    <FieldLabel>ชื่อธุรกิจ</FieldLabel>
                    <input type="text" value={settings.businessName} onChange={e => set('businessName', e.target.value)} placeholder="ชื่อร้าน / บริษัท" style={inputStyle()} />
                  </div>
                  <div>
                    <FieldLabel>เลขประจำตัวผู้เสียภาษี</FieldLabel>
                    <input type="text" value={settings.taxId} onChange={e => set('taxId', e.target.value)} placeholder="13 หลัก" style={inputStyle()} maxLength={13} />
                  </div>
                </div>
                <div>
                  <FieldLabel>ที่อยู่</FieldLabel>
                  <textarea value={settings.address} onChange={e => set('address', e.target.value)} rows={2} placeholder="ที่อยู่สำหรับออกใบเสร็จ" style={{ ...inputStyle(), resize: 'vertical' } as React.CSSProperties} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div>
                    <FieldLabel>เบอร์โทรศัพท์</FieldLabel>
                    <input type="text" value={settings.phone} onChange={e => set('phone', e.target.value)} placeholder="0x-xxx-xxxx" style={inputStyle()} />
                  </div>
                  <div>
                    <FieldLabel>อีเมล</FieldLabel>
                    <input type="email" value={settings.email} onChange={e => set('email', e.target.value)} placeholder="info@example.com" style={inputStyle()} />
                  </div>
                  <div>
                    <FieldLabel>เว็บไซต์</FieldLabel>
                    <input type="text" value={settings.website} onChange={e => set('website', e.target.value)} placeholder="example.com" style={inputStyle()} />
                  </div>
                </div>
                <SaveBtn />
              </div>
            )}

            {/* Tax tab */}
            {activeTab === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}>
                  <div>
                    <p style={{ margin: 0, color: '#FFF', fontSize: 14, fontWeight: 600 }}>เปิดใช้งาน VAT</p>
                    <p style={{ margin: 0, color: TEXT2, fontSize: 12, marginTop: 2 }}>ระบบจะคำนวณ VAT อัตโนมัติในทุกรายการ</p>
                  </div>
                  <Toggle value={settings.vatEnabled} onChange={v => set('vatEnabled', v)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                  <div>
                    <FieldLabel>อัตรา VAT (%)</FieldLabel>
                    <input type="number" value={settings.vatRate} onChange={e => set('vatRate', e.target.value)} placeholder="7" style={inputStyle()} min="0" max="100" />
                  </div>
                  <div>
                    <FieldLabel>ภาษีหัก ณ ที่จ่าย (%)</FieldLabel>
                    <input type="number" value={settings.withholdingTax} onChange={e => set('withholdingTax', e.target.value)} placeholder="3" style={inputStyle()} min="0" max="100" />
                  </div>
                  <div>
                    <FieldLabel>ปีการเงิน (เริ่มต้น)</FieldLabel>
                    <select value={settings.fiscalYear} onChange={e => set('fiscalYear', e.target.value)} style={{ ...inputStyle(), cursor: 'pointer' }}>
                      {['มกราคม', 'เมษายน', 'ตุลาคม'].map(m => <option key={m} value={m} style={{ background: '#1A1A1A' }}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <SaveBtn />
              </div>
            )}

            {/* Bank tab */}
            {activeTab === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div>
                    <FieldLabel>ธนาคาร</FieldLabel>
                    <select value={settings.bankName} onChange={e => set('bankName', e.target.value)} style={{ ...inputStyle(), cursor: 'pointer' }}>
                      <option value="" style={{ background: '#1A1A1A' }}>เลือกธนาคาร</option>
                      {['กสิกรไทย', 'กรุงเทพ', 'ไทยพาณิชย์', 'กรุงไทย', 'กรุงศรี', 'ทหารไทยธนชาต', 'ออมสิน'].map(b => (
                        <option key={b} value={b} style={{ background: '#1A1A1A' }}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>ชื่อบัญชี</FieldLabel>
                    <input type="text" value={settings.accountName} onChange={e => set('accountName', e.target.value)} placeholder="ชื่อเจ้าของบัญชี" style={inputStyle()} />
                  </div>
                  <div>
                    <FieldLabel>เลขบัญชี</FieldLabel>
                    <input type="text" value={settings.accountNumber} onChange={e => set('accountNumber', e.target.value)} placeholder="xxx-x-xxxxx-x" style={inputStyle()} />
                  </div>
                </div>
                <SaveBtn />
              </div>
            )}

            {/* Notifications tab */}
            {activeTab === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { key: 'notifyNewRequest' as const,  label: 'แจ้งเตือนคำขอใหม่', desc: 'รับการแจ้งเตือนเมื่อมีคำขอใหม่เข้ามาในระบบ' },
                  { key: 'notifyLowStock' as const,    label: 'แจ้งเตือนสต็อกต่ำ',  desc: 'รับการแจ้งเตือนเมื่อสต็อกเหลือน้อยกว่า 5 เครื่อง' },
                  { key: 'notifyLargeProfit' as const, label: 'แจ้งเตือนกำไรสูง',   desc: 'รับการแจ้งเตือนเมื่อมีรายการกำไรเกิน ฿5,000' },
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}>
                    <div>
                      <p style={{ margin: 0, color: '#FFF', fontSize: 14, fontWeight: 600 }}>{item.label}</p>
                      <p style={{ margin: 0, color: TEXT2, fontSize: 12, marginTop: 2 }}>{item.desc}</p>
                    </div>
                    <Toggle value={settings[item.key]} onChange={v => set(item.key, v)} />
                  </div>
                ))}
                <p style={{ color: TEXT3, fontSize: 13, margin: 0 }}>หมายเหตุ: การแจ้งเตือนจะแสดงในหน้า Notifications ของ Admin Panel</p>
                <SaveBtn />
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {saved && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: '#22c55e', borderRadius: 10, padding: '12px 24px', color: '#FFF', fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check size={16} /> บันทึกการตั้งค่าเรียบร้อย
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
