import { createClient } from "@supabase/supabase-js";
import type { RequestPatch } from "@/lib/request-patch";

const _client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
);

// patch เป็น optional + backward compatible: payload ยังมี id เสมอ
// ผู้ฟังที่รองรับ patch จะ merge ได้เลย ผู้ฟังเดิมก็ยัง fallback refetch ตาม id ได้
export async function broadcastRequestUpdate(requestId: string, patch?: RequestPatch) {
  try {
    await _client.channel("request-updates").send({
      type: "broadcast",
      event: "updated",
      payload: { id: requestId, patch: patch ?? null },
    });
  } catch {
    // non-critical — realtime is best-effort
  }
}
