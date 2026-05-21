'use client'

import { createContext, useContext } from 'react'

export type FinanceDateCtx = {
  dateFrom: string
  dateTo: string
}

export const FinanceDateContext = createContext<FinanceDateCtx>({ dateFrom: '', dateTo: '' })

export function useFinanceDate() {
  return useContext(FinanceDateContext)
}
