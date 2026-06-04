"use server";

import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/require-auth";

export async function scanDeviceInfo(
  base64Image: string
): Promise<{ serial?: string; error?: string }> {
  await requireAuth();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY not configured" };

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: base64Image },
          },
          {
            type: "text",
            text: 'This is a screenshot of an iPhone/iPad Settings > General > About screen (may be in English or Thai). Find the Serial Number (labeled "Serial Number" in English or "เลขประจำเครื่อง" in Thai) — it is a 10–12 character alphanumeric code like "F2LJH0X7XY" or "CG6WXV7CJP". Do NOT return the Model Number ("หมายเลขรุ่น" / "MYWV3KH/A" style). Return valid JSON only: {"serial":"..."}. Use null if not visible.',
          },
        ],
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) return { error: "อ่านข้อมูลไม่ได้ — ลองถ่ายใหม่ให้ชัดขึ้น" };

    const parsed = JSON.parse(match[0]);
    return {
      serial: parsed.serial && parsed.serial !== "null" ? String(parsed.serial) : undefined,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

export type SickwResult = {
  imei?: string;
  device?: string;
  color?: string;
  carrier?: string;
  carrierLock?: string;
  icloudStatus?: string;
  blacklist?: string;
  warrantyStatus?: string;
  warrantyDate?: string;
  rawText?: string;
};

function parseSickwText(raw: string): Record<string, string> {
  const map: Record<string, string> = {};
  const lines = raw.split(/<br\s*\/?>/i).flatMap(l => l.split(/\r?\n/));
  for (const line of lines) {
    const clean = line.replace(/<[^>]+>/g, "").trim();
    const idx = clean.indexOf(": ");
    if (idx > 0) {
      const key = clean.slice(0, idx).trim();
      const val = clean.slice(idx + 2).trim();
      if (key && val) map[key] = val;
    }
  }
  return map;
}

function parseShortDate(s: string): string | undefined {
  // "Ends on MM/DD/YY" or bare "MM/DD/YY" / "MM/DD/YYYY"
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return undefined;
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

export async function checkSickw(
  identifier: string  // accepts IMEI or Serial Number
): Promise<{ success: boolean; data?: SickwResult; error?: string }> {
  await requireAuth();

  const apiKey    = process.env.SICKW_API_KEY;
  const serviceId = process.env.SICKW_SERVICE_ID;

  if (!apiKey)    return { success: false, error: "ยังไม่ได้ตั้งค่า SICKW_API_KEY" };
  if (!serviceId) return { success: false, error: "ยังไม่ได้ตั้งค่า SICKW_SERVICE_ID" };

  try {
    const url = `https://sickw.com/api.php?format=json&key=${encodeURIComponent(apiKey)}&imei=${encodeURIComponent(identifier)}&service=${encodeURIComponent(serviceId)}`;
    const res  = await fetch(url, { next: { revalidate: 0 } });
    const json = await res.json();

    console.log("[SICKW]", identifier, JSON.stringify(json));

    if (json.status === "error" || !json.result) {
      const msg = json.message || json.result || json.error || json.status;
      return {
        success: false,
        error: typeof msg === "string" && msg ? msg : `SICKW ไม่พบข้อมูล (${identifier})`,
      };
    }

    // Service 72 returns result as plain text; other services may return an object
    const rawText: string = typeof json.result === "string"
      ? json.result.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim()
      : Object.entries(json.result as Record<string, string>)
          .map(([k, v]) => `${k}: ${v}`).join("\n");
    const r: Record<string, string> = typeof json.result === "string"
      ? parseSickwText(json.result)
      : json.result as Record<string, string>;

    // Extract color from "Device Configuration: SVC,MODEL,REGION,STORAGE,COLOR,..."
    const devConfig = r["Device Configuration"] ?? "";
    const configParts = devConfig.split(",");
    const colorFromConfig = configParts.length >= 5 ? configParts[4].trim() : undefined;

    const warrantyDate =
      parseShortDate(r["Coverage Duration"] ?? "") ??
      parseShortDate(r["Coverage End"] ?? "") ??
      r["WarrantyDate"] ?? r["warranty_date"];

    return {
      success: true,
      data: {
        imei:          r["IMEI"]          ?? r.IMEI   ?? r.Imei  ?? r.imei,
        device:        r["Device Configuration"] ?? r.Device ?? r.device ?? r.Model ?? r.model,
        color:         colorFromConfig    ?? r.Color  ?? r.color ?? r.Colour ?? r.colour,
        carrier:       r["Carrier"]       ?? r.Carrier ?? r.carrier,
        carrierLock:   r["Unlock Status"] ?? r["Sim-Lock"] ?? r.CarrierLock ?? r.simlock,
        icloudStatus:  ([r["iCloud Lock"], r["iCloud Status"]].filter(Boolean).join(" / ")) ||
                       (r.iCloudStatus ?? r.icloud_status ?? r.icloud),
        blacklist:     r["Blacklist"]     ?? r.blacklist,
        warrantyStatus: r["Limited Warranty"] ?? r.WarrantyStatus ?? r.warranty_status ?? r.warranty,
        warrantyDate,
        rawText,
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เชื่อมต่อ SICKW ไม่ได้" };
  }
}
