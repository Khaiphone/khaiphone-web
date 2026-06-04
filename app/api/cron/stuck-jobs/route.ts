import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { sendPushToOwners } from "@/app/actions/push";

// Called every 30 min. Alerts owner if any active job has been stuck in the same status too long.
const THRESHOLDS: Record<string, number> = {
  pickup_scheduled: 60,   // รับงานแล้วแต่ยังไม่ออก > 60 นาที
  en_route:         90,   // ออกเดินทางแต่ยังไม่ถึง > 90 นาที
  inspecting:       60,   // ตรวจเครื่องนานเกิน > 60 นาที
  price_negotiation: 120, // รอยืนยันราคา > 2 ชั่วโมง
  contracting:      60,   // ทำสัญญานาน > 60 นาที
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "") ?? req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const now = new Date();
  const cutoff = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // oldest possible: 1h ago

  const { data: requests } = await supabase
    .from("requests")
    .select("id, order_number, device_model, status, updated_at, rider_id")
    .in("status", Object.keys(THRESHOLDS))
    .lt("updated_at", cutoff);

  if (!requests?.length) return NextResponse.json({ checked: 0, alerts: 0 });

  let alerts = 0;
  for (const r of requests) {
    const thresholdMin = THRESHOLDS[r.status];
    if (!thresholdMin) continue;
    const minutesStuck = (now.getTime() - new Date(r.updated_at).getTime()) / 60_000;
    if (minutesStuck < thresholdMin) continue;

    const statusLabel: Record<string, string> = {
      pickup_scheduled:  "รับงานแล้วแต่ยังไม่ออกเดินทาง",
      en_route:          "ออกเดินทางแต่ยังไม่ถึง",
      inspecting:        "ตรวจเครื่องนานผิดปกติ",
      price_negotiation: "รอยืนยันราคานานเกิน",
      contracting:       "ทำสัญญานานผิดปกติ",
    };

    await sendPushToOwners({
      title: `⚠️ งานค้าง — ${r.order_number}`,
      body: `${r.device_model} · ${statusLabel[r.status]} (${Math.round(minutesStuck)} นาที)`,
      url: `/admin/requests/${r.id}`,
      tag: `stuck-${r.id}`,
    }).catch(console.error);

    alerts++;
  }

  return NextResponse.json({ checked: requests.length, alerts });
}
