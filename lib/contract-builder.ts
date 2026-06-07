// Shared contract/receipt document builder — used by both admin and rider

export const FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">';

export const DOC_CSS = '*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Sarabun",sans-serif;max-width:780px;margin:0 auto;font-size:11px;color:#1a1a1a;line-height:1.6;background:#fff}.header{background:linear-gradient(135deg,#1a1a2e,#2a2a4e);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}.logo-area{display:flex;align-items:center;gap:10px;min-width:160px}.logo-name{color:#FFD700;font-size:14px;font-weight:800}.logo-sub{color:rgba(255,255,255,.6);font-size:9px;margin-top:1px}.title-center{text-align:center;flex:1}.title-center h1{color:#FFD700;font-size:15px;font-weight:800}.title-center .between{color:rgba(255,255,255,.8);font-size:11px;margin-top:3px}.cno-box{background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.35);border-radius:8px;padding:9px 13px;text-align:right;min-width:160px}.cno-label{color:rgba(255,255,255,.5);font-size:8.5px;text-transform:uppercase;letter-spacing:.5px}.cno-value{color:#FFD700;font-size:15px;font-weight:800;font-family:monospace;letter-spacing:.5px;margin:2px 0}.cno-date{color:rgba(255,255,255,.65);font-size:10px}.content{padding:14px 20px}.top3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}.icard{border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}.icard-hd{background:#f5f4f0;padding:7px 11px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:700;color:#333}.hd-num{width:18px;height:18px;border-radius:5px;background:#1a1a2e;color:#FFD700;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}.icard-body{padding:9px 11px;font-size:10.5px}.f{display:flex;flex-direction:column;margin-bottom:4px}.fl{font-size:9px;color:#aaa;text-transform:uppercase;letter-spacing:.4px}.fv{font-size:11px;font-weight:500;color:#1a1a1a;border-bottom:1px solid #f0f0f0;padding-bottom:2px;min-height:16px}.shop-row{display:flex;align-items:flex-start;gap:5px;font-size:10px;color:#555;margin-bottom:3px}.price-big{font-size:28px;font-weight:800;color:#c9a84c;font-family:monospace;text-align:center;padding:5px 0;line-height:1}.price-label{font-size:9px;color:#aaa;text-align:center;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}.pay-badge{display:inline-flex;align-items:center;gap:4px;background:#f0fdf4;border:1px solid #86efac;border-radius:4px;padding:3px 8px;font-size:10px;font-weight:600;color:#15803d;margin-bottom:6px}.sec{font-size:10px;font-weight:700;color:#1a1a2e;border-left:3px solid #c9a84c;padding-left:8px;margin:12px 0 7px;text-transform:uppercase;letter-spacing:.5px}.dtable{width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:10px}.dtable th{background:#1a1a2e;color:#FFD700;padding:6px 9px;text-align:left;font-weight:600;font-size:9.5px}.dtable td{padding:5px 9px;border-bottom:1px solid #f0f0f0;vertical-align:top}.dtable tr:nth-child(even) td{background:#fafafa}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:10px}.terms-ol{counter-reset:tc;list-style:none;padding:0;margin:0 0 8px}.terms-ol li{counter-increment:tc;padding:4px 0 4px 22px;position:relative;font-size:10.5px;border-bottom:1px solid #f8f8f8;line-height:1.5}.terms-ol li::before{content:counter(tc)".";position:absolute;left:0;top:4px;font-weight:700;color:#c9a84c}.check-list{list-style:none;padding:0;margin:0}.check-list li{padding:2px 0 2px 14px;position:relative;font-size:10.5px}.check-list li::before{content:"•";position:absolute;left:0;color:#c9a84c;font-weight:700}.pdpa-box{background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:10px 13px;font-size:10.5px}.pdpa-title{font-weight:700;color:#92400e;margin-bottom:5px}.pdpa-list{list-style:none;padding:0;margin:0}.pdpa-list li{padding:2px 0 2px 16px;position:relative;color:#78350f}.pdpa-list li::before{content:"✓";position:absolute;left:0;color:#c9a84c;font-weight:700}.id-photo-wrap{border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0}.photos-section{margin-top:24px;padding-top:18px;border-top:2px solid #f0f0f0}.photos-sec-hd{font-size:10px;font-weight:700;color:#1a1a2e;border-left:3px solid #c9a84c;padding-left:8px;margin:0 0 12px;text-transform:uppercase;letter-spacing:.5px}.id-photo-hd{background:#f5f4f0;padding:7px 11px;border-bottom:1px solid #e5e7eb;font-size:10.5px;font-weight:700;color:#333}.id-photo-wrap img{width:100%;max-height:200px;object-fit:contain;display:block;background:#f9f9f9}.footer{background:#1a1a2e;color:rgba(255,255,255,.65);padding:10px 20px;display:flex;align-items:flex-start;justify-content:space-between;font-size:9.5px;margin-top:14px}.fv-row{display:flex;gap:6px;margin-bottom:1px}.fv-lbl{color:rgba(255,255,255,.45)}.fv-val{color:#FFD700;font-family:monospace}.footer-brand{color:#FFD700;font-size:14px;font-weight:800;margin-bottom:3px}.footer-info{color:rgba(255,255,255,.5);font-size:9px;line-height:1.7}.rejected-box{background:#fef2f2;border:1px solid #fecaca;border-radius:5px;padding:7px 9px;font-size:10px;color:#991b1b;margin-top:8px;line-height:1.7}@media print{.header,.footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{max-width:none}}';

