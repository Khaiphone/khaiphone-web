import { createClient } from "@supabase/supabase-js";

const _client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
);

export async function broadcastRequestUpdate(requestId: string) {
  try {
    await _client.channel("request-updates").send({
      type: "broadcast",
      event: "updated",
      payload: { id: requestId },
    });
  } catch {
    // non-critical — realtime is best-effort
  }
}
