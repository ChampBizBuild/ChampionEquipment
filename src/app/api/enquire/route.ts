import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeHireDetails, type HireDetails } from "@/lib/hireAgreement";
import {
  BLOCKING_BOOKING_STATUSES,
  findOverlappingBooking,
} from "@/lib/availability";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      business_name,
      contact_name,
      email,
      phone,
      abn,
      billing_address,
      equipment_id,
      pickup_date,
      dropoff_date,
      notes,
      hire_details,
    } = body;

    if (
      !business_name?.trim() ||
      !contact_name?.trim() ||
      !email?.trim() ||
      !abn?.trim() ||
      !equipment_id ||
      !pickup_date ||
      !dropoff_date
    ) {
      return NextResponse.json(
        {
          error:
            "Business name, contact name, email, ABN, equipment, and dates are required",
        },
        { status: 400 },
      );
    }

    const abnClean = String(abn).replace(/\s/g, "");
    if (!/^\d{11}$/.test(abnClean)) {
      return NextResponse.json(
        { error: "ABN must be 11 digits" },
        { status: 400 },
      );
    }

    if (new Date(dropoff_date) < new Date(pickup_date)) {
      return NextResponse.json(
        { error: "Drop-off date must be on or after pickup date" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const details = normalizeHireDetails(hire_details as HireDetails);

    if (!details.site_contact) details.site_contact = String(contact_name);
    if (!details.site_phone && phone) details.site_phone = String(phone);

    const { data: equipment, error: eqError } = await admin
      .from("equipment")
      .select("id, name, status")
      .eq("id", equipment_id)
      .single();

    if (eqError || !equipment) {
      return NextResponse.json({ error: "Invalid equipment" }, { status: 400 });
    }

    if (equipment.status === "service") {
      return NextResponse.json(
        { error: "That machine is in service and not available for hire" },
        { status: 400 },
      );
    }

    const { data: existingBookings } = await admin
      .from("bookings")
      .select("id, equipment_id, pickup_date, dropoff_date, status")
      .eq("equipment_id", equipment_id)
      .in("status", BLOCKING_BOOKING_STATUSES);

    const clash = findOverlappingBooking(
      existingBookings || [],
      equipment_id,
      pickup_date,
      dropoff_date,
    );
    if (clash) {
      return NextResponse.json(
        {
          error: `That machine is already booked for overlapping dates (${clash.pickup_date} → ${clash.dropoff_date}). Please choose different dates.`,
        },
        { status: 409 },
      );
    }

    const { data: client, error: clientError } = await admin
      .from("clients")
      .insert({
        business_name: String(business_name).trim(),
        contact_name: String(contact_name).trim(),
        email: String(email).trim().toLowerCase(),
        phone: phone ? String(phone).trim() : null,
        abn: abnClean,
        billing_address: billing_address
          ? String(billing_address).trim()
          : null,
        notes: "Created via public enquire form",
      })
      .select("*")
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: clientError?.message || "Failed to save client" },
        { status: 400 },
      );
    }

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .insert({
        client_id: client.id,
        equipment_id,
        pickup_date,
        dropoff_date,
        notes: notes ? String(notes).trim() : null,
        hire_details: details,
        status: "enquiry",
      })
      .select("id, accept_token, pickup_date, dropoff_date, status")
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: bookingError?.message || "Failed to create enquiry" },
        { status: 400 },
      );
    }

    try {
      const { data: settings } = await admin
        .from("business_settings")
        .select("business_name, email")
        .limit(1)
        .single();

      const operatorEmail = settings?.email;
      const apiKey = process.env.RESEND_API_KEY;
      if (operatorEmail && apiKey) {
        const resend = new Resend(apiKey);
        const from =
          process.env.RESEND_FROM_EMAIL ||
          "Champion Equipment <onboarding@resend.dev>";
        const appUrl = (
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002"
        ).replace(/\/$/, "");

        await resend.emails.send({
          from,
          to: operatorEmail,
          subject: `New hire enquiry — ${client.business_name}`,
          html: `
            <p>New enquiry from the website form.</p>
            <ul>
              <li><strong>Client:</strong> ${client.business_name} (${client.contact_name})</li>
              <li><strong>Email:</strong> ${client.email}</li>
              <li><strong>Phone:</strong> ${client.phone || "—"}</li>
              <li><strong>Equipment:</strong> ${equipment.name}</li>
              <li><strong>Dates:</strong> ${booking.pickup_date} → ${booking.dropoff_date}</li>
            </ul>
            <p><a href="${appUrl}/bookings/${booking.id}">Open booking in Champion Equipment</a></p>
          `,
        });
      }
    } catch (notifyError) {
      console.warn("[enquire] operator notify failed", notifyError);
    }

    return NextResponse.json(
      {
        ok: true,
        bookingId: booking.id,
        reference: booking.id.slice(0, 8).toUpperCase(),
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not submit enquiry",
      },
      { status: 500 },
    );
  }
}
