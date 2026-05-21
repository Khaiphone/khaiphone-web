'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  BarChart2,
  Banknote,
  FileText,
  GitMerge,
  ScrollText,
  Settings,
  Menu,
  X,
  Calendar,
  Search,
  Bell,
  Download,
  MoreHorizontal,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { fetchFinanceDashboard } from '@/app/actions/finance'

const GOLD = '#B8860B'
const BG = '#060606'
const CARD = '#0D0D0D'
const BORDER = 'rgba(255,255,255,0.08)'
const TEXT2 = 'rgba(255,255,255,0.65)'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/finance/dashboard' },
  { label: 'รายรับ', icon: TrendingUp, href: '/finance/income' },
  { label: 'รายจ่าย', icon: TrendingDown, href: '/finance/expenses' },
  { label: 'ซื้อเครื่อง', icon: ShoppingCart, href: '/finance/purchases' },
  { label: 'กำไร / Margin', icon: BarChart2, href: '/finance/profit' },
  { label: 'กระแสเงินสด', icon: Banknote, href: '/finance/cashflow' },
  { label: 'รายงาน', icon: FileText, href: '/finance/reports' },
  { label: 'Reconcile', icon: GitMerge, href: '/finance/reconcile' },
  { label: 'Audit Logs', icon: ScrollText, href: '/finance/audit' },
  { label: 'ตั้งค่าการเงิน', icon: Settings, href: '/finance/settings' },
]

const PAGE_TITLES: Record<string, string> = {
  '/finance/dashboard': 'Dashboard',
  '/finance/income': 'รายรับ',
  '/finance/expenses': 'รายจ่าย',
  '/finance/purchases': 'ซื้อเครื่อง (ต้นทุน)',
  '/finance/profit': 'กำไร / Margin',
  '/finance/cashflow': 'กระแสเงินสด (Cash Flow)',
  '/finance/reports': 'รายงาน (Reports)',
  '/finance/reconcile': 'Reconcile (กระทบยอด)',
  '/finance/audit': 'Audit Logs',
  '/finance/settings': 'ตั้งค่าการเงิน',
}

const MOBILE_TABS = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/finance/dashboard' },
  { label: 'รายรับ', icon: TrendingUp, href: '/finance/income' },
  { label: 'รายจ่าย', icon: TrendingDown, href: '/finance/expenses' },
  { label: 'กำไร', icon: BarChart2, href: '/finance/profit' },
  { label: 'เพิ่มเติม', icon: MoreHorizontal, href: '/finance/cashflow' },
]

