const R = 6371; // Earth radius km

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }

export function etaMinutes(distKm: number, speedKmh = 30): number {
  return Math.ceil((distKm / speedKmh) * 60);
}

export function fmtDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} ม.`;
  return `${km.toFixed(1)} กม.`;
}

export function fmtEta(minutes: number): string {
  if (minutes < 60) return `~${minutes} นาที`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `~${h}ชม. ${m > 0 ? `${m}นาที` : ""}`;
}

// Office location — Khaiphone HQ
export const OFFICE_LAT = 14.0282;
export const OFFICE_LNG = 100.7497;

export function distanceToOfficeKm(lat: number, lng: number): number {
  return haversineKm(lat, lng, OFFICE_LAT, OFFICE_LNG);
}
