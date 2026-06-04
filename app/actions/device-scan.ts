"use server";

import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/require-auth";

export async function scanDeviceInfo(
  base64Image: string
): Promise<{ imei?: string; serial?: string; error?: string }> {
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
            text: 'This is a screenshot of an iPhone Settings > General > About screen. Extract ONLY the IMEI (15-digit number) and Serial Number values. Return valid JSON only: {"imei":"...","serial":"..."}. Use null for any value not visible.',
          },
        ],
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) return { error: "อ่านข้อมูลไม่ได้ — ลองถ่ายใหม่ให้ชัดขึ้น" };

    const parsed = JSON.parse(match[0]);
    return {
      imei:   parsed.imei   && parsed.imei   !== "null" ? String(parsed.imei)   : undefined,
      serial: parsed.serial && parsed.serial !== "null" ? String(parsed.serial) : undefined,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

export type SickwResult = {
  device?: string;
  carrier?: string;
  carrierLock?: string;
  icloudStatus?: string;
  blacklist?: string;
  warrantyStatus?: string;
  warrantyDate?: string;
};

export async function checkSickw(
  imei: string
): Promise<{ success: boolean; data?: SickwResult; error?: string }> {
  await requireAuth();

  const apiKey   = process.env.SICKW_API_KEY;
  const serviceId = process.env.SICKW_SERVICE_ID;

  if (!apiKey)    return { success: false, error: "ยังไม่ได้ตั้งค่า SICKW_API_KEY" };
  if (!serviceId) return { success: false, error: "ยังไม่ได้ตั้งค่า SICKW_SERVICE_ID" };

  try {
    const url = `https://sickw.com/api.php?format=json&key=${encodeURIComponent(apiKey)}&imei=${encodeURIComponent(imei)}&service=${encodeURIComponent(serviceId)}`;
    const res  = await fetch(url, { next: { revalidate: 0 } });
    const json = await res.json();

    if (json.status === "error" || !json.result) {
      return { success: false, error: json.message ?? "ไม่พบข้อมูลจาก SICKW" };
    }

    const r = json.result as Record<string, string>;
    return {
      success: true,
      data: {
        device:        r.Device        ?? r.device        ?? r.Model ?? r.model,
        carrier:       r.Carrier       ?? r.carrier,
        carrierLock:   r.CarrierLock   ?? r.simlock        ?? r.sim_lock,
        icloudStatus:  r.iCloudStatus  ?? r.icloud_status  ?? r.iCloudLock ?? r.icloud,
        blacklist:     r.Blacklist      ?? r.blacklist,
        warrantyStatus:r.WarrantyStatus ?? r.warranty_status ?? r.warranty,
        warrantyDate:  r.WarrantyDate   ?? r.warranty_date,
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เชื่อมต่อ SICKW ไม่ได้" };
  }
}
