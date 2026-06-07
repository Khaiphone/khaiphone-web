const BKK = "Asia/Bangkok";

/** "YYYY-MM-DD" in Bangkok timezone */
export function thaiDateStr(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BKK }).format(d);
}

/** "YYYY-MM" in Bangkok timezone */
export function thaiMonthStr(d: Date = new Date()): string {
  return thaiDateStr(d).slice(0, 7);
}

/** ISO boundary for start of a Bangkok day: "YYYY-MM-DDT00:00:00+07:00" */
export function startOfThaiDay(dateStr: string): string {
  return `${dateStr}T00:00:00+07:00`;
}

/** ISO boundary for end of a Bangkok day: "YYYY-MM-DDT23:59:59+07:00" */
export function endOfThaiDay(dateStr: string): string {
  return `${dateStr}T23:59:59+07:00`;
}

/** ISO start of a Bangkok month from "YYYY-MM" */
export function startOfThaiMonth(ym: string): string {
  return `${ym}-01T00:00:00+07:00`;
}

/** ISO start of the next Bangkok month from "YYYY-MM" */
export function startOfNextThaiMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  return `${nextY}-${String(nextM).padStart(2, "0")}-01T00:00:00+07:00`;
}

/**
 * Bangkok date N days before/after a reference date string "YYYY-MM-DD".
 * Uses noon Bangkok time to avoid DST/midnight edge cases.
 */
export function thaiDateOffset(dateStr: string, days: number): string {
  return thaiDateStr(new Date(new Date(`${dateStr}T12:00:00+07:00`).getTime() + days * 86_400_000));
}

/** Format ISO timestamp as Thai long date ("1 มิถุนายน 2569") */
export function formatThaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    timeZone: BKK, year: "numeric", month: "long", day: "numeric",
  });
}

/** Format ISO timestamp as Thai short time ("13:30") */
export function formatThaiTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("th-TH", {
    timeZone: BKK, hour: "2-digit", minute: "2-digit",
  });
}
