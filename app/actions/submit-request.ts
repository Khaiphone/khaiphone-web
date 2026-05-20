"use server";

import { createServerClient } from "@/lib/supabase-server";

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
  const supabase = createServerClient();

  const conditionDetails = Object.values(data.selections).filter(Boolean);

  const { error } = await supabase.from("requests").insert({
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
    status_log: [{ status: "new", timestamp: new Date().toISOString(), note: "คำขอใหม่จากเว็บไซต์" }],
    source: "website",
    customer_notes:  data.notes        || null,
    extra_devices:   data.extraDevices?.length ? data.extraDevices : [],
  });

  if (error) {
    console.error("submitRequest error:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
