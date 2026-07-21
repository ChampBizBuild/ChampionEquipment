import { createAdminClient } from "@/lib/supabase/admin";
import { canTransition } from "@/lib/status";
import {
  buildHireInvoiceQuote,
  defaultDueDate,
  normalizeLineItem,
  totalsFromLineItems,
} from "@/lib/invoice";
import { buildAcceptancePdf, buildInvoicePdf } from "@/lib/pdf";
import { sendConfirmationEmail, sendTermsEmail } from "@/lib/email";
import { normalizeHireDetails } from "@/lib/hireAgreement";
import {
  requireInspection,
  suggestedReturnCharges,
} from "@/lib/inspections";
import type {
  BookingStatus,
  BusinessSettings,
  DocumentTemplate,
  InvoiceKind,
  InvoiceLineItem,
} from "@/lib/types";

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function sendTermsForBooking(bookingId: string) {
  const admin = createAdminClient();

  const { data: booking, error } = await admin
    .from("bookings")
    .select("*, clients(*), equipment(*)")
    .eq("id", bookingId)
    .single();

  if (error || !booking) throw new Error(error?.message || "Booking not found");

  if (["out", "returned", "invoiced", "paid", "cancelled"].includes(booking.status)) {
    throw new Error(`Cannot send terms while booking is ${booking.status}`);
  }

  const { data: settings } = await admin
    .from("business_settings")
    .select("*")
    .limit(1)
    .single();

  const businessName = settings?.business_name || "Champion Equipment";
  const acceptUrl = `${appUrl()}/accept/${booking.accept_token}`;
  const now = new Date().toISOString();

  const { data: existingDocs } = await admin
    .from("documents")
    .select("id, type")
    .eq("booking_id", bookingId)
    .in("type", ["terms_of_trade", "hire_agreement"]);

  const haveTerms = (existingDocs || []).some((d) => d.type === "terms_of_trade");
  const haveAgreement = (existingDocs || []).some(
    (d) => d.type === "hire_agreement",
  );

  if (haveTerms || haveAgreement) {
    await admin
      .from("documents")
      .update({ sent_at: now })
      .eq("booking_id", bookingId)
      .in("type", ["terms_of_trade", "hire_agreement"]);
  }

  const toInsert = [];
  if (!haveTerms) {
    toInsert.push({
      booking_id: bookingId,
      type: "terms_of_trade",
      sent_at: now,
    });
  }
  if (!haveAgreement) {
    toInsert.push({
      booking_id: bookingId,
      type: "hire_agreement",
      sent_at: now,
    });
  }
  if (toInsert.length) {
    await admin.from("documents").insert(toInsert);
  }

  // Don't downgrade if already confirmed — only bump enquiry → terms_sent
  if (booking.status === "enquiry" || booking.status === "terms_sent") {
    await admin
      .from("bookings")
      .update({ status: "terms_sent" })
      .eq("id", bookingId);
  }

  await admin
    .from("equipment")
    .update({ status: "booked" })
    .eq("id", booking.equipment_id);

  const emailResult = await sendTermsEmail({
    to: booking.clients.email,
    clientName: booking.clients.contact_name,
    equipmentName: booking.equipment.name,
    pickupDate: booking.pickup_date,
    dropoffDate: booking.dropoff_date,
    acceptUrl,
    businessName,
  });

  return { acceptUrl, emailResult, resent: booking.status === "terms_sent" };
}

