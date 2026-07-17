import { ipadShowsBatteryHealth } from "./ipad-model-info";

export type PricingOption = { label: string; sub?: string; ded: number };
export type PricingGroup  = { key: string; title: string; options: PricingOption[] };
export type PricingConfig = { storageMultiplier: number; floorPct: number; groups: PricingGroup[] };

// Returns iPhone-generation-specific labels with deductions from configOpts (DB).
// Returns null for non-iPhone — callers use configOpts directly.
export function getModelTypeOpts(model: string, configOpts: PricingOption[]): PricingOption[] | null {
  const ded0 = configOpts[0]?.ded ?? 0;
  const ded1 = configOpts[1]?.ded ?? -1500;
  const gen = parseInt(model.match(/iPhone (\d+)/)?.[1] ?? "0", 10);
  if (gen >= 14) {
    return [
      { label: "เครื่องศูนย์ไทย ZP/A", sub: "ราคาสูงสุด",   ded: ded0 },
      { label: "เครื่องนอก / ไม่ทราบ", sub: "ราคาเริ่มต้น", ded: ded1 },
    ];
  }
  if (gen >= 11) {
    return [
      { label: "เครื่องศูนย์ไทย TH/A", sub: "ราคาสูงสุด",   ded: ded0 },
      { label: "เครื่องนอก / ไม่ทราบ", sub: "ราคาเริ่มต้น", ded: ded1 },
    ];
  }
  // iPad / MacBook / Watch → use configOpts directly
  return null;
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  storageMultiplier: 0.12,
  floorPct: 0.60,
  groups: [
    {
      key: "model_type", title: "Model ของเครื่อง",
      options: [
        { label: "เครื่องศูนย์ไทย",       ded: 0     },
        { label: "เครื่องนอก / ไม่ทราบ", ded: -1500 },
      ],
    },
    {
      key: "warranty", title: "ประกัน",
      options: [
        { label: "ประกันเหลือมากกว่า 4 เดือน", ded: 0     },
        { label: "ประกันเหลือน้อยกว่า 4 เดือน", ded: -500  },
        { label: "การรับประกันสิ้นสุดแล้ว",       ded: -1000 },
      ],
    },
    {
      key: "body", title: "สภาพตัวเครื่อง",
      options: [
        { label: "ไม่มีรอยขีดข่วน",          sub: "สภาพสวยมาก", ded: 0     },
        { label: "มีรอยนิดหน่อย / รอยเคสกัด", sub: "สภาพดี",     ded: -500  },
        { label: "มีรอยมาก / กลอก / สีหลุด", sub: "สภาพพอใช้",  ded: -2000 },
        { label: "ตัวเครื่องมีรอยตก",        sub: "สภาพไม่ดี",  ded: -3500 },
        { label: "ฝาหลัง / กระจกหลังแตก",     sub: "สภาพเสีย",   ded: -5000 },
      ],
    },
    {
      key: "screen", title: "สภาพหน้าจอ",
      options: [
        { label: "หน้าจอไม่มีรอย",                 ded: 0     },
        { label: "หน้าจอมีรอยบางๆ",               ded: -300  },
        { label: "หน้าจอมีรอยขีดข่วน หรือ รอยสดุดบนจอ", ded: -1000 },
        { label: "หน้าจอแตก",                          ded: -3000 },
      ],
    },
    {
      key: "display", title: "การแสดงภาพหน้าจอ",
      options: [
        { label: "แสดงภาพหน้าจอปกติ",                    ded: 0     },
        { label: "จุด Bright / จุดดำในวง / ขอบออกเขียว", ded: -1500 },
        { label: "จุด Dead / จุดสี / ลายเส้น / จอปลอม",   ded: -3000 },
        { label: "หน้าจอไม่แสดงผล / จอดับ",               ded: -2000 },
      ],
    },
    {
      key: "battery", title: "สุขภาพแบตเตอรี่",
      options: [
        { label: "สุขภาพแบต 100%",                           ded: 0     },
        { label: "สุขภาพมากกว่า 90%",                        ded: -200  },
        { label: "สุขภาพแบต 85–90%",                         ded: -500  },
        { label: "สุขภาพแบต 80–84%",                         ded: -1000 },
        { label: "สุขภาพแบตต่ำกว่า 80% (Service Recommend)", ded: -2000 },
      ],
    },
    {
      key: "accessory", title: "อุปกรณ์เสริม",
      options: [
        { label: "มีกล่อง / อุปกรณ์ครบ",      ded: 0    },
        { label: "มีกล่อง / อุปกรณ์ไม่ครบ",   ded: -200 },
        { label: "มีอุปกรณ์ / ไม่มีกล่อง",    ded: -300 },
        { label: "ไม่มีกล่อง / ไม่มีอุปกรณ์", ded: -500 },
      ],
    },
    {
      key: "icloud", title: "iCloud / Activation Lock",
      options: [
        { label: "สามารถออก iCloud ได้",         sub: "ไม่ติด Activation Lock / ไม่ติดล็อค MDM หรือ ติดผ่อน", ded: 0     },
        { label: "ติด iCloud / Activation Lock", sub: "ไม่เข้าเงื่อนไขการรับซื้อ",       ded: -8000 },
      ],
    },
  ],
};

