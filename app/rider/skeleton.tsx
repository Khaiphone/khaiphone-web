const STYLE = `@keyframes rsk{0%,100%{opacity:.85}50%{opacity:.25}}`;
const BASE  = { background: "#2C2C2E", animation: "rsk 1.4s ease-in-out infinite" } as const;

export function Sk({ w = "100%", h = 16, r = 8, style }: {
  w?: string | number; h?: number; r?: number; style?: React.CSSProperties;
}) {
  return (
    <>
      <style>{STYLE}</style>
      <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...BASE, ...style }} />
    </>
  );
}
