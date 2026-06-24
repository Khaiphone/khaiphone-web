// Lightweight performance timing — เปิดด้วย env NEXT_PUBLIC_PERF=1 เท่านั้น
// ห้าม log ข้อมูลส่วนตัว (ชื่อ/เบอร์/ที่อยู่/payload คำขอ) — log แค่ label + ms
const PERF_ON =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_PERF === "1";

/** จับเวลาช่วงหนึ่ง: const end = perfStart("rider:bootstrap"); ... ; end(); */
export function perfStart(label: string): () => void {
  if (!PERF_ON) return () => {};
  const t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
  return () => {
    const ms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
    // eslint-disable-next-line no-console
    console.log(`[perf] ${label}: ${Math.round(ms)}ms`);
  };
}

/** ห่อ async ให้จับเวลาอัตโนมัติ */
export async function perfTimed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const end = perfStart(label);
  try {
    return await fn();
  } finally {
    end();
  }
}
