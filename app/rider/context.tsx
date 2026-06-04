"use client";

import { createContext, useContext } from "react";

export interface RiderSessionCtx {
  userId: string;
  riderName: string;
  riderEmail: string;
  riderRole: string;
  isOnline: boolean;
  setIsOnline: (v: boolean) => void;
}

const RiderSessionContext = createContext<RiderSessionCtx>({
  userId: "", riderName: "", riderEmail: "", riderRole: "",
  isOnline: false, setIsOnline: () => {},
});

export function useRiderSession() { return useContext(RiderSessionContext); }
export { RiderSessionContext };
