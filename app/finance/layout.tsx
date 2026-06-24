'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchMyProfile } from '@/app/actions/admin-users'
import FinanceLayout from '@/app/components/finance/FinanceLayout'
import AppSplash from '@/app/components/AppSplash'

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  // dep [] โดยตั้งใจ — ตรวจ auth ครั้งเดียวตอน mount ไม่ re-run/redirect ตอนเปลี่ยนหน้า (กัน jump-back)
  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return
      if (!session) { router.replace('/admin/login'); return }
      const profile = await fetchMyProfile(session.user.id)
      if (cancelled) return
      const canAccess = profile?.role === 'owner' || (profile?.permissions ?? []).includes('view_finance')
      if (!canAccess) {
        const host = window.location.host
        const adminHost = host.replace(/^finance\./, 'admin.')
        window.location.href = `${window.location.protocol}//${adminHost}/admin/dashboard`
        return
      }
      setReady(true)
    })
    return () => { cancelled = true }
  }, [])

  if (!ready) return <AppSplash logo="/icon-192.png" name="KP Finance" accent="#B8860B" bg="#060606" />
  return (
    <>
      <FinanceLayout>{children}</FinanceLayout>
      {/* ฉากหน้าขั้นต่ำ 0.8 วิ แล้ว fade (finance ไม่มี data-ready signal แยก) */}
      <AppSplash done logo="/icon-192.png" name="KP Finance" accent="#B8860B" bg="#060606" />
    </>
  )
}
