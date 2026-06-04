export type RequestStatus =
  | "new"
  | "pending"
  | "inspecting"
  | "confirmed"
  | "pickup_scheduled"
  | "en_route"
  | "price_negotiation"
  | "contracting"
  | "awaiting_transfer"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rejected";

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new:               "คำขอใหม่",
  pending:           "รอตรวจสอบ",
  inspecting:        "กำลังตรวจเครื่อง",
  confirmed:         "ยืนยันนัดหมาย",
  pickup_scheduled:  "นัดรับเครื่อง",
  en_route:          "ไรเดอร์กำลังเดินทาง",
  price_negotiation: "รอยืนยันราคา",
  contracting:       "กำลังทำสัญญา",
  awaiting_transfer: "รอโอนเงิน",
  completed:         "เสร็จสิ้น",
  cancelled:         "ยกเลิก",
  no_show:           "ลูกค้าไม่อยู่",
  rejected:          "ไม่เข้าเงื่อนไข",
};

export const STATUS_COLORS: Record<RequestStatus, { bg: string; text: string; border: string }> = {
  new:               { bg: "rgba(245,158,11,0.15)",  text: "#F59E0B", border: "rgba(245,158,11,0.3)"  },
  pending:           { bg: "rgba(59,130,246,0.15)",  text: "#3B82F6", border: "rgba(59,130,246,0.3)"  },
  inspecting:        { bg: "rgba(249,115,22,0.15)",  text: "#F97316", border: "rgba(249,115,22,0.3)"  },
  confirmed:         { bg: "rgba(139,92,246,0.15)",  text: "#8B5CF6", border: "rgba(139,92,246,0.3)"  },
  pickup_scheduled:  { bg: "rgba(6,182,212,0.15)",   text: "#06B6D4", border: "rgba(6,182,212,0.3)"   },
  en_route:          { bg: "rgba(234,179,8,0.15)",   text: "#EAB308", border: "rgba(234,179,8,0.3)"   },
  price_negotiation: { bg: "rgba(245,158,11,0.15)",  text: "#F59E0B", border: "rgba(245,158,11,0.3)"  },
  contracting:       { bg: "rgba(79,70,229,0.15)",   text: "#4F46E5", border: "rgba(79,70,229,0.3)"   },
  awaiting_transfer: { bg: "rgba(59,130,246,0.15)",  text: "#3B82F6", border: "rgba(59,130,246,0.3)"  },
  completed:         { bg: "rgba(16,185,129,0.15)",  text: "#10B981", border: "rgba(16,185,129,0.3)"  },
  cancelled:         { bg: "rgba(239,68,68,0.15)",   text: "#EF4444", border: "rgba(239,68,68,0.3)"   },
  no_show:           { bg: "rgba(249,115,22,0.15)",  text: "#F97316", border: "rgba(249,115,22,0.3)"  },
  rejected:          { bg: "rgba(107,114,128,0.15)", text: "#6B7280", border: "rgba(107,114,128,0.3)" },
};

export type SellMethod = "branch" | "rider" | "parcel";
export type PayMethod  = "cash"   | "transfer";
export type NotificationType = "new_request" | "status_change" | "appointment" | "system";
export type InspectionResult = "matched" | "adjusted" | "rejected";

export interface InspectionCriterion {
  label: string;
  stated: string;
  actual: string;
  pass: boolean;
}

export interface FunctionalTest {
  label: string;
  pass: boolean;
  note?: string;
}

export interface ExtraDeviceInspection {
  model: string;
  storage: string;
  originalPrice: number;
  actualPrice: number;
  result: InspectionResult;
  criteria: InspectionCriterion[];
  issues: string[];
  photos: string[];
  functionalTests?: FunctionalTest[];
  imei?: string;
  serial?: string;
  color?: string;
}

export interface InspectionData {
  arrivedAt?: string;
  arrivedPhotoUrl?: string;
  inspectedAt: string;
  result: InspectionResult;
  criteria: InspectionCriterion[];
  issues: string[];
  photos: string[];
  originalPrice: number;
  actualPrice: number;
  priceReason: string;
  negotiationResponse: "accepted" | "rejected" | null;
  negotiationRespondedAt: string | null;
  negotiationRespondedBy: "customer" | "staff" | null;
  functionalTests?: FunctionalTest[];
  imei?: string;
  serial?: string;
  warrantyExpiry?: string;
  batteryCycles?: number;
  batteryHealth?: number;
  extraInspections?: ExtraDeviceInspection[];
}

export interface AdminRequest {
  id: string;
  orderNumber: string;
  status: RequestStatus;
  createdAt: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    lineId?: string;
    address?: string;
  };
  device: {
    model: string;
    storage: string;
    color?: string;
    condition: string;
    estimatedPrice: number;
    actualPrice?: number;
    priceRange: string;
    conditionDetails?: string[];
    selections?: Record<string, string>;
  };
  appointment: {
    date: string;
    time: string;
    location: string;
    method: SellMethod;
  };
  payment: {
    method: PayMethod;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    slipUrl?: string;
    contractSignedAt?: string;
  };
  customerNotes?: string;
  extraDevices?: Array<{
    model: string;
    storage: string;
    estimatedPrice: number;
    details: Array<{ title: string; value: string }>;
  }>;
  notes: Array<{
    text: string;
    createdAt: string;
    author: string;
    showToCustomer?: boolean;
  }>;
  statusLog: Array<{
    status: string;
    timestamp: string;
    note: string;
  }>;
  inspection?: InspectionData;
  source: "website" | "line" | "facebook" | "phone";
  contractUrl?: string;
  receiptUrl?: string;
  assignedTo?: string | null;
  assignedToName?: string | null;
  riderId?: string | null;
  riderName?: string | null;
  distanceKm?: number | null;
}

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  requestId?: string;
  requestNumber?: string;
  read: boolean;
  createdAt: string;
}
