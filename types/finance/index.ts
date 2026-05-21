export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'paid'
export type TransactionType = 'income' | 'expense' | 'purchase'

export type Transaction = {
  id: string
  date: string
  refNumber: string
  type: TransactionType
  customer?: string
  product?: string
  channel?: string
  amount: number
  status: TransactionStatus
  category?: string
  notes?: string
}

export type KpiData = {
  label: string
  value: number
  delta: number
  deltaType: 'positive' | 'negative'
  format: 'currency' | 'number' | 'percent'
}

export type ProfitByModel = {
  model: string
  costAvg: number
  sellAvg: number
  profitAvg: number
  margin: number
}

export type CashFlowEntry = {
  id: string
  datetime: string
  description: string
  entryType: 'in' | 'out' | 'adjustment'
  amountIn?: number
  amountOut?: number
  balance: number
}

export type AuditLog = {
  id: string
  datetime: string
  user: string
  action: string
  refNumber: string
  before?: string
  after?: string
  category: 'finance' | 'stock' | 'system' | 'user'
}
