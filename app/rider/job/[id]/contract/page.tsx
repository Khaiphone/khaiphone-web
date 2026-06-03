"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { fetchRiderJob } from "@/app/actions/rider";
import { saveContractUrls, markContractSigned } from "@/app/actions/admin-requests";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compress-image";
import { validateImageFile } from "@/lib/validate-file";
import { useRiderTheme } from "@/app/rider/theme";
import type { AdminRequest } from "@/lib/types/admin";

const FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">';

const DOC_CSS = '*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Sarabun",sans-serif;max-width:780px;margin:0 auto;font-size:11px;color:#1a1a1a;line-height:1.6;background:#fff}.header{background:linear-gradient(135deg,#1a1a2e,#2a2a4e);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}.logo-area{display:flex;align-items:center;gap:10px;min-width:160px}.logo-name{color:#FFD700;font-size:14px;font-weight:800}.logo-sub{color:rgba(255,255,255,.6);font-size:9px;margin-top:1px}.title-center{text-align:center;flex:1}.title-center h1{color:#FFD700;font-size:15px;font-weight:800}.title-center .between{color:rgba(255,255,255,.8);font-size:11px;margin-top:3px}.cno-box{background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.35);border-radius:8px;padding:9px 13px;text-align:right;min-width:160px}.cno-label{color:rgba(255,255,255,.5);font-size:8.5px;text-transform:uppercase;letter-spacing:.5px}.cno-value{color:#FFD700;font-size:15px;font-weight:800;font-family:monospace;letter-spacing:.5px;margin:2px 0}.cno-date{color:rgba(255,255,255,.65);font-size:10px}.content{padding:14px 20px}.top3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}.icard{border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}.icard-hd{background:#f5f4f0;padding:7px 11px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:700;color:#333}.hd-num{width:18px;height:18px;border-radius:5px;background:#1a1a2e;color:#FFD700;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}.icard-body{padding:9px 11px;font-size:10.5px}.f{display:flex;flex-direction:column;margin-bottom:4px}.fl{font-size:9px;color:#aaa;text-transform:uppercase;letter-spacing:.4px}.fv{font-size:11px;font-weight:500;color:#1a1a1a;border-bottom:1px solid #f0f0f0;padding-bottom:2px;min-height:16px}.shop-row{display:flex;align-items:flex-start;gap:5px;font-size:10px;color:#555;margin-bottom:3px}.price-big{font-size:28px;font-weight:800;color:#c9a84c;font-family:monospace;text-align:center;padding:5px 0;line-height:1}.price-label{font-size:9px;color:#aaa;text-align:center;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}.price-words{font-size:10px;color:#666;text-align:center;margin-bottom:7px;line-height:1.4}.pay-badge{display:inline-flex;align-items:center;gap:4px;background:#f0fdf4;border:1px solid #86efac;border-radius:4px;padding:3px 8px;font-size:10px;font-weight:600;color:#15803d;margin-bottom:6px}.sec{font-size:10px;font-weight:700;color:#1a1a2e;border-left:3px solid #c9a84c;padding-left:8px;margin:12px 0 7px;text-transform:uppercase;letter-spacing:.5px}.dtable{width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:10px}.dtable th{background:#1a1a2e;color:#FFD700;padding:6px 9px;text-align:left;font-weight:600;font-size:9.5px}.dtable td{padding:5px 9px;border-bottom:1px solid #f0f0f0;vertical-align:top}.dtable tr:nth-child(even) td{background:#fafafa}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:10px}.terms-ol{counter-reset:tc;list-style:none;padding:0;margin:0 0 8px}.terms-ol li{counter-increment:tc;padding:4px 0 4px 22px;position:relative;font-size:10.5px;border-bottom:1px solid #f8f8f8;line-height:1.5}.terms-ol li::before{content:counter(tc)".";position:absolute;left:0;top:4px;font-weight:700;color:#c9a84c}.check-list{list-style:none;padding:0;margin:0}.check-list li{padding:2px 0 2px 14px;position:relative;font-size:10.5px}.check-list li::before{content:"•";position:absolute;left:0;color:#c9a84c;font-weight:700}.pdpa-box{background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:10px 13px;font-size:10.5px}.pdpa-title{font-weight:700;color:#92400e;margin-bottom:5px}.pdpa-list{list-style:none;padding:0;margin:0}.pdpa-list li{padding:2px 0 2px 16px;position:relative;color:#78350f}.pdpa-list li::before{content:"✓";position:absolute;left:0;color:#c9a84c;font-weight:700}.id-photo-wrap{border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:10px 0}.id-photo-hd{background:#f5f4f0;padding:7px 11px;border-bottom:1px solid #e5e7eb;font-size:10.5px;font-weight:700;color:#333}.id-photo-wrap img{width:100%;max-height:200px;object-fit:contain;display:block;background:#f9f9f9}.footer{background:#1a1a2e;color:rgba(255,255,255,.65);padding:10px 20px;display:flex;align-items:flex-start;justify-content:space-between;font-size:9.5px;margin-top:14px}.fv-row{display:flex;gap:6px;margin-bottom:1px}.fv-lbl{color:rgba(255,255,255,.45)}.fv-val{color:#FFD700;font-family:monospace}.footer-brand{color:#FFD700;font-size:14px;font-weight:800;margin-bottom:3px}.footer-info{color:rgba(255,255,255,.5);font-size:9px;line-height:1.7}.rejected-box{background:#fef2f2;border:1px solid #fecaca;border-radius:5px;padding:7px 9px;font-size:10px;color:#991b1b;margin-top:8px;line-height:1.7}@media print{.header,.footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{max-width:none}}';

