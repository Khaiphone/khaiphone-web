import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { createServerClient } from "@/lib/supabase-server";

// Called by navigator.sendBeacon() when rider PWA is closed/backgrounded.
// sendBeacon sends cookies automatically so requireAuth() works here.
export async function POST() {
  try {
    const user = await requireAuth();
    const supabase = createServerClient();
    await supabase
      .from("rider_locations")
      .update({ is_online: false, tracking_mode: "idle", updated_at: new Date().toISOString() })
      .eq("rider_id", user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
