import type { PricingOption } from "@/lib/pricing-defaults";

// ฟังก์ชันคำนวณราคาประเมิน — แยกออกมาจากหน้า /sell/[model] เพื่อให้หน้าเว็บ
// และเทสต์ใช้ logic ตัวเดียวกัน (เทสต์ของจริง ไม่ใช่สำเนา)

export type PriceableProduct = { storage: string; priceGood: number };

/** "฿12,000" */
export function formatPrice(n: number): string {
  return "฿" + n.toLocaleString("th-TH");
}

/** ช่วงราคาประเมิน: min = ต่ำกว่า 5%, max = สูงกว่า 3% (ปัดหลักร้อย) */
export function calcPriceRange(price: number): { min: number; max: number } {
  return {
    min: Math.floor((price * 0.95) / 100) * 100,
    max: Math.ceil((price * 1.03) / 100) * 100,
  };
}

/**
 * ราคาประเมิน = ราคาฐานตามความจุ + ส่วนหักตามสภาพแต่ละข้อ
 * แต่ต้องไม่ต่ำกว่าราคาขั้นต่ำ (floorPct ของราคาฐาน)
 */
export function calcPrice(
  product: PriceableProduct,
  picks: (number | null)[],
  groups: PricingOption[][],
  storageMultiplier: number,
  storagePrices: Record<string, number> | null,
  floorPct: number,
): number {
  const storages = product.storage.split(" / ");
  const storageIdx = picks[0] ?? Math.floor((storages.length - 1) / 2);
  const selectedStorage = storages[storageIdx];
  let basePrice: number;
  if (storagePrices && storagePrices[selectedStorage] !== undefined) {
    basePrice = storagePrices[selectedStorage];
  } else {
    const midIdx = Math.floor((storages.length - 1) / 2);
    basePrice = Math.round(product.priceGood * (1 + (storageIdx - midIdx) * storageMultiplier));
  }
  let price = basePrice;
  groups.forEach((g, i) => {
    const idx = picks[i + 1];
    if (idx !== null && g[idx]) price += g[idx].ded;
  });
  return Math.max(Math.round(basePrice * floorPct), price);
}