export function esc(s: string): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function thDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", year: "numeric", month: "long", day: "numeric" });
}

export function thTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
}

export function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")} / ${String(d.getMonth()+1).padStart(2,"0")} / ${d.getFullYear()+543}`;
}

export function bahtWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return "(ศูนย์บาทถ้วน)";
  const u = ["","หนึ่ง","สอง","สาม","สี่","ห้า","หก","เจ็ด","แปด","เก้า"];
  const p = ["","สิบ","ร้อย","พัน","หมื่น","แสน"];
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

export interface ContractDevice {
  label: string;
  model: string;
  storage: string;
  color: string;
  condition: string;
  imei: string;
  serial: string;
  accessories: string[];
  price: number;
  criteria?: Array<{ label: string; stated: string; actual: string; pass: boolean }>;
  issues?: string[];
  functionalTests?: Array<{ label: string; pass: boolean }>;
  warrantyExpiry?: string;
  batteryCycles?: number;
  batteryHealth?: number;
}

export interface ContractCtx {
  docNo: string;
  totalDevices: number;
  dateStr: string;
  timeStr: string;
  dateShort: string;
  genTs: string;
  logoSrc: string;
  cName: string;
  cPhone: string;
  cId: string;
  cAddr: string;
  cEmail: string;
  payMethod: "cash" | "transfer";
  payTh: string;
  dobStr: string;
  staffName: string;
  officerId: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  idPhotoDataUrl: string | null;
  custProdPhotoDataUrl: string | null;
  slipImgSrc: string;
}

