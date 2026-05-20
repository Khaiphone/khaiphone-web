"use client";

import { REOPEN_EVENT } from "./CookieConsent";

export default function CookieReopenButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent(REOPEN_EVENT))}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "inherit",
        color: "inherit",
        textAlign: "left",
      }}
    >
      การตั้งค่าคุกกี้
    </button>
  );
}
