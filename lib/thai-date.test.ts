import { describe, it, expect } from "vitest";
import {
  thaiDateStr,
  thaiDateOffset,
  thaiMonthStr,
  startOfThaiDay,
  startOfNextThaiMonth,
} from "@/lib/thai-date";

// นี่คือบั๊กที่เราเพิ่งแก้: new Date().toISOString() คืนวันที่ UTC เสมอ
// ช่วงเวลาไทย 00:00–07:00 น. UTC ยังเป็น "เมื่อวาน" → "วันนี้" เพี้ยนไป 1 วัน
// เทสต์ชุดนี้ "ล็อก" พฤติกรรมที่ถูกต้องไว้ ใครเผลอแก้กลับไปใช้ UTC จะ fail ทันที
describe("thaiDateStr — ต้องคืนวันที่ตามเวลาไทย (UTC+7) ไม่ใช่ UTC", () => {
  it("ตี 3 เวลาไทย (UTC ยังเป็นเมื่อวาน) → ต้องได้วันที่ของไทย", () => {
    // 2026-06-15 20:00 UTC = 2026-06-16 03:00 เวลาไทย
    expect(thaiDateStr(new Date("2026-06-15T20:00:00Z"))).toBe("2026-06-16");
  });

  it("เกือบเที่ยงคืนเวลาไทย → ยังเป็นวันเดิม", () => {
    // 2026-06-15 16:59 UTC = 2026-06-15 23:59 เวลาไทย
    expect(thaiDateStr(new Date("2026-06-15T16:59:00Z"))).toBe("2026-06-15");
  });

  it("thaiMonthStr คืน YYYY-MM ตามเวลาไทย", () => {
    expect(thaiMonthStr(new Date("2026-06-15T20:00:00Z"))).toBe("2026-06");
  });
});

describe("thaiDateOffset — บวก/ลบวันแบบไม่หลุดขอบเขต", () => {
  it("บวก 1 วัน", () => {
    expect(thaiDateOffset("2026-06-15", 1)).toBe("2026-06-16");
  });

  it("ลบ 30 วัน (ใช้ใน stats/ช่วงราคา)", () => {
    expect(thaiDateOffset("2026-06-15", -30)).toBe("2026-05-16");
  });

  it("ข้ามปี: ลบ 1 วันจาก 1 ม.ค.", () => {
    expect(thaiDateOffset("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("startOfThaiDay / startOfNextThaiMonth — ขอบเขตเวลาไทยสำหรับ query", () => {
  it("ต้นวันไทยมี +07:00 ติดมาด้วย", () => {
    expect(startOfThaiDay("2026-06-15")).toBe("2026-06-15T00:00:00+07:00");
  });

  it("ต้นเดือนถัดไป ข้ามปี (ธ.ค. → ม.ค.)", () => {
    expect(startOfNextThaiMonth("2026-12")).toBe("2027-01-01T00:00:00+07:00");
  });
});
