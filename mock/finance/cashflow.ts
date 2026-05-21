import type { CashFlowEntry } from '@/types/finance'

export const cashFlowSummary = {
  opening: 980200,
  totalIn: 2850900,
  totalOut: 1754600,
  closing: 1328500,
}

export const cashFlowEntries: CashFlowEntry[] = [
  {
    id: '1',
    datetime: '2024-05-21 10:30',
    description: 'รับเงินจากการขาย iPhone 15 Pro Max — INC-240521-001',
    entryType: 'in',
    amountIn: 32000,
    balance: 1328500,
  },
  {
    id: '2',
    datetime: '2024-05-21 09:15',
    description: 'จ่ายค่า Ads Facebook/Google — EXP-240521-001',
    entryType: 'out',
    amountOut: 2850,
    balance: 1296500,
  },
  {
    id: '3',
    datetime: '2024-05-20 16:45',
    description: 'รับเงินจากการขาย iPhone 14 Pro — INC-240520-002',
    entryType: 'in',
    amountIn: 18500,
    balance: 1299350,
  },
  {
    id: '4',
    datetime: '2024-05-20 14:00',
    description: 'จ่ายค่าเช่าสำนักงาน พ.ค. 2024 — EXP-240520-003',
    entryType: 'out',
    amountOut: 18000,
    balance: 1280850,
  },
  {
    id: '5',
    datetime: '2024-05-20 11:30',
    description: 'ปรับยอดยกมา — ตรวจนับเงินสด',
    entryType: 'adjustment',
    balance: 1298850,
  },
]
