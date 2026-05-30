export type StockStatus =
  | "รอตรวจ"
  | "พร้อมขาย"
  | "ลงขายแล้ว"
  | "จองแล้ว"
  | "ขายแล้ว"
  | "ส่งคืน"
  | "ตีกลับ/ไม่รับซื้อ";

export type StockGrade = "A" | "A-" | "B+" | "B" | "B-" | "C";

export type SourceChannel =
  | "หน้าร้าน"
  | "เว็บไซต์"
  | "LINE OA"
  | "Facebook"
  | "Shopee"
  | "โทรศัพท์";

export type PhysicalCondition = string;

export interface PhysicalCheck {
  label: string;
  condition: PhysicalCondition;
}

export interface StatusLog {
  status: StockStatus;
  timestamp: string;
  note: string;
  by: string;
}

export interface StockNote {
  text: string;
  createdAt: string;
  by: string;
}

export interface AuditEntry {
  action: string;
  detail: string;
  timestamp: string;
  by: string;
}

export interface StockItem {
  id: string;
  model: string;
  storage: string;
  color: string;
  imei: string;
  serial: string;
  grade: StockGrade;
  batteryHealth: number;
  cycleCount: number;
  icloudStatus: string;
  carrierLock: string;
  accessories: string;
  physicalChecks?: PhysicalCheck[];

  costPrice: number;
  shippingCost: number;
  otherCost: number;
  sellingPrice: number;

  status: StockStatus;
  sourceChannel: SourceChannel;
  requestRef?: string;
  sellerName: string;
  sellerPhone: string;
  receivedAt: string;
  inspector: string;

  photos: string[];
  documents?: string[];
  notes: StockNote[];
  statusLog: StatusLog[];
  auditLog?: AuditEntry[];

  soldAt?: string;
  soldPrice?: number;
  buyerName?: string;
  buyerPhone?: string;
  soldBy?: string;
  saleType?: string;
  partnerName?: string;
  deliveryChannel?: string;
  deliveryStatus?: string;
  trackingNumber?: string;
  deliveryAddress?: string;

  // Original values captured by field staff during inspection — used for cross-checking
  inspectionSnapshot?: {
    imei:    string | null;
    serial:  string | null;
    model:   string | null;
    storage: string | null;
    color:   string | null;
    source:  string;
    result?: string;
    batteryHealth?: number;
    batteryCycles?: number;
    criteria?: { label: string; stated: string; actual: string; pass: boolean }[];
    functionalTests?: { label: string; pass: boolean }[];
    issues?: string[];
  };
}

export interface StockMetrics {
  totalValue: number;
  totalCount: number;
  estimatedProfit: number;
  readyToSell: number;
  inspecting: number;
  soldToday: number;
}

// For Add Stock Wizard
export interface AddStockForm {
  model: string;
  storage: string;
  color: string;
  imei: string;
  serial: string;
  grade: StockGrade | "";
  batteryHealth: string;
  cycleCount: string;
  icloudStatus: string;
  carrierLock: string;
  accessories: string;
  physicalChecks: PhysicalCheck[];
  requestRef: string;
  sellerName: string;
  sellerPhone: string;
  sourceChannel: SourceChannel | "";
  receiveMethod: string;
  costPrice: string;
  shippingCost: string;
  otherCost: string;
  sellingPrice: string;
  photos: File[];
}
