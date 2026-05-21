import type { KpiData } from '@/types/finance'

export const kpiMain: KpiData[] = [
  { label: 'เงินสดคงเหลือ', value: 1328500, delta: 8.2, deltaType: 'positive', format: 'currency' },
  { label: 'รายได้เดือนนี้', value: 2850900, delta: 15.7, deltaType: 'positive', format: 'currency' },
  { label: 'ต้นทุนเดือนนี้', value: 1754600, delta: 10.4, deltaType: 'negative', format: 'currency' },
  { label: 'กำไรสุทธิ', value: 1096300, delta: 18.9, deltaType: 'positive', format: 'currency' },
]

export const kpiSecondary: KpiData[] = [
  { label: 'มูลค่าสต็อก', value: 4780000, delta: 0, deltaType: 'positive', format: 'currency' },
  { label: 'รับเงินรอ', value: 245600, delta: 0, deltaType: 'positive', format: 'currency' },
  { label: 'หนี้ค้างรับ', value: 868000, delta: 0, deltaType: 'negative', format: 'currency' },
  { label: 'ค่าใช้จ่ายคงค้าง', value: 32450, delta: 0, deltaType: 'negative', format: 'currency' },
]

export const revenueVsExpenseData = [
  { date: 'ม.ค.', revenue: 1850000, expense: 1120000 },
  { date: 'ก.พ.', revenue: 2050000, expense: 1280000 },
  { date: '1 มี.ค.', revenue: 1950000, expense: 1150000 },
  { date: '5 มี.ค.', revenue: 2200000, expense: 1350000 },
  { date: '9 มี.ค.', revenue: 2100000, expense: 1290000 },
  { date: '13 มี.ค.', revenue: 2400000, expense: 1480000 },
  { date: '17 มี.ค.', revenue: 2350000, expense: 1420000 },
  { date: '21 มี.ค.', revenue: 2550000, expense: 1560000 },
  { date: '25 มี.ค.', revenue: 2480000, expense: 1510000 },
  { date: '1 เม.ย.', revenue: 2600000, expense: 1580000 },
  { date: '5 เม.ย.', revenue: 2500000, expense: 1500000 },
  { date: '9 เม.ย.', revenue: 2700000, expense: 1650000 },
  { date: '13 เม.ย.', revenue: 2650000, expense: 1620000 },
  { date: '17 เม.ย.', revenue: 2800000, expense: 1700000 },
  { date: '1 พ.ค.', revenue: 2750000, expense: 1680000 },
  { date: '7 พ.ค.', revenue: 2900000, expense: 1780000 },
  { date: '14 พ.ค.', revenue: 2820000, expense: 1720000 },
  { date: '21 พ.ค.', revenue: 2850900, expense: 1754600 },
]

export const dailyProfitData = [
  { date: 'ม.ค.', profit: 730000 },
  { date: 'ก.พ.', profit: 770000 },
  { date: '1 มี.ค.', profit: 800000 },
  { date: '5 มี.ค.', profit: 850000 },
  { date: '9 มี.ค.', profit: 810000 },
  { date: '13 มี.ค.', profit: 920000 },
  { date: '17 มี.ค.', profit: 930000 },
  { date: '21 มี.ค.', profit: 990000 },
  { date: '25 มี.ค.', profit: 970000 },
  { date: '1 เม.ย.', profit: 1020000 },
  { date: '5 เม.ย.', profit: 1000000 },
  { date: '9 เม.ย.', profit: 1050000 },
  { date: '13 เม.ย.', profit: 1030000 },
  { date: '17 เม.ย.', profit: 1100000 },
  { date: '1 พ.ค.', profit: 1070000 },
  { date: '7 พ.ค.', profit: 1120000 },
  { date: '14 พ.ค.', profit: 1100000 },
  { date: '21 พ.ค.', profit: 1096300 },
]

export const topModels = [
  { model: 'iPhone 15 Pro Max', profit: 245000 },
  { model: 'iPhone 15 Pro', profit: 198000 },
  { model: 'iPhone 14 Pro Max', profit: 165000 },
  { model: 'iPhone 15', profit: 132000 },
  { model: 'iPhone 14', profit: 98000 },
]

export const alerts: { type: 'danger' | 'warning' | 'orange'; title: string; sub: string }[] = [
  { type: 'danger', title: 'หนี้ค้างรับเกิน 30 วัน', sub: '3 รายการ รวม ฿248,000 เกินกำหนดชำระ' },
  { type: 'warning', title: 'ค่าใช้จ่ายคงค้างรอยืนยัน', sub: '2 รายการ รวม ฿43,000 รออนุมัติ' },
  { type: 'orange', title: 'สต็อกเครื่องต้นทุนสูง', sub: 'iPhone 15 Pro Max 3 เครื่อง รอขายมา 15 วัน' },
]
