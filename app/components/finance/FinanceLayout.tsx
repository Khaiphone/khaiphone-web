'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, TrendingUp, TrendingDown, ShoppingCart, BarChart2,
  Banknote, FileText, GitMerge, ScrollText, Settings, Menu, X,
  Calendar, Search, Bell, Download, MoreHorizontal, Sun, Moon,
  Clock, Users, Receipt, Target, Scale, Activity,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import {
  fetchFinanceDashboard,
  fetchFinanceNotifications,
  searchFinance,
} from '@/app/actions/finance'
import type { FinanceNotification, FinanceSearchResult } from '@/app/actions/finance'
import { FinanceDateContext } from './FinanceDateContext'

const GOLD = '#B8860B'

const NAV_ITEMS = [
  { label: 'Dashboard',      icon: LayoutDashboard, href: '/finance/dashboard' },
  { label: 'รายรับ',         icon: TrendingUp,      href: '/finance/income' },
  { label: 'รายจ่าย',        icon: TrendingDown,    href: '/finance/expenses' },
  { label: 'ซื้อเครื่อง',    icon: ShoppingCart,    href: '/finance/purchases' },
  { label: 'กำไร / Margin',  icon: BarChart2,       href: '/finance/profit' },
  { label: 'กระแสเงินสด',    icon: Banknote,        href: '/finance/cashflow' },
  { label: 'สต็อกค้าง',      icon: Clock,           href: '/finance/aging' },
  { label: 'ยอดขายพนักงาน',  icon: Users,           href: '/finance/staff' },
  { label: 'ภาษี',           icon: Receipt,         href: '/finance/tax' },
  { label: 'เป้าหมาย',       icon: Target,          href: '/finance/targets' },
  { label: 'Break-even',     icon: Scale,           href: '/finance/breakeven' },
  { label: 'คาดการณ์',       icon: Activity,        href: '/finance/forecast' },
  { label: 'รายงาน',         icon: FileText,        href: '/finance/reports' },
  { label: 'Reconcile',      icon: GitMerge,        href: '/finance/reconcile' },
  { label: 'Audit Logs',     icon: ScrollText,      href: '/finance/audit' },
  { label: 'ตั้งค่าการเงิน', icon: Settings,        href: '/finance/settings' },
]

const PAGE_TITLES: Record<string, string> = {
  '/finance/dashboard':  'Dashboard',
  '/finance/income':     'รายรับ',
  '/finance/expenses':   'รายจ่าย',
  '/finance/purchases':  'ซื้อเครื่อง (ต้นทุน)',
  '/finance/profit':     'กำไร / Margin',
  '/finance/cashflow':   'กระแสเงินสด (Cash Flow)',
  '/finance/aging':      'สต็อกค้าง (Stock Aging)',
  '/finance/staff':      'ยอดขายพนักงาน',
  '/finance/tax':        'สรุปภาษี',
  '/finance/targets':    'เป้าหมายรายเดือน',
  '/finance/breakeven':  'Break-even Analysis',
  '/finance/forecast':   'คาดการณ์รายได้',
  '/finance/reports':    'รายงาน (Reports)',
  '/finance/reconcile':  'Reconcile (กระทบยอด)',
  '/finance/audit':      'Audit Logs',
  '/finance/settings':   'ตั้งค่าการเงิน',
}

const MOBILE_TABS = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/finance/dashboard' },
  { label: 'รายรับ',    icon: TrendingUp,      href: '/finance/income' },
  { label: 'รายจ่าย',   icon: TrendingDown,    href: '/finance/expenses' },
  { label: 'กำไร',      icon: BarChart2,       href: '/finance/profit' },
  { label: 'เพิ่มเติม', icon: MoreHorizontal,  href: '/finance/cashflow' },
]

