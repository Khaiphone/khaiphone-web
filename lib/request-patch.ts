import type { RequestStatus, AdminRequest } from "@/lib/types/admin";

// แพตช์ของคำขอ — ฟิลด์ที่ "ปลอดภัยพอจะ broadcast" ให้ UI admin/rider อัปเดตเองโดยไม่ refetch
// ห้ามใส่ข้อมูลลูกค้าละเอียด/เอกสาร PDPA/signed URL ที่อ่อนไหว — ใส่เฉพาะสถานะงาน
export type RequestPatch = {
  id: string;
  status?: RequestStatus;
  updated_at?: string | null;
  rider_id?: string | null;
  rider_name?: string | null;
  assigned_at?: string | null;
  actual_price?: number | null;
  payment_slip_url?: string | null;
  contract_signed_at?: string | null;
  return_submitted_at?: string | null;
  returned_to_office_at?: string | null;
  stock_item_id?: string | null;
  stock_status?: string | null;
  sell_price?: number | null;
};

const PATCH_FIELDS = [
  "status", "updated_at", "rider_id", "rider_name", "assigned_at", "actual_price",
  "payment_slip_url", "contract_signed_at", "return_submitted_at",
  "returned_to_office_at", "stock_item_id", "stock_status", "sell_price",
] as const;

/** ดึงเฉพาะฟิลด์ patch จาก DB row (snake_case) → ใช้ broadcast/return จาก server action */
export function buildRequestPatch(id: string, row: Record<string, unknown>): RequestPatch {
  const patch: RequestPatch = { id };
  for (const f of PATCH_FIELDS) {
    const v = row[f];
    if (v !== undefined) (patch as Record<string, unknown>)[f] = v;
  }
  return patch;
}

/** merge patch (snake_case) เข้า AdminRequest (camelCase) — ใช้ฝั่ง client อัปเดต UI โดยไม่ refetch */
export function applyRequestPatch(req: AdminRequest, patch: RequestPatch): AdminRequest {
  if (patch.id !== req.id) return req;
  const next: AdminRequest = { ...req };
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.rider_id !== undefined) next.riderId = patch.rider_id;
  if (patch.rider_name !== undefined) next.riderName = patch.rider_name;
  if (patch.return_submitted_at !== undefined) next.returnSubmittedAt = patch.return_submitted_at;
  if (patch.returned_to_office_at !== undefined) next.returnedToOfficeAt = patch.returned_to_office_at;
  if (patch.stock_item_id !== undefined) next.stockItemId = patch.stock_item_id;
  if (patch.actual_price !== undefined) {
    next.device = { ...req.device, actualPrice: patch.actual_price ?? undefined };
  }
  if (patch.payment_slip_url !== undefined || patch.contract_signed_at !== undefined) {
    next.payment = {
      ...req.payment,
      ...(patch.payment_slip_url !== undefined ? { slipUrl: patch.payment_slip_url ?? undefined } : {}),
      ...(patch.contract_signed_at !== undefined ? { contractSignedAt: patch.contract_signed_at ?? undefined } : {}),
    };
  }
  return next;
}
