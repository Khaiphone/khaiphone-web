// ── Push client (ฝั่ง browser) — ตัวกลางเดียวของทุก PWA ────────────────────────
// Web Push ผูกกับ "เครื่อง" ไม่ใช่การล็อกอิน:
//   เครื่องใหม่ → ต้อง subscribe ใหม่ (iOS ให้ขอสิทธิ์ได้เฉพาะจาก user gesture —
//     auto-attempt ใน useEffect ได้ "default" เงียบๆ → shell ต้องมีแถบให้แตะซ้ำ)
//   ล็อกเอาต์ → ต้องถอน subscription ของเครื่อง ก่อน auth.signOut() (การลบใช้ session)

import { saveSubscription, deleteSubscriptionByEndpoint, type PushApp } from "@/app/actions/push";

export type SubscribeResult = "subscribed" | "needs_gesture" | "denied" | "unsupported";

const RESUB_BEFORE_EXPIRY_MS = 7 * 24 * 3600 * 1000; // re-subscribe ถ้าจะหมดอายุใน 7 วัน

function vapidUint8(): Uint8Array | null {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return null;
  return Uint8Array.from(atob(vapidKey.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
}

/** ลงทะเบียน SW → ขอสิทธิ์ → subscribe → save ลง DB (พร้อม app tag)
 *  เรียกได้ทั้ง auto (ตอนเปิดแอพ) และจาก user gesture (แตะแถบ) — idempotent */
export async function subscribeDeviceToPush(app: PushApp): Promise<SubscribeResult> {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  const key = vapidUint8();
  if (!key) return "unsupported";

  try {
    const reg = await navigator.serviceWorker.register("/sw.js");

    let permission: NotificationPermission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    if (permission === "denied") return "denied";
    if (permission !== "granted") return "needs_gesture"; // iOS นอก gesture → "default" เงียบๆ

    let sub = await reg.pushManager.getSubscription();
    if (sub) {
      // VAPID key เปลี่ยน (หรืออ่านไม่ได้บน iOS) → ถอนแล้ว subscribe ใหม่
      const buf = sub.options.applicationServerKey;
      const sameKey = !!buf && (() => {
        const ex = new Uint8Array(buf);
        return ex.length === key.length && key.every((v, i) => v === ex[i]);
      })();
      // subscription จะหมดอายุใน 7 วัน → re-subscribe กันแจ้งเตือนหายเงียบๆ
      const expiringSoon = sub.expirationTime != null && sub.expirationTime - Date.now() < RESUB_BEFORE_EXPIRY_MS;
      if (!sameKey || expiringSoon) {
        await sub.unsubscribe().catch(() => {});
        sub = null;
      }
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key as BufferSource });
    }

    const json = sub.toJSON();
    if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
      await saveSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }, app });
      return "subscribed";
    }
    return "unsupported";
  } catch {
    // subscribe ล้มเหลว (มักเพราะไม่ได้มาจาก gesture) — ให้ shell โชว์แถบให้แตะซ้ำ
    return Notification.permission === "denied" ? "denied" : "needs_gesture";
  }
}

/** ถอน subscription ของเครื่องนี้ + ลบ row ใน DB — **ต้องเรียกก่อน auth.signOut()** */
export async function unsubscribeDeviceFromPush(): Promise<void> {
  try {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await deleteSubscriptionByEndpoint(sub.endpoint).catch(() => {}); // ลบ DB ก่อน (ใช้ session)
    await sub.unsubscribe().catch(() => {});
  } catch { /* best-effort — ห้ามบล็อกการล็อกเอาต์ */ }
}
