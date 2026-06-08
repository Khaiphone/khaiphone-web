"use server";

import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";
import type { StockQuote, QuoteStatus, QuoteItem } from "@/lib/stock/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any): StockQuote {
  return {
    id: r.id,
    status: r.status as QuoteStatus,
    customerName: r.customer_name,
    customerPhone: r.customer_phone ?? "",
    customerEmail: r.customer_email ?? "",
    customerAddress: r.customer_address ?? "",
    customerTaxId: r.customer_tax_id ?? "",
    items: r.items ?? [],
    subtotal: r.subtotal ?? 0,
    discountAmount: r.discount_amount ?? 0,
    vatRate: r.vat_rate ?? 0,
    vatAmount: r.vat_amount ?? 0,
    total: r.total ?? 0,
    validUntil: r.valid_until ?? null,
    paymentTerms: r.payment_terms ?? "",
    note: r.note ?? "",
    terms: r.terms ?? "",
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    acceptedAt: r.accepted_at ?? null,
    saleRef: r.sale_ref ?? null,
  };
}

export async function createQuote(input: {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerTaxId: string;
  items: QuoteItem[];
  subtotal: number;
  discountAmount: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  validUntil: string | null;
  paymentTerms: string;
  note: string;
  terms: string;
  status: QuoteStatus;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const user = await requireAuth();
  const supabase = createServerClient();
  const year = new Date().getFullYear();
  const { data: lastRow } = await supabase
    .from("stock_quotes")
    .select("id")
    .like("id", `QUO-${year}-%`)
    .order("id", { ascending: false })
    .limit(1);
  const lastSeq = lastRow?.[0]?.id ? parseInt(lastRow[0].id.split("-")[2], 10) : 0;
  const id = `QUO-${year}-${String(lastSeq + 1).padStart(5, "0")}`;
  const now = new Date().toISOString();
  const { error } = await supabase.from("stock_quotes").insert({
    id,
    status: input.status,
    customer_name: input.customerName,
    customer_phone: input.customerPhone || null,
    customer_email: input.customerEmail || null,
    customer_address: input.customerAddress || null,
    customer_tax_id: input.customerTaxId || null,
    items: input.items,
    subtotal: input.subtotal,
    discount_amount: input.discountAmount,
    vat_rate: input.vatRate,
    vat_amount: input.vatAmount,
    total: input.total,
    valid_until: input.validUntil || null,
    payment_terms: input.paymentTerms || null,
    note: input.note || null,
    terms: input.terms || null,
    created_by: user.email ?? user.id,
    created_at: now,
    updated_at: now,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, id };
}

export async function fetchQuotes(): Promise<StockQuote[]> {
  await requireAuth();
  const supabase = createServerClient();
  // Auto-expire sent quotes past valid_until
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from("stock_quotes")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("status", "sent")
    .not("valid_until", "is", null)
    .lt("valid_until", today);
  const { data } = await supabase
    .from("stock_quotes")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapRow);
}

export async function fetchQuote(id: string): Promise<StockQuote | null> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase.from("stock_quotes").select("*").eq("id", id).single();
  if (!data) return null;
  return mapRow(data);
}

export async function updateQuoteStatus(
  id: string,
  status: QuoteStatus,
): Promise<{ success: boolean }> {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const update: Record<string, unknown> = { status, updated_at: now };
  if (status === "accepted") update.accepted_at = now;
  const { error } = await supabase.from("stock_quotes").update(update).eq("id", id);
  return { success: !error };
}

