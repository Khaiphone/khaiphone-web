"use server";

import webpush from "web-push";
import { createServerClient } from "@/lib/supabase-server";

type PushPayload = { title: string; body: string; url?: string; tag?: string };
type SubRow = { endpoint: string; p256dh: string; auth: string };

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
}) {
  const supabase = createServerClient();
  await supabase.from("push_subscriptions").upsert(
    {
      endpoint:  subscription.endpoint,
      p256dh:    subscription.keys.p256dh,
      auth:      subscription.keys.auth,
      user_id:   subscription.userId ?? null,
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

// Send to all owner subscriptions (+ legacy null user_id rows)
export async function sendPushToOwners(payload: PushPayload) {
  const supabase = createServerClient();
  const { data: owners } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("role", "owner")
    .eq("active", true);
  const ownerIds = (owners ?? []).map((o: { user_id: string }) => o.user_id).filter(Boolean);

  let query = supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (ownerIds.length) {
    query = query.or(`user_id.in.(${ownerIds.join(",")}),user_id.is.null`);
  } else {
    query = query.is("user_id", null);
  }
  const { data: subs } = await query;
  if (!subs?.length) return;
  await sendToSubs(subs, payload);
}

// Send to owners + staff who have the receive_new_requests permission
export async function sendPushToNewRequestReceivers(payload: PushPayload) {
  const supabase = createServerClient();
  const { data: recipients } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("active", true)
    .or('role.eq.owner,permissions.cs.{"receive_new_requests"}');
  const recipientIds = (recipients ?? []).map((r: { user_id: string }) => r.user_id).filter(Boolean);

  let query = supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (recipientIds.length) {
    query = query.or(`user_id.in.(${recipientIds.join(",")}),user_id.is.null`);
  } else {
    query = query.is("user_id", null);
  }
  const { data: subs } = await query;
  if (!subs?.length) return;
  await sendToSubs(subs, payload);
}

// Send to a specific user's subscriptions
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const supabase = createServerClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs?.length) return;
  await sendToSubs(subs, payload);
}

export async function sendTestPush(): Promise<{ ok: boolean; error?: string }> {
  try {
    await sendPushToAll({
      title: "ทดสอบการแจ้งเตือน",
      body: "ระบบแจ้งเตือนทำงานปกติ ✓",
      url: "/admin/dashboard",
      tag: "test",
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