function SidebarContent({ onClose, userName, avatarLetter }: { onClose?: () => void; userName?: string; avatarLetter?: string }) {
  const pathname = usePathname()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 16px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 16, margin: 0 }}>KHAIPHONE</p>
            <p style={{ color: GOLD, fontSize: 11, margin: '2px 0 0', fontWeight: 500 }}>
              Finance &amp; Accounting
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: TEXT2,
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* User card */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: GOLD,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {avatarLetter ?? 'A'}
        </div>
        <div>
          <p style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 700, margin: 0 }}>{userName ?? '...'}</p>
          <p style={{ color: TEXT2, fontSize: 11, margin: '1px 0 0' }}>Administrator</p>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                color: active ? GOLD : TEXT2,
                background: active ? 'rgba(184,134,11,0.15)' : 'transparent',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                borderLeft: active ? `2px solid ${GOLD}` : '2px solid transparent',
                transition: 'background 0.15s',
              }}
            >
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
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setUserEmail(session.user.email)
    })
  }, [])

  const userName = userEmail ? userEmail.split('@')[0] : '...'
  const avatarLetter = userName.charAt(0).toUpperCase()

  async function handleExport() {
    setExporting(true)
    try {
      const d = await fetchFinanceDashboard()
      const BOM = '﻿'
      const lines: string[] = []

      lines.push('สรุปการเงิน KHAIPHONE')
      lines.push(`ส่งออกเมื่อ,${new Date().toLocaleString('th-TH')}`)
      lines.push('')

      lines.push('=== KPI หลัก ===')
      lines.push('รายการ,จำนวน (บาท)')
      lines.push(`รายได้รวม,${d.totalRevenue}`)
      lines.push(`ต้นทุนเครื่อง,${d.totalCost}`)
      lines.push(`ค่าใช้จ่าย (approved),${d.totalExpenses}`)
      lines.push(`กำไรสุทธิแท้จริง,${d.trueNetProfit}`)
      lines.push(`มูลค่าสต็อก,${d.stockValue}`)
      lines.push('')

      lines.push('=== จำนวนเครื่อง ===')
      lines.push('รายการ,จำนวน')
      lines.push(`รับซื้อทั้งหมด,${d.purchaseCount}`)
      lines.push(`ขายแล้ว,${d.soldCount}`)
      lines.push(`ในมือ,${d.purchaseCount - d.soldCount}`)
      lines.push(`รออนุมัติค่าใช้จ่าย,${d.pendingExpensesCount}`)
      lines.push('')

      lines.push('=== รายรับ / ต้นทุน รายเดือน ===')
      lines.push('เดือน,รายรับ,ต้นทุน,กำไร')
      for (const m of d.revenueByMonth) {
        lines.push(`${m.date},${m.revenue},${m.cost},${m.revenue - m.cost}`)
      }
      lines.push('')

      lines.push('=== ค่าใช้จ่ายแยกประเภท ===')
      lines.push('ประเภท,จำนวน (บาท)')
      for (const e of d.expenseByCategory) {
        lines.push(`${e.category},${e.amount}`)
      }
      lines.push('')

      lines.push('=== Top รุ่นกำไรสูงสุด ===')
      lines.push('รุ่น,กำไรรวม (บาท)')
      for (const m of d.topModels) {
        lines.push(`${m.model},${m.profit}`)
      }

      const csv = BOM + lines.join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finance-summary-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const pageTitle = PAGE_TITLES[pathname] ?? 'Finance'

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex' }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex"
        style={{
          width: 220,
          background: CARD,
          borderRight: `1px solid ${BORDER}`,
          flexDirection: 'column',
          flexShrink: 0,
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 20,
        }}
      >
        <SidebarContent userName={userName} avatarLetter={avatarLetter} />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            background: 'rgba(0,0,0,0.7)',
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className="md:hidden"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 260,
          background: CARD,
          borderRight: `1px solid ${BORDER}`,
          zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        <SidebarContent onClose={() => setSidebarOpen(false)} userName={userName} avatarLetter={avatarLetter} />
      </aside>

      {/* Main area */}
      <div
        className="md:ml-[220px]"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
      >
        {/* Sticky Header */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'rgba(13,13,13,0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: `1px solid ${BORDER}`,
            padding: '0 24px',
            height: 60,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <button
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: TEXT2,
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Menu size={20} />
            </button>
            <h1
              style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: 700,
                margin: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {pageTitle}
            </h1>
          </div>

          {/* Center: date range */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${BORDER}`,
              whiteSpace: 'nowrap',
            }}
          >
            <Calendar size={14} color={TEXT2} />
            <span style={{ color: TEXT2, fontSize: 13 }}>01/05/2024 – 21/05/2024</span>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: TEXT2,
                cursor: 'pointer',
                padding: 6,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Search size={18} />
            </button>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: TEXT2,
                cursor: 'pointer',
                padding: 6,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              <Bell size={18} />
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                3
              </span>
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 8,
                background: GOLD,
                border: 'none',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 600,
                cursor: exporting ? 'not-allowed' : 'pointer',
                opacity: exporting ? 0.7 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <Download size={14} />
              {exporting ? 'กำลัง...' : 'Export'}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main
          style={{ flex: 1, padding: '24px' }}
          className="pb-20 md:pb-6"
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav
        className="md:hidden"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          background: CARD,
          borderTop: `1px solid ${BORDER}`,
          display: 'flex',
          height: 60,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {MOBILE_TABS.map(({ label, icon: Icon, href }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                color: active ? GOLD : TEXT2,
                textDecoration: 'none',
                fontSize: 10,
                fontWeight: active ? 600 : 400,
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