export async function acceptBookingByToken(params: {
  token: string;
  acceptedName: string;
  acceptedIp: string;
  hireDetails?: unknown;
}) {
  const admin = createAdminClient();
  const name = params.acceptedName.trim();
  if (name.length < 2) throw new Error("Please type your full name");

  const { data: booking, error } = await admin
    .from("bookings")
    .select("*, clients(*), equipment(*)")
    .eq("accept_token", params.token)
    .single();

  if (error || !booking) throw new Error("Invalid or expired acceptance link");

  if (booking.status === "confirmed" || booking.status === "out" || booking.status === "returned" || booking.status === "invoiced" || booking.status === "paid") {
    return { alreadyAccepted: true as const, bookingId: booking.id };
  }

  if (booking.status !== "terms_sent" && booking.status !== "enquiry") {
    throw new Error(`Booking cannot be accepted in status "${booking.status}"`);
  }

  const hireDetails = normalizeHireDetails(
    params.hireDetails ?? booking.hire_details,
  );

  await admin
    .from("bookings")
    .update({ hire_details: hireDetails })
    .eq("id", booking.id);

  const { data: templates } = await admin
    .from("document_templates")
    .select("*");

  const terms = (templates || []).find(
    (t: DocumentTemplate) => t.type === "terms_of_trade",
  );

  if (!terms) {
    throw new Error("Document templates are not configured");
  }

  const { data: settings } = await admin
    .from("business_settings")
    .select("*")
    .limit(1)
    .single();

  const acceptedAt = new Date().toISOString();
  const pdfBytes = await buildAcceptancePdf({
    settings: settings as BusinessSettings,
    clientName: booking.clients.contact_name,
    clientBusiness: booking.clients.business_name,
    clientPhone: booking.clients.phone || "",
    clientEmail: booking.clients.email,
    equipmentName: booking.equipment.name,
    dayRate: Number(booking.equipment.day_rate),
    pickupDate: booking.pickup_date,
    dropoffDate: booking.dropoff_date,
    acceptedName: name,
    acceptedAt,
    acceptedIp: params.acceptedIp,
    hireDetails,
    termsTitle: terms.title,
    termsBody: terms.body,
  });

  const path = `acceptances/${booking.id}/${Date.now()}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("documents")
    .upload(path, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data: signed } = await admin.storage
    .from("documents")
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  const pdfUrl = signed?.signedUrl || path;

  await admin
    .from("documents")
    .update({
      accepted_at: acceptedAt,
      accepted_name: name,
      accepted_ip: params.acceptedIp,
      pdf_url: pdfUrl,
    })
    .eq("booking_id", booking.id)
    .in("type", ["terms_of_trade", "hire_agreement"]);

  await admin.from("documents").insert({
    booking_id: booking.id,
    type: "acceptance_snapshot",
    sent_at: acceptedAt,
    accepted_at: acceptedAt,
    accepted_name: name,
    accepted_ip: params.acceptedIp,
    pdf_url: pdfUrl,
  });

  await admin
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", booking.id);

  await admin
    .from("equipment")
    .update({ status: "booked" })
    .eq("id", booking.equipment_id);

  // Hire invoice must be paid before scheduling
  await createInvoiceForBooking(booking.id, "hire");

  await sendConfirmationEmail({
    to: booking.clients.email,
    clientName: booking.clients.contact_name,
    equipmentName: booking.equipment.name,
    pickupDate: booking.pickup_date,
    dropoffDate: booking.dropoff_date,
    businessName: settings?.business_name || "Champion Equipment",
  });

  return { alreadyAccepted: false as const, bookingId: booking.id };
}

export async function transitionBookingStatus(params: {
  bookingId: string;
  to: BookingStatus;
  needsService?: boolean;
}) {
  const admin = createAdminClient();
  const { data: booking, error } = await admin
    .from("bookings")
    .select("*, clients(*), equipment(*)")
    .eq("id", params.bookingId)
    .single();

  if (error || !booking) throw new Error(error?.message || "Booking not found");

  if (params.to === "terms_sent") {
    return sendTermsForBooking(params.bookingId);
  }

  if (!canTransition(booking.status, params.to) && params.to !== booking.status) {
    // Allow operator to force-confirm if terms were already accepted offline
    if (!(booking.status === "enquiry" && params.to === "confirmed")) {
      throw new Error(
        `Cannot move booking from ${booking.status} to ${params.to}`,
      );
    }
  }

  const updates: Record<string, unknown> = { status: params.to };
  if (typeof params.needsService === "boolean") {
    updates.needs_service = params.needsService;
  }

  // Gate Out / Returned on completed condition inspections
  let returnInspection = null as Awaited<
    ReturnType<typeof requireInspection>
  > | null;
  if (params.to === "out") {
    await requireInspection(params.bookingId, "outbound");
  } else if (params.to === "returned") {
    returnInspection = await requireInspection(params.bookingId, "return");
    updates.needs_service =
      params.needsService ??
      returnInspection.needs_service ??
      booking.needs_service ??
      false;
  }

  await admin.from("bookings").update(updates).eq("id", params.bookingId);

  // Equipment status side-effects
  // Note: "terms_sent" returns early above via sendTermsForBooking.
  if (params.to === "confirmed") {
    await admin
      .from("equipment")
      .update({ status: "booked" })
      .eq("id", booking.equipment_id);
    const invoice = await createInvoiceForBooking(params.bookingId, "hire");
    return { invoice };
  } else if (params.to === "out") {
    await admin
      .from("equipment")
      .update({ status: "out" })
      .eq("id", booking.equipment_id);
  } else if (params.to === "returned") {
    const service = Boolean(updates.needs_service);
    await admin
      .from("equipment")
      .update({ status: service ? "service" : "available" })
      .eq("id", booking.equipment_id);

    const invoice = await createInvoiceForBooking(
      params.bookingId,
      "additional",
    );

    if (returnInspection) {
      const suggested = suggestedReturnCharges({
        fuelLevel: returnInspection.fuel_level,
        dropoffDate: booking.dropoff_date,
        returnDate: returnInspection.inspected_at,
        dayRate: Number(booking.equipment.day_rate),
      });

      if (suggested.length && invoice?.id) {
        const existingItems = (invoice.line_items || []) as InvoiceLineItem[];
        const merged = [...existingItems];
        for (const item of suggested) {
          const already = merged.some(
            (m) => m.description === item.description,
          );
          if (!already) merged.push(item);
        }
        if (merged.length !== existingItems.length) {
          const updated = await updateInvoiceLineItems(invoice.id, merged);
          return { invoice: updated };
        }
      }
    }

    return { invoice };
  } else if (params.to === "cancelled") {
    // Free equipment unless another active booking holds it
    const { data: others } = await admin
      .from("bookings")
      .select("id")
      .eq("equipment_id", booking.equipment_id)
      .in("status", ["terms_sent", "confirmed", "out"])
      .neq("id", params.bookingId);

    if (!others?.length) {
      await admin
        .from("equipment")
        .update({ status: "available" })
        .eq("id", booking.equipment_id);
    }
  } else if (params.to === "paid") {
    // no equipment change
  }

  return { ok: true };
}

export async function createInvoiceForBooking(
  bookingId: string,
  kind: InvoiceKind,
) {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("invoices")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("kind", kind)
    .maybeSingle();

  if (existing) return existing;

  const { data: booking, error } = await admin
    .from("bookings")
    .select("*, clients(*), equipment(*)")
    .eq("id", bookingId)
    .single();

  if (error || !booking) throw new Error(error?.message || "Booking not found");

  const { data: settings } = await admin
    .from("business_settings")
    .select("*")
    .limit(1)
    .single();

  if (!settings) throw new Error("Business settings missing");

  let line_items: InvoiceLineItem[] = [];
  let subtotal = 0;
  let gst = 0;
  let total = 0;

  if (kind === "hire") {
    const details = normalizeHireDetails(booking.hire_details);
    // false = hirer does NOT have own LCC → Champion covers at 10%
    const quote = buildHireInvoiceQuote({
      pickupDate: booking.pickup_date,
      dropoffDate: booking.dropoff_date,
      dayRate: Number(booking.equipment.day_rate),
      weekRate: Number(booking.equipment.week_rate),
      gstRegistered: Boolean(settings.gst_registered),
      needsChampionLcc: details.lcc_insurance === false,
      travelFloatFee: details.travel_float_fee,
      additionalHireCharge: details.additional_hire_charge,
    });
    line_items = quote.line_items;
    subtotal = quote.subtotal;
    gst = quote.gst;
    total = quote.total;
  }
  // additional starts empty — operator adds extras after return

  const invoiceNumber = `${settings.invoice_prefix}-${settings.next_invoice_number}`;

  const { data: invoice, error: invError } = await admin
    .from("invoices")
    .insert({
      booking_id: bookingId,
      kind,
      invoice_number: invoiceNumber,
      line_items,
      subtotal,
      gst,
      total,
      due_date: defaultDueDate(undefined, kind === "hire" ? 7 : 14),
      status: "draft",
    })
    .select("*")
    .single();

  if (invError || !invoice) throw new Error(invError?.message || "Invoice failed");

  await admin
    .from("business_settings")
    .update({
      next_invoice_number: settings.next_invoice_number + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", settings.id);

  return attachInvoicePdf(invoice, booking, settings as BusinessSettings).catch(
    async (err) => {
      console.warn("[invoice] PDF generation failed; invoice saved", err);
      return invoice;
    },
  );
}

/** @deprecated use createInvoiceForBooking(bookingId, "additional") */
export async function createDraftInvoiceForBooking(bookingId: string) {
  return createInvoiceForBooking(bookingId, "additional");
}

async function attachInvoicePdf(
  invoice: {
    id: string;
    invoice_number: string;
    kind?: InvoiceKind;
    line_items: unknown;
    subtotal: number;
    gst: number;
    total: number;
    due_date: string | null;
    status: string;
    pdf_url?: string | null;
  },
  booking: {
    clients: {
      business_name: string;
      contact_name: string;
      email: string;
      abn: string | null;
    };
    equipment: { name: string };
    pickup_date: string;
    dropoff_date: string;
  },
  settings: BusinessSettings,
) {
  const admin = createAdminClient();
  const pdfBytes = await buildInvoicePdf({
    settings,
    invoice: {
      invoice_number: invoice.invoice_number,
      kind: (invoice.kind as InvoiceKind) || "hire",
      line_items: invoice.line_items as InvoiceLineItem[],
      subtotal: Number(invoice.subtotal),
      gst: Number(invoice.gst),
      total: Number(invoice.total),
      due_date: invoice.due_date,
      status: invoice.status as "draft" | "sent" | "paid" | "overdue",
    },
    clientBusiness: booking.clients.business_name,
    clientName: booking.clients.contact_name,
    clientEmail: booking.clients.email,
    clientAbn: booking.clients.abn,
    equipmentName: booking.equipment.name,
    pickupDate: booking.pickup_date,
    dropoffDate: booking.dropoff_date,
  });

  const path = `invoices/${invoice.id}.pdf`;
  await admin.storage.from("documents").upload(path, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });

  const { data: signed } = await admin.storage
    .from("documents")
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signed?.signedUrl) {
    await admin
      .from("invoices")
      .update({ pdf_url: signed.signedUrl })
      .eq("id", invoice.id);
    invoice.pdf_url = signed.signedUrl;
  }

  return invoice;
}

export async function updateInvoiceLineItems(
  invoiceId: string,
  rawItems: unknown[],
) {
  const admin = createAdminClient();
  const { data: invoice, error } = await admin
    .from("invoices")
    .select("*, bookings(*, clients(*), equipment(*))")
    .eq("id", invoiceId)
    .single();

  if (error || !invoice) throw new Error(error?.message || "Invoice not found");
  if (invoice.status === "paid") {
    throw new Error("Paid invoices cannot be edited");
  }
  if (invoice.kind === "hire" && invoice.status !== "draft") {
    throw new Error("Hire invoice can only be edited while draft");
  }

  const { data: settings } = await admin
    .from("business_settings")
    .select("*")
    .limit(1)
    .single();
  if (!settings) throw new Error("Business settings missing");

  const line_items = (rawItems || []).map((item) =>
    normalizeLineItem(item as Record<string, unknown>),
  );
  const totals = totalsFromLineItems(
    line_items,
    Boolean(settings.gst_registered),
  );

  const { data: updated, error: updateError } = await admin
    .from("invoices")
    .update({
      line_items,
      subtotal: totals.subtotal,
      gst: totals.gst,
      total: totals.total,
    })
    .eq("id", invoiceId)
    .select("*")
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || "Failed to update invoice");
  }

  return attachInvoicePdf(
    updated,
    invoice.bookings,
    settings as BusinessSettings,
  );
}

export async function regenerateInvoicePdf(invoiceId: string) {
  const admin = createAdminClient();
  const { data: invoice, error } = await admin
    .from("invoices")
    .select("*, bookings(*, clients(*), equipment(*))")
    .eq("id", invoiceId)
    .single();

  if (error || !invoice) throw new Error(error?.message || "Invoice not found");

  const { data: settings } = await admin
    .from("business_settings")
    .select("*")
    .limit(1)
    .single();
  if (!settings) throw new Error("Business settings missing");

  let refreshed = invoice;

  // Hire drafts: rebuild from rates + float/extras + LCC + GST
  if (invoice.kind === "hire" && invoice.status === "draft") {
    const details = normalizeHireDetails(invoice.bookings.hire_details);
    const quote = buildHireInvoiceQuote({
      pickupDate: invoice.bookings.pickup_date,
      dropoffDate: invoice.bookings.dropoff_date,
      dayRate: Number(invoice.bookings.equipment.day_rate),
      weekRate: Number(invoice.bookings.equipment.week_rate),
      gstRegistered: Boolean(settings.gst_registered),
      needsChampionLcc: details.lcc_insurance === false,
      travelFloatFee: details.travel_float_fee,
      additionalHireCharge: details.additional_hire_charge,
    });

    const { data: updated, error: updateError } = await admin
      .from("invoices")
      .update({
        line_items: quote.line_items,
        subtotal: quote.subtotal,
        gst: quote.gst,
        total: quote.total,
      })
      .eq("id", invoiceId)
      .select("*")
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message || "Could not rebuild hire invoice");
    }
    refreshed = updated;
  } else {
    const line_items = (invoice.line_items || []) as InvoiceLineItem[];
    const totals = totalsFromLineItems(
      line_items,
      Boolean(settings.gst_registered),
    );

    const { data: updated, error: refreshError } = await admin
      .from("invoices")
      .update({
        subtotal: totals.subtotal,
        gst: totals.gst,
        total: totals.total,
      })
      .eq("id", invoiceId)
      .select("*")
      .single();

    if (refreshError || !updated) {
      throw new Error(refreshError?.message || "Could not refresh invoice totals");
    }
    refreshed = updated;
  }

  return attachInvoicePdf(
    refreshed,
    invoice.bookings,
    settings as BusinessSettings,
  );
}

export async function markInvoicePaid(invoiceId: string) {
  const admin = createAdminClient();
  const { data: invoice, error } = await admin
    .from("invoices")
    .update({ status: "paid" })
    .eq("id", invoiceId)
    .select("*")
    .single();

  if (error || !invoice) throw new Error(error?.message || "Invoice not found");

  if (invoice.kind === "hire") {
    await admin
      .from("bookings")
      .update({
        payment_received_at: new Date().toISOString(),
        payment_notes: `Hire invoice ${invoice.invoice_number} paid`,
      })
      .eq("id", invoice.booking_id);
    return invoice;
  }

  // Additional invoice paid → close booking if hire is also paid (or missing)
  const { data: hire } = await admin
    .from("invoices")
    .select("status")
    .eq("booking_id", invoice.booking_id)
    .eq("kind", "hire")
    .maybeSingle();

  if (!hire || hire.status === "paid") {
    await admin
      .from("bookings")
      .update({ status: "paid" })
      .eq("id", invoice.booking_id);
  }

  return invoice;
}

export async function markInvoiceSent(invoiceId: string) {
  const admin = createAdminClient();
  const { data: invoice, error } = await admin
    .from("invoices")
    .update({ status: "sent" })
    .eq("id", invoiceId)
    .select("*")
    .single();

  if (error || !invoice) throw new Error(error?.message || "Invoice not found");

  // Only the return/additional invoice moves booking → invoiced
  if (invoice.kind === "additional") {
    await admin
      .from("bookings")
      .update({ status: "invoiced" })
      .eq("id", invoice.booking_id);
  }

  return invoice;
}

export async function getBookingInvoice(
  bookingId: string,
  kind: InvoiceKind,
) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("invoices")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("kind", kind)
    .maybeSingle();
  return data;
}
