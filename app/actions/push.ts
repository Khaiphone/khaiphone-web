"use server";

import webpush from "web-push";
import { createServerClient } from "@/lib/supabase-server";

function getWebPush() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("VAPID keys not configured");
  webpush.setVapidDetails("mailto:panupan@khaiphone.com", pub, priv);
  return webpush;
}

export async function saveSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("push_subscriptions").upsert(
    {
      endpoint:  subscription.endpoint,
      p256dh:    subscription.keys.p256dh,
      auth:      subscription.keys.auth,
      user_id:   user?.id ?? null,
    },
    { onConflict: "endpoint" },
  );
}

export async function sendPushToAll(payload: {
  title: string;
  body:  string;
  url?:  string;
  tag?:  string;
}) {
  const supabase = createServerClient();
  const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (!subs?.length) return;

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

  // Remove expired/invalid subscriptions
  const expired = results
    .map((r, i) => (r.status === "rejected" ? subs[i].endpoint : null))
    .filter(Boolean) as string[];

  if (expired.length) {
    await supabase.from("push_subscriptions").delete().in("endpoint", expired);
  }
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
