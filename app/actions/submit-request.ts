"use server";

import { after } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { Resend } from "resend";
import { sendPushToNewRequestReceivers } from "./push";

interface ExtraDevice {
  model: string;
  storage: string;
  estimatedPrice: number;
  details: Array<{ title: string; value: string }>;
}

interface SubmissionData {
  orderNumber: string;
  model: string;
  storage: string;
  condition: string;
  selections: Record<string, string>;
  estimatedPrice: number;
  priceMin: number;
  priceMax: number;
  customer: { name: string; phone: string; email?: string };
  appointment: { method: string; date: string; time: string; location: string };
  payment: {
    method: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  };
  notes?: string;
  extraDevices?: ExtraDevice[];
}

export async function submitRequest(data: SubmissionData) {
  // Input length validation
  if (data.customer.name.length > 100)  return { success: false, error: "ชื่อยาวเกินไป" };
  if (data.customer.phone.length > 20)  return { success: false, error: "เบอร์โทรไม่ถูกต้อง" };
  if ((data.customer.email?.length ?? 0) > 200) return { success: false, error: "อีเมลยาวเกินไป" };
  if (data.model.length > 100)          return { success: false, error: "ชื่อรุ่นยาวเกินไป" };
  if ((data.notes?.length ?? 0) > 1000) return { success: false, error: "หมายเหตุยาวเกินไป (สูงสุด 1,000 ตัวอักษร)" };
  if ((data.extraDevices?.length ?? 0) > 10) return { success: false, error: "จำนวนอุปกรณ์เพิ่มเติมเกิน 10 ชิ้น" };

  const supabase = createServerClient();

  // Idempotency: if this exact orderNumber already exists, the first attempt succeeded
  // (network timeout lost the response) — return success so the client can navigate to /success
  const { count: existingCount } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("order_number", data.orderNumber);
  if ((existingCount ?? 0) > 0) return { success: true };

  // Fraud: block same phone + model within 30 minutes
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { count: dupCount } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("customer_phone", data.customer.phone)
    .eq("device_model", data.model)
    .gte("created_at", since);
  if ((dupCount ?? 0) > 0) {
    return { success: false, error: "มีคำขอของเบอร์นี้สำหรับรุ่นนี้อยู่แล้ว กรุณารอ 30 นาทีก่อนส่งใหม่" };
  }

  const conditionDetails = Object.values(data.selections).filter(Boolean);

  const { data: inserted, error } = await supabase.from("requests").insert({
    order_number:           data.orderNumber,
    customer_name:          data.customer.name,
    customer_phone:         data.customer.phone,
    customer_email:         data.customer.email || null,
    device_model:           data.model,
    device_storage:         data.storage,
    device_condition:       data.condition,
    device_condition_details: conditionDetails,
    device_selections:        data.selections,
    estimated_price:        data.estimatedPrice,
    price_range:            `${data.priceMin.toLocaleString("th-TH")} - ${data.priceMax.toLocaleString("th-TH")} บาท`,
    appt_date:              data.appointment.date,
    appt_time:              data.appointment.time,
    appt_location:          data.appointment.location,
    appt_method:            data.appointment.method,
    payment_method:         data.payment.method,
    payment_bank:           data.payment.bankName  || null,
    payment_account_name:   data.payment.accountName   || null,
    payment_account_number: data.payment.accountNumber || null,
    status:     "new",
    status_log: [{ status: "new", timestamp: new Date().toISOString(), note: "คำขอใหม่จากเว็บไซต์" }],
    source: "website",
    customer_notes:  data.notes        || null,
    extra_devices:   data.extraDevices?.length ? data.extraDevices : [],
  }).select("id").single();

  if (error) {
    console.error("submitRequest error:", error);
    return { success: false, error: error.message };
  }

  // Send email + push notification after response is returned
  after(() => Promise.all([
    sendNotificationEmail(data, inserted?.id).catch(e => console.error("email error:", e)),
    sendPushToNewRequestReceivers({
      title: `คำขอใหม่ — ${data.model} ${data.storage}`,
      body:  `${data.customer.name} · ฿${data.estimatedPrice.toLocaleString("th-TH")}`,
      url:   `/admin/requests/${inserted?.id ?? ""}`,
      tag:   "new-request",
    }).catch(e => console.error("push error:", e)),
  ]));

  return { success: true };
}

function formatPrice(n: number) {
  return n.toLocaleString("th-TH") + " บาท";
}

