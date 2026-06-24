"use client";

import { createContext, useContext } from "react";

// คุม prefetch ของ nav + เป็นสัญญาณ "หน้าจอแรกพร้อม" (home data render) ให้ splash fade
// หน้า home เป็นคนเรียก markFirstScreenReady แบบ cache-first (revisit = instant) เหมือน admin
type NavReadyCtx = { navReady: boolean; markFirstScreenReady: () => void };

export const RiderNavReadyContext = createContext<NavReadyCtx>({
  navReady: true, // default true เผื่อ component นอก provider (ไม่บล็อก prefetch ปกติ)
  markFirstScreenReady: () => {},
});

export function useRiderNavReady() {
  return useContext(RiderNavReadyContext);
}
