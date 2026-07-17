// ข้อมูลระบุรุ่น iPad — ชื่อแบบที่ลูกค้าเห็นใน ตั้งค่า > ทั่วไป > เกี่ยวกับ + Model Number (A…)
// อ้างอิง Apple "Identify your iPad model" (support.apple.com/108043) — ตรวจเทียบ 2026-07-18

type IpadFamily = {
  base: string;      // ชื่อรุ่นใน catalog (lib/products.ts) แบบตัด (Wi-Fi)/(Wi-Fi + Cellular)
  subtitle: string;  // ชื่อแบบใน Settings ของลูกค้า + ปีวางขาย
  wifi: string[];    // A-number ของรุ่น Wi-Fi
  cellular: string[]; // A-number ของรุ่น Wi-Fi + Cellular (รวม mmWave / China)
  batteryHealth?: boolean; // มีเมนูสุขภาพแบตใน iPadOS (เครื่องปี 2024 ขึ้นไป)
};

const IPAD_FAMILIES: IpadFamily[] = [
  // iPad Gen
  { base: "iPad Gen 9",  subtitle: "iPad (รุ่นที่ 9) • ปี 2021",  wifi: ["A2602"], cellular: ["A2604", "A2603", "A2605"] },
  { base: "iPad Gen 10", subtitle: "iPad (รุ่นที่ 10) • ปี 2022", wifi: ["A2696"], cellular: ["A2757", "A2777", "A3162"] },
  { base: "iPad Gen 11 A16", subtitle: "iPad (A16) • ปี 2025", wifi: ["A3354"], cellular: ["A3355", "A3356"], batteryHealth: true },
  // iPad mini
  { base: "iPad mini 6", subtitle: "iPad mini (รุ่นที่ 6) • ปี 2021", wifi: ["A2567"], cellular: ["A2568", "A2569"] },
  { base: "iPad mini 7", subtitle: "iPad mini (A17 Pro) • ปี 2024", wifi: ["A2993"], cellular: ["A2995", "A2996"], batteryHealth: true },
  // iPad Air
  { base: "iPad Air 5", subtitle: "iPad Air (รุ่นที่ 5) • ปี 2022", wifi: ["A2588"], cellular: ["A2589", "A2591"] },
  { base: 'iPad Air 6 11"', subtitle: "iPad Air 11-inch (M2) • ปี 2024", wifi: ["A2902"], cellular: ["A2903", "A2904"], batteryHealth: true },
  { base: 'iPad Air 6 13"', subtitle: "iPad Air 13-inch (M2) • ปี 2024", wifi: ["A2898"], cellular: ["A2899", "A2900"], batteryHealth: true },
  { base: 'iPad Air 7 11"', subtitle: "iPad Air 11-inch (M3) • ปี 2025", wifi: ["A3266"], cellular: ["A3267", "A3270"], batteryHealth: true },
  { base: 'iPad Air 7 13"', subtitle: "iPad Air 13-inch (M3) • ปี 2025", wifi: ["A3268"], cellular: ["A3269", "A3271"], batteryHealth: true },
  { base: 'iPad Air 8 11"', subtitle: "iPad Air 11-inch (M4) • ปี 2026", wifi: ["A3459"], cellular: ["A3460", "A3463"], batteryHealth: true },
  { base: 'iPad Air 8 13"', subtitle: "iPad Air 13-inch (M4) • ปี 2026", wifi: ["A3461"], cellular: ["A3462", "A3464"], batteryHealth: true },
  // iPad Pro 11"
  { base: 'iPad Pro 11" (2020)', subtitle: "iPad Pro 11-inch (รุ่นที่ 2) • ปี 2020", wifi: ["A2228"], cellular: ["A2068", "A2230", "A2231"] },
  { base: 'iPad Pro 11" M1', subtitle: "iPad Pro 11-inch (รุ่นที่ 3) • ปี 2021", wifi: ["A2377"], cellular: ["A2459", "A2301", "A2460"] },
  { base: 'iPad Pro 11" M2', subtitle: "iPad Pro 11-inch (รุ่นที่ 4) • ปี 2022", wifi: ["A2759"], cellular: ["A2761", "A2435", "A2762"] },
  { base: 'iPad Pro 11" M4', subtitle: "iPad Pro 11-inch (M4) • ปี 2024", wifi: ["A2836"], cellular: ["A2837", "A3006"], batteryHealth: true },
  { base: 'iPad Pro 11" M5', subtitle: "iPad Pro 11-inch (M5) • ปี 2025", wifi: ["A3357"], cellular: ["A3358", "A3359"], batteryHealth: true },
  // iPad Pro 12.9" / 13"
  { base: 'iPad Pro 12.9" (2020)', subtitle: "iPad Pro 12.9-inch (รุ่นที่ 4) • ปี 2020", wifi: ["A2229"], cellular: ["A2069", "A2232", "A2233"] },
  { base: 'iPad Pro 12.9" M1', subtitle: "iPad Pro 12.9-inch (รุ่นที่ 5) • ปี 2021", wifi: ["A2378"], cellular: ["A2461", "A2379", "A2462"] },
  { base: 'iPad Pro 12.9" M2', subtitle: "iPad Pro 12.9-inch (รุ่นที่ 6) • ปี 2022", wifi: ["A2436"], cellular: ["A2437", "A2764", "A2766"] },
  { base: 'iPad Pro 13" M4', subtitle: "iPad Pro 13-inch (M4) • ปี 2024", wifi: ["A2925"], cellular: ["A2926", "A3007"], batteryHealth: true },
  { base: 'iPad Pro 13" M5', subtitle: "iPad Pro 13-inch (M5) • ปี 2025", wifi: ["A3360"], cellular: ["A3361", "A3362"], batteryHealth: true },
];

export function ipadBaseModel(model: string): string {
  return model.replace(/\s*\((Wi-Fi|Wi-Fi \+ Cellular)\)\s*$/, "");
}

/** subtitle ชื่อแบบใน Settings ของลูกค้า — null ถ้าไม่ใช่ iPad ใน catalog */
export function getIpadSubtitle(model: string): string | null {
  const base = ipadBaseModel(model);
  return IPAD_FAMILIES.find(f => f.base === base)?.subtitle ?? null;
}

/** iPad รุ่นที่มีเมนูสุขภาพแบตให้ลูกค้าดูเอง (เครื่องปี 2024 ขึ้นไป, iPadOS 17.5+) */
export function ipadShowsBatteryHealth(model: string): boolean {
  const base = ipadBaseModel(model);
  return IPAD_FAMILIES.find(f => f.base === base)?.batteryHealth === true;
}

export type IpadANumberMatch = {
  model: string;    // ชื่อรุ่นเต็มตรงกับ catalog เช่น 'iPad Pro 11" M1 (Wi-Fi)'
  subtitle: string;
};

/** ค้นรุ่นจาก Model Number (A….) — รับข้อความดิบจากช่องกรอก, null ถ้าไม่เจอ */
export function lookupIpadByANumber(raw: string): IpadANumberMatch | null {
  const m = raw.toUpperCase().match(/A\d{4}/);
  if (!m) return null;
  const a = m[0];
  for (const f of IPAD_FAMILIES) {
    if (f.wifi.includes(a)) return { model: `${f.base} (Wi-Fi)`, subtitle: f.subtitle };
    if (f.cellular.includes(a)) return { model: `${f.base} (Wi-Fi + Cellular)`, subtitle: f.subtitle };
  }
  return null;
}
