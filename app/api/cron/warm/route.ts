import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Keep-warm: ปลุก serverless instance + อุ่นการต่อ DB ไว้ระหว่างวัน
// เพื่อให้ "เปิดแอปครั้งแรกของวัน" ไม่เจอ cold start (เรียกโดย Vercel Cron)
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const t = Date.now();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  // query เบาๆ เพื่ออุ่น connection pool ไปยัง DB
  await supabase.from("admin_users").select("*", { count: "exact", head: true });

  return NextResponse.json({ ok: true, ms: Date.now() - t });
}
