// ── โซนรับซื้อถึงที่ (แบ่งตามเวลาเดินทางจากออฟฟิศ ไม่ใช่ระยะทางดิบ) ──
// แก้รายชื่อ/ค่าบริการที่นี่ที่เดียว (เฟสถัดไปย้ายไป DB config ได้)

export type PickupZone = "core" | "round" | "far";

// โซนหลัก — รับถึงที่ฟรี เต็มพื้นที่
export const CORE_FULL = ["กรุงเทพมหานคร", "นนทบุรี", "ปทุมธานี", "สมุทรปราการ"];
// โซนหลัก — ฟรี (บางพื้นที่ ทีมงานยืนยันอีกครั้ง)
export const CORE_PARTIAL = ["สมุทรสาคร", "นครปฐม", "พระนครศรีอยุธยา", "สระบุรี"];
// โซนเข้ารับเป็นรอบ — ค่าบริการตายตัว (บาท) หักจากยอดรับซื้อ
export const ROUND_FEE: Record<string, number> = { "ชลบุรี": 500, "ฉะเชิงเทรา": 300 };
// ความถี่รอบเข้ารับ (วัน)
export const ROUND_INTERVAL_DAYS = 3;

export interface ZoneInfo {
  zone: PickupZone;
  partial: boolean; // core แบบบางพื้นที่
  fee: number;      // ค่าบริการเข้ารับ (0 = ฟรี)
}

/** จำแนกโซนจากชื่อจังหวัด */
export function classifyZone(province: string): ZoneInfo {
  const p = normalizeProvince(province);
  if (CORE_FULL.includes(p))    return { zone: "core",  partial: false, fee: 0 };
  if (CORE_PARTIAL.includes(p)) return { zone: "core",  partial: true,  fee: 0 };
  if (p in ROUND_FEE)           return { zone: "round", partial: false, fee: ROUND_FEE[p] };
  return { zone: "far", partial: false, fee: 0 };
}

/** ตัดคำนำหน้า "จังหวัด " และช่องว่าง เพื่อจับคู่ให้แม่น */
export function normalizeProvince(province: string): string {
  return (province || "").replace(/^จังหวัด\s*/, "").trim();
}

/** ดึงชื่อจังหวัดจาก address_components ของ Google Geocoding */
export function extractProvince(
  components: Array<{ long_name: string; short_name?: string; types: string[] }> | undefined | null
): string | null {
  if (!components) return null;
  const c = components.find(x => x.types.includes("administrative_area_level_1"));
  return c ? normalizeProvince(c.long_name) : null;
}

// รายชื่อ 77 จังหวัด (สำหรับ dropdown — ครอบคลุมทุกพื้นที่)
export const ALL_PROVINCES = [
  "กรุงเทพมหานคร","กระบี่","กาญจนบุรี","กาฬสินธุ์","กำแพงเพชร","ขอนแก่น","จันทบุรี","ฉะเชิงเทรา",
  "ชลบุรี","ชัยนาท","ชัยภูมิ","ชุมพร","เชียงราย","เชียงใหม่","ตรัง","ตราด","ตาก","นครนายก",
  "นครปฐม","นครพนม","นครราชสีมา","นครศรีธรรมราช","นครสวรรค์","นนทบุรี","นราธิวาส","น่าน",
  "บึงกาฬ","บุรีรัมย์","ปทุมธานี","ประจวบคีรีขันธ์","ปราจีนบุรี","ปัตตานี","พระนครศรีอยุธยา",
  "พะเยา","พังงา","พัทลุง","พิจิตร","พิษณุโลก","เพชรบุรี","เพชรบูรณ์","แพร่","ภูเก็ต","มหาสารคาม",
  "มุกดาหาร","แม่ฮ่องสอน","ยโสธร","ยะลา","ร้อยเอ็ด","ระนอง","ระยอง","ราชบุรี","ลพบุรี","ลำปาง",
  "ลำพูน","เลย","ศรีสะเกษ","สกลนคร","สงขลา","สตูล","สมุทรปราการ","สมุทรสงคราม","สมุทรสาคร",
  "สระแก้ว","สระบุรี","สิงห์บุรี","สุโขทัย","สุพรรณบุรี","สุราษฎร์ธานี","สุรินทร์","หนองคาย",
  "หนองบัวลำภู","อ่างทอง","อำนาจเจริญ","อุดรธานี","อุตรดิตถ์","อุทัยธานี","อุบลราชธานี",
];

export interface ProvinceGroup { label: string; provinces: { value: string; label: string }[]; }

/** จัดกลุ่มจังหวัดสำหรับ dropdown */
export const PROVINCE_GROUPS: ProvinceGroup[] = [
  {
    label: "โซนบริการหลัก (รับถึงที่ฟรี)",
    provinces: [
      ...CORE_FULL.map(v => ({ value: v, label: v })),
      ...CORE_PARTIAL.map(v => ({ value: v, label: `${v} (บางพื้นที่)` })),
    ],
  },
  {
    label: "เข้ารับเป็นรอบ",
    provinces: Object.keys(ROUND_FEE).map(v => ({ value: v, label: v })),
  },
  {
    label: "พื้นที่อื่นๆ (ส่งพัสดุ)",
    provinces: ALL_PROVINCES
      .filter(v => !CORE_FULL.includes(v) && !CORE_PARTIAL.includes(v) && !(v in ROUND_FEE))
      .map(v => ({ value: v, label: v })),
  },
];