function esc(s: string) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function thDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

function thTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")} / ${String(d.getMonth()+1).padStart(2,"0")} / ${d.getFullYear()+543}`;
}

function bahtWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return "(ศูนย์บาทถ้วน)";
  const u = ["","หนึ่ง","สอง","สาม","สี่","ห้า","หก","เจ็ด","แปด","เก้า"];
  function chunk(m: number): string {
    if (m === 0) return "";
    const s = String(m); let out = "";
    for (let i = 0; i < s.length; i++) {
      const d = +s[i]; const pos = s.length - 1 - i;
      if (d === 0) continue;
      if (pos === 1) { if (d === 1) out += "สิบ"; else if (d === 2) out += "ยี่สิบ"; else out += u[d] + "สิบ"; }
      else if (pos === 0 && d === 1 && m >= 10) out += "เอ็ด";
      else out += u[d] + ["","สิบ","ร้อย","พัน","หมื่น","แสน"][pos];
    }
    return out;
  }
  const mil = Math.floor(n / 1_000_000); const rem = n % 1_000_000;
  return `(${mil > 0 ? chunk(mil) + "ล้าน" : ""}${rem > 0 ? chunk(rem) : ""}บาทถ้วน)`;
}

function formatIdNumber(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 13);
  if (d.length <= 1)  return d;
  if (d.length <= 5)  return `${d.slice(0,1)}-${d.slice(1)}`;
  if (d.length <= 10) return `${d.slice(0,1)}-${d.slice(1,5)}-${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0,1)}-${d.slice(1,5)}-${d.slice(5,10)}-${d.slice(10)}`;
  return `${d.slice(0,1)}-${d.slice(1,5)}-${d.slice(5,10)}-${d.slice(10,12)}-${d.slice(12)}`;
}

