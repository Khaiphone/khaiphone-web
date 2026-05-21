import type { KpiData, ProfitByModel } from '@/types/finance'

export const profitKpi: KpiData[] = [
  { label: 'กำไรสุทธิเดือนนี้', value: 1096300, delta: 18.9, deltaType: 'positive', format: 'currency' },
  { label: 'Gross Margin เฉลี่ย', value: 38.5, delta: 2.1, deltaType: 'positive', format: 'percent' },
  { label: 'กำไรต่อเครื่องเฉลี่ย', value: 4850, delta: 5.3, deltaType: 'positive', format: 'currency' },
  { label: 'จำนวนเครื่องที่ขาย', value: 226, delta: 12, deltaType: 'positive', format: 'number' },
]

export const profitByModel: ProfitByModel[] = [
  { model: 'iPhone 15 Pro Max', costAvg: 31500, sellAvg: 38900, profitAvg: 7400, margin: 19.0 },
  { model: 'iPhone 15 Pro', costAvg: 28500, sellAvg: 34800, profitAvg: 6300, margin: 18.1 },
  { model: 'iPhone 15', costAvg: 21000, sellAvg: 27500, profitAvg: 6500, margin: 23.6 },
  { model: 'iPhone 14 Pro Max', costAvg: 24000, sellAvg: 29500, profitAvg: 5500, margin: 18.6 },
  { model: 'iPhone 14', costAvg: 14500, sellAvg: 19800, profitAvg: 5300, margin: 26.8 },
]

export const profitDonut: { name: string; value: number; color: string }[] = [
  { name: 'iPhone 15 Pro Max', value: 245000, color: '#B8860B' },
  { name: 'iPhone 15 Pro', value: 198000, color: '#22c55e' },
  { name: 'iPhone 15', value: 175000, color: '#3b82f6' },
  { name: 'iPhone 14 Pro Max', value: 165000, color: '#a855f7' },
  { name: 'อื่นๆ', value: 313300, color: '#64748b' },
]