export async function acceptQuoteAndReserve(
  quoteId: string,
): Promise<{ success: boolean; stockIds: string[] }> {
  await requireAuth();
  const supabase = createServerClient();
  const { data: quote } = await supabase
    .from("stock_quotes")
    .select("items")
    .eq("id", quoteId)
    .single();
  if (!quote) return { success: false, stockIds: [] };

  const items: QuoteItem[] = quote.items ?? [];
  const now = new Date().toISOString();
  for (const item of items) {
    const { data: stock } = await supabase
      .from("stocks")
      .select("status, status_log")
      .eq("id", item.stockId)
      .single();
    if (!stock || stock.status === "ขายแล้ว") continue;
    const newLog = [
      ...(stock.status_log ?? []),
      { status: "จองแล้ว", timestamp: now, note: `จองสำหรับใบเสนอราคา ${quoteId}`, by: "system" },
    ];
    await supabase
      .from("stocks")
      .update({ status: "จองแล้ว", status_log: newLog, updated_at: now })
      .eq("id", item.stockId);
  }
  await supabase
    .from("stock_quotes")
    .update({ status: "accepted", accepted_at: now, updated_at: now })
    .eq("id", quoteId);
  return { success: true, stockIds: items.map((i) => i.stockId) };
}

// ── Print document ────────────────────────────────────────────────────────────

export type QuoteDocument = {
  id: string;
  date: string;
  validUntil: string | null;
  status: QuoteStatus;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerTaxId: string;
  items: QuoteItem[];
  subtotal: number;
  discountAmount: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  paymentTerms: string;
  note: string;
  terms: string;
  createdBy: string;
  businessName: string;
  businessTaxId: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
};

export async function fetchQuoteDocument(id: string): Promise<QuoteDocument | null> {
  await requireAuth();
  const supabase = createServerClient();
  const [{ data: quote }, { data: settings }] = await Promise.all([
    supabase.from("stock_quotes").select("*").eq("id", id).single(),
    supabase.from("finance_settings").select("business_name, tax_id, address, phone, email").eq("id", 1).single(),
  ]);
  if (!quote) return null;
  return {
    id: quote.id,
    date: quote.created_at.slice(0, 10),
    validUntil: quote.valid_until ?? null,
    status: quote.status,
    customerName: quote.customer_name,
    customerPhone: quote.customer_phone ?? "",
    customerEmail: quote.customer_email ?? "",
    customerAddress: quote.customer_address ?? "",
    customerTaxId: quote.customer_tax_id ?? "",
    items: quote.items ?? [],
    subtotal: quote.subtotal ?? 0,
    discountAmount: quote.discount_amount ?? 0,
    vatRate: quote.vat_rate ?? 0,
    vatAmount: quote.vat_amount ?? 0,
    total: quote.total ?? 0,
    paymentTerms: quote.payment_terms ?? "",
    note: quote.note ?? "",
    terms: quote.terms ?? "",
    createdBy: quote.created_by,
    businessName: settings?.business_name ?? "KHAIPHONE",
    businessTaxId: settings?.tax_id ?? "",
    businessAddress: settings?.address ?? "",
    businessPhone: settings?.phone ?? "",
    businessEmail: settings?.email ?? "",
  };
}

// ── Finance pipeline ──────────────────────────────────────────────────────────

export type QuotePipeline = {
  sentCount: number;
  sentValue: number;
  conversionRate: number | null; // % last 30 days
  expiringSoon: number; // expiring within 7 days
};

export async function fetchQuotePipeline(): Promise<QuotePipeline> {
  await requireAuth();
  const supabase = createServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const sevenDaysFromNow = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const { data } = await supabase
    .from("stock_quotes")
    .select("status, total, valid_until, created_at");
  const rows = data ?? [];

  const sent = rows.filter((r) => r.status === "sent");
  const sentCount = sent.length;
  const sentValue = sent.reduce((s, r) => s + (r.total ?? 0), 0);

  const recent = rows.filter((r) => (r.created_at ?? "").slice(0, 10) >= thirtyDaysAgo);
  const recentAccepted = recent.filter((r) => r.status === "accepted").length;
  const recentDecided = recent.filter((r) => r.status === "accepted" || r.status === "rejected").length;
  const conversionRate = recentDecided > 0 ? Math.round((recentAccepted / recentDecided) * 100) : null;

  const expiringSoon = sent.filter(
    (r) => r.valid_until && r.valid_until >= today && r.valid_until <= sevenDaysFromNow,
  ).length;

  return { sentCount, sentValue, conversionRate, expiringSoon };
}
