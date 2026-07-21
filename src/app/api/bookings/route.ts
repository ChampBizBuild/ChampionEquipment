import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTermsForBooking } from "@/lib/bookings";
import { normalizeHireDetails } from "@/lib/hireAgreement";
import {
  BLOCKING_BOOKING_STATUSES,
  findOverlappingBooking,
} from "@/lib/availability";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    client_id,
    new_client,
    equipment_id,
    pickup_date,
    dropoff_date,
    notes,
    hire_details,
    send_terms = true,
  } = body;

  let clientId = client_id as string | undefined;

  if (!clientId && new_client) {
    const { data: created, error } = await supabase
      .from("clients")
      .insert({
        business_name: new_client.business_name,
        contact_name: new_client.contact_name,
        abn: new_client.abn || null,
        email: new_client.email,
        phone: new_client.phone || null,
        billing_address: new_client.billing_address || null,
        notes: new_client.notes || null,
      })
      .select("id")
      .single();

    if (error || !created) {
      return NextResponse.json(
        { error: error?.message || "Failed to create client" },
        { status: 400 },
      );
    }
    clientId = created.id;
  }

  if (!clientId || !equipment_id || !pickup_date || !dropoff_date) {
    return NextResponse.json(
      { error: "client, equipment, and dates are required" },
      { status: 400 },
    );
  }

  if (new Date(dropoff_date) < new Date(pickup_date)) {
    return NextResponse.json(
      { error: "Drop-off date must be on or after pickup date" },
      { status: 400 },
    );
  }

  const { data: existingBookings } = await supabase
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
        error: `That machine is already booked for overlapping dates (${clash.pickup_date} → ${clash.dropoff_date}).`,
      },
      { status: 409 },
    );
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      client_id: clientId,
      equipment_id,
      pickup_date,
      dropoff_date,
      notes: notes || null,
      hire_details: normalizeHireDetails(hire_details),
      status: "enquiry",
    })
    .select("*")
    .single();

  if (bookingError || !booking) {
    return NextResponse.json(
      { error: bookingError?.message || "Failed to create booking" },
      { status: 400 },
    );
  }

  let acceptUrl: string | undefined;
  let emailResult: unknown;

  if (send_terms) {
    try {
      const result = await sendTermsForBooking(booking.id);
      acceptUrl = result.acceptUrl;
      emailResult = result.emailResult;
    } catch (err) {
      return NextResponse.json(
        {
          booking,
          warning:
            err instanceof Error
              ? err.message
              : "Booking created but terms email failed",
        },
        { status: 201 },
      );
    }
  }

  return NextResponse.json(
    { booking, acceptUrl, emailResult },
    { status: 201 },
  );
}
