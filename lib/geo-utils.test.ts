import { describe, it, expect } from "vitest";
import {
  haversineKm,
  etaMinutes,
  fmtDistance,
  fmtEta,
  distanceToOfficeKm,
  OFFICE_LAT,
  OFFICE_LNG,
} from "@/lib/geo-utils";

// ระยะทางใช้จ่ายงานให้ไรเดอร์ที่ใกล้สุด — คำนวณผิด = จ่ายงานผิดคน
describe("haversineKm — ระยะทางระหว่างพิกัด", () => {
  it("จุดเดียวกัน = 0 กม.", () => {
    expect(haversineKm(13.75, 100.5, 13.75, 100.5)).toBeCloseTo(0, 5);
  });

  it("ห่างกัน 1 องศาละติจูด ≈ 111 กม.", () => {
    expect(haversineKm(0, 0, 1, 0)).toBeCloseTo(111.19, 1);
  });

  it("อยู่ที่ออฟฟิศพอดี → ระยะ = 0", () => {
    expect(distanceToOfficeKm(OFFICE_LAT, OFFICE_LNG)).toBeCloseTo(0, 5);
  });
});

describe("etaMinutes — เวลาเดินทาง (ปัดขึ้น)", () => {
  it("15 กม. ที่ 30 กม./ชม. = 30 นาที", () => {
    expect(etaMinutes(15)).toBe(30);
  });

  it("ปัดขึ้นเสมอ (1 กม. = 2 นาที)", () => {
    expect(etaMinutes(1)).toBe(2);
  });

  it("กำหนดความเร็วเองได้ (5 กม. ที่ 60 = 5 นาที)", () => {
    expect(etaMinutes(5, 60)).toBe(5);
  });
});

describe("fmtDistance / fmtEta — รูปแบบที่แสดงไรเดอร์", () => {
  it("ต่ำกว่า 1 กม. → เป็นเมตร", () => {
    expect(fmtDistance(0.5)).toBe("500 ม.");
  });

  it("ตั้งแต่ 1 กม. → ทศนิยม 1 ตำแหน่ง", () => {
    expect(fmtDistance(2.345)).toBe("2.3 กม.");
  });

  it("ต่ำกว่า 60 นาที", () => {
    expect(fmtEta(45)).toBe("~45 นาที");
  });

  it("เกิน 1 ชม.", () => {
    expect(fmtEta(90)).toBe("~1ชม. 30นาที");
  });
});
