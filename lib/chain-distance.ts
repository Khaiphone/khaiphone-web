// ── ระยะทางไรเดอร์จากเส้นทางงานจริง ─────────────────────────────────────────────
// ไรเดอร์ไม่เปิดแอพขณะขี่ (GPS ต่อเนื่องใช้ไม่ได้) → คำนวณจากงานที่ทำจริงแทน:
//   ปกติ:        ร้าน → งาน → ร้าน (ไป-กลับ ต่องานละรอบ)
//   ต่องาน:      งานที่มี direct_chain ใน status_log = ขี่ต่อไปงานถัดไปโดยไม่แวะร้าน
//                → ร้าน → งานA → งานB → ร้าน (ไม่นับขากลับร้านของ A)
// ระยะแต่ละขา: ใช้ระยะถนนจริงที่แคชไว้ (requests.distance_km) ก่อน
//              ไม่มี → haversine × ROAD_FACTOR (ค่าสัมประสิทธิ์ถนน)
// ทุกหน้าที่แสดงระยะทาง (ผลงานไรเดอร์/แอดมิน/leaderboard) ต้องเรียกที่นี่ที่เดียว

import { haversineKm, OFFICE_LAT, OFFICE_LNG } from "@/lib/geo-utils";

export const ROAD_FACTOR = 1.3;

export interface DistanceJob {
  status: string | null;
  lat: number | null;        // requests.appt_lat
  lng: number | null;        // requests.appt_lng
  distanceKm: number | null; // requests.distance_km — ระยะถนน ร้าน→งาน (ขาเดียว)
  statusLog: Array<{ status?: string | null; timestamp?: string | null }> | null;
}

/** งานถูกนับระยะเมื่อมีหลักฐานว่าเดินทางจริงเท่านั้น:
 *  completed นับเสมอ · cancelled/no_show/rejected นับเฉพาะเมื่อ log มี en_route/inspecting
 *  (ทีมงานชอบปิดงานเป็น no_show ทั้งที่ลูกค้ายกเลิกก่อนไรเดอร์ออกรถ) */
export function jobTravelled(job: DistanceJob): boolean {
  if (job.status === "completed") return true;
  return (job.statusLog ?? []).some(l => l.status === "en_route" || l.status === "inspecting");
}

function isChainedToNext(job: DistanceJob): boolean {
  return (job.statusLog ?? []).some(l => l.status === "direct_chain");
}

function hasPin(job: DistanceJob): boolean {
  return job.lat != null && job.lng != null;
}

/** เวลาเริ่มเดินทางของงาน (ใช้เรียงลำดับก่อนต่อ chain) */
function travelStart(job: DistanceJob): number {
  const l = (job.statusLog ?? []).find(x => x.status === "en_route" || x.status === "inspecting");
  const t = l?.timestamp ? Date.parse(l.timestamp) : NaN;
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

/** ระยะ ร้าน→งาน (ขาเดียว): ระยะถนนแคชก่อน → haversine×1.3 → null ถ้าไม่มีข้อมูลเลย */
function legOfficeKm(job: DistanceJob): number | null {
  if (job.distanceKm != null) return job.distanceKm;
  if (hasPin(job)) return haversineKm(OFFICE_LAT, OFFICE_LNG, job.lat!, job.lng!) * ROAD_FACTOR;
  return null;
}

/** รวมระยะทางจากรายการงาน (กรอง travelled + ต่อ chain ให้เอง)
 *  คืน travelledTrips ไว้ใช้เป็นตัวหารค่าเฉลี่ยระยะ/งาน (เที่ยวที่เดินทางจริง) */
export function chainDistanceKm(jobsIn: DistanceJob[]): { totalKm: number; travelledTrips: number } {
  const jobs = jobsIn.filter(jobTravelled).sort((a, b) => travelStart(a) - travelStart(b));
  let total = 0;

  let i = 0;
  while (i < jobs.length) {
    // สร้างลำดับงานที่ต่อกัน (chain ได้เฉพาะคู่ที่มีพิกัดทั้งสองฝั่ง — ไม่งั้นคำนวณขาเชื่อมไม่ได้)
    const seq: DistanceJob[] = [jobs[i]];
    while (
      isChainedToNext(seq[seq.length - 1]) &&
      i + seq.length < jobs.length &&
      hasPin(seq[seq.length - 1]) &&
      hasPin(jobs[i + seq.length])
    ) {
      seq.push(jobs[i + seq.length]);
    }

    if (seq.length === 1) {
      const leg = legOfficeKm(seq[0]);
      if (leg != null) total += leg * 2; // ไป-กลับร้าน (งานไม่มีหมุดแต่มี distance_km ก็เข้าเคสนี้)
    } else {
      const firstLeg = legOfficeKm(seq[0]) ?? 0;             // ร้าน → งานแรก
      const lastLeg  = legOfficeKm(seq[seq.length - 1]) ?? 0; // งานสุดท้าย → ร้าน
      let mid = 0;                                            // ขาเชื่อมระหว่างงาน (หมุด→หมุด)
      for (let k = 0; k < seq.length - 1; k++) {
        mid += haversineKm(seq[k].lat!, seq[k].lng!, seq[k + 1].lat!, seq[k + 1].lng!) * ROAD_FACTOR;
      }
      total += firstLeg + mid + lastLeg;
    }
    i += seq.length;
  }

  return { totalKm: Math.round(total * 10) / 10, travelledTrips: jobs.length };
}

/** map แถวจาก requests → DistanceJob (คอลัมน์ที่ต้อง select: status, appt_lat, appt_lng, distance_km, status_log) */
export function toDistanceJob(r: {
  status?: string | null; appt_lat?: number | null; appt_lng?: number | null;
  distance_km?: number | null; status_log?: unknown;
}): DistanceJob {
  return {
    status: r.status ?? null,
    lat: r.appt_lat ?? null,
    lng: r.appt_lng ?? null,
    distanceKm: r.distance_km ?? null,
    statusLog: Array.isArray(r.status_log) ? (r.status_log as DistanceJob["statusLog"]) : null,
  };
}
