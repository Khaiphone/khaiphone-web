"use server";

import webpush from "web-push";
import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";

type PushPayload = { title: string; body: string; url?: string; tag?: string };
type SubRow = { endpoint: string; p256dh: string; auth: string };
// แอปปลายทางของการแจ้งเตือน — กันเด้งซ้ำข้ามแอป (owner ติดตั้งหลาย PWA, endpoint คนละตัว แต่ user เดียว)
export type PushApp = "admin" | "rider" | "stock";

function getWebPush() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("VAPID keys not configured");
  webpush.setVapidDetails("mailto:panupan@khaiphone.com", pub.replace(/=+$/, ""), priv.replace(/=+$/, ""));
  return webpush;
}

async function sendToSubs(subs: SubRow[], payload: PushPayload) {
  if (!subs.length) return;
  const wp = getWebPush();
  const results = await Promise.allSettled(
    subs.map((s) =>
      wp.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 86400, urgency: "high" },
      ),
    ),
  );
  const expired = results
    .map((r, i) => (r.status === "rejected" ? subs[i].endpoint : null))
    .filter(Boolean) as string[];
  if (expired.length) {
    const supabase = createServerClient();
    await supabase.from("push_subscriptions").delete().in("endpoint", expired);
  }
}

export async function saveSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userId?: string;
  app?: PushApp;
}) {
  const user = await requireAuth();
  const supabase = createServerClient();
  await supabase.from("push_subscriptions").upsert(
    {
      endpoint:  subscription.endpoint,
      p256dh:    subscription.keys.p256dh,
      auth:      subscription.keys.auth,
      user_id:   user.id,
      ...(subscription.app ? { app: subscription.app } : {}),
    },
    { onConflict: "endpoint" },
  );
}

export async function sendPushToAll(payload: PushPayload) {
  const supabase = createServerClient();
  const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (!subs?.length) return;
  await sendToSubs(subs, payload);
}

// Send to all owner subscriptions (+ legacy null user_id rows) — เฉพาะ subscription ของแอปปลายทาง
export async function sendPushToOwners(payload: PushPayload, app: PushApp = "admin") {
  const supabase = createServerClient();
  const { data: owners } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("role", "owner")
    .eq("active", true);
  const ownerIds = (owners ?? []).map((o: { user_id: string }) => o.user_id).filter(Boolean);

  // app ตรงแอป หรือ null (sub เก่ายังไม่ถูก tag — รับได้ระหว่างเปลี่ยนผ่าน)
  let query = supabase.from("push_subscriptions").select("endpoint, p256dh, auth").or(`app.eq.${app},app.is.null`);
  if (ownerIds.length) {
    query = query.or(`user_id.in.(${ownerIds.join(",")}),user_id.is.null`);
  } else {
    query = query.is("user_id", null);
  }
  const { data: subs } = await query;
  if (!subs?.length) return;
  await sendToSubs(subs, payload);
}

// Send to owners + staff who have the receive_new_requests permission — เฉพาะแอป admin
export async function sendPushToNewRequestReceivers(payload: PushPayload, app: PushApp = "admin") {
  const supabase = createServerClient();
  const { data: recipients } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("active", true)
    .or('role.eq.owner,permissions.cs.{"receive_new_requests"}');
  const recipientIds = (recipients ?? []).map((r: { user_id: string }) => r.user_id).filter(Boolean);

  // app ตรงแอป หรือ null (sub เก่ายังไม่ถูก tag — รับได้ระหว่างเปลี่ยนผ่าน)
  let query = supabase.from("push_subscriptions").select("endpoint, p256dh, auth").or(`app.eq.${app},app.is.null`);
  if (recipientIds.length) {
    query = query.or(`user_id.in.(${recipientIds.join(",")}),user_id.is.null`);
  } else {
    query = query.is("user_id", null);
  }
  const { data: subs } = await query;
  if (!subs?.length) return;
  await sendToSubs(subs, payload);
}

// Send to a specific user's subscriptions — เฉพาะ subscription ของแอปปลายทาง (rider/admin)
export async function sendPushToUser(userId: string, payload: PushPayload, app: PushApp) {
  const supabase = createServerClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId)
    .or(`app.eq.${app},app.is.null`); // app ตรงแอป หรือ null (sub เก่ายังไม่ถูก tag)
  if (!subs?.length) return;
  await sendToSubs(subs, payload);
}

// ทดสอบ: ส่งหาเครื่องของผู้กดเอง เฉพาะแอป admin (สะท้อนการ route จริง — ไม่เด้งข้ามแอป)
export async function sendTestPush(): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireAuth();
    await sendPushToUser(user.id, {
      title: "ทดสอบการแจ้งเตือน",
      body: "ระบบแจ้งเตือนทำงานปกติ ✓",
      url: "/admin/dashboard",
      tag: "test",
    }, "admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