async function sendNotificationEmail(data: SubmissionData, uuid?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);

  const methodLabel: Record<string, string> = {
    walk_in: "เดินเข้ามาเอง",
    rider:   "รับซื้อถึงที่ (Rider)",
    mail:    "ส่งไปรษณีย์",
  };
  const payLabel: Record<string, string> = {
    cash:     "เงินสด",
    transfer: "โอนเงิน",
    promptpay: "พร้อมเพย์",
  };

  const conditionRows = Object.entries(data.selections)
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px">${k}</td><td style="padding:4px 0;font-size:13px">${v}</td></tr>`)
    .join("");

  const extraRows = (data.extraDevices ?? []).map((d, i) => `
    <tr><td colspan="2" style="padding-top:8px;font-weight:600;font-size:13px">เครื่องที่ ${i + 2}: ${d.model} ${d.storage}</td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#666;font-size:13px">ราคาประเมิน</td><td style="font-size:13px">${formatPrice(d.estimatedPrice)}</td></tr>
    ${d.details.map(r => `<tr><td style="padding:2px 12px 2px 0;color:#666;font-size:13px">${r.title}</td><td style="font-size:13px">${r.value}</td></tr>`).join("")}
  `).join("");

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#111;padding:20px 24px;border-radius:10px 10px 0 0">
        <h2 style="margin:0;color:#B8860B;font-size:18px">📋 คำขอใหม่ — ${data.orderNumber}</h2>
      </div>
      <div style="border:1px solid #e5e5e5;border-top:none;border-radius:0 0 10px 10px;padding:24px">

        <h3 style="margin:0 0 10px;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:.5px">ข้อมูลลูกค้า</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px">ชื่อ</td><td style="font-size:13px">${data.customer.name}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px">เบอร์</td><td style="font-size:13px">${data.customer.phone}</td></tr>
          ${data.customer.email ? `<tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px">อีเมล</td><td style="font-size:13px">${data.customer.email}</td></tr>` : ""}
        </table>

        <h3 style="margin:0 0 10px;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:.5px">เครื่องหลัก</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px">รุ่น</td><td style="font-weight:600;font-size:13px">${data.model} ${data.storage}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px">ราคาประเมิน</td><td style="font-weight:700;font-size:15px;color:#B8860B">${formatPrice(data.estimatedPrice)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px">ช่วงราคา</td><td style="font-size:13px">${data.priceMin.toLocaleString("th-TH")} – ${data.priceMax.toLocaleString("th-TH")} บาท</td></tr>
          ${conditionRows}
        </table>

        ${extraRows ? `<h3 style="margin:0 0 10px;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:.5px">เครื่องเพิ่มเติม</h3><table style="width:100%;border-collapse:collapse;margin-bottom:20px">${extraRows}</table>` : ""}

        <h3 style="margin:0 0 10px;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:.5px">นัดหมาย</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px">ช่องทาง</td><td style="font-size:13px">${methodLabel[data.appointment.method] ?? data.appointment.method}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px">วันที่</td><td style="font-size:13px">${data.appointment.date}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px">เวลา</td><td style="font-size:13px">${data.appointment.time}</td></tr>
          ${data.appointment.location ? `<tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px">สถานที่</td><td style="font-size:13px">${data.appointment.method === "rider" ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.appointment.location)}" style="color:#B8860B;font-weight:600;text-decoration:none">${data.appointment.location} ↗</a>` : data.appointment.location}</td></tr>` : ""}
        </table>

        <h3 style="margin:0 0 10px;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:.5px">การรับเงิน</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px">วิธี</td><td style="font-size:13px">${payLabel[data.payment.method] ?? data.payment.method}</td></tr>
          ${data.payment.bankName ? `<tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px">ธนาคาร</td><td style="font-size:13px">${data.payment.bankName}</td></tr>` : ""}
          ${data.payment.accountName ? `<tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px">ชื่อบัญชี</td><td style="font-size:13px">${data.payment.accountName}</td></tr>` : ""}
          ${data.payment.accountNumber ? `<tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px">เลขบัญชี</td><td style="font-size:13px">${data.payment.accountNumber}</td></tr>` : ""}
        </table>

        ${data.notes ? `<h3 style="margin:0 0 6px;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:.5px">หมายเหตุ</h3><p style="margin:0 0 20px;font-size:13px;color:#444">${data.notes}</p>` : ""}

        <div style="background:#F5F5F7;border-radius:8px;padding:12px 16px;text-align:center">
          <a href="https://khaiphone.com/admin/requests/${uuid ?? data.orderNumber}"
             style="color:#B8860B;font-weight:600;font-size:13px;text-decoration:none">
            ดูคำขอในระบบ →
          </a>
        </div>
      </div>
    </div>
  `;

  await resend.emails.send({
    from:    "Khaiphone <noreply@khaiphone.com>",
    to:      "panupan@khaiphone.com",
    subject: `[คำขอใหม่] ${data.orderNumber} — ${data.model} ${data.storage} (${formatPrice(data.estimatedPrice)})`,
    html,
  });
}

export async function checkOrderExists(orderNumber: string): Promise<boolean> {
  const supabase = createServerClient();
  const { count } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("order_number", orderNumber);
  return (count ?? 0) > 0;
}
