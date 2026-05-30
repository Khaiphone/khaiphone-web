"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, ExternalLink, Camera } from "lucide-react";
import { fetchRequest, saveContractUrls, updateStatus, markContractSigned, savePaymentSlip } from "@/app/actions/admin-requests";
import { fetchAdminUsers } from "@/app/actions/admin-users";
import type { AdminUserRow } from "@/app/actions/admin-users";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compress-image";
import { validateImageFile } from "@/lib/validate-file";
import type { AdminRequest } from "@/lib/types/admin";

const BG     = "#F5F5F7";
const CARD   = "#FFFFFF";
const BORDER = "#E5E5E5";
const TEXT   = "#111111";
const TEXT2  = "#666666";
const DARK   = "#1a1a2e";

const FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">';

const DOC_CSS = '*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Sarabun",sans-serif;max-width:780px;margin:0 auto;font-size:11px;color:#1a1a1a;line-height:1.6;background:#fff}.header{background:linear-gradient(135deg,#1a1a2e,#2a2a4e);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}.logo-area{display:flex;align-items:center;gap:10px;min-width:160px}.logo-circle{width:44px;height:44px;background:#c9a84c;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}.logo-inner{font-size:7.5px;font-weight:800;color:#1a1a2e;text-align:center;line-height:1.3}.logo-name{color:#FFD700;font-size:14px;font-weight:800}.logo-sub{color:rgba(255,255,255,.6);font-size:9px;margin-top:1px}.title-center{text-align:center;flex:1}.title-center h1{color:#FFD700;font-size:15px;font-weight:800}.title-center .between{color:rgba(255,255,255,.8);font-size:11px;margin-top:3px}.cno-box{background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.35);border-radius:8px;padding:9px 13px;text-align:right;min-width:160px}.cno-label{color:rgba(255,255,255,.5);font-size:8.5px;text-transform:uppercase;letter-spacing:.5px}.cno-value{color:#FFD700;font-size:15px;font-weight:800;font-family:monospace;letter-spacing:.5px;margin:2px 0}.cno-date{color:rgba(255,255,255,.65);font-size:10px}.content{padding:14px 20px}.top3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}.icard{border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}.icard-hd{background:#f5f4f0;padding:7px 11px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:700;color:#333}.hd-num{width:18px;height:18px;border-radius:5px;background:#1a1a2e;color:#FFD700;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}.icard-body{padding:9px 11px;font-size:10.5px}.f{display:flex;flex-direction:column;margin-bottom:4px}.fl{font-size:9px;color:#aaa;text-transform:uppercase;letter-spacing:.4px}.fv{font-size:11px;font-weight:500;color:#1a1a1a;border-bottom:1px solid #f0f0f0;padding-bottom:2px;min-height:16px}.shop-row{display:flex;align-items:flex-start;gap:5px;font-size:10px;color:#555;margin-bottom:3px}.price-big{font-size:28px;font-weight:800;color:#c9a84c;font-family:monospace;text-align:center;padding:5px 0;line-height:1}.price-label{font-size:9px;color:#aaa;text-align:center;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}.price-words{font-size:10px;color:#666;text-align:center;margin-bottom:7px;line-height:1.4}.pay-badge{display:inline-flex;align-items:center;gap:4px;background:#f0fdf4;border:1px solid #86efac;border-radius:4px;padding:3px 8px;font-size:10px;font-weight:600;color:#15803d;margin-bottom:6px}.sec{font-size:10px;font-weight:700;color:#1a1a2e;border-left:3px solid #c9a84c;padding-left:8px;margin:12px 0 7px;text-transform:uppercase;letter-spacing:.5px}.dtable{width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:10px}.dtable th{background:#1a1a2e;color:#FFD700;padding:6px 9px;text-align:left;font-weight:600;font-size:9.5px}.dtable td{padding:5px 9px;border-bottom:1px solid #f0f0f0;vertical-align:top}.dtable tr:nth-child(even) td{background:#fafafa}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:10px}.terms-ol{counter-reset:tc;list-style:none;padding:0;margin:0 0 8px}.terms-ol li{counter-increment:tc;padding:4px 0 4px 22px;position:relative;font-size:10.5px;border-bottom:1px solid #f8f8f8;line-height:1.5}.terms-ol li::before{content:counter(tc)".";position:absolute;left:0;top:4px;font-weight:700;color:#c9a84c}.check-list{list-style:none;padding:0;margin:0}.check-list li{padding:2px 0 2px 14px;position:relative;font-size:10.5px}.check-list li::before{content:"•";position:absolute;left:0;color:#c9a84c;font-weight:700}.pdpa-box{background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:10px 13px;font-size:10.5px}.pdpa-title{font-weight:700;color:#92400e;margin-bottom:5px}.pdpa-list{list-style:none;padding:0;margin:0}.pdpa-list li{padding:2px 0 2px 16px;position:relative;color:#78350f}.pdpa-list li::before{content:"✓";position:absolute;left:0;color:#c9a84c;font-weight:700}.id-photo-wrap{border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:10px 0}.id-photo-hd{background:#f5f4f0;padding:7px 11px;border-bottom:1px solid #e5e7eb;font-size:10.5px;font-weight:700;color:#333}.id-photo-wrap img{width:100%;max-height:200px;object-fit:contain;display:block;background:#f9f9f9}.footer{background:#1a1a2e;color:rgba(255,255,255,.65);padding:10px 20px;display:flex;align-items:flex-start;justify-content:space-between;font-size:9.5px;margin-top:14px}.fv-row{display:flex;gap:6px;margin-bottom:1px}.fv-lbl{color:rgba(255,255,255,.45)}.fv-val{color:#FFD700;font-family:monospace}.footer-brand{color:#FFD700;font-size:14px;font-weight:800;margin-bottom:3px}.footer-info{color:rgba(255,255,255,.5);font-size:9px;line-height:1.7}.note-green{background:#f0fdf4;border:1px solid #86efac;border-radius:4px;padding:6px 10px;font-size:10px;color:#15803d;margin-top:8px}.rejected-box{background:#fef2f2;border:1px solid #fecaca;border-radius:5px;padding:7px 9px;font-size:10px;color:#991b1b;margin-top:8px;line-height:1.7}@media print{.header,.footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{max-width:none}.device-page-break{page-break-before:always!important}}';

// Receipt uses same CSS

function esc(s: string) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function thDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

function thTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function shortDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear() + 543;
  return `${dd} / ${mm} / ${yy}`;
}

function bahtWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return "(ศูนย์บาทถ้วน)";
  const u = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const p = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
  function chunk(m: number): string {
    if (m === 0) return "";
    const s = String(m); let out = "";
    for (let i = 0; i < s.length; i++) {
      const d = +s[i]; const pos = s.length - 1 - i;
      if (d === 0) continue;
      if (pos === 1) { if (d === 1) out += "สิบ"; else if (d === 2) out += "ยี่สิบ"; else out += u[d] + "สิบ"; }
      else if (pos === 0 && d === 1 && m >= 10) out += "เอ็ด";
      else out += u[d] + p[pos];
    }
    return out;
  }
  const mil = Math.floor(n / 1_000_000); const rem = n % 1_000_000;
  return `(${mil > 0 ? chunk(mil) + "ล้าน" : ""}${rem > 0 ? chunk(rem) : ""}บาทถ้วน)`;
}


