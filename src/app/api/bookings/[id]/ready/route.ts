import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createInvoiceForBooking } from "@/lib/bookings";

export async function POST(
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
  const admin = createAdminClient();

  const { data: booking, error } = await admin
    .from("bookings")
    .select("*, clients(*), equipment(*)")
    .eq("id", params.id)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  try {
    if (action === "create_hire_invoice") {
      const invoice = await createInvoiceForBooking(params.id, "hire");
      return NextResponse.json({ invoice });
    }

    if (action === "mark_payment_received") {
      // Legacy shortcut — prefer marking the hire invoice paid
      const { data, error: updateError } = await admin
        .from("bookings")
        .update({
          payment_received_at: new Date().toISOString(),
          payment_notes: body.payment_notes
            ? String(body.payment_notes)
            : booking.payment_notes,
        })
        .eq("id", params.id)
        .select("*")
        .single();

      if (updateError) throw new Error(updateError.message);
      return NextResponse.json({ booking: data });
    }

    if (action === "schedule") {
      const agreementDone = [
        "confirmed",
        "out",
        "returned",
        "invoiced",
        "paid",
      ].includes(booking.status);

      if (!agreementDone) {
        throw new Error(
          "Client must accept the Hire Agreement before you can schedule",
        );
      }

      const { data: hireInvoice } = await admin
        .from("invoices")
        .select("id, status, invoice_number")
        .eq("booking_id", params.id)
        .eq("kind", "hire")
        .maybeSingle();

      const hirePaid =
        hireInvoice?.status === "paid" || Boolean(booking.payment_received_at);

      if (!hireInvoice) {
        throw new Error(
          "Create and collect the hire invoice before scheduling",
        );
      }
      if (!hirePaid) {
        throw new Error(
          `Hire invoice ${hireInvoice.invoice_number} must be marked paid before scheduling`,
        );
      }

      if (!booking.payment_received_at) {
        await admin
          .from("bookings")
          .update({
            payment_received_at: new Date().toISOString(),
            payment_notes: `Hire invoice ${hireInvoice.invoice_number} paid`,
          })
          .eq("id", params.id);
      }

      const { data, error: updateError } = await admin
        .from("bookings")
        .update({
          scheduled_at: new Date().toISOString(),
          status: "confirmed",
        })
        .eq("id", params.id)
        .select("*")
        .single();

      if (updateError) throw new Error(updateError.message);

      await admin
        .from("equipment")
        .update({ status: "booked" })
        .eq("id", booking.equipment_id);

      return NextResponse.json({ booking: data });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 400 },
    );
  }
}
