import { describe, it, expect } from "vitest";
import { calcPrice, calcPriceRange, formatPrice, type PriceableProduct } from "@/lib/pricing";
import type { PricingOption } from "@/lib/pricing-defaults";

// จำลอง iPhone 1 รุ่น: ราคาฐาน (ความจุกลาง) 18,000 มี 3 ความจุ
const product: PriceableProduct = { storage: "128GB / 256GB / 512GB", priceGood: 18000 };
const STORAGE_MULT = 0.15; // แต่ละสเต็ปความจุ ±15%
const FLOOR = 0.5;         // ราคาต่ำสุด = 50% ของราคาฐาน (กันหักจนเหลือน้อยเกิน)

// picks[0] = index ความจุ, picks[1..] = ตัวเลือกสภาพของแต่ละกลุ่ม
// helper: เลือกความจุอย่างเดียว ไม่หักสภาพ
const pickStorage = (i: number) => [i] as (number | null)[];

describe("calcPrice — สมองการประเมินราคา (ความจุ + สภาพ)", () => {
  it("ความจุกลาง (256GB) สภาพดีไม่หักอะไร → ได้ราคาฐาน 18,000", () => {
    expect(calcPrice(product, pickStorage(1), [], STORAGE_MULT, null, FLOOR)).toBe(18000);
  });

  it("ความจุสูงกว่า (512GB) → ราคาเพิ่มตาม multiplier (+15%)", () => {
    expect(calcPrice(product, pickStorage(2), [], STORAGE_MULT, null, FLOOR)).toBe(20700);
  });

  it("ความจุต่ำกว่า (128GB) → ราคาลด (−15%)", () => {
    expect(calcPrice(product, pickStorage(0), [], STORAGE_MULT, null, FLOOR)).toBe(15300);
  });

  it("จอแตก (หัก 3,000) → ราคาลดตามจริง", () => {
    const groups: PricingOption[][] = [[{ label: "จอแตก", ded: -3000 }]];
    // picks: ความจุกลาง(1) + เลือกตัวเลือกแรกของกลุ่มจอ(0)
    expect(calcPrice(product, [1, 0], groups, STORAGE_MULT, null, FLOOR)).toBe(15000);
  });

  it("สภาพพังหนักมาก (หัก 15,000) → ติดราคาขั้นต่ำ (floor 50% = 9,000) ไม่ต่ำกว่านี้", () => {
    const groups: PricingOption[][] = [[{ label: "พังหนัก", ded: -15000 }]];
    // ถ้าไม่มี floor จะเหลือ 3,000 แต่ floor บังคับขั้นต่ำที่ 9,000
    expect(calcPrice(product, [1, 0], groups, STORAGE_MULT, null, FLOOR)).toBe(9000);
  });

  it("ถ้ามีราคาต่อความจุกำหนดไว้ตรงๆ (storagePrices) → ใช้ราคานั้นแทนการคำนวณ", () => {
    const storagePrices = { "256GB": 19000 };
    expect(calcPrice(product, pickStorage(1), [], STORAGE_MULT, storagePrices, FLOOR)).toBe(19000);
  });
});

describe("calcPriceRange — ช่วงราคาที่โชว์ลูกค้า (−5% ถึง +3%)", () => {
  it("ราคา 18,000 → ช่วง 17,100 – 18,600 (ปัดหลักร้อย)", () => {
    expect(calcPriceRange(18000)).toEqual({ min: 17100, max: 18600 });
  });
});

describe("formatPrice — รูปแบบที่แสดงผล", () => {
  it("18000 → ฿18,000", () => {
    expect(formatPrice(18000)).toBe("฿18,000");
  });
});
