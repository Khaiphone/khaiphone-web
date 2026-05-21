'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import FinanceLayout from '@/app/components/finance/FinanceLayout'

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/admin/login'); return }
      setReady(true)
    })
  }, [])

  if (!ready) return <div style={{ minHeight: '100vh', background: '#060606' }} />
  return <FinanceLayout>{children}</FinanceLayout>
}
