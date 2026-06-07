"use client";

import { createContext, useContext } from "react";

export interface RiderSessionCtx {
  userId: string;
  riderName: string;
  riderEmail: string;
  riderRole: string;
  avatarUrl: string | null;
  setAvatarUrl: (v: string | null) => void;
  isOnline: boolean;
  setIsOnline: (v: boolean) => void;
}

const RiderSessionContext = createContext<RiderSessionCtx>({
  userId: "", riderName: "", riderEmail: "", riderRole: "",
  avatarUrl: null, setAvatarUrl: () => {},
  isOnline: false, setIsOnline: () => {},
});

export function useRiderSession() { return useContext(RiderSessionContext); }
export { RiderSessionContext };
