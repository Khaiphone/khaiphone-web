"use client";

import { createContext, useContext } from "react";

// คุม prefetch + การดึงข้อมูล secondary ของ nav/sidebar: เปิดหลัง first screen พร้อม
type NavReadyCtx = { navReady: boolean; markFirstScreenReady: () => void };

export const StockNavReadyContext = createContext<NavReadyCtx>({
  navReady: true, // default true เผื่อ component นอก provider (prefetch ปกติ)
  markFirstScreenReady: () => {},
});

export function useStockNavReady() {
  return useContext(StockNavReadyContext);
}