const DARK_VARS = {
  '--f-bg':         '#060606',
  '--f-card':       '#0D0D0D',
  '--f-card2':      '#1A1A1A',
  '--f-border':     'rgba(255,255,255,0.08)',
  '--f-text1':      '#FFFFFF',
  '--f-text2':      'rgba(255,255,255,0.65)',
  '--f-text3':      'rgba(255,255,255,0.35)',
  '--f-grid':       'rgba(255,255,255,0.05)',
  '--f-hover':      'rgba(255,255,255,0.04)',
  '--f-header-bg':  'rgba(13,13,13,0.95)',
  '--f-input-bg':   'rgba(255,255,255,0.07)',
}

const LIGHT_VARS = {
  '--f-bg':         '#F0F2F5',
  '--f-card':       '#FFFFFF',
  '--f-card2':      '#F5F5F7',
  '--f-border':     'rgba(0,0,0,0.09)',
  '--f-text1':      '#111111',
  '--f-text2':      'rgba(0,0,0,0.60)',
  '--f-text3':      'rgba(0,0,0,0.38)',
  '--f-grid':       'rgba(0,0,0,0.06)',
  '--f-hover':      'rgba(0,0,0,0.04)',
  '--f-header-bg':  'rgba(255,255,255,0.95)',
  '--f-input-bg':   'rgba(0,0,0,0.05)',
}

function applyThemeVars(dark: boolean) {
  const vars = dark ? DARK_VARS : LIGHT_VARS
  const root = document.documentElement
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
}

