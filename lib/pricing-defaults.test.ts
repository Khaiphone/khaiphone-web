import { describe, it, expect } from "vitest";
import { getEffectiveGroupOptions, getDeviceCategory, DEFAULT_PRICING_CONFIG } from "./pricing-defaults";
import { getIpadSubtitle, lookupIpadByANumber, ipadShowsBatteryHealth } from "./ipad-model-info";
import { ipads } from "./products";

const groups = DEFAULT_PRICING_CONFIG.groups.map(g => g.options);

describe("getDeviceCategory", () => {
  it("แยกประเภทจากชื่อรุ่น", () => {
    expect(getDeviceCategory("iPhone 15 Pro")).toBe("iphone");
    expect(getDeviceCategory('iPad Pro 11" M1 (Wi-Fi)')).toBe("ipad");
    expect(getDeviceCategory('MacBook Air 13" M2 8GB')).toBe("macbook");
    expect(getDeviceCategory("Apple Watch Series 9")).toBe("watch");
  });
});

describe("getEffectiveGroupOptions — iPhone ไม่เปลี่ยน", () => {
  it("groups[1..7] เป็น reference เดิมทุกตัว", () => {
    const eff = getEffectiveGroupOptions("iPhone 13", groups);
    for (let i = 1; i < 8; i++) expect(eff[i]).toBe(groups[i]);
  });
});

describe("getEffectiveGroupOptions — iPad", () => {
  it("รุ่นเก่า (M1) ได้แบตเชิงคุณภาพ 4 ตัวเลือก ded มาจาก config", () => {
    const eff = getEffectiveGroupOptions('iPad Pro 11" M1 (Wi-Fi)', groups);
    expect(eff[5]).toHaveLength(4);
    expect(eff[5][0].ded).toBe(groups[5][0].ded);
    expect(eff[5][1].ded).toBe(groups[5][4].ded); // หมดเร็ว = ช่อง <80%
    expect(eff[5].some(o => o.label.includes("%"))).toBe(false);
  });

  it("รุ่นใหม่ (Air 7) ใช้แบต % เดิม", () => {
    const eff = getEffectiveGroupOptions('iPad Air 7 11" (Wi-Fi)', groups);
    expect(eff[5]).toBe(groups[5]);
  });

  it("body index 4 เป็นเครื่องงอ ded เดิม, sub เดิม", () => {
    const eff = getEffectiveGroupOptions("iPad Gen 9 (Wi-Fi)", groups);
    expect(eff[2][4].label).toContain("งอ");
    expect(eff[2][4].ded).toBe(groups[2][4].ded);
    expect(eff[2][4].sub).toBe(groups[2][4].sub);
    expect(eff[2].slice(0, 4)).toEqual(groups[2].slice(0, 4));
  });

  it("iCloud มี 3 ตัวเลือก — MDM ded เท่าติด iCloud", () => {
    const eff = getEffectiveGroupOptions("iPad mini 6 (Wi-Fi)", groups);
    expect(eff[7]).toHaveLength(3);
    expect(eff[7][2].label).toContain("MDM");
    expect(eff[7][2].ded).toBe(groups[7][1].ded);
  });
});

describe("ipad-model-info", () => {
  it("ทุกรุ่นใน catalog มี subtitle", () => {
    for (const p of ipads) expect(getIpadSubtitle(p.model), p.model).toBeTruthy();
  });

  it("lookup A-number คืนชื่อที่มีจริงใน catalog", () => {
    const names = new Set(ipads.map(p => p.model));
    expect(lookupIpadByANumber("a2377")?.model).toBe('iPad Pro 11" M1 (Wi-Fi)');
    expect(names.has(lookupIpadByANumber("A2604")!.model)).toBe(true);
    expect(lookupIpadByANumber("A9999")).toBeNull();
    expect(lookupIpadByANumber("iphone")).toBeNull();
  });

  it("battery health เฉพาะรุ่นปี 2024+", () => {
    expect(ipadShowsBatteryHealth('iPad Pro 11" M4 (Wi-Fi)')).toBe(true);
    expect(ipadShowsBatteryHealth('iPad Pro 11" M2 (Wi-Fi)')).toBe(false);
    expect(ipadShowsBatteryHealth("iPhone 15 Pro")).toBe(false);
  });
});