export default function ContractPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<AdminRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [generated, setGenerated] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedUrls, setSavedUrls] = useState<{ contract: string; receipt: string } | null>(null);

  // Form fields
  const [buyerName, setBuyerName] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "transfer">("cash");
  const [bankNameDraft, setBankNameDraft] = useState("");
  const [accountNameDraft, setAccountNameDraft] = useState("");
  const [accountNumberDraft, setAccountNumberDraft] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [serial, setSerial] = useState("");
  const [imei, setImei] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffList, setStaffList] = useState<AdminUserRow[]>([]);
  const [accessories, setAccessories] = useState<string[]>(["ตัวเครื่อง"]);
  const [accessoriesOther, setAccessoriesOther] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [extraDeviceDetails, setExtraDeviceDetails] = useState<Array<{
    serial: string; imei: string; accessories: string[]; accessoriesOther: string;
  }>>([]);

  // ID card photo
  const [idPhotoDataUrl, setIdPhotoDataUrl] = useState<string | null>(null);
  const [pdpaConsent, setPdpaConsent] = useState(false);
  const idFileRef = useRef<HTMLInputElement>(null!);

  // Payment slip (transfer only)
  const [slipDataUrl, setSlipDataUrl] = useState<string | null>(null);
  const [slipSaving, setSlipSaving] = useState(false);
  const slipFileRef = useRef<HTMLInputElement>(null!);

  // Customer-with-product photo
  const [custProdPhotoDataUrl, setCustProdPhotoDataUrl] = useState<string | null>(null);
  const custProdFileRef = useRef<HTMLInputElement>(null!);

  // Generated HTML
  const contractHTML = useRef("");
  const receiptHTML  = useRef("");

  useEffect(() => {
    fetchAdminUsers().then(list => setStaffList(list.filter(u => u.active)));
    fetchRequest(id).then(r => {
      setRequest(r);
      if (r) {
        setBuyerName(r.customer.name);
        setPayMethod(r.payment.method);
        if (r.assignedToName) setStaffName(r.assignedToName);
        setBankNameDraft(r.payment.bankName ?? "");
        setAccountNameDraft(r.payment.accountName ?? "");
        setAccountNumberDraft(r.payment.accountNumber ?? "");
        setAddress(r.customer.address ?? "");
        setSerial((r.inspection?.serial ?? "").toUpperCase());
        setImei(r.inspection?.imei ?? "");
        const extras = (r.extraDevices ?? []).map((_, i) => ({
          serial:           (r.inspection?.extraInspections?.[i]?.serial ?? "").toUpperCase(),
          imei:             r.inspection?.extraInspections?.[i]?.imei ?? "",
          accessories:      ["ตัวเครื่อง"],
          accessoriesOther: "",
        }));
        setExtraDeviceDetails(extras);
      }
      setLoading(false);
    });
  }, [id]);

  function formatIdNumber(raw: string) {
    const d = raw.replace(/\D/g, "").slice(0, 13);
    if (d.length <= 1)  return d;
    if (d.length <= 5)  return `${d.slice(0,1)}-${d.slice(1)}`;
    if (d.length <= 10) return `${d.slice(0,1)}-${d.slice(1,5)}-${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0,1)}-${d.slice(1,5)}-${d.slice(5,10)}-${d.slice(10)}`;
    return `${d.slice(0,1)}-${d.slice(1,5)}-${d.slice(5,10)}-${d.slice(10,12)}-${d.slice(12)}`;
  }

  async function handleIdPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await applyWatermark(file);
    setIdPhotoDataUrl(dataUrl);
  }

  async function handleSlipUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    if (!raw) return;
    const check = validateImageFile(raw);
    if (!check.valid) { alert(check.error); return; }
    setSlipSaving(true);
    const file = await compressImage(raw);
    const dataUrl = await applyWatermark(file);
    setSlipDataUrl(dataUrl);
    // Also upload to Supabase so it's visible from request detail page
    const path = `slips/${id}/${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const { data, error } = await supabase.storage.from("inspection-photos").upload(path, file, { upsert: true });
    if (!error && data) {
      const { data: pub } = supabase.storage.from("inspection-photos").getPublicUrl(data.path);
      await savePaymentSlip(id, pub.publicUrl);
    }
    setSlipSaving(false);
    if (slipFileRef.current) slipFileRef.current.value = "";
  }

  async function handleCustProdPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    if (!raw) return;
    const check = validateImageFile(raw);
    if (!check.valid) { alert(check.error); return; }
    const file = await compressImage(raw);
    const reader = new FileReader();
    reader.onload = ev => setCustProdPhotoDataUrl(ev.target!.result as string);
    reader.readAsDataURL(file);
    if (custProdFileRef.current) custProdFileRef.current.value = "";
  }

  function applyWatermark(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, 1400 / img.width);
          const canvas = document.createElement("canvas");
          canvas.width  = img.width  * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const fs = Math.max(18, Math.floor(canvas.width / 18));
          ctx.save();
          ctx.globalAlpha = 0.72;
          ctx.fillStyle = "#DC2626";
          ctx.font = `bold ${fs}px Arial, sans-serif`;
          ctx.textAlign = "center";
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(-22 * Math.PI / 180);
          ctx.fillText("ใช้สำหรับขายโทรศัพท์ให้ ขายไอโฟน.com เท่านั้น", 0, 0);
          ctx.font = `${Math.floor(fs * 0.75)}px Arial, sans-serif`;
          ctx.fillText(`วันที่ ${thDate(txDate + "T00:00:00")}`, 0, fs * 1.4);
          ctx.restore();

          resolve(canvas.toDataURL("image/jpeg", 0.88));
        };
        img.src = ev.target!.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  async function generateDocs() {
    if (!request) return;

    const r         = request;
    const now       = new Date();
    const docNo     = r.orderNumber;
    const dateStr   = thDate(txDate + "T00:00:00");
    const timeStr   = thTime(now.toISOString());
    const dateShort = shortDate(txDate + "T00:00:00");
    const genTs     = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
    const staffIdx  = staffList.findIndex(s => s.name === staffName);
    const officerId = staffIdx >= 0 ? `EMP-${String(staffIdx + 1).padStart(3, "0")}` : "";

    const cName  = buyerName.trim() || r.customer.name;
    const cPhone = r.customer.phone;
    const cId    = idNumber || "—";
    const cAddr  = address   || "—";
    const cEmail = r.customer.email || "—";
    const payM   = payMethod;
    const payTh  = payM === "cash" ? "เงินสด" : "โอนผ่านธนาคาร";
    const dobStr = dob ? thDate(dob + "T00:00:00") : "";

    const extraInspArr = r.inspection?.extraInspections ?? [];

    // Embed logo as base64
    let logoSrc = "/logo-icon.webp";
    try {
      const resp = await fetch("/logo-icon.webp");
      const blob = await resp.blob();
      logoSrc = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {}

    // ── FETCH SLIP ─────────────────────────────────────────────────────────────
    let slipImgSrc = slipDataUrl ?? "";
    if (!slipImgSrc && r.payment.slipUrl) {
      try {
        const slipResp = await fetch(r.payment.slipUrl);
        const slipBlob = await slipResp.blob();
        slipImgSrc = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(slipBlob);
        });
      } catch {}
    }

    // ── BUILD DEVICE LIST ──────────────────────────────────────────────────────
    const allDevices = [
      {
        label:           (r.extraDevices ?? []).length > 0 ? "เครื่องที่ 1" : "",
        model:           r.device.model,
        storage:         r.device.storage,
        color:           r.device.color ?? "",
        condition:       r.device.condition,
        imei:            imei,
        serial:          serial,
        accessories:     [...accessories, ...(accessoriesOther.trim() ? [accessoriesOther.trim()] : [])],
        price:           r.inspection?.actualPrice ?? r.device.estimatedPrice,
        criteria:        (r.inspection?.criteria      ?? []) as NonNullable<typeof r.inspection>["criteria"],
        issues:          r.inspection?.issues ?? [] as string[],
        functionalTests: (r.inspection?.functionalTests ?? []) as NonNullable<typeof r.inspection>["functionalTests"],
        warrantyExpiry:  r.inspection?.warrantyExpiry,
        batteryCycles:   r.inspection?.batteryCycles,
        batteryHealth:   r.inspection?.batteryHealth,
      },
      ...(r.extraDevices ?? []).map((d, i) => {
        const ei = extraInspArr[i];
        const ed = extraDeviceDetails[i];
        const xAcc = ed?.accessories ?? ["ตัวเครื่อง"];
        const xAccOther = ed?.accessoriesOther ?? "";
        return {
          label:           `เครื่องที่ ${i + 2}`,
          model:           d.model,
          storage:         d.storage,
          color:           ei?.color || d.details?.find(dd => dd.title === "สี")?.value || "",
          condition:       d.details?.find(dd => dd.title === "สภาพ")?.value ?? "—",
          imei:            ed?.imei   || ei?.imei   || "",
          serial:          ed?.serial || ei?.serial || "",
          accessories:     [...xAcc, ...(xAccOther.trim() ? [xAccOther.trim()] : [])],
          price:           ei?.actualPrice ?? d.estimatedPrice,
          criteria:        (ei?.criteria      ?? []) as NonNullable<typeof r.inspection>["criteria"],
          issues:          (ei?.issues        ?? []) as string[],
          functionalTests: (ei?.functionalTests ?? []) as NonNullable<typeof r.inspection>["functionalTests"],
          warrantyExpiry:  undefined as string | undefined,
          batteryCycles:   undefined as number | undefined,
          batteryHealth:   undefined as number | undefined,
        };
      }),
    ];
    const totalDevices = allDevices.length;

    // ── CONTRACT PAGE BUILDER ──────────────────────────────────────────────────
    function buildContractPage(dev: (typeof allDevices)[number], devIdx: number, isFirst: boolean): string {
      const accStr     = esc(dev.accessories.join(", ") || "—");
      const contractNo = `${esc(docNo)}${totalDevices > 1 ? `-${devIdx + 1}` : ""}`;
      let p = `<div class="header">
        <div class="logo-area">
          <img src="${logoSrc}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0">
          <div><div class="logo-name">ขายไอโฟน.com</div><div class="logo-sub">รับซื้อ-ขาย Apple มือสอง</div></div>
        </div>
        <div class="title-center">
          <h1>สัญญาซื้อขายโทรศัพท์มือถือมือสอง</h1>
          ${dev.label ? `<div style="color:#FFD700;font-size:12px;font-weight:700;margin-top:2px">${dev.label}</div>` : ""}
          <div class="between">ระหว่าง <strong>ผู้ขาย</strong> และ <strong style="color:#FFD700">ขายไอโฟน.com</strong></div>
        </div>
        <div class="cno-box">
          <div class="cno-label">เลขที่สัญญา (CONTRACT NO.)</div>
          <div class="cno-value">${contractNo}</div>
          <div class="cno-date">วันที่ ${dateStr}<br>เวลา ${timeStr} น.</div>
        </div>
      </div>
      <div class="content">
        <div class="top3">
          <div class="icard">
            <div class="icard-hd"><div class="hd-num">1</div> ผู้รับซื้อ</div>
            <div class="icard-body">
              <div style="font-weight:700;font-size:13px;color:#1a1a2e;margin-bottom:5px">ขายไอโฟน.com</div>
              <div style="font-size:10px;color:#666;line-height:1.5;margin-bottom:8px">ประกอบธุรกิจรับซื้อ-ขายโทรศัพท์มือถือ<br>และอุปกรณ์อิเล็กทรอนิกส์มือสอง</div>
              <div class="shop-row">📞 โทรศัพท์: 095-553-5167</div><div class="shop-row">💬 LINE: @khaiphone</div><div class="shop-row">🌐 เว็บไซต์: khaiphone.com</div>
              <div style="margin-top:8px;padding:5px 8px;background:#f5f4f0;border-radius:5px;font-size:9.5px;color:#666;border-left:3px solid #c9a84c">ต่อไปในสัญญานี้เรียกว่า <strong>"ผู้รับซื้อ"</strong></div>
              ${officerId || staffName ? `<div style="margin-top:7px;padding:6px 9px;background:#1a1a2e;border-radius:6px"><div style="font-size:8px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">เจ้าหน้าที่ผู้ดำเนินการ</div>${officerId ? `<div style="font-size:10px;font-weight:800;color:#FFD700;font-family:monospace;letter-spacing:.5px">${esc(officerId)}</div>` : ""}<div style="font-size:11px;font-weight:600;color:#fff;margin-top:1px">${esc(staffName || "—")}</div></div>` : ""}
            </div>
          </div>
          <div class="icard">
            <div class="icard-hd"><div class="hd-num">2</div> ผู้ขาย</div>
            <div class="icard-body">
              <div class="f"><span class="fl">ชื่อ-นามสกุล</span><span class="fv">${esc(cName)}</span></div>
              <div class="f"><span class="fl">เลขบัตรประชาชน</span><span class="fv" style="font-family:monospace">${esc(cId)}</span></div>
              ${dobStr ? `<div class="f"><span class="fl">วันเดือนปีเกิด</span><span class="fv">${esc(dobStr)}</span></div>` : ""}
              <div class="f"><span class="fl">ที่อยู่</span><span class="fv" style="white-space:pre-line;line-height:1.4">${esc(cAddr)}</span></div>
              <div class="f"><span class="fl">เบอร์โทรศัพท์</span><span class="fv">${esc(cPhone)}</span></div>
              <div class="f"><span class="fl">อีเมล</span><span class="fv">${esc(cEmail)}</span></div>
              <div style="margin-top:8px;padding:5px 8px;background:#f5f4f0;border-radius:5px;font-size:9.5px;color:#666;border-left:3px solid #c9a84c">ต่อไปในสัญญานี้เรียกว่า <strong>"ผู้ขาย"</strong></div>
            </div>
          </div>
          <div class="icard">
            <div class="icard-hd"><div class="hd-num">3</div> ราคาซื้อขายและการชำระเงิน</div>
            <div class="icard-body">
              <div class="price-label">${dev.label ? `ราคา${dev.label}` : "ราคาซื้อขายรวมทั้งสิ้น"}</div>
              <div class="price-big">${dev.price.toLocaleString("th-TH")}</div>
              <div style="text-align:center;font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:4px">บาท</div>
              <div style="text-align:center;font-size:10px;color:#666;margin-bottom:7px">${bahtWords(dev.price)}</div>
              <div style="border-top:1px solid #eee;padding-top:7px;margin-top:4px">
                <div style="font-size:9.5px;color:#aaa;margin-bottom:5px">วิธีการชำระเงิน</div>
                <div class="pay-badge">✓ ${payTh}</div>
                ${payM === "transfer" ? `
                  <div style="font-size:9.5px;color:#aaa;margin:5px 0 3px">รายละเอียดบัญชีผู้ขาย</div>
                  <div class="f"><span class="fl">ธนาคาร</span><span class="fv">${esc(bankNameDraft || "—")}</span></div>
                  <div class="f"><span class="fl">ชื่อบัญชี</span><span class="fv">${esc(accountNameDraft || "—")}</span></div>
                  <div class="f"><span class="fl">เลขที่บัญชี</span><span class="fv" style="font-family:monospace">${esc(accountNumberDraft || "—")}</span></div>
                ` : ""}
              </div>
            </div>
          </div>
        </div>
        <div class="sec">📱 รายละเอียดทรัพย์สินที่ซื้อขาย${dev.label ? ` — ${dev.label}` : ""}</div>
        <table class="dtable">
          <tr><th>ประเภทอุปกรณ์</th><th>IMEI</th><th>ยี่ห้อ / รุ่น</th><th>Serial Number</th></tr>
          <tr>
            <td>โทรศัพท์มือถือ</td>
            <td style="font-family:monospace">${esc(dev.imei || "—")}</td>
            <td style="font-weight:600">${esc(dev.model)}</td>
            <td style="font-family:monospace">${esc(dev.serial || "—")}</td>
          </tr>
          <tr><th>ความจุ</th><th>สภาพสินค้า</th><th>สี</th><th>อุปกรณ์ที่ให้มา</th></tr>
          <tr>
            <td>${esc(dev.storage)}</td>
            <td>${esc(dev.condition)}</td>
            <td>${esc(dev.color || "—")}</td>
            <td>${accStr}</td>
          </tr>
          ${(dev.warrantyExpiry || dev.batteryCycles !== undefined || dev.batteryHealth !== undefined) ? (() => {
            const batteryLabel = dev.batteryCycles !== undefined ? "รอบชาร์จ" : "สุขภาพแบต";
            const batteryValue = dev.batteryCycles !== undefined ? dev.batteryCycles + " รอบ" : dev.batteryHealth !== undefined ? dev.batteryHealth + "%" : "—";
            const warrantyCellStyle = dev.warrantyExpiry === "expired" ? "color:#DC2626;font-weight:600" : "";
            const warrantyText = dev.warrantyExpiry === "expired" ? "ประกันสิ้นสุดแล้ว" : dev.warrantyExpiry ? new Date(dev.warrantyExpiry + "T00:00:00").toLocaleDateString("th-TH",{year:"numeric",month:"long",day:"numeric"}) : "—";
            return `<tr><th>การรับประกัน</th><th>${batteryLabel}</th><th colspan="2"></th></tr><tr><td style="${warrantyCellStyle}">${warrantyText}</td><td>${batteryValue}</td><td colspan="2"></td></tr>`;
          })() : ""}
          <tr><td colspan="3" style="font-weight:700;text-align:right;background:#f5f4f0">ราคา${dev.label || "ซื้อขาย"}</td><td style="font-weight:700;color:#c9a84c">฿${dev.price.toLocaleString("th-TH")}</td></tr>
        </table>`;
      if ((dev.criteria ?? []).length) {
        p += `<div class="sec">🔍 ผลการตรวจสอบสภาพจริง</div>
        <table class="dtable">
          <tr><th>รายการตรวจสอบ</th><th>สภาพที่แจ้ง</th><th>ผลตรวจจริง</th><th>ผ่าน</th></tr>
          ${(dev.criteria ?? []).map(cr => `<tr><td>${esc(cr.label)}</td><td>${esc(cr.stated)}</td><td style="${!cr.pass ? "color:#DC2626;font-weight:600" : ""}">${esc(cr.actual)}</td><td style="text-align:center;font-size:13px">${cr.pass ? "✓" : "⚠"}</td></tr>`).join("")}
        </table>`;
        if ((dev.issues ?? []).length) p += `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:5px;padding:7px 10px;font-size:10px;color:#991b1b;margin-bottom:10px">⚠ ปัญหาที่พบ: ${(dev.issues ?? []).map(esc).join(", ")}</div>`;
        if ((dev.functionalTests ?? []).length) {
          const allPass = (dev.functionalTests ?? []).every(t => t.pass);
          p += `<div class="sec">📲 ผลทดสอบการใช้งานภายใน</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:10px">
            ${(dev.functionalTests ?? []).map(t => `<div style="display:flex;align-items:center;gap:5px;padding:5px 8px;border-radius:5px;border:1px solid ${t.pass ? "#bbf7d0" : "#fecaca"};background:${t.pass ? "#f0fff4" : "#fef2f2"};font-size:10px;color:${t.pass ? "#065f46" : "#991b1b"}"><span>${t.pass ? "✓" : "⚠"}</span><span>${esc(t.label)}</span></div>`).join("")}
          </div>
          ${!allPass ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:5px;padding:6px 10px;font-size:10px;color:#991b1b;margin-bottom:10px">⚠ มีฟังก์ชันที่ไม่ผ่าน: ${(dev.functionalTests ?? []).filter(t=>!t.pass).map(t=>esc(t.label)).join(", ")}</div>` : ""}`;
        }
      }
      p += `<div class="two-col">
        <div>
          <div class="sec">✅ ข้อตกลงและคำรับรองของผู้ขาย</div>
          <ol class="terms-ol">
            <li>ผู้ขายเป็นเจ้าของทรัพย์สินดังกล่าวโดยชอบด้วยกฎหมาย และมีสิทธิ์สมบูรณ์ในการขาย โอน และส่งมอบทรัพย์สินดังกล่าว</li>
            <li>ทรัพย์สินดังกล่าวไม่ได้มาจากการกระทำผิดกฎหมาย ลักทรัพย์ ฉ้อโกง ยักยอก หรือการกระทำผิดใดๆ</li>
            <li>ทรัพย์สินดังกล่าวไม่มีการผูกพัน สิทธิร้องกลับ หรือข้อพิพาทพาทางกฎหมายใดๆ</li>
            <li>ผู้ขายได้ลบข้อมูลส่วนตัวทั้งหมดออกจากอุปกรณ์แล้ว และยินยอมให้ผู้รับซื้อดำเนินการรีเซ็ต ล้างข้อมูล ตรวจสอบอุปกรณ์ได้</li>
            <li>ผู้ขายรับรองว่าอุปกรณ์ไม่ได้ถูกล็อค iCloud, Find My iPhone, MDM หรือระบบรักษาความปลอดภัยใดๆ ที่จะทำให้ผู้รับซื้อไม่สามารถใช้งานได้โดยสมบูรณ์</li>
            <li>หากตรวจพบภายหลังว่าข้อมูลที่ให้ไว้เป็นเท็จ หรืออุปกรณ์มีปัญหาทางกฎหมาย ผู้ขายยืนยอมรับผิดชอบค่าเสียหายทั้งหมดที่เกิดขึ้น</li>
            <li>กรรมสิทธิ์ในทรัพย์สินจะโอนให้ผู้รับซื้อทันทีเมื่อผู้ขายได้รับชำระเงินครบถ้วน</li>
          </ol>
        </div>
        <div>
          <div class="sec">🔍 การตรวจสอบสภาพสินค้า</div>
          <div style="font-size:10px;color:#666;margin-bottom:6px;line-height:1.5">ผู้ขายยินยอมให้ผู้รับซื้อดำเนินการตรวจสอบ</div>
          <ul class="check-list"><li>หมายเลข IMEI</li><li>Serial Number</li><li>สถานะเครื่อง</li><li>ระบบล็อคต่างๆ</li><li>ประวัติซ่อม</li><li>สภาพภายนอกและภายใน</li><li>การทำงานของอุปกรณ์</li></ul>
          <div class="rejected-box">หากตรวจพบความผิดปกติ ผู้รับซื้อมีสิทธิ์<br>• ปรับราคาซื้อขาย<br>• ยกเลิกธุรกรรม<br>• ระงับการชำระเงิน<br>ได้ตามความเหมาะสม</div>
        </div>
      </div>
      <div class="two-col">
        <div class="pdpa-box">
          <div class="pdpa-title">🔒 การคุ้มครองข้อมูลส่วนบุคคล (PDPA)</div>
          <div style="color:#78350f;font-size:10px;margin-bottom:5px">ผู้ขายยินยอมให้ผู้รับซื้อ เก็บ ใช้ และประมวลผลข้อมูลส่วนบุคคล เพื่อวัตถุประสงค์ดังต่อไปนี้</div>
          <ul class="pdpa-list"><li>ใช้ในการทำธุรกรรมซื้อขาย</li><li>ตรวจสอบและยืนยันตัวตน</li><li>ป้องกันการทุจริต</li><li>จัดเก็บเป็นหลักฐานทางธุรกิจและกฎหมาย</li><li>ใช้ในการติดต่อสอบถามหลังเสร็จสิ้นเกี่ยวกับธุรกรรม</li></ul>
          <div style="margin-top:6px;font-size:10px;color:#92400e">ผู้รับซื้อจะดำเนินการตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562</div>
        </div>
        <div>
          <div class="sec">📋 ข้อกำหนดเพิ่มเติม</div>
          <ol class="terms-ol">
            <li>สัญญานี้อยู่ภายใต้กฎหมายไทย</li>
            <li>หากข้อความใดในสัญญานี้ไม่มีผลในโมงหรือใช้บังคับไม่ได้ ให้ถือว่าส่วนอื่นยังคงมีผลบังคับ</li>
            <li>เอกสารฉบับนี้จัดทำขึ้นจากข้อมูลที่ผู้ขายให้ไว้ และจากการส่งมอบอุปกรณ์ต่อหน้าเจ้าหน้าที่ ผู้ขายได้ตรวจสอบรายละเอียดรุ่นอุปกรณ์ IMEI Serial Number สภาพเครื่อง และราคาซื้อขายแล้ว</li>
          </ol>
        </div>
      </div>`;
      if (isFirst && idPhotoDataUrl) {
        p += `<div class="id-photo-wrap"><div class="id-photo-hd">📷 เอกสารยืนยันตัวตนผู้ขาย — สำเนาบัตรประชาชน (มี Watermark)</div><img src="${idPhotoDataUrl}" alt="บัตรประชาชน"></div>`;
      }
      if (isFirst && custProdPhotoDataUrl) {
        p += `<div class="id-photo-wrap"><div class="id-photo-hd">📸 รูปหลักฐาน — ลูกค้าพร้อมสินค้าที่ขาย</div><img src="${custProdPhotoDataUrl}" alt="ลูกค้าพร้อมสินค้า" style="max-height:300px;object-fit:contain"></div>`;
      }
      if (isFirst) {
        const evItems = [
          { label: "สำเนาบัตรประชาชน",       ok: !!idPhotoDataUrl },
          { label: "รูปลูกค้าพร้อมสินค้า",   ok: !!custProdPhotoDataUrl },
          { label: "หลักฐานการโอนเงิน",      ok: !!slipImgSrc },
          { label: "ผลตรวจสภาพเครื่อง",      ok: (dev.criteria ?? []).length > 0 },
        ];
        p += `<div style="margin:10px 0;padding:9px 13px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa">
          <div style="font-size:9.5px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">📎 หลักฐานที่แนบในระบบ</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 16px">
            ${evItems.map(e => `<div style="font-size:10px;${e.ok ? "color:#065f46;font-weight:600" : "color:#aaa"}">${e.ok ? "✓" : "—"} ${e.label}</div>`).join("")}
          </div>
        </div>`;
      }
      p += `</div>
      <div class="footer">
        <div>
          <div style="font-size:11px;font-weight:700;color:#FFD700;margin-bottom:4px">🛡️ การยืนยันเอกสารดิจิทัล</div>
          <div class="fv-row"><span class="fv-lbl">Document ID :</span><span class="fv-val">${contractNo}</span></div>
          <div class="fv-row"><span class="fv-lbl">Request ID :</span><span class="fv-val">${esc(docNo)}</span></div>
          <div class="fv-row"><span class="fv-lbl">Document Generated :</span><span class="fv-val">${genTs}</span></div>
          <div class="fv-row"><span class="fv-lbl">ตรวจสอบเอกสารได้ที่ :</span><span class="fv-val">khaiphone.com/verify</span></div>
          <div style="margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,.1);font-size:8.5px;color:rgba(255,255,255,.35);max-width:400px;line-height:1.6">เอกสารฉบับนี้ถูกสร้างจากระบบ Khaiphone โดยอัตโนมัติจากข้อมูลการรับซื้อจริง พร้อมหลักฐานประกอบในระบบ และสามารถตรวจสอบความถูกต้องได้ผ่าน Document ID</div>
        </div>
        <div class="footer-logo" style="text-align:right">
          <div class="footer-brand">ขายไอโฟน.com</div>
          <div class="footer-info">รับซื้อ-ขาย Apple มือสอง<br>📞 095-553-5167 &nbsp;💬 LINE: @khaiphone<br>🌐 khaiphone.com</div>
        </div>
      </div>`;
      return p;
    }

    // ── RECEIPT PAGE BUILDER ───────────────────────────────────────────────────
    function buildReceiptPage(dev: (typeof allDevices)[number], devIdx: number, isFirst: boolean): string {
      const accStr    = esc(dev.accessories.join(", ") || "—");
      const receiptNo = `${esc(docNo)}-R${totalDevices > 1 ? `-${devIdx + 1}` : ""}`;
      let p = `<div class="header">
        <div class="logo-area">
          <img src="${logoSrc}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0">
          <div><div class="logo-name">ขายไอโฟน.com</div><div class="logo-sub">รับซื้อ-ขาย Apple มือสอง</div></div>
        </div>
        <div class="title-center">
          <h1>ใบสำคัญรับเงิน</h1>
          ${totalDevices > 1 ? `<div style="color:#FFD700;font-size:12px;font-weight:700;margin-top:2px">${dev.label}</div>` : ""}
          <div class="between">PAYMENT RECEIPT</div>
        </div>
        <div class="cno-box">
          <div class="cno-label">เลขที่ใบรับเงิน (RECEIPT NO.)</div>
          <div class="cno-value">${receiptNo}</div>
          <div class="cno-date">วันที่ ${dateStr}<br>เวลา ${timeStr} น.</div>
        </div>
      </div>
      <div style="background:#2a2a4e;padding:6px 20px;display:flex;align-items:center;justify-content:center;gap:20px;font-size:9.5px;color:rgba(255,255,255,.6)">
        <span>📞 095-553-5167</span><span>💬 LINE: @khaiphone</span><span>🌐 khaiphone.com</span>
      </div>
      <div class="content">
        <div class="two-col" style="margin-bottom:12px">
          <div class="icard">
            <div class="icard-hd"><div class="hd-num">1</div> ผู้รับเงิน (ผู้ขาย)</div>
            <div class="icard-body">
              <div class="f"><span class="fl">ชื่อ-นามสกุล</span><span class="fv" style="font-size:13px;font-weight:700;color:#1a1a2e">${esc(cName)}</span></div>
              <div class="f"><span class="fl">เลขบัตรประชาชน</span><span class="fv" style="font-family:monospace">${esc(cId)}</span></div>
              ${dobStr ? `<div class="f"><span class="fl">วันเดือนปีเกิด</span><span class="fv">${esc(dobStr)}</span></div>` : ""}
              <div class="f"><span class="fl">เบอร์โทรศัพท์</span><span class="fv">${esc(cPhone)}</span></div>
              <div class="f"><span class="fl">อีเมล</span><span class="fv">${esc(cEmail)}</span></div>
            </div>
          </div>
          <div class="icard">
            <div class="icard-hd"><div class="hd-num">2</div> ผู้จ่ายเงิน (ผู้รับซื้อ)</div>
            <div class="icard-body">
              <div style="font-weight:700;font-size:13px;color:#1a1a2e;margin-bottom:5px">ขายไอโฟน.com</div>
              <div style="font-size:10px;color:#666;line-height:1.5;margin-bottom:8px">ประกอบธุรกิจรับซื้อ-ขายโทรศัพท์มือถือ<br>และอุปกรณ์อิเล็กทรอนิกส์มือสอง</div>
              <div class="shop-row">📞 โทรศัพท์: 095-553-5167</div><div class="shop-row">💬 LINE: @khaiphone</div><div class="shop-row">🌐 เว็บไซต์: khaiphone.com</div>
            </div>
          </div>
        </div>
        <div class="two-col" style="margin-bottom:12px">
          <div>
            <div class="sec">📱 รายละเอียดสินค้า${dev.label ? ` — ${dev.label}` : ""}</div>
            <table class="dtable">
              <tr><th>รายการ</th><th>รายละเอียด</th></tr>
              <tr><td>รุ่น / Model</td><td style="font-weight:600">${esc(dev.model)}</td></tr>
              <tr><td>ความจุ / Storage</td><td>${esc(dev.storage)}</td></tr>
              <tr><td>สี / Color</td><td>${esc(dev.color || "—")}</td></tr>
              <tr><td>IMEI</td><td style="font-family:monospace;font-size:10px">${esc(dev.imei || "—")}</td></tr>
              <tr><td>Serial Number</td><td style="font-family:monospace;font-size:10px">${esc(dev.serial || "—")}</td></tr>
              <tr><td>สภาพ / Condition</td><td>${esc(dev.condition)}</td></tr>
              <tr><td>อุปกรณ์ที่ให้มา</td><td>${accStr}</td></tr>
              <tr><td>วันที่ทำรายการ</td><td>${dateStr}</td></tr>
            </table>
          </div>
          <div>
            <div class="sec">💰 รายละเอียดการชำระเงิน</div>
            <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
              <div style="background:#1a1a2e;padding:10px 14px;text-align:center">
                <div style="font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">${dev.label ? `จำนวนเงิน${dev.label}` : "จำนวนเงินทั้งสิ้น"}</div>
                <div style="font-size:30px;font-weight:800;color:#FFD700;font-family:monospace;line-height:1">${dev.price.toLocaleString("th-TH")}</div>
                <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.8)">บาท</div>
                <div style="font-size:10px;color:rgba(255,255,255,.5);margin-top:3px">${bahtWords(dev.price)}</div>
              </div>
              <div style="padding:10px 12px;font-size:10.5px;line-height:1.8">
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;padding-bottom:4px;margin-bottom:4px"><span style="color:#aaa">วิธีชำระเงิน</span><span style="font-weight:600">${payTh}</span></div>
                ${payM === "transfer" ? `
                  <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;padding-bottom:4px;margin-bottom:4px"><span style="color:#aaa">ธนาคาร</span><span style="font-weight:600">${esc(bankNameDraft || "—")}</span></div>
                  <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;padding-bottom:4px;margin-bottom:4px"><span style="color:#aaa">ชื่อบัญชี</span><span style="font-weight:600">${esc(accountNameDraft || "—")}</span></div>
                  <div style="display:flex;justify-content:space-between"><span style="color:#aaa">เลขบัญชี</span><span style="font-weight:600;font-family:monospace">${esc(accountNumberDraft || "—")}</span></div>` : ""}
              </div>
            </div>
            <div style="margin-top:8px;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.25);border-radius:6px;padding:8px 10px;font-size:10px;color:#7a6020;text-align:center">
              อ้างอิงสัญญาเลขที่ <strong style="font-family:monospace">${esc(docNo)}${totalDevices > 1 ? `-${devIdx + 1}` : ""}</strong>
            </div>
          </div>
        </div>
        <div class="two-col" style="margin-bottom:12px">
          <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:8px;padding:12px 14px">
            <div style="font-size:10.5px;font-weight:700;color:#15803d;margin-bottom:6px">✅ ข้าพเจ้าขอรับรองว่า</div>
            <div style="font-size:10.5px;color:#166534;line-height:1.7">ข้าพเจ้า <strong>${esc(cName)}</strong> ได้รับเงินจำนวน <strong>${dev.price.toLocaleString("th-TH")} บาทถ้วน</strong> จาก <strong>${esc(staffName || "ขายไอโฟน.com")}</strong> เป็นค่าขาย${dev.label ? dev.label + " " : ""}โทรศัพท์มือถือ <strong>${esc(dev.model)} ${esc(dev.storage)}</strong> ตามสัญญาเลขที่ <strong>${receiptNo}</strong> เรียบร้อยแล้ว โดยสมัครใจ</div>
          </div>
          <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:8px;padding:12px 14px">
            <div style="font-size:10.5px;font-weight:700;color:#92400e;margin-bottom:6px">📝 หมายเหตุ</div>
            <div style="font-size:10.5px;color:#78350f;line-height:1.7">ทำ ณ วันที่ <strong>${dateStr}</strong> เวลา <strong>${timeStr} น.</strong><br>ผู้ดำเนินการ: <strong>${officerId ? `${esc(officerId)} ` : ""}${esc(staffName || "—")}</strong><br>ใบรับเงินนี้เป็นหลักฐานการได้รับเงินครบถ้วนสมบูรณ์</div>
          </div>
        </div>`;
      if (isFirst) {
        if (payM !== "transfer") {
          p += `<div style="margin:12px 0;background:#f0fdf4;border:1.5px solid #86efac;border-radius:8px;padding:12px 14px;display:flex;align-items:center;gap:12px"><div style="width:40px;height:40px;background:#16a34a;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px">💵</div><div><div style="font-size:11px;font-weight:700;color:#15803d;margin-bottom:2px">ชำระเงินสดเรียบร้อยแล้ว</div><div style="font-size:10px;color:#166534">มอบเงินสดจำนวน <strong>${dev.price.toLocaleString("th-TH")} บาท</strong> ให้แก่ผู้ขายโดยตรง ณ วันที่ ${dateStr}</div></div></div>`;
        }
        if (slipImgSrc) {
          p += `<div style="margin:12px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden"><div style="background:#f5f4f0;padding:7px 11px;border-bottom:1px solid #e5e7eb;font-size:10.5px;font-weight:700;color:#333">📎 หลักฐานการรับเงิน</div><div style="padding:12px;text-align:center;background:#fafafa"><img src="${slipImgSrc}" style="max-width:280px;max-height:380px;border-radius:6px;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.08)"></div></div>`;
        } else if (payM === "transfer") {
          p += `<div style="margin:12px 0;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px 13px;font-size:10.5px;color:#92400e">⚠ ยังไม่มีหลักฐานการโอนเงิน</div>`;
        }
        if (idPhotoDataUrl) {
          p += `<div class="id-photo-wrap"><div class="id-photo-hd">📷 เอกสารยืนยันตัวตนผู้ขาย — สำเนาบัตรประชาชน (มี Watermark)</div><img src="${idPhotoDataUrl}" alt="บัตรประชาชน"></div>`;
        }
        if (custProdPhotoDataUrl) {
          p += `<div class="id-photo-wrap"><div class="id-photo-hd">📸 รูปหลักฐาน — ลูกค้าพร้อมสินค้าที่ขาย</div><img src="${custProdPhotoDataUrl}" alt="ลูกค้าพร้อมสินค้า" style="max-height:300px;object-fit:contain"></div>`;
        }
        const evItems = [
          { label: "สำเนาบัตรประชาชน",     ok: !!idPhotoDataUrl },
          { label: "รูปลูกค้าพร้อมสินค้า", ok: !!custProdPhotoDataUrl },
          { label: "หลักฐานการโอนเงิน",    ok: !!slipImgSrc },
          { label: "ผลตรวจสภาพเครื่อง",    ok: (dev.criteria ?? []).length > 0 },
        ];
        p += `<div style="margin:10px 0;padding:9px 13px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa">
          <div style="font-size:9.5px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">📎 หลักฐานที่แนบในระบบ</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 16px">
            ${evItems.map(e => `<div style="font-size:10px;${e.ok ? "color:#065f46;font-weight:600" : "color:#aaa"}">${e.ok ? "✓" : "—"} ${e.label}</div>`).join("")}
          </div>
        </div>`;
      }
      p += `<div style="margin-top:14px;border-top:1px solid #e5e7eb;padding-top:12px">
          <div style="display:grid;grid-template-columns:1fr auto;gap:14px;align-items:start">
            <div>
              <div style="font-size:10px;font-weight:700;color:#1a1a2e;margin-bottom:5px">🛡️ การยืนยันเอกสารดิจิทัล</div>
              <div style="margin-bottom:2px"><span style="font-size:9.5px;color:#aaa">Document ID :</span>&nbsp;<span style="font-size:9.5px;font-family:monospace;color:#1a1a2e;font-weight:600">${receiptNo}</span></div>
              <div style="margin-bottom:2px"><span style="font-size:9.5px;color:#aaa">Verification Code :</span>&nbsp;<span style="font-size:9.5px;font-family:monospace;color:#c9a84c;font-weight:600">${receiptNo}-${dateShort.replace(/ \/ /g, "")}</span></div>
              <div><span style="font-size:9.5px;color:#aaa">ตรวจสอบที่ :</span>&nbsp;<span style="font-size:9.5px;color:#1a1a2e">khaiphone.com/verify</span></div>
            </div>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=khaiphone.com%2Fverify%3Fid%3D${receiptNo}" style="width:64px;height:64px;border-radius:5px;border:1px solid #e5e7eb" onerror="this.style.display='none'">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px">
            <div style="border:1px solid #e5e7eb;border-radius:6px;padding:8px;text-align:center"><div style="font-size:15px;margin-bottom:2px">🔒</div><div style="font-size:9.5px;font-weight:700;color:#1a1a2e">เอกสารปลอดภัย</div><div style="font-size:8.5px;color:#aaa">มีลายเซ็นดิจิทัล</div></div>
            <div style="border:1px solid #e5e7eb;border-radius:6px;padding:8px;text-align:center"><div style="font-size:15px;margin-bottom:2px">✅</div><div style="font-size:9.5px;font-weight:700;color:#1a1a2e">ชำระครบถ้วน</div><div style="font-size:8.5px;color:#aaa">ยืนยันการรับเงิน</div></div>
            <div style="border:1px solid #e5e7eb;border-radius:6px;padding:8px;text-align:center"><div style="font-size:15px;margin-bottom:2px">📋</div><div style="font-size:9.5px;font-weight:700;color:#1a1a2e">มีผลทางกฎหมาย</div><div style="font-size:8.5px;color:#aaa">ตามกฎหมายไทย</div></div>
          </div>
        </div>
      </div>
      <div class="footer">
        <div>
          <div style="font-size:11px;font-weight:700;color:#FFD700;margin-bottom:4px">🛡️ การยืนยันเอกสารดิจิทัล</div>
          <div class="fv-row"><span class="fv-lbl">Document ID :</span><span class="fv-val">${receiptNo}</span></div>
          <div class="fv-row"><span class="fv-lbl">Request ID :</span><span class="fv-val">${esc(docNo)}</span></div>
          <div class="fv-row"><span class="fv-lbl">Document Generated :</span><span class="fv-val">${genTs}</span></div>
          <div class="fv-row"><span class="fv-lbl">ตรวจสอบเอกสารได้ที่ :</span><span class="fv-val">khaiphone.com/verify</span></div>
          <div style="margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,.1);font-size:8.5px;color:rgba(255,255,255,.35);max-width:400px;line-height:1.6">เอกสารฉบับนี้ถูกสร้างจากระบบ Khaiphone โดยอัตโนมัติจากข้อมูลการรับซื้อจริง พร้อมหลักฐานประกอบในระบบ และสามารถตรวจสอบความถูกต้องได้ผ่าน Document ID</div>
        </div>
        <div class="footer-logo" style="text-align:right">
          <div class="footer-brand">ขายไอโฟน.com</div>
          <div class="footer-info">รับซื้อ-ขาย Apple มือสอง<br>📞 095-553-5167 &nbsp;💬 LINE: @khaiphone<br>🌐 khaiphone.com</div>
        </div>
      </div>`;
      return p;
    }

    // ── ASSEMBLE ───────────────────────────────────────────────────────────────
    contractHTML.current = allDevices
      .map((dev, i) => buildContractPage(dev, i, i === 0))
      .map((page, i) => i === 0 ? page : `<div style="page-break-before:always">${page}</div>`)
      .join("");

    receiptHTML.current = allDevices
      .map((dev, i) => buildReceiptPage(dev, i, i === 0))
      .map((page, i) => i === 0 ? page : `<div style="page-break-before:always">${page}</div>`)
      .join("");

    setGenerated(true);
    uploadDocs(contractHTML.current, receiptHTML.current, docNo);
  }

  async function uploadDocs(cHtml: string, rHtml: string, docNo: string) {
    setUploading(true);
    const printCSS = "@media print{.header,.footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{max-width:none}}";
    const wrap = (body: string) =>
      `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">${FONT_LINK}<style>${DOC_CSS}${printCSS}</style></head><body>${body}</body></html>`;

    const [cBlob, rBlob] = [
      new Blob([wrap(cHtml)], { type: "text/html;charset=utf-8" }),
      new Blob([wrap(rHtml)], { type: "text/html;charset=utf-8" }),
    ];

    const cPath = `contracts/${id}/${docNo}-contract.html`;
    const rPath = `contracts/${id}/${docNo}-receipt.html`;

    const [cu, ru] = await Promise.all([
      supabase.storage.from("inspection-photos").upload(cPath, cBlob, { upsert: true, contentType: "text/html" }),
      supabase.storage.from("inspection-photos").upload(rPath, rBlob, { upsert: true, contentType: "text/html" }),
    ]);

    if (cu.error || ru.error) {
      console.error("upload error", cu.error, ru.error);
      setUploading(false);
      return;
    }

    await saveContractUrls(id, cu.data.path, ru.data.path);
    await updateStatus(id, "completed", "บันทึกสัญญาและใบรับเงินสำเร็จ — เสร็จสิ้น");
    await markContractSigned(id);
    setSavedUrls({ contract: cu.data.path, receipt: ru.data.path });
    setUploading(false);
  }

  function openInTab(type: "contract" | "receipt") {
    const body = type === "contract" ? contractHTML.current : receiptHTML.current;
    const printCSS = "@media print{.header,.footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{max-width:none}}";
    const full = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">${FONT_LINK}<style>${DOC_CSS}${printCSS}</style></head><body>${body}</body></html>`;
    const blob = new Blob([full], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: TEXT2, fontSize: 15 }}>กำลังโหลด...</div>
    </div>
  );

  if (!request) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#DC2626", fontSize: 15 }}>ไม่พบคำขอ</div>
    </div>
  );

  const price = request.device.actualPrice ?? request.device.estimatedPrice;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 11px", borderRadius: 8,
    border: `1px solid ${BORDER}`, background: "#FAFAFA",
    fontSize: 14, color: TEXT, fontFamily: "inherit", outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 4,
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, background: DARK, zIndex: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#FFD700", cursor: "pointer", display: "flex", padding: 4 }}>
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#FFD700", fontSize: 16, fontWeight: 700 }}>ออกเอกสารสัญญา</div>
          <div style={{ color: "rgba(255,255,255,.6)", fontSize: 11, marginTop: 1 }}>{request.orderNumber} · {request.customer.name}</div>
        </div>
        <FileText size={20} color="#FFD700" />
      </div>

      <div style={{ padding: "12px 16px" }}>

        {/* Summary */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: TEXT2, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>ข้อมูลจากคำขอ</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
            {([
              ["ผู้ขาย", buyerName || request.customer.name],
              ["เบอร์โทร", request.customer.phone],
              ["อุปกรณ์", `${request.device.model} ${request.device.storage}`],
              ["ราคาตกลง", `${price.toLocaleString("th-TH")} บาท`],
              ["วิธีชำระ", payMethod === "cash" ? "เงินสด" : "โอนธนาคาร"],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 10, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Extra fields */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, background: "#F9F9F9", fontSize: 13, fontWeight: 700, color: TEXT }}>ข้อมูลเพิ่มเติม</div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>

            <div>
              <label style={labelStyle}>ชื่อ-นามสกุลผู้ขาย (ในสัญญา)</label>
              <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="ชื่อที่จะปรากฏในสัญญา" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>วิธีชำระเงิน</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value as "cash" | "transfer")} style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none" }}>
                <option value="cash">เงินสด</option>
                <option value="transfer">โอนเงิน</option>
              </select>
            </div>
            {payMethod === "transfer" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>ธนาคาร</label>
                    <input type="text" value={bankNameDraft} onChange={e => setBankNameDraft(e.target.value)} placeholder="เช่น กสิกรไทย" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>ชื่อบัญชี</label>
                    <input type="text" value={accountNameDraft} onChange={e => setAccountNameDraft(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>เลขที่บัญชี</label>
                  <input type="text" value={accountNumberDraft} onChange={e => setAccountNumberDraft(e.target.value)} placeholder="xxx-x-xxxxx-x" style={inputStyle} />
                </div>
              </>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>วันที่ทำสัญญา</label>
                <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>พนักงานผู้รับซื้อ</label>
                {staffList.length > 0 ? (
                  <select
                    value={staffList.some(s => s.name === staffName) ? staffName : "__other__"}
                    onChange={e => { if (e.target.value !== "__other__") setStaffName(e.target.value); else setStaffName(""); }}
                    style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none" }}
                  >
                    <option value="">— เลือกพนักงาน —</option>
                    {staffList.map(s => <option key={s.user_id} value={s.name}>{s.name}</option>)}
                    <option value="__other__">อื่นๆ (พิมพ์เอง)</option>
                  </select>
                ) : (
                  <input type="text" placeholder="ชื่อพนักงาน" value={staffName} onChange={e => setStaffName(e.target.value)} style={inputStyle} />
                )}
                {staffList.length > 0 && !staffList.some(s => s.name === staffName) && (
                  <input type="text" placeholder="ระบุชื่อพนักงาน" value={staffName} onChange={e => setStaffName(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>เลขบัตรประชาชน</label>
                <input type="text" inputMode="numeric" placeholder="X-XXXX-XXXXX-XX-X" value={idNumber} onChange={e => setIdNumber(formatIdNumber(e.target.value))} maxLength={17} style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: 1 }} />
              </div>
              <div>
                <label style={labelStyle}>วันเดือนปีเกิด</label>
                <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inputStyle} />
                {dob && (() => {
                  const birth = new Date(dob + "T00:00:00");
                  const now = new Date();
                  let y = now.getFullYear() - birth.getFullYear();
                  let m = now.getMonth() - birth.getMonth();
                  let d = now.getDate() - birth.getDate();
                  if (d < 0) { m -= 1; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
                  if (m < 0) { y -= 1; m += 12; }
                  const under20 = y < 20;
                  return (
                    <div style={{ marginTop: 6, padding: "7px 10px", borderRadius: 7, background: under20 ? "#FEF3C7" : "#F0F9FF", border: `1px solid ${under20 ? "#FCD34D" : "#BAE6FD"}` }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: under20 ? "#92400E" : "#0369A1", margin: 0 }}>
                        อายุ {y} ปี {m} เดือน {d} วัน
                      </p>
                      {under20 && (
                        <p style={{ fontSize: 11, color: "#B45309", margin: "3px 0 0" }}>
                          ⚠️ อายุต่ำกว่า 20 ปีบริบูรณ์ — ควรให้ผู้ปกครองรับทราบ
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div>
              <label style={labelStyle}>ที่อยู่ตามบัตร</label>
              <textarea rows={2} placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด" value={address} onChange={e => setAddress(e.target.value)} style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Serial Number (เครื่องที่ 1)</label>
                <input type="text" placeholder="XXXXXXXXXX" value={serial} onChange={e => setSerial(e.target.value.toUpperCase())} style={{ ...inputStyle, fontFamily: "monospace", textTransform: "uppercase" }} />
              </div>
              <div>
                <label style={labelStyle}>IMEI (เครื่องที่ 1)</label>
                <input type="text" inputMode="numeric" placeholder="000000000000000" value={imei} onChange={e => setImei(e.target.value.replace(/\D/g, "").slice(0, 15))} style={{ ...inputStyle, fontFamily: "monospace" }} />
              </div>
            </div>

            {/* Extra device S/N + IMEI */}
            {(request.extraDevices ?? []).map((d, idx) => (
              <div key={idx} style={{ paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#B8860B", marginBottom: 8 }}>
                  📱 เครื่องที่ {idx + 2}: {d.model} {d.storage}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Serial Number</label>
                    <input
                      type="text"
                      placeholder="XXXXXXXXXX"
                      value={extraDeviceDetails[idx]?.serial ?? ""}
                      onChange={e => setExtraDeviceDetails(prev => prev.map((p, i) => i === idx ? { ...p, serial: e.target.value.toUpperCase() } : p))}
                      style={{ ...inputStyle, fontFamily: "monospace", textTransform: "uppercase" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>IMEI</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="000000000000000"
                      value={extraDeviceDetails[idx]?.imei ?? ""}
                      onChange={e => setExtraDeviceDetails(prev => prev.map((p, i) => i === idx ? { ...p, imei: e.target.value.replace(/\D/g, "").slice(0, 15) } : p))}
                      style={{ ...inputStyle, fontFamily: "monospace" }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>อุปกรณ์ที่ให้มา</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    {["ตัวเครื่อง", "กล่อง", "สายชาร์จ", "หัวชาร์จ", "เคส", "ฟิล์ม/กระจก", "EarPods", "ที่จิ้ม SIM"].map(item => {
                      const checked = (extraDeviceDetails[idx]?.accessories ?? []).includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setExtraDeviceDetails(prev => prev.map((p, i) =>
                            i === idx
                              ? { ...p, accessories: checked ? p.accessories.filter(x => x !== item) : [...p.accessories, item] }
                              : p
                          ))}
                          style={{
                            padding: "6px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer",
                            fontFamily: "inherit", border: "none",
                            background: checked ? DARK : "#F0F0F3",
                            color: checked ? "#FFD700" : TEXT2,
                            fontWeight: checked ? 600 : 400,
                          }}
                        >
                          {checked ? "✓ " : ""}{item}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      placeholder="อื่นๆ (พิมพ์เพิ่ม)"
                      value={extraDeviceDetails[idx]?.accessoriesOther ?? ""}
                      onChange={e => setExtraDeviceDetails(prev => prev.map((p, i) => i === idx ? { ...p, accessoriesOther: e.target.value } : p))}
                      onKeyDown={e => {
                        const val = extraDeviceDetails[idx]?.accessoriesOther?.trim();
                        if (e.key === "Enter" && val) {
                          e.preventDefault();
                          setExtraDeviceDetails(prev => prev.map((p, i) => i === idx ? { ...p, accessories: [...p.accessories, val], accessoriesOther: "" } : p));
                        }
                      }}
                      style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = extraDeviceDetails[idx]?.accessoriesOther?.trim();
                        if (!val) return;
                        setExtraDeviceDetails(prev => prev.map((p, i) => i === idx ? { ...p, accessories: [...p.accessories, val], accessoriesOther: "" } : p));
                      }}
                      style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: DARK, color: "#FFD700", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
                    >
                      เพิ่ม
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div>
              <label style={labelStyle}>อุปกรณ์ที่ให้มา</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {["ตัวเครื่อง", "กล่อง", "สายชาร์จ", "หัวชาร์จ", "เคส", "ฟิล์ม/กระจก", "EarPods", "ที่จิ้ม SIM"].map(item => {
                  const checked = accessories.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setAccessories(prev => checked ? prev.filter(x => x !== item) : [...prev, item])}
                      style={{
                        padding: "6px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer",
                        fontFamily: "inherit", border: "none",
                        background: checked ? DARK : "#F0F0F3",
                        color: checked ? "#FFD700" : TEXT2,
                        fontWeight: checked ? 600 : 400,
                      }}
                    >
                      {checked ? "✓ " : ""}{item}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="อื่นๆ (พิมพ์เพิ่ม)"
                  value={accessoriesOther}
                  onChange={e => setAccessoriesOther(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && accessoriesOther.trim()) {
                      e.preventDefault();
                      setAccessories(prev => [...prev, accessoriesOther.trim()]);
                      setAccessoriesOther("");
                    }
                  }}
                  style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!accessoriesOther.trim()) return;
                    setAccessories(prev => [...prev, accessoriesOther.trim()]);
                    setAccessoriesOther("");
                  }}
                  style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: DARK, color: "#FFD700", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
                >
                  เพิ่ม
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ID Card Photo */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, background: "#F9F9F9", display: "flex", alignItems: "center", gap: 8 }}>
            <Camera size={16} color={DARK} />
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>เอกสารยืนยันตัวตนผู้ขาย</div>
          </div>
          <div style={{ padding: 14 }}>

            {/* PDPA consent */}
            <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 10, padding: "10px 13px", marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 6 }}>การยินยอม PDPA</div>
              <div style={{ fontSize: 11, color: "#78350F", lineHeight: 1.7, marginBottom: 8 }}>
                ผู้ขายยินยอมแนบสำเนาบัตรประชาชนเพื่อใช้ประกอบธุรกรรมซื้อขายโทรศัพท์มือถือ และเพื่อการยืนยันตัวตนตามกฎหมาย ขายไอโฟน.com จะเก็บรักษาข้อมูลตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
              </div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={pdpaConsent}
                  onChange={e => setPdpaConsent(e.target.checked)}
                  style={{ width: 18, height: 18, marginTop: 1, accentColor: DARK, flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, color: "#78350F", fontWeight: 600 }}>ลูกค้ายินยอมให้เก็บรูปบัตรประชาชนแล้ว</span>
              </label>
            </div>

            {/* Photo upload */}
            {pdpaConsent ? (
              <>
                <input
                  ref={idFileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={handleIdPhoto}
                />
                {!idPhotoDataUrl ? (
                  <button
                    onClick={() => idFileRef.current?.click()}
                    style={{ width: "100%", padding: 16, borderRadius: 12, border: `2px dashed ${BORDER}`, background: "#FAFAFA", color: TEXT2, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
                  >
                    <Camera size={28} color={TEXT2} />
                    ถ่ายรูปบัตรประชาชน
                    <span style={{ fontSize: 11, fontWeight: 400 }}>ระบบจะใส่ Watermark อัตโนมัติ</span>
                  </button>
                ) : (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={idPhotoDataUrl} alt="บัตรประชาชน" style={{ width: "100%", borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 8 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1, background: "#F0FDF4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#15803d", fontWeight: 600 }}>
                        ✓ มี Watermark แล้ว
                      </div>
                      <button
                        onClick={() => { setIdPhotoDataUrl(null); if (idFileRef.current) idFileRef.current.value = ""; }}
                        style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#FAFAFA", color: TEXT2, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        ถ่ายใหม่
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "16px 0", color: TEXT2, fontSize: 13 }}>
                ต้องได้รับความยินยอมก่อนถ่ายรูปบัตร
              </div>
            )}
          </div>
        </div>

        {/* Payment Slip */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, background: "#F9F9F9", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>📎</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>หลักฐานการรับเงิน</div>
                <div style={{ fontSize: 11, color: TEXT2 }}>สลิป / รูปหลักฐาน — แสดงในใบสำคัญรับเงิน</div>
              </div>
              {(slipDataUrl || request.payment.slipUrl) && (
                <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>✓ มีสลิปแล้ว</div>
              )}
            </div>
            <div style={{ padding: 14 }}>
              <input ref={slipFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSlipUpload} />
              {slipDataUrl ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slipDataUrl} alt="สลิป" style={{ width: "100%", borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 8, maxHeight: 260, objectFit: "contain", background: "#F9F9F9" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, background: "#F0FDF4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#15803d", fontWeight: 600 }}>
                      ✓ สลิปพร้อมใช้งาน
                    </div>
                    <button
                      onClick={() => { setSlipDataUrl(null); if (slipFileRef.current) slipFileRef.current.value = ""; }}
                      style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#FAFAFA", color: TEXT2, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      เปลี่ยน
                    </button>
                  </div>
                </div>
              ) : request.payment.slipUrl ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={request.payment.slipUrl} alt="สลิป" style={{ width: "100%", borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 8, maxHeight: 260, objectFit: "contain", background: "#F9F9F9" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, background: "#F0FDF4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#15803d", fontWeight: 600 }}>
                      ✓ ใช้สลิปจากหน้า request
                    </div>
                    <button
                      onClick={() => slipFileRef.current?.click()}
                      style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#FAFAFA", color: TEXT2, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      เปลี่ยน
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => slipFileRef.current?.click()}
                  disabled={slipSaving}
                  style={{ width: "100%", padding: 16, borderRadius: 12, border: `2px dashed ${BORDER}`, background: "#FAFAFA", color: TEXT2, fontSize: 14, fontWeight: 600, cursor: slipSaving ? "default" : "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: slipSaving ? 0.6 : 1 }}
                >
                  <span style={{ fontSize: 28 }}>📎</span>
                  {slipSaving ? "กำลังอัพโหลด..." : "อัพโหลดสลิปโอนเงิน"}
                  <span style={{ fontSize: 11, fontWeight: 400 }}>รูปภาพจากกล้องหรือไฟล์</span>
                </button>
              )}
            </div>
          </div>

        {/* Customer with product photo */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, background: "#F9F9F9", display: "flex", alignItems: "center", gap: 8 }}>
            <Camera size={16} color={DARK} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>รูปหลักฐานลูกค้าพร้อมสินค้า</div>
              <div style={{ fontSize: 11, color: TEXT2 }}>แนบในสัญญาซื้อขาย — ก่อนลงลายเซ็น</div>
            </div>
            {custProdPhotoDataUrl && (
              <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>✓ มีรูปแล้ว</div>
            )}
          </div>
          <div style={{ padding: 14 }}>
            <input ref={custProdFileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleCustProdPhoto} />
            {custProdPhotoDataUrl ? (
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={custProdPhotoDataUrl} alt="ลูกค้าพร้อมสินค้า" style={{ width: "100%", borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 8, maxHeight: 300, objectFit: "contain", background: "#F9F9F9" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, background: "#F0FDF4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#15803d", fontWeight: 600 }}>
                    ✓ รูปพร้อมแนบในสัญญา
                  </div>
                  <button
                    onClick={() => { setCustProdPhotoDataUrl(null); if (custProdFileRef.current) custProdFileRef.current.value = ""; }}
                    style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#FAFAFA", color: TEXT2, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    ถ่ายใหม่
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => custProdFileRef.current?.click()}
                style={{ width: "100%", padding: 16, borderRadius: 12, border: `2px dashed ${BORDER}`, background: "#FAFAFA", color: TEXT2, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
              >
                <Camera size={28} color={TEXT2} />
                ถ่ายรูปลูกค้าพร้อมสินค้า
                <span style={{ fontSize: 11, fontWeight: 400 }}>รูปนี้จะแนบในสัญญาก่อนช่องลายเซ็น</span>
              </button>
            )}
          </div>
        </div>

        {/* Generate */}
        <button
          onClick={generateDocs}
          disabled={uploading}
          style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: DARK, color: "#FFD700", fontSize: 15, fontWeight: 700, cursor: uploading ? "default" : "pointer", fontFamily: "inherit", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: uploading ? 0.7 : 1 }}
        >
          <FileText size={18} />
          {uploading ? "กำลังบันทึกขึ้น Cloud..." : "ออกเอกสารสัญญา"}
        </button>

        {/* Open buttons */}
        {generated && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => openInTab("contract")} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: "#1d4ed8", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <ExternalLink size={16} /> เปิดสัญญาซื้อขาย
            </button>
            <button onClick={() => openInTab("receipt")} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: "#15803d", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <ExternalLink size={16} /> เปิดใบสำคัญรับเงิน
            </button>
            {savedUrls ? (
              <div style={{ background: "#F0FDF4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#15803d", lineHeight: 1.7 }}>
                ☁️ <strong>บันทึกขึ้น Cloud แล้ว</strong> — ลูกค้าสามารถเปิดเอกสารจากหน้าติดตามคำขอได้
              </div>
            ) : uploading ? (
              <div style={{ background: "#EFF6FF", border: "1px solid #93c5fd", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#1d4ed8" }}>
                กำลังอัปโหลดเอกสารขึ้น Supabase...
              </div>
            ) : null}
            <div style={{ background: "#F0F0F0", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: TEXT2, lineHeight: 1.6 }}>
              กด <strong>Cmd+P</strong> (Mac) หรือ <strong>Ctrl+P</strong> (Windows) แล้วเลือก <strong>Save as PDF</strong>
            </div>
          </div>
        )}

        {/* Back */}
        <button
          onClick={() => router.push(`/admin/requests/${id}`)}
          style={{ width: "100%", marginTop: 12, padding: "12px", borderRadius: 12, border: `1px solid ${BORDER}`, background: CARD, color: TEXT2, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <ArrowLeft size={16} /> กลับหน้าคำขอ
        </button>

      </div>
    </div>
  );
}