function fmtDateTH(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function todayISO() { return new Date().toISOString().slice(0, 10) }
function firstOfMonthISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function monthsAgoISO(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString().slice(0, 10)
}
function yearStartISO() { return `${new Date().getFullYear()}-01-01` }

function SidebarContent({ onClose, userName, avatarLetter }: {
  onClose?: () => void
  userName?: string
  avatarLetter?: string
}) {
  const pathname = usePathname()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid var(--f-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'var(--f-text1)', fontWeight: 700, fontSize: 16, margin: 0 }}>KHAIPHONE</p>
            <p style={{ color: GOLD, fontSize: 11, margin: '2px 0 0', fontWeight: 500 }}>Finance &amp; Accounting</p>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--f-text2)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--f-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
          {avatarLetter ?? 'A'}
        </div>
        <div>
          <p style={{ color: 'var(--f-text1)', fontSize: 13, fontWeight: 700, margin: 0 }}>{userName ?? '...'}</p>
          <p style={{ color: 'var(--f-text2)', fontSize: 11, margin: '1px 0 0' }}>Administrator</p>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, color: active ? GOLD : 'var(--f-text2)', background: active ? 'rgba(184,134,11,0.15)' : 'transparent', textDecoration: 'none', fontSize: 14, fontWeight: active ? 600 : 400, borderLeft: active ? `2px solid ${GOLD}` : '2px solid transparent', transition: 'background 0.15s' }}>
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  // theme
  const [isDark, setIsDark] = useState(true)

  // date range
  const [dateFrom, setDateFrom] = useState(firstOfMonthISO)
  const [dateTo, setDateTo] = useState(todayISO)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [tempFrom, setTempFrom] = useState(firstOfMonthISO)
  const [tempTo, setTempTo] = useState(todayISO)
  const datePickerRef = useRef<HTMLDivElement>(null)

  // bell
  const [notifications, setNotifications] = useState<FinanceNotification[]>([])
  const [showBell, setShowBell] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  // search
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FinanceSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // export
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    // Load theme from localStorage
    const saved = localStorage.getItem('finance-theme')
    const dark = saved ? saved === 'dark' : true
    setIsDark(dark)
    applyThemeVars(dark)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setUserEmail(session.user.email)
    })
    fetchFinanceNotifications().then(setNotifications)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) setShowDatePicker(false)
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (showSearch) setTimeout(() => searchInputRef.current?.focus(), 50)
    else { setSearchQuery(''); setSearchResults([]) }
  }, [showSearch])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setShowSearch(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchInput = useCallback((q: string) => {
    setSearchQuery(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (q.trim().length < 2) { setSearchResults([]); return }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      const res = await searchFinance(q)
      setSearchResults(res)
      setSearching(false)
    }, 350)
  }, [])

  function toggleTheme() {
    const newDark = !isDark
    setIsDark(newDark)
    localStorage.setItem('finance-theme', newDark ? 'dark' : 'light')
    applyThemeVars(newDark)
  }

  function applyDate(from: string, to: string) {
    setDateFrom(from)
    setDateTo(to)
    setShowDatePicker(false)
  }

  function applyTempDate() {
    setDateFrom(tempFrom)
    setDateTo(tempTo)
    setShowDatePicker(false)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const d = await fetchFinanceDashboard(dateFrom, dateTo)
      const BOM = '﻿'
      const lines: string[] = []
      lines.push('สรุปการเงิน KHAIPHONE')
      lines.push(`ช่วงวันที่,${fmtDateTH(dateFrom)} – ${fmtDateTH(dateTo)}`)
      lines.push(`ส่งออกเมื่อ,${new Date().toLocaleString('th-TH')}`)
      lines.push('')
      lines.push('=== KPI หลัก ===,')
      lines.push('รายการ,จำนวน (บาท)')
      lines.push(`รายได้รวม,${d.totalRevenue}`)
      lines.push(`ต้นทุนเครื่อง,${d.totalCost}`)
      lines.push(`ค่าใช้จ่าย,${d.totalExpenses}`)
      lines.push(`กำไรสุทธิแท้จริง,${d.trueNetProfit}`)
      lines.push(`มูลค่าสต็อก,${d.stockValue}`)
      lines.push('')
      lines.push('=== จำนวนเครื่อง ===,')
      lines.push(`รับซื้อ,${d.purchaseCount}`)
      lines.push(`ขายแล้ว,${d.soldCount}`)
      lines.push(`ในมือ,${d.purchaseCount - d.soldCount}`)
      lines.push('')
      lines.push('=== รายรับ / ต้นทุน รายเดือน ===,,,')
      lines.push('เดือน,รายรับ,ต้นทุน,กำไร')
      for (const m of d.revenueByMonth) lines.push(`${m.date},${m.revenue},${m.cost},${m.revenue - m.cost}`)
      lines.push('')
      lines.push('=== ค่าใช้จ่ายแยกประเภท ===,')
      lines.push('ประเภท,จำนวน')
      for (const e of d.expenseByCategory) lines.push(`${e.category},${e.amount}`)
      lines.push('')
      lines.push('=== Top รุ่นกำไรสูงสุด ===,')
      lines.push('รุ่น,กำไรรวม')
      for (const m of d.topModels) lines.push(`${m.model},${m.profit}`)
      const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finance-${dateFrom}-to-${dateTo}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const userName = userEmail ? userEmail.split('@')[0] : '...'
  const avatarLetter = userName.charAt(0).toUpperCase()
  const pageTitle = PAGE_TITLES[pathname] ?? 'Finance'
  const notifCount = notifications.length

  const PRESETS = [
    { label: 'เดือนนี้', from: firstOfMonthISO(),  to: todayISO() },
    { label: '3 เดือน',  from: monthsAgoISO(3),    to: todayISO() },
    { label: 'ปีนี้',    from: yearStartISO(),      to: todayISO() },
  ]

  return (
    <FinanceDateContext.Provider value={{ dateFrom, dateTo }}>
      <div style={{ minHeight: '100vh', background: 'var(--f-bg)', display: 'flex' }}>

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex" style={{ width: 220, background: 'var(--f-card)', borderRight: '1px solid var(--f-border)', flexDirection: 'column', flexShrink: 0, position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 20 }}>
          <SidebarContent userName={userName} avatarLetter={avatarLetter} />
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.7)' }} onClick={() => setSidebarOpen(false)} />}

        {/* Mobile Sidebar */}
        <aside className="md:hidden" style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, background: 'var(--f-card)', borderRight: '1px solid var(--f-border)', zIndex: 50, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.25s ease' }}>
          <SidebarContent onClose={() => setSidebarOpen(false)} userName={userName} avatarLetter={avatarLetter} />
        </aside>

        {/* Main */}
        <div className="md:ml-[220px]" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

          {/* Header */}
          <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--f-header-bg)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--f-border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 16 }}>

            {/* Left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <button className="md:hidden" onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--f-text2)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                <Menu size={20} />
              </button>
              <h1 style={{ color: 'var(--f-text1)', fontSize: 16, fontWeight: 700, margin: 0, whiteSpace: 'nowrap' }}>{pageTitle}</h1>
            </div>

            {/* Date picker */}
            <div ref={datePickerRef} style={{ position: 'relative' }}>
              <button onClick={() => { setTempFrom(dateFrom); setTempTo(dateTo); setShowDatePicker(v => !v) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 8, background: 'var(--f-input-bg)', border: `1px solid ${showDatePicker ? GOLD : 'var(--f-border)'}`, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'border-color 0.15s' }}>
                <Calendar size={14} color={'var(--f-text2)'} />
                <span style={{ color: 'var(--f-text2)', fontSize: 13 }}>{fmtDateTH(dateFrom)} – {fmtDateTH(dateTo)}</span>
              </button>

              {showDatePicker && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: 'var(--f-card)', border: '1px solid var(--f-border)', borderRadius: 12, padding: 16, zIndex: 100, minWidth: 280, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                  <p style={{ margin: '0 0 12px', color: 'var(--f-text1)', fontSize: 13, fontWeight: 600 }}>เลือกช่วงวันที่</p>

                  {/* Preset buttons — click to apply immediately */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {PRESETS.map(p => (
                      <button key={p.label} onClick={() => applyDate(p.from, p.to)}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: 'var(--f-input-bg)', border: '1px solid var(--f-border)', color: 'var(--f-text2)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Manual date inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <p style={{ margin: '0 0 4px', color: 'var(--f-text3)', fontSize: 11 }}>วันเริ่มต้น</p>
                      <input type="date" value={tempFrom} onChange={e => setTempFrom(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, background: 'var(--f-input-bg)', border: '1px solid var(--f-border)', color: 'var(--f-text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box', colorScheme: isDark ? 'dark' : 'light' }} />
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px', color: 'var(--f-text3)', fontSize: 11 }}>วันสิ้นสุด</p>
                      <input type="date" value={tempTo} onChange={e => setTempTo(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, background: 'var(--f-input-bg)', border: '1px solid var(--f-border)', color: 'var(--f-text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box', colorScheme: isDark ? 'dark' : 'light' }} />
                    </div>
                  </div>
                  <button onClick={applyTempDate}
                    style={{ width: '100%', marginTop: 10, padding: '8px 0', borderRadius: 8, background: GOLD, border: 'none', color: '#FFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ใช้ช่วงนี้
                  </button>
                </div>
              )}
            </div>

            {/* Right actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

              {/* Theme toggle */}
              <button onClick={toggleTheme} title={isDark ? 'เปลี่ยนเป็น Light Mode' : 'เปลี่ยนเป็น Dark Mode'}
                style={{ background: 'none', border: 'none', color: 'var(--f-text2)', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }}>
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Search */}
              <button onClick={() => setShowSearch(true)}
                style={{ background: 'none', border: 'none', color: 'var(--f-text2)', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }}>
                <Search size={18} />
              </button>

              {/* Bell */}
              <div ref={bellRef} style={{ position: 'relative' }}>
                <button onClick={() => setShowBell(v => !v)}
                  style={{ background: 'none', border: 'none', color: 'var(--f-text2)', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <Bell size={18} />
                  {notifCount > 0 && (
                    <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 14, height: 14, borderRadius: 7, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </button>
                {showBell && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'var(--f-card)', border: '1px solid var(--f-border)', borderRadius: 12, width: 280, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--f-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ margin: 0, color: 'var(--f-text1)', fontSize: 13, fontWeight: 600 }}>การแจ้งเตือน</p>
                      {notifCount > 0 && <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>{notifCount} รออนุมัติ</span>}
                    </div>
                    {notifications.length === 0 ? (
                      <p style={{ padding: '20px 16px', color: 'var(--f-text3)', fontSize: 13, textAlign: 'center', margin: 0 }}>ไม่มีการแจ้งเตือน</p>
                    ) : (
                      <>
                        {notifications.map(n => (
                          <Link key={n.id} href={n.href} onClick={() => setShowBell(false)}
                            style={{ display: 'block', padding: '10px 16px', borderBottom: '1px solid var(--f-border)', textDecoration: 'none' }}
                            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--f-hover)'}
                            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'}>
                            <p style={{ margin: 0, color: 'var(--f-text1)', fontSize: 13 }}>{n.label}</p>
                            <p style={{ margin: '2px 0 0', color: 'var(--f-text2)', fontSize: 11 }}>{n.sub}</p>
                          </Link>
                        ))}
                        <Link href="/finance/expenses" onClick={() => setShowBell(false)}
                          style={{ display: 'block', padding: '10px 16px', color: GOLD, fontSize: 12, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
                          ดูทั้งหมด →
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Export */}
              <button onClick={handleExport} disabled={exporting}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: GOLD, border: 'none', color: '#FFF', fontSize: 13, fontWeight: 600, cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.7 : 1, transition: 'opacity 0.2s', fontFamily: 'inherit' }}>
                <Download size={14} />
                {exporting ? 'กำลัง...' : 'Export'}
              </button>
            </div>
          </header>

          {/* Content */}
          <main style={{ flex: 1, padding: '24px' }} className="pb-20 md:pb-6">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, background: 'var(--f-card)', borderTop: '1px solid var(--f-border)', display: 'flex', height: 60, paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {MOBILE_TABS.map(({ label, icon: Icon, href }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, color: active ? GOLD : 'var(--f-text2)', textDecoration: 'none', fontSize: 10, fontWeight: active ? 600 : 400 }}>
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Search Modal */}
        {showSearch && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}
            onClick={e => { if (e.target === e.currentTarget) setShowSearch(false) }}>
            <div style={{ width: '100%', maxWidth: 560, background: 'var(--f-card)', borderRadius: 16, border: '1px solid var(--f-border)', overflow: 'hidden', boxShadow: '0 16px 64px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--f-border)' }}>
                <Search size={18} color={'var(--f-text2)'} style={{ flexShrink: 0 }} />
                <input ref={searchInputRef} value={searchQuery} onChange={e => handleSearchInput(e.target.value)}
                  placeholder="ค้นหา รุ่น, เลขอ้างอิง, รายจ่าย..."
                  style={{ flex: 1, background: 'none', border: 'none', color: 'var(--f-text1)', fontSize: 15, outline: 'none', fontFamily: 'inherit' }} />
                <button onClick={() => setShowSearch(false)} style={{ background: 'none', border: 'none', color: 'var(--f-text3)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {searchQuery.trim().length < 2 ? (
                  <p style={{ padding: '24px 16px', color: 'var(--f-text3)', fontSize: 13, textAlign: 'center', margin: 0 }}>พิมพ์อย่างน้อย 2 ตัวอักษร</p>
                ) : searching ? (
                  <p style={{ padding: '24px 16px', color: 'var(--f-text3)', fontSize: 13, textAlign: 'center', margin: 0 }}>กำลังค้นหา...</p>
                ) : searchResults.length === 0 ? (
                  <p style={{ padding: '24px 16px', color: 'var(--f-text3)', fontSize: 13, textAlign: 'center', margin: 0 }}>ไม่พบผลลัพธ์</p>
                ) : (
                  (['income', 'expense'] as const).map(type => {
                    const items = searchResults.filter(r => r.type === type)
                    if (items.length === 0) return null
                    return (
                      <div key={type}>
                        <p style={{ margin: 0, padding: '8px 16px 4px', color: 'var(--f-text3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                        </p>
                        {items.map(r => (
                          <Link key={r.id} href={r.href} onClick={() => setShowSearch(false)}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', textDecoration: 'none' }}
                            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--f-hover)'}
                            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: type === 'income' ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, color: 'var(--f-text1)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</p>
                              <p style={{ margin: '2px 0 0', color: 'var(--f-text2)', fontSize: 11 }}>{r.sub}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </FinanceDateContext.Provider>
  )
}