export default function RiderContractPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { BG, CARD, BORDER, ACCENT, TEXT, TEXT2 } = useRiderTheme();
  const [job, setJob]     = useState<AdminRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [done, setDone]   = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [buyerName, setBuyerName]   = useState("");
  const [idNumber, setIdNumber]     = useState("");
  const [dob, setDob]               = useState("");
  const [address, setAddress]       = useState("");
  const [staffName, setStaffName]   = useState("");
  const [txDate, setTxDate]         = useState(new Date().toISOString().slice(0, 10));
  const [accessories, setAccessories] = useState<string[]>(["ตัวเครื่อง"]);
  const [accessoriesOther, setAccessoriesOther] = useState("");

  // Photos
  const [idPhotoDataUrl, setIdPhotoDataUrl] = useState<string | null>(null);
  const idFileRef = useRef<HTMLInputElement>(null!);

  const contractHTML = useRef("");
  const receiptHTML  = useRef("");

  useEffect(() => {
    fetchRiderJob(id).then(j => {
      setJob(j);
      if (j) {
        setBuyerName(j.customer.name);
        setAddress(j.customer.address ?? "");
      }
      setLoading(false);
    });
  }, [id]);

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
          ctx.fillText("ใช้สำหรับขายโทรศัพท์ให้ Khaiphone.com เท่านั้น", 0, 0);
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

  async function handleIdPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateImageFile(file);
    if (!check.valid) { alert(check.error); return; }
    const compressed = await compressImage(file);
    const dataUrl = await applyWatermark(compressed);
    setIdPhotoDataUrl(dataUrl);
  }

  async function handleGenerate() {
    if (!job) return;
    if (!buyerName.trim()) { setError("กรุณากรอกชื่อผู้ขาย"); return; }
    setError("");
    setGenerating(true);

    try {
      const r       = job;
      const now     = new Date();
      const docNo   = r.orderNumber;
      const dateStr = thDate(txDate + "T00:00:00");
      const timeStr = thTime(now.toISOString());
      const genTs   = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
      const dateShort = shortDate(txDate + "T00:00:00");

      const cName  = buyerName.trim();
      const cPhone = r.customer.phone;
      const cId    = idNumber || "—";
      const cAddr  = address   || "—";
      const cEmail = r.customer.email || "—";
      const dobStr = dob ? thDate(dob + "T00:00:00") : "";
      const price  = r.device.actualPrice ?? r.device.estimatedPrice;
      const payM   = r.payment.method;
      const payTh  = payM === "cash" ? "เงินสด" : "โอนผ่านธนาคาร";
      const accStr = esc([...accessories, ...(accessoriesOther.trim() ? [accessoriesOther.trim()] : [])].join(", ") || "—");

      // Embed logo
      let logoSrc = "/logo-icon.webp";
      try {
        const resp = await fetch("/logo-icon.webp");
        const blob = await resp.blob();
        logoSrc = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch {}

      const contractNo = esc(docNo);
      const receiptNo  = `${esc(docNo)}-R`;

      // ── CONTRACT ────────────────────────────────────────────────────────────
      let cPage = `<div class="header">
        <div class="logo-area">
          <img src="${logoSrc}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0">
          <div><div class="logo-name">Khaiphone.com</div><div class="logo-sub">รับซื้อ-ขาย Apple มือสอง</div></div>
        </div>
        <div class="title-center">
          <h1>สัญญาซื้อขายโทรศัพท์มือถือมือสอง</h1>
          <div class="between">ระหว่าง <strong>ผู้ขาย</strong> และ <strong style="color:#FFD700">Khaiphone.com</strong></div>
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
              <div style="font-weight:700;font-size:13px;color:#1a1a2e;margin-bottom:5px">Khaiphone.com</div>
              <div style="font-size:10px;color:#666;line-height:1.5;margin-bottom:8px">ประกอบธุรกิจรับซื้อ-ขายโทรศัพท์มือถือ<br>และอุปกรณ์อิเล็กทรอนิกส์มือสอง</div>
              <div class="shop-row">📞 โทรศัพท์: 095-553-5167</div>
              <div class="shop-row">💬 LINE: @khaiphone</div>
              <div class="shop-row">🌐 เว็บไซต์: khaiphone.com</div>
              ${staffName ? `<div style="margin-top:7px;padding:6px 9px;background:#1a1a2e;border-radius:6px"><div style="font-size:8px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">เจ้าหน้าที่ผู้ดำเนินการ</div><div style="font-size:11px;font-weight:600;color:#fff">${esc(staffName)}</div></div>` : ""}
            </div>
          </div>
          <div class="icard">
            <div class="icard-hd"><div class="hd-num">2</div> ผู้ขาย</div>
            <div class="icard-body">
              <div class="f"><span class="fl">ชื่อ-นามสกุล</span><span class="fv">${esc(cName)}</span></div>
              <div class="f"><span class="fl">เลขบัตรประชาชน</span><span class="fv" style="font-family:monospace">${esc(cId)}</span></div>
              ${dobStr ? `<div class="f"><span class="fl">วันเดือนปีเกิด</span><span class="fv">${esc(dobStr)}</span></div>` : ""}
              <div class="f"><span class="fl">ที่อยู่</span><span class="fv">${esc(cAddr)}</span></div>
              <div class="f"><span class="fl">เบอร์โทรศัพท์</span><span class="fv">${esc(cPhone)}</span></div>
              <div class="f"><span class="fl">อีเมล</span><span class="fv">${esc(cEmail)}</span></div>
            </div>
          </div>
          <div class="icard">
            <div class="icard-hd"><div class="hd-num">3</div> ราคาซื้อขายและการชำระเงิน</div>
            <div class="icard-body">
              <div class="price-label">ราคาซื้อขายรวมทั้งสิ้น</div>
              <div class="price-big">${price.toLocaleString("th-TH")}</div>
              <div style="text-align:center;font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:4px">บาท</div>
              <div style="text-align:center;font-size:10px;color:#666;margin-bottom:7px">${bahtWords(price)}</div>
              <div style="border-top:1px solid #eee;padding-top:7px;margin-top:4px">
                <div class="pay-badge">✓ ${payTh}</div>
                ${payM === "transfer" ? `
                  <div class="f"><span class="fl">ธนาคาร</span><span class="fv">${esc(r.payment.bankName || "—")}</span></div>
                  <div class="f"><span class="fl">ชื่อบัญชี</span><span class="fv">${esc(r.payment.accountName || "—")}</span></div>
                  <div class="f"><span class="fl">เลขที่บัญชี</span><span class="fv" style="font-family:monospace">${esc(r.payment.accountNumber || "—")}</span></div>
                ` : ""}
              </div>
            </div>
          </div>
        </div>
        <div class="sec">📱 รายละเอียดทรัพย์สินที่ซื้อขาย</div>
        <table class="dtable">
          <tr><th>ประเภทอุปกรณ์</th><th>IMEI</th><th>ยี่ห้อ / รุ่น</th><th>Serial Number</th></tr>
          <tr>
            <td>โทรศัพท์มือถือ</td>
            <td style="font-family:monospace">${esc(r.inspection?.imei || "—")}</td>
            <td style="font-weight:600">${esc(r.device.model)}</td>
            <td style="font-family:monospace">${esc(r.inspection?.serial || "—")}</td>
          </tr>
          <tr><th>ความจุ</th><th>สภาพสินค้า</th><th>สี</th><th>อุปกรณ์ที่ให้มา</th></tr>
          <tr>
            <td>${esc(r.device.storage)}</td>
            <td>${esc(r.device.condition)}</td>
            <td>${esc(r.device.color || "—")}</td>
            <td>${accStr}</td>
          </tr>
          <tr><td colspan="3" style="font-weight:700;text-align:right;background:#f5f4f0">ราคาซื้อขาย</td><td style="font-weight:700;color:#c9a84c">฿${price.toLocaleString("th-TH")}</td></tr>
        </table>
        <div class="two-col">
          <div>
            <div class="sec">✅ ข้อตกลงและคำรับรองของผู้ขาย</div>
            <ol class="terms-ol">
              <li>ผู้ขายเป็นเจ้าของทรัพย์สินดังกล่าวโดยชอบด้วยกฎหมาย และมีสิทธิ์สมบูรณ์ในการขาย โอน และส่งมอบทรัพย์สินดังกล่าว</li>
              <li>ทรัพย์สินดังกล่าวไม่ได้มาจากการกระทำผิดกฎหมาย ลักทรัพย์ ฉ้อโกง ยักยอก หรือการกระทำผิดใดๆ</li>
              <li>ทรัพย์สินดังกล่าวไม่มีการผูกพัน สิทธิร้องกลับ หรือข้อพิพาทพาทางกฎหมายใดๆ</li>
              <li>ผู้ขายได้ลบข้อมูลส่วนตัวทั้งหมดออกจากอุปกรณ์แล้ว และยินยอมให้ผู้รับซื้อดำเนินการรีเซ็ต ล้างข้อมูล ตรวจสอบอุปกรณ์ได้</li>
              <li>ผู้ขายรับรองว่าอุปกรณ์ไม่ได้ถูกล็อค iCloud, Find My iPhone, MDM หรือระบบรักษาความปลอดภัยใดๆ</li>
              <li>หากตรวจพบภายหลังว่าข้อมูลที่ให้ไว้เป็นเท็จ ผู้ขายยืนยอมรับผิดชอบค่าเสียหายทั้งหมด</li>
              <li>กรรมสิทธิ์ในทรัพย์สินจะโอนให้ผู้รับซื้อทันทีเมื่อผู้ขายได้รับชำระเงินครบถ้วน</li>
            </ol>
          </div>
          <div>
            <div class="sec">🔒 การคุ้มครองข้อมูลส่วนบุคคล (PDPA)</div>
            <div class="pdpa-box">
              <div style="color:#78350f;font-size:10px;margin-bottom:5px">ผู้ขายยินยอมให้ผู้รับซื้อ เก็บ ใช้ และประมวลผลข้อมูลส่วนบุคคล เพื่อวัตถุประสงค์ดังต่อไปนี้</div>
              <ul class="pdpa-list"><li>ใช้ในการทำธุรกรรมซื้อขาย</li><li>ตรวจสอบและยืนยันตัวตน</li><li>ป้องกันการทุจริต</li><li>จัดเก็บเป็นหลักฐานทางธุรกิจและกฎหมาย</li></ul>
            </div>
          </div>
        </div>
        ${idPhotoDataUrl ? `<div class="id-photo-wrap"><div class="id-photo-hd">📷 เอกสารยืนยันตัวตนผู้ขาย — สำเนาบัตรประชาชน (มี Watermark)</div><img src="${idPhotoDataUrl}" alt="บัตรประชาชน"></div>` : ""}
      </div>
      <div class="footer">
        <div>
          <div style="font-size:11px;font-weight:700;color:#FFD700;margin-bottom:4px">🛡️ การยืนยันเอกสารดิจิทัล</div>
          <div class="fv-row"><span class="fv-lbl">Document ID :</span><span class="fv-val">${contractNo}</span></div>
          <div class="fv-row"><span class="fv-lbl">Document Generated :</span><span class="fv-val">${genTs}</span></div>
          <div class="fv-row"><span class="fv-lbl">ตรวจสอบเอกสารได้ที่ :</span><span class="fv-val">khaiphone.com/verify</span></div>
        </div>
        <div style="text-align:right">
          <div class="footer-brand">Khaiphone.com</div>
          <div class="footer-info">รับซื้อ-ขาย Apple มือสอง<br>📞 095-553-5167 &nbsp;💬 LINE: @khaiphone<br>🌐 khaiphone.com</div>
        </div>
      </div>`;

      // ── RECEIPT ─────────────────────────────────────────────────────────────
      let rPage = `<div class="header">
        <div class="logo-area">
          <img src="${logoSrc}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0">
          <div><div class="logo-name">Khaiphone.com</div><div class="logo-sub">รับซื้อ-ขาย Apple มือสอง</div></div>
        </div>
        <div class="title-center"><h1>ใบสำคัญรับเงิน</h1><div class="between">PAYMENT RECEIPT</div></div>
        <div class="cno-box">
          <div class="cno-label">เลขที่ใบรับเงิน (RECEIPT NO.)</div>
          <div class="cno-value">${receiptNo}</div>
          <div class="cno-date">วันที่ ${dateStr}<br>เวลา ${timeStr} น.</div>
        </div>
      </div>
      <div class="content">
        <div class="two-col" style="margin-bottom:12px">
          <div class="icard">
            <div class="icard-hd"><div class="hd-num">1</div> ผู้รับเงิน (ผู้ขาย)</div>
            <div class="icard-body">
              <div class="f"><span class="fl">ชื่อ-นามสกุล</span><span class="fv" style="font-size:13px;font-weight:700">${esc(cName)}</span></div>
              <div class="f"><span class="fl">เลขบัตรประชาชน</span><span class="fv" style="font-family:monospace">${esc(cId)}</span></div>
              <div class="f"><span class="fl">เบอร์โทรศัพท์</span><span class="fv">${esc(cPhone)}</span></div>
            </div>
          </div>
          <div class="icard">
            <div class="icard-hd"><div class="hd-num">2</div> ผู้จ่ายเงิน (ผู้รับซื้อ)</div>
            <div class="icard-body">
              <div style="font-weight:700;font-size:13px;color:#1a1a2e;margin-bottom:5px">Khaiphone.com</div>
              <div class="shop-row">📞 โทรศัพท์: 095-553-5167</div>
              <div class="shop-row">💬 LINE: @khaiphone</div>
              <div class="shop-row">🌐 เว็บไซต์: khaiphone.com</div>
            </div>
          </div>
        </div>
        <div class="two-col" style="margin-bottom:12px">
          <div>
            <div class="sec">📱 รายละเอียดสินค้า</div>
            <table class="dtable">
              <tr><th>รายการ</th><th>รายละเอียด</th></tr>
              <tr><td>รุ่น / Model</td><td style="font-weight:600">${esc(r.device.model)}</td></tr>
              <tr><td>ความจุ / Storage</td><td>${esc(r.device.storage)}</td></tr>
              <tr><td>สี / Color</td><td>${esc(r.device.color || "—")}</td></tr>
              <tr><td>IMEI</td><td style="font-family:monospace;font-size:10px">${esc(r.inspection?.imei || "—")}</td></tr>
              <tr><td>Serial Number</td><td style="font-family:monospace;font-size:10px">${esc(r.inspection?.serial || "—")}</td></tr>
              <tr><td>สภาพ / Condition</td><td>${esc(r.device.condition)}</td></tr>
              <tr><td>อุปกรณ์ที่ให้มา</td><td>${accStr}</td></tr>
              <tr><td>วันที่ทำรายการ</td><td>${dateStr}</td></tr>
            </table>
          </div>
          <div>
            <div class="sec">💰 รายละเอียดการชำระเงิน</div>
            <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
              <div style="background:#1a1a2e;padding:10px 14px;text-align:center">
                <div style="font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">จำนวนเงินทั้งสิ้น</div>
                <div style="font-size:30px;font-weight:800;color:#FFD700;font-family:monospace;line-height:1">${price.toLocaleString("th-TH")}</div>
                <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.8)">บาท</div>
                <div style="font-size:10px;color:rgba(255,255,255,.5);margin-top:3px">${bahtWords(price)}</div>
              </div>
              <div style="padding:10px 12px;font-size:10.5px;line-height:1.8">
                <div style="display:flex;justify-content:space-between"><span style="color:#aaa">วิธีชำระเงิน</span><span style="font-weight:600">${payTh}</span></div>
                ${payM === "transfer" ? `
                  <div style="display:flex;justify-content:space-between"><span style="color:#aaa">ธนาคาร</span><span style="font-weight:600">${esc(r.payment.bankName || "—")}</span></div>
                  <div style="display:flex;justify-content:space-between"><span style="color:#aaa">เลขบัญชี</span><span style="font-weight:600;font-family:monospace">${esc(r.payment.accountNumber || "—")}</span></div>` : ""}
              </div>
            </div>
          </div>
        </div>
        <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:8px;padding:12px 14px;margin-bottom:12px">
          <div style="font-size:10.5px;font-weight:700;color:#15803d;margin-bottom:6px">✅ ข้าพเจ้าขอรับรองว่า</div>
          <div style="font-size:10.5px;color:#166534;line-height:1.7">ข้าพเจ้า <strong>${esc(cName)}</strong> ได้รับเงินจำนวน <strong>${price.toLocaleString("th-TH")} บาทถ้วน</strong> จาก <strong>${esc(staffName || "Khaiphone.com")}</strong> เป็นค่าขายโทรศัพท์มือถือ <strong>${esc(r.device.model)} ${esc(r.device.storage)}</strong> ตามสัญญาเลขที่ <strong>${receiptNo}</strong> เรียบร้อยแล้ว โดยสมัครใจ</div>
        </div>
        ${idPhotoDataUrl ? `<div class="id-photo-wrap"><div class="id-photo-hd">📷 เอกสารยืนยันตัวตนผู้ขาย — สำเนาบัตรประชาชน (มี Watermark)</div><img src="${idPhotoDataUrl}" alt="บัตรประชาชน"></div>` : ""}
        <div style="margin:10px 0;padding:9px 13px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa">
          <div style="font-size:9.5px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">📎 หลักฐานที่แนบในระบบ</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 16px">
            <div style="font-size:10px;${idPhotoDataUrl ? "color:#065f46;font-weight:600" : "color:#aaa"}">${idPhotoDataUrl ? "✓" : "—"} สำเนาบัตรประชาชน</div>
            <div style="font-size:10px;${r.inspection?.criteria?.length ? "color:#065f46;font-weight:600" : "color:#aaa"}">${r.inspection?.criteria?.length ? "✓" : "—"} ผลตรวจสภาพเครื่อง</div>
          </div>
        </div>
      </div>
      <div class="footer">
        <div>
          <div style="font-size:11px;font-weight:700;color:#FFD700;margin-bottom:4px">🛡️ การยืนยันเอกสารดิจิทัล</div>
          <div class="fv-row"><span class="fv-lbl">Document ID :</span><span class="fv-val">${receiptNo}</span></div>
          <div class="fv-row"><span class="fv-lbl">Document Generated :</span><span class="fv-val">${genTs}</span></div>
          <div class="fv-row"><span class="fv-lbl">Verification :</span><span class="fv-val">${receiptNo}-${dateShort.replace(/ \/ /g, "")}</span></div>
        </div>
        <div style="text-align:right">
          <div class="footer-brand">Khaiphone.com</div>
          <div class="footer-info">รับซื้อ-ขาย Apple มือสอง<br>📞 095-553-5167 &nbsp;💬 LINE: @khaiphone</div>
        </div>
      </div>`;

      contractHTML.current = cPage;
      receiptHTML.current  = rPage;

      // Upload
      const printCSS = "@media print{.header,.footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{max-width:none}}";
      const wrap = (body: string) =>
        `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">${FONT_LINK}<style>${DOC_CSS}${printCSS}</style></head><body>${body}</body></html>`;

      const [cBlob, rBlob] = [
        new Blob([wrap(cPage)], { type: "text/html;charset=utf-8" }),
        new Blob([wrap(rPage)], { type: "text/html;charset=utf-8" }),
      ];

      const cPath = `contracts/${id}/${docNo}-contract.html`;
      const rPath = `contracts/${id}/${docNo}-receipt.html`;

      const [cu, ru] = await Promise.all([
        supabase.storage.from("inspection-photos").upload(cPath, cBlob, { upsert: true, contentType: "text/html" }),
        supabase.storage.from("inspection-photos").upload(rPath, rBlob, { upsert: true, contentType: "text/html" }),
      ]);

      if (cu.error || ru.error) throw new Error("อัปโหลดเอกสารไม่สำเร็จ");

      await saveContractUrls(id, cu.data.path, ru.data.path);
      await markContractSigned(id);

      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setGenerating(false);
    }
  }

  function openDoc(type: "contract" | "receipt") {
    const body = type === "contract" ? contractHTML.current : receiptHTML.current;
    const printCSS = "@media print{.header,.footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{max-width:none}}";
    const full = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">${FONT_LINK}<style>${DOC_CSS}${printCSS}</style></head><body>${body}</body></html>`;
    const blob = new Blob([full], { type: "text/html;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${BORDER}`, borderTopColor: ACCENT, animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!job) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: TEXT2 }}>ไม่พบงาน</p>
    </div>
  );

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: `1px solid ${BORDER}`, background: CARD,
    fontSize: 14, color: TEXT, fontFamily: "inherit", outline: "none",
  };

  const labelSt: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 5,
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 0 }}>
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>ออกเอกสารสัญญา</p>
          <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>{job.orderNumber} · {job.customer.name}</p>
        </div>
        <FileText size={20} color={ACCENT} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

        {done ? (
          /* ── Success state ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.25)", borderRadius: 14, padding: 20, textAlign: "center" }}>
              <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: TEXT }}>✅ ออกเอกสารสำเร็จ</p>
              <p style={{ margin: 0, fontSize: 13, color: TEXT2 }}>สัญญาและใบรับเงินถูกบันทึกในระบบแล้ว</p>
            </div>

            <button onClick={() => openDoc("contract")} style={{
              padding: "14px 16px", borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`,
              fontSize: 14, fontWeight: 600, color: TEXT, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              📄 ดูสัญญาซื้อขาย
            </button>

            <button onClick={() => openDoc("receipt")} style={{
              padding: "14px 16px", borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`,
              fontSize: 14, fontWeight: 600, color: TEXT, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              🧾 ดูใบรับเงิน
            </button>

            <button onClick={() => router.push(`/rider/job/${id}/payment`)} style={{
              padding: 16, borderRadius: 14, background: ACCENT, border: "none",
              fontSize: 16, fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "inherit",
            }}>
              ไปหน้าชำระเงิน →
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <>
            {/* Summary */}
            <div style={{ background: CARD, borderRadius: 14, padding: "14px 16px" }}>
              <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: TEXT }}>ข้อมูลจากระบบ</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  ["อุปกรณ์", `${job.device.model} ${job.device.storage}`],
                  ["ราคาตกลง", `฿${(job.device.actualPrice ?? job.device.estimatedPrice).toLocaleString("th-TH")}`],
                  ["วิธีชำระ", job.payment.method === "cash" ? "เงินสด" : "โอนเงิน"],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: TEXT2 }}>{l}</span>
                    <span style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Buyer info */}
            <div style={{ background: CARD, borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TEXT }}>ข้อมูลผู้ขาย</p>

              <div>
                <label style={labelSt}>ชื่อ-นามสกุลในสัญญา <span style={{ color: "#FF453A" }}>*</span></label>
                <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="ชื่อตามบัตรประชาชน" style={inputSt} />
              </div>

              <div>
                <label style={labelSt}>เลขบัตรประชาชน</label>
                <input type="text" inputMode="numeric" value={idNumber} onChange={e => setIdNumber(formatIdNumber(e.target.value))} placeholder="X-XXXX-XXXXX-XX-X" maxLength={17} style={{ ...inputSt, fontFamily: "monospace", letterSpacing: 1 }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelSt}>วันเดือนปีเกิด</label>
                  <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>วันที่ทำสัญญา</label>
                  <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} style={inputSt} />
                </div>
              </div>

              <div>
                <label style={labelSt}>ที่อยู่</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="ที่อยู่ตามบัตรประชาชน" style={inputSt} />
              </div>

              <div>
                <label style={labelSt}>ชื่อเจ้าหน้าที่ผู้รับซื้อ (ไรเดอร์)</label>
                <input type="text" value={staffName} onChange={e => setStaffName(e.target.value)} placeholder="ชื่อของคุณ" style={inputSt} />
              </div>
            </div>

            {/* Accessories */}
            <div style={{ background: CARD, borderRadius: 14, padding: "14px 16px" }}>
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: TEXT }}>อุปกรณ์ที่ให้มา</p>
              {["ตัวเครื่อง", "กล่อง", "สายชาร์จ", "หัวชาร์จ", "EarPods", "ฟิล์ม/เคส"].map(item => (
                <label key={item} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 5, border: `2px solid ${accessories.includes(item) ? ACCENT : BORDER}`,
                    background: accessories.includes(item) ? ACCENT : "transparent", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {accessories.includes(item) && <span style={{ fontSize: 12, color: "#000", fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 14, color: TEXT }}>{item}</span>
                  <input type="checkbox" checked={accessories.includes(item)} onChange={e => {
                    setAccessories(prev => e.target.checked ? [...prev, item] : prev.filter(x => x !== item));
                  }} style={{ display: "none" }} />
                </label>
              ))}
              <input
                type="text"
                value={accessoriesOther}
                onChange={e => setAccessoriesOther(e.target.value)}
                placeholder="อุปกรณ์อื่นๆ..."
                style={{ ...inputSt, marginTop: 10 }}
              />
            </div>

            {/* ID Card Photo */}
            <div style={{ background: CARD, borderRadius: 14, padding: "14px 16px" }}>
              <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: TEXT }}>ถ่ายบัตรประชาชนผู้ขาย</p>
              <p style={{ margin: "0 0 10px", fontSize: 12, color: TEXT2 }}>จะมี Watermark โดยอัตโนมัติ</p>
              <button onClick={() => idFileRef.current?.click()} style={{
                width: "100%", aspectRatio: "16/9", background: "#111", border: `1.5px dashed ${idPhotoDataUrl ? ACCENT : BORDER}`,
                borderRadius: 12, cursor: "pointer", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {idPhotoDataUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={idPhotoDataUrl} alt="id card" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <p style={{ color: TEXT2, fontSize: 13 }}>แตะเพื่อถ่ายรูป / เลือกรูป</p>
                }
              </button>
              <input ref={idFileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                onChange={handleIdPhoto} />
            </div>

            {error && (
              <div style={{ background: "rgba(255,69,58,0.1)", border: "1px solid rgba(255,69,58,0.3)", borderRadius: 10, padding: "10px 14px" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#FF453A" }}>{error}</p>
              </div>
            )}
          </>
        )}
      </div>

      {!done && (
        <div style={{ padding: "16px 20px", paddingBottom: "calc(16px + env(safe-area-inset-bottom))", background: BG, borderTop: `1px solid ${BORDER}` }}>
          <button onClick={handleGenerate} disabled={generating} style={{
            width: "100%", padding: 16, borderRadius: 14, background: ACCENT, border: "none",
            fontSize: 16, fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "inherit",
            opacity: generating ? 0.6 : 1,
          }}>
            {generating ? "กำลังสร้างเอกสาร..." : "📄 สร้างสัญญา + ใบรับเงิน"}
          </button>
        </div>
      )}
    </div>
  );
}
