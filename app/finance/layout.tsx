'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchMyRole } from '@/app/actions/admin-users'
import FinanceLayout from '@/app/components/finance/FinanceLayout'

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/admin/login'); return }
      const role = await fetchMyRole(session.user.id)
      if (role !== 'owner') {
        const host = window.location.host
        const adminHost = host.replace(/^finance\./, 'admin.')
        window.location.href = `${window.location.protocol}//${adminHost}/admin/dashboard`
        return
      }
      setReady(true)
    })
  }, [])

  if (!ready) return <div style={{ minHeight: '100vh', background: '#060606' }} />
  return <FinanceLayout>{children}</FinanceLayout>
}
