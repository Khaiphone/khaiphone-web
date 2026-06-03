"use client";

import { useContext } from "react";
import { Ctx } from "@/app/rider/theme";

const STYLE = `@keyframes rsk{0%,100%{opacity:.85}50%{opacity:.25}}`;

export function Sk({ w = "100%", h = 16, r = 8, style }: {
  w?: string | number; h?: number; r?: number; style?: React.CSSProperties;
}) {
  const theme = useContext(Ctx);
  const color = theme?.CARD_SKEL ?? "#2C2C2E";
  return (
    <>
      <style>{STYLE}</style>
      <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0, background: color, animation: "rsk 1.4s ease-in-out infinite", ...style }} />
    </>
  );
}
