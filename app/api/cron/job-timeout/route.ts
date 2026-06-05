import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { broadcastRequestUpdate } from "@/lib/broadcast";

const ACCEPT_TIMEOUT_MINUTES = 10;

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: Request) {
  // Verify Vercel Cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminClient();
  const cutoff = new Date(Date.now() - ACCEPT_TIMEOUT_MINUTES * 60 * 1000).toISOString();

  // Find confirmed jobs assigned to a rider but not yet accepted (pickup_scheduled) within timeout
  const { data: timedOut } = await supabase
    .from("requests")
    .select("id, order_number, device_model, rider_id, status_log, assigned_at")
    .eq("status", "confirmed")
    .not("rider_id", "is", null)
    .lt("assigned_at", cutoff);

  if (!timedOut?.length) {
    return NextResponse.json({ reclaimed: 0 });
  }

  const now = new Date().toISOString();
  let reclaimed = 0;

  for (const job of timedOut) {
    const newLog = [
      ...(job.status_log ?? []),
      { status: "confirmed", timestamp: now, note: `ไม่รับงานภายใน ${ACCEPT_TIMEOUT_MINUTES} นาที — ระบบดึงงานกลับ` },
    ];

    const { data: updated } = await supabase
      .from("requests")
      .update({ rider_id: null, rider_name: null, assigned_at: null, status_log: newLog, updated_at: now })
      .eq("id", job.id)
      .eq("status", "confirmed")
      .not("rider_id", "is", null)
      .select("id");

    if (updated?.length) {
      reclaimed++;
      // Clear current_job_id from rider_locations if it points to this job
      await supabase
        .from("rider_locations")
        .update({ current_job_id: null, updated_at: now })
        .eq("rider_id", job.rider_id)
        .eq("current_job_id", job.id);

      await broadcastRequestUpdate(job.id).catch(console.error);
    }
  }

  console.log(`[cron/job-timeout] reclaimed ${reclaimed}/${timedOut.length} jobs`);
  return NextResponse.json({ reclaimed });
}
