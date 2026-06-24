// instrumentation สำหรับ route guard — เปิดด้วย NEXT_PUBLIC_PERF=1 เท่านั้น
// log แค่ reason + from/target path (ไม่ใช่ข้อมูลผู้ใช้/ลูกค้า)
const ON = typeof process !== "undefined" && process.env.NEXT_PUBLIC_PERF === "1";

/** เรียกก่อน router.replace เพื่อ log/ตัดสินใจ; คืน true ถ้าควร redirect, false ถ้าควรข้าม
 * pathnameSensitive=true (route gating เช่น staff ไม่มีสิทธิ์หน้านี้) → ข้ามถ้าผู้ใช้ย้ายหน้าแล้ว
 * pathnameSensitive=false (auth ใช้ไม่ได้ทั้งแอป เช่นไม่มี session) → เด้งได้ทุกหน้า (ยกเว้น cancelled/อยู่ปลายทางแล้ว) */
export function shouldRedirect(opts: {
  reason: string;
  from: string;
  current: string;
  target: string;
  cancelled?: boolean;
  pathnameSensitive?: boolean;
}): boolean {
  const { reason, from, current, target, cancelled, pathnameSensitive = true } = opts;
  const moved = pathnameSensitive && current !== from;
  const already = current === target || current.startsWith(target + "/");
  const skip = !!cancelled || moved || already;
  if (ON) {
    // eslint-disable-next-line no-console
    console.log(`[guard] ${skip ? "SKIP" : "REDIRECT"} reason=${reason} from=${from} current=${current} → ${target}${cancelled ? " (cancelled)" : moved ? " (moved)" : already ? " (already-there)" : ""}`);
  }
  return !skip;
}