export function buildContractPage(dev: ContractDevice, devIdx: number, isFirst: boolean, ctx: ContractCtx): string {
  const { docNo, totalDevices, dateStr, timeStr, genTs, logoSrc,
    cName, cPhone, cId, cAddr, cEmail, payTh, payMethod, dobStr,
    staffName, officerId, bankName, accountName, accountNumber,
    idPhotoDataUrl, custProdPhotoDataUrl } = ctx;

  const accStr = esc(dev.accessories.join(", ") || "—");
  const contractNo = `${esc(docNo)}${totalDevices > 1 ? `-${devIdx + 1}` : ""}`;

  let p = `<div class="header">
    <div class="logo-area">
      <img src="${logoSrc}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0">
      <div><div class="logo-name">Khaiphone.com</div><div class="logo-sub">รับซื้อ-ขาย Apple มือสอง</div></div>
    </div>
    <div class="title-center">
      <h1>สัญญาซื้อขายโทรศัพท์มือถือมือสอง</h1>
      ${dev.label ? `<div style="color:#FFD700;font-size:12px;font-weight:700;margin-top:2px">${dev.label}</div>` : ""}
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
          <div style="font-size:10px;color:#666;line-height:1.5;margin-bottom:6px">ประกอบธุรกิจรับซื้อ-ขายโทรศัพท์มือถือ<br>และอุปกรณ์อิเล็กทรอนิกส์มือสอง</div>
          <div class="shop-row">📞 โทรศัพท์: 095-553-5167</div>
          <div class="shop-row">💬 LINE: @khaiphone</div>
          <div class="shop-row">🌐 เว็บไซต์: khaiphone.com</div>
          <div style="font-size:9px;color:#aaa;margin:4px 0 6px">ต่อไปในสัญญานี้เรียกว่า "ผู้รับซื้อ"</div>
          ${officerId || staffName ? `<div style="margin-top:2px;padding:6px 9px;background:#1a1a2e;border-radius:6px"><div style="font-size:8px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">เจ้าหน้าที่ผู้ดำเนินการ</div>${officerId ? `<div style="font-size:10px;font-weight:800;color:#FFD700;font-family:monospace;letter-spacing:.5px">${esc(officerId)}</div>` : ""}<div style="font-size:11px;font-weight:600;color:#fff;margin-top:1px">${esc(staffName || "—")}</div></div>` : ""}
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
        </div>
      </div>
      <div class="icard">
        <div class="icard-hd"><div class="hd-num">3</div> ราคาซื้อขายและการชำระเงิน</div>
        <div class="icard-body">
          <div class="price-label">${dev.label ? `ราคา${dev.label}` : "ราคาซื้อขายรวมทั้งสิ้น"}</div>
          <div class="price-big">${dev.price.toLocaleString("th-TH")}</div>
          <div style="text-align:center;font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:4px">บาท</div>
          <div style="text-align:center;font-size:10px;color:#666;margin-bottom:7px">${bahtWords(dev.price)}</div>
          <div class="pay-badge">✓ ${payTh}</div>
          ${payMethod === "transfer" ? `
            <div class="f"><span class="fl">ธนาคาร</span><span class="fv">${esc(bankName||"—")}</span></div>
            <div class="f"><span class="fl">ชื่อบัญชี</span><span class="fv">${esc(accountName||"—")}</span></div>
            <div class="f"><span class="fl">เลขที่บัญชี</span><span class="fv" style="font-family:monospace">${esc(accountNumber||"—")}</span></div>
          ` : ""}
        </div>
      </div>
    </div>
    <div class="sec">📱 รายละเอียดทรัพย์สินที่ซื้อขาย${dev.label ? ` — ${dev.label}` : ""}</div>
    <table class="dtable">
      <tr><th>ประเภทอุปกรณ์</th><th>IMEI</th><th>ยี่ห้อ / รุ่น</th><th>Serial Number</th></tr>
      <tr><td>โทรศัพท์มือถือ</td><td style="font-family:monospace">${esc(dev.imei||"—")}</td><td style="font-weight:600">${esc(dev.model)}</td><td style="font-family:monospace">${esc(dev.serial||"—")}</td></tr>
      <tr><th>ความจุ</th><th>สภาพสินค้า</th><th>สี</th><th>อุปกรณ์ที่ให้มา</th></tr>
      <tr><td>${esc(dev.storage)}</td><td>${esc(dev.condition)}</td><td>${esc(dev.color||"—")}</td><td>${accStr}</td></tr>
      ${(dev.warrantyExpiry || dev.batteryHealth !== undefined) ? (() => {
        const batteryValue = dev.batteryHealth !== undefined ? dev.batteryHealth + "%" : (dev.batteryCycles !== undefined ? dev.batteryCycles + " รอบ" : "—");
        const batteryLabel = dev.batteryCycles !== undefined ? "รอบชาร์จ" : "สุขภาพแบต";
        const wStyle = dev.warrantyExpiry === "expired" ? "color:#DC2626;font-weight:600" : "";
        const wText = dev.warrantyExpiry === "expired" ? "ประกันสิ้นสุดแล้ว" : dev.warrantyExpiry ? new Date(dev.warrantyExpiry + "T00:00:00+07:00").toLocaleDateString("th-TH",{timeZone:"Asia/Bangkok",year:"numeric",month:"long",day:"numeric"}) : "—";
        return `<tr><th>การรับประกัน</th><th>${batteryLabel}</th><th colspan="2"></th></tr><tr><td style="${wStyle}">${wText}</td><td>${batteryValue}</td><td colspan="2"></td></tr>`;
      })() : ""}
      <tr><td colspan="3" style="font-weight:700;text-align:right;background:#f5f4f0">ราคา${dev.label||"ซื้อขาย"}</td><td style="font-weight:700;color:#c9a84c">฿${dev.price.toLocaleString("th-TH")}</td></tr>
    </table>`;

  if ((dev.criteria ?? []).length) {
    p += `<div class="sec">🔍 ผลการตรวจสอบสภาพจริง</div>
    <table class="dtable">
      <tr><th>รายการตรวจสอบ</th><th>สภาพที่แจ้ง</th><th>ผลตรวจจริง</th><th>ผ่าน</th></tr>
      ${(dev.criteria ?? []).map(cr => `<tr><td>${esc(cr.label)}</td><td>${esc(cr.stated)}</td><td style="${!cr.pass?"color:#DC2626;font-weight:600":""}">${esc(cr.actual)}</td><td style="text-align:center;font-size:13px">${cr.pass?"✓":"⚠"}</td></tr>`).join("")}
    </table>`;
    if ((dev.issues ?? []).length) {
      p += `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:5px;padding:7px 10px;font-size:10px;color:#991b1b;margin-bottom:10px">⚠ ปัญหาที่พบ: ${(dev.issues ?? []).map(esc).join(", ")}</div>`;
    }
    if ((dev.functionalTests ?? []).length) {
      const allPass = (dev.functionalTests ?? []).every(t => t.pass);
      p += `<div class="sec">📲 ผลทดสอบการใช้งานภายใน</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:10px">
        ${(dev.functionalTests ?? []).map(t => `<div style="display:flex;align-items:center;gap:5px;padding:5px 8px;border-radius:5px;border:1px solid ${t.pass?"#bbf7d0":"#fecaca"};background:${t.pass?"#f0fff4":"#fef2f2"};font-size:10px;color:${t.pass?"#065f46":"#991b1b"}"><span>${t.pass?"✓":"⚠"}</span><span>${esc(t.label)}</span></div>`).join("")}
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
        <li>ผู้ขายได้ลบข้อมูลส่วนตัวทั้งหมดออกจากอุปกรณ์แล้ว และยินยอมให้ผู้รับซื้อดำเนินการรีเซ็ต ล้างข้อมูล ตรวจสอบอุปกรณ์ได้</li>
        <li>ผู้ขายรับรองว่าอุปกรณ์ไม่ได้ถูกล็อค iCloud, Find My iPhone, MDM หรือระบบรักษาความปลอดภัยใดๆ</li>
        <li>หากตรวจพบภายหลังว่าข้อมูลที่ให้ไว้เป็นเท็จ ผู้ขายยืนยอมรับผิดชอบค่าเสียหายทั้งหมดที่เกิดขึ้น</li>
        <li>กรรมสิทธิ์ในทรัพย์สินจะโอนให้ผู้รับซื้อทันทีเมื่อผู้ขายได้รับชำระเงินครบถ้วน</li>
      </ol>
    </div>
    <div>
      <div class="sec">🔒 PDPA</div>
      <div class="pdpa-box">
        <div class="pdpa-title">การคุ้มครองข้อมูลส่วนบุคคล (PDPA)</div>
        <ul class="pdpa-list">
          <li>ใช้ในการทำธุรกรรมซื้อขาย</li>
          <li>ตรวจสอบและยืนยันตัวตน</li>
          <li>ป้องกันการทุจริต</li>
          <li>จัดเก็บเป็นหลักฐานทางธุรกิจและกฎหมาย</li>
        </ul>
      </div>
      <div class="rejected-box">หากตรวจพบความผิดปกติ ผู้รับซื้อมีสิทธิ์<br>• ปรับราคาซื้อขาย<br>• ยกเลิกธุรกรรม<br>• ระงับการชำระเงิน</div>
    </div>
  </div>`;

  if (isFirst && (idPhotoDataUrl || custProdPhotoDataUrl)) {
    p += `<div class="photos-section"><p class="photos-sec-hd">เอกสารและหลักฐานประกอบสัญญา</p>`;
    if (idPhotoDataUrl)      p += `<div class="id-photo-wrap"><div class="id-photo-hd">📷 สำเนาบัตรประชาชนผู้ขาย (มี Watermark)</div><img src="${idPhotoDataUrl}" alt="บัตรประชาชน"></div>`;
    if (custProdPhotoDataUrl) p += `<div class="id-photo-wrap"><div class="id-photo-hd">📸 ลูกค้าพร้อมสินค้าที่ขาย</div><img src="${custProdPhotoDataUrl}" alt="ลูกค้าพร้อมสินค้า" style="max-height:300px;object-fit:contain"></div>`;
    p += `</div>`;
  }

  p += `</div>
  <div class="footer">
    <div>
      <div style="font-size:11px;font-weight:700;color:#FFD700;margin-bottom:4px">🛡️ การยืนยันเอกสารดิจิทัล</div>
      <div class="fv-row"><span class="fv-lbl">Document ID :</span><span class="fv-val">${contractNo}</span></div>
      <div class="fv-row"><span class="fv-lbl">Request ID :</span><span class="fv-val">${esc(ctx.docNo)}</span></div>
      <div class="fv-row"><span class="fv-lbl">Document Generated :</span><span class="fv-val">${genTs}</span></div>
      <div class="fv-row"><span class="fv-lbl">ตรวจสอบเอกสารได้ที่ :</span><span class="fv-val">khaiphone.com/verify</span></div>
    </div>
    <div style="text-align:right">
      <div class="footer-brand">Khaiphone.com</div>
      <div class="footer-info">รับซื้อ-ขาย Apple มือสอง<br>📞 095-553-5167 &nbsp;💬 LINE: @khaiphone<br>🌐 khaiphone.com</div>
    </div>
  </div>`;

  return p;
}

export const SLIP_PLACEHOLDER = '<div style="margin:12px 0;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px 13px;font-size:10.5px;color:#92400e">⚠ ยังไม่มีหลักฐานการโอนเงิน</div>';

export const SLIP_BLOCK = (slipDataUrl: string) =>
  `<div style="margin:12px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden"><div style="background:#f5f4f0;padding:7px 11px;border-bottom:1px solid #e5e7eb;font-size:10.5px;font-weight:700;color:#333">📎 หลักฐานการรับเงิน</div><div style="padding:12px;text-align:center;background:#fafafa"><img src="${slipDataUrl}" style="max-width:280px;max-height:380px;border-radius:6px;border:1px solid #e5e7eb"></div></div>`;

export function buildReceiptPage(dev: ContractDevice, devIdx: number, isFirst: boolean, ctx: ContractCtx): string {
  const { docNo, totalDevices, dateStr, timeStr, dateShort, genTs, logoSrc,
    cName, cPhone, cId, cEmail, payTh, payMethod, dobStr,
    staffName, officerId, bankName, accountName, accountNumber,
    idPhotoDataUrl, custProdPhotoDataUrl, slipImgSrc } = ctx;

  const accStr = esc(dev.accessories.join(", ") || "—");
  const receiptNo = `${esc(docNo)}-R${totalDevices > 1 ? `-${devIdx + 1}` : ""}`;

  let p = `<div class="header">
    <div class="logo-area">
      <img src="${logoSrc}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0">
      <div><div class="logo-name">Khaiphone.com</div><div class="logo-sub">รับซื้อ-ขาย Apple มือสอง</div></div>
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
          <div style="font-weight:700;font-size:13px;color:#1a1a2e;margin-bottom:5px">Khaiphone.com</div>
          <div style="font-size:10px;color:#666;line-height:1.5;margin-bottom:8px">รับซื้อ-ขายโทรศัพท์มือถือและอุปกรณ์อิเล็กทรอนิกส์มือสอง</div>
          <div class="shop-row">📞 095-553-5167</div>
          ${officerId || staffName ? `<div style="margin-top:5px;font-size:10px;color:#666">ผู้ดำเนินการ: <strong>${esc(officerId ? `${officerId} ` : "")}${esc(staffName||"—")}</strong></div>` : ""}
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
          <tr><td>สี / Color</td><td>${esc(dev.color||"—")}</td></tr>
          <tr><td>IMEI</td><td style="font-family:monospace;font-size:10px">${esc(dev.imei||"—")}</td></tr>
          <tr><td>Serial Number</td><td style="font-family:monospace;font-size:10px">${esc(dev.serial||"—")}</td></tr>
          <tr><td>สภาพ / Condition</td><td>${esc(dev.condition)}</td></tr>
          <tr><td>อุปกรณ์ที่ให้มา</td><td>${accStr}</td></tr>
          <tr><td>วันที่ทำรายการ</td><td>${dateStr}</td></tr>
        </table>
      </div>
      <div>
        <div class="sec">💰 รายละเอียดการชำระเงิน</div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          <div style="background:#1a1a2e;padding:10px 14px;text-align:center">
            <div style="font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">จำนวนเงินทั้งสิ้น</div>
            <div style="font-size:30px;font-weight:800;color:#FFD700;font-family:monospace;line-height:1">${dev.price.toLocaleString("th-TH")}</div>
            <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.8)">บาท</div>
            <div style="font-size:10px;color:rgba(255,255,255,.5);margin-top:3px">${bahtWords(dev.price)}</div>
          </div>
          <div style="padding:10px 12px;font-size:10.5px;line-height:1.8">
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;padding-bottom:4px;margin-bottom:4px"><span style="color:#aaa">วิธีชำระเงิน</span><span style="font-weight:600">${payTh}</span></div>
            ${payMethod === "transfer" ? `
              <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;padding-bottom:4px;margin-bottom:4px"><span style="color:#aaa">ธนาคาร</span><span style="font-weight:600">${esc(bankName||"—")}</span></div>
              <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;padding-bottom:4px;margin-bottom:4px"><span style="color:#aaa">ชื่อบัญชี</span><span style="font-weight:600">${esc(accountName||"—")}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:#aaa">เลขบัญชี</span><span style="font-weight:600;font-family:monospace">${esc(accountNumber||"—")}</span></div>
            ` : ""}
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
        <div style="font-size:10.5px;color:#166534;line-height:1.7">ข้าพเจ้า <strong>${esc(cName)}</strong> ได้รับเงินจำนวน <strong>${dev.price.toLocaleString("th-TH")} บาทถ้วน</strong> จาก <strong>${esc(staffName||"Khaiphone.com")}</strong> เป็นค่าขาย${dev.label ? dev.label + " " : ""}โทรศัพท์มือถือ <strong>${esc(dev.model)} ${esc(dev.storage)}</strong> ตามสัญญาเลขที่ <strong>${receiptNo}</strong> เรียบร้อยแล้ว โดยสมัครใจ</div>
      </div>
      <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:8px;padding:12px 14px">
        <div style="font-size:10.5px;font-weight:700;color:#92400e;margin-bottom:6px">📝 หมายเหตุ</div>
        <div style="font-size:10.5px;color:#78350f;line-height:1.7">ทำ ณ วันที่ <strong>${dateStr}</strong> เวลา <strong>${timeStr} น.</strong><br>ผู้ดำเนินการ: <strong>${esc(officerId ? `${officerId} ` : "")}${esc(staffName||"—")}</strong><br>ใบรับเงินนี้เป็นหลักฐานการได้รับเงินครบถ้วนสมบูรณ์</div>
      </div>
    </div>`;

  if (isFirst) {
    if (payMethod !== "transfer") {
      p += `<div style="margin:12px 0;background:#f0fdf4;border:1.5px solid #86efac;border-radius:8px;padding:12px 14px;display:flex;align-items:center;gap:12px"><div style="width:40px;height:40px;background:#16a34a;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px">💵</div><div><div style="font-size:11px;font-weight:700;color:#15803d;margin-bottom:2px">ชำระเงินสดเรียบร้อยแล้ว</div><div style="font-size:10px;color:#166534">มอบเงินสดจำนวน <strong>${dev.price.toLocaleString("th-TH")} บาท</strong> ให้แก่ผู้ขายโดยตรง ณ วันที่ ${dateStr}</div></div></div>`;
    }
    if (slipImgSrc) {
      p += `<div style="margin:12px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden"><div style="background:#f5f4f0;padding:7px 11px;border-bottom:1px solid #e5e7eb;font-size:10.5px;font-weight:700;color:#333">📎 หลักฐานการรับเงิน</div><div style="padding:12px;text-align:center;background:#fafafa"><img src="${slipImgSrc}" style="max-width:280px;max-height:380px;border-radius:6px;border:1px solid #e5e7eb"></div></div>`;
    } else if (payMethod === "transfer") {
      p += `<div style="margin:12px 0;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px 13px;font-size:10.5px;color:#92400e">⚠ ยังไม่มีหลักฐานการโอนเงิน</div>`;
    }
    if (idPhotoDataUrl || custProdPhotoDataUrl) {
      p += `<div class="photos-section"><p class="photos-sec-hd">เอกสารและหลักฐานประกอบ</p>`;
      if (idPhotoDataUrl)      p += `<div class="id-photo-wrap"><div class="id-photo-hd">📷 สำเนาบัตรประชาชนผู้ขาย (มี Watermark)</div><img src="${idPhotoDataUrl}" alt="บัตรประชาชน"></div>`;
      if (custProdPhotoDataUrl) p += `<div class="id-photo-wrap"><div class="id-photo-hd">📸 ลูกค้าพร้อมสินค้าที่ขาย</div><img src="${custProdPhotoDataUrl}" alt="ลูกค้าพร้อมสินค้า" style="max-height:300px;object-fit:contain"></div>`;
      p += `</div>`;
    }
  }

  p += `</div>
  <div class="footer">
    <div>
      <div style="font-size:11px;font-weight:700;color:#FFD700;margin-bottom:4px">🛡️ การยืนยันเอกสารดิจิทัล</div>
      <div class="fv-row"><span class="fv-lbl">Document ID :</span><span class="fv-val">${receiptNo}</span></div>
      <div class="fv-row"><span class="fv-lbl">Request ID :</span><span class="fv-val">${esc(docNo)}</span></div>
      <div class="fv-row"><span class="fv-lbl">Document Generated :</span><span class="fv-val">${genTs}</span></div>
      <div class="fv-row"><span class="fv-lbl">ตรวจสอบเอกสารได้ที่ :</span><span class="fv-val">khaiphone.com/verify</span></div>
    </div>
    <div style="text-align:right">
      <div class="footer-brand">Khaiphone.com</div>
      <div class="footer-info">รับซื้อ-ขาย Apple มือสอง<br>📞 095-553-5167 &nbsp;💬 LINE: @khaiphone<br>🌐 khaiphone.com</div>
    </div>
  </div>`;

  return p;
}
