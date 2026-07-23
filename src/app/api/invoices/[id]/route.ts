import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  markInvoicePaid,
  markInvoiceSent,
  rebuildHireInvoiceFromBooking,
  regenerateInvoicePdf,
  updateInvoiceLineItems,
} from "@/lib/bookings";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const action = body.action as string;

  try {
    if (action === "mark_paid") {
      const invoice = await markInvoicePaid(params.id);
      return NextResponse.json({ invoice });
    }
    if (action === "mark_sent") {
      const invoice = await markInvoiceSent(params.id);
      return NextResponse.json({ invoice });
    }
    if (action === "update_line_items") {
      const invoice = await updateInvoiceLineItems(
        params.id,
        Array.isArray(body.line_items) ? body.line_items : [],
      );
      return NextResponse.json({ invoice });
    }
    if (action === "regenerate_pdf") {
      const invoice = await regenerateInvoicePdf(params.id);
      return NextResponse.json({ invoice });
    }
    if (action === "rebuild_from_booking") {
      const invoice = await rebuildHireInvoiceFromBooking(params.id);
      return NextResponse.json({ invoice });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invoice update failed" },
      { status: 400 },
    );
  }
}
