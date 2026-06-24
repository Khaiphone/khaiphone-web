"use client";

import { createContext, useContext } from "react";

// คุม prefetch ของ nav/sidebar: เปิดหลัง "หน้าจอแรกพร้อม" จริง (dashboard data render)
// ไม่ใช่แค่ layout ready — กัน RSC prefetch flood ตอน first-open
type NavReadyCtx = { navReady: boolean; markFirstScreenReady: () => void };

export const AdminNavReadyContext = createContext<NavReadyCtx>({
  navReady: true, // default true เผื่อ component ที่อยู่นอก provider (ไม่ให้พังการ prefetch ปกติ)
  markFirstScreenReady: () => {},
});

export function useAdminNavReady() {
  return useContext(AdminNavReadyContext);
}