// ─── Category-aware option overrides ─────────────────────────────────────────
// แพทเทิร์นเดียวกับ getModelTypeOpts: คืน null = ใช้ configOpts เดิม (ค่า ded จาก DB ยังไหลผ่าน)

export type DeviceCategory = "iphone" | "ipad" | "macbook" | "watch";

export function getDeviceCategory(model: string): DeviceCategory {
  if (model.startsWith("iPad")) return "ipad";
  if (model.startsWith("MacBook") || model.startsWith("Mac mini") || model.startsWith("iMac")) return "macbook";
  if (model.includes("Apple Watch")) return "watch";
  return "iphone";
}

// iPad รุ่นเก่าดูเปอร์เซ็นต์แบตในเครื่องไม่ได้ → ถามเชิงคุณภาพ (รุ่นปี 2024+ ใช้ % เดิม)
export function getBatteryOpts(model: string, configOpts: PricingOption[]): PricingOption[] | null {
  if (getDeviceCategory(model) !== "ipad" || ipadShowsBatteryHealth(model)) return null;
  return [
    { label: "แบตเตอรี่ใช้งานได้ปกติ",    sub: "ใช้งานได้ทั้งวันตามปกติ",                 ded: configOpts[0]?.ded ?? 0 },
    { label: "แบตหมดเร็วผิดปกติ / เสื่อม", sub: "ต้องชาร์จบ่อยกว่าปกติมาก",                ded: configOpts[4]?.ded ?? -2000 },
    { label: "เคยเปลี่ยนแบตเตอรี่มาแล้ว",  sub: "เปลี่ยนจากศูนย์หรือร้านนอก",              ded: configOpts[3]?.ded ?? -1000 },
    { label: "ไม่แน่ใจ ให้ทางร้านตรวจสอบ", sub: "iPad รุ่นนี้ดูเปอร์เซ็นต์แบตในเครื่องไม่ได้", ded: configOpts[2]?.ded ?? -500 },
  ];
}

export function getBodyOpts(model: string, configOpts: PricingOption[]): PricingOption[] | null {
  return null; // iPad override มาใน commit ถัดไป
}

export function getICloudOpts(model: string, configOpts: PricingOption[]): PricingOption[] | null {
  return null; // iPad override มาใน commit ถัดไป
}

/** รวมทุก override ต่อรุ่น/ประเภทสินค้า — index ตรงกับ DEFAULT_PRICING_CONFIG.groups */
export function getEffectiveGroupOptions(model: string, groups: PricingOption[][]): PricingOption[][] {
  return [
    getModelTypeOpts(model, groups[0]) ?? groups[0],
    groups[1],
    getBodyOpts(model, groups[2]) ?? groups[2],
    groups[3],
    groups[4],
    getBatteryOpts(model, groups[5]) ?? groups[5],
    groups[6],
    getICloudOpts(model, groups[7]) ?? groups[7],
  ];
}
