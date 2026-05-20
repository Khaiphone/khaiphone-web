import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const order = req.nextUrl.searchParams.get("order");
  const phone = req.nextUrl.searchParams.get("phone");
  const type  = req.nextUrl.searchParams.get("type"); // "contract" | "receipt"

  if (!order || !phone || (type !== "contract" && type !== "receipt")) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const supabase = createServerClient();

  // Fetch the request row, verifying it exists
  const { data: row } = await supabase
    .from("requests")
    .select("customer_phone, contract_url, receipt_url")
    .ilike("order_number", order)
    .single();

  if (!row) return new NextResponse("Not found", { status: 404 });

  // Verify phone — same normalisation as fetchRequestByOrderNumber
  const dbPhone    = (row.customer_phone ?? "").replace(/\D/g, "");
  const inputPhone = phone.replace(/\D/g, "");
  if (dbPhone !== inputPhone) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  const storagePath = type === "contract" ? row.contract_url : row.receipt_url;
  if (!storagePath) return new NextResponse("Document not ready", { status: 404 });

  // Download using service-role (bypasses RLS — private bucket)
  const { data: blob, error } = await supabase.storage
    .from("inspection-photos")
    .download(storagePath);

  if (error || !blob) {
    console.error("contract download error:", error);
    return new NextResponse("Storage error", { status: 500 });
  }

  const html = await blob.text();
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
