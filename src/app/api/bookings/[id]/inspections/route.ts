import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FUEL_LEVELS, PHOTO_SIDES } from "@/lib/inspections";
import type { FuelLevel, InspectionPhase } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("condition_inspections")
    .select("*")
    .eq("booking_id", params.id)
    .order("phase");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ inspections: data || [] });
}

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

  try {
    const form = await request.formData();
    const phase = String(form.get("phase") || "") as InspectionPhase;
    if (phase !== "outbound" && phase !== "return") {
      return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
    }

    const fuel_level = String(form.get("fuel_level") || "") as FuelLevel;
    if (!FUEL_LEVELS.includes(fuel_level)) {
      return NextResponse.json({ error: "Select a fuel level" }, { status: 400 });
    }

    const hoursRaw = String(form.get("hours_reading") || "").trim();
    const hours_reading = hoursRaw === "" ? null : Number(hoursRaw);
    if (hours_reading != null && Number.isNaN(hours_reading)) {
      return NextResponse.json({ error: "Invalid hours reading" }, { status: 400 });
    }

    const notes = String(form.get("notes") || "").trim() || null;
    const needs_service = form.get("needs_service") === "true";

    const admin = createAdminClient();
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, equipment_id, status")
      .eq("id", params.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (phase === "outbound" && !["confirmed", "out"].includes(booking.status)) {
      return NextResponse.json(
        { error: "Outbound inspection is for confirmed / scheduled hires" },
        { status: 400 },
      );
    }
    if (
      phase === "return" &&
      !["out", "returned", "invoiced"].includes(booking.status)
    ) {
      return NextResponse.json(
        { error: "Return inspection is for machines that are out" },
        { status: 400 },
      );
    }

    const { data: existing } = await admin
      .from("condition_inspections")
      .select("*")
      .eq("booking_id", params.id)
      .eq("phase", phase)
      .maybeSingle();

    const photoUrls: Record<string, string | null> = {
      photo_front_url: existing?.photo_front_url || null,
      photo_rear_url: existing?.photo_rear_url || null,
      photo_left_url: existing?.photo_left_url || null,
      photo_right_url: existing?.photo_right_url || null,
    };

    for (const side of PHOTO_SIDES) {
      const file = form.get(`photo_${side}`);
      if (file instanceof File && file.size > 0) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `inspections/${params.id}/${phase}/${side}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const { error: uploadError } = await admin.storage
          .from("documents")
          .upload(path, buffer, {
            contentType: file.type || "image/jpeg",
            upsert: true,
          });
        if (uploadError) throw new Error(uploadError.message);

        const { data: signed } = await admin.storage
          .from("documents")
          .createSignedUrl(path, 60 * 60 * 24 * 365);

        const key = `photo_${side}_url` as const;
        photoUrls[key] = signed?.signedUrl || path;
      }
    }

    const missing = PHOTO_SIDES.filter(
      (side) => !photoUrls[`photo_${side}_url`],
    );
    if (missing.length) {
      return NextResponse.json(
        {
          error: `Photos required for: ${missing.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const payload = {
      booking_id: params.id,
      equipment_id: booking.equipment_id,
      phase,
      hours_reading,
      fuel_level,
      notes,
      needs_service,
      inspected_at: new Date().toISOString(),
      inspected_by: user.email || user.id,
      photo_front_url: photoUrls.photo_front_url,
      photo_rear_url: photoUrls.photo_rear_url,
      photo_left_url: photoUrls.photo_left_url,
      photo_right_url: photoUrls.photo_right_url,
    };

    let inspection;
    if (existing) {
      const { data, error } = await admin
        .from("condition_inspections")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error || !data) throw new Error(error?.message || "Update failed");
      inspection = data;
    } else {
      const { data, error } = await admin
        .from("condition_inspections")
        .insert(payload)
        .select("*")
        .single();
      if (error || !data) throw new Error(error?.message || "Insert failed");
      inspection = data;
    }

    if (phase === "return" && needs_service) {
      await admin
        .from("bookings")
        .update({ needs_service: true })
        .eq("id", params.id);
    }

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002"
    ).replace(/\/$/, "");
    const ackUrl = `${appUrl}/inspect/${inspection.client_ack_token}`;

    return NextResponse.json({ inspection, ackUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Inspection failed" },
      { status: 400 },
    );
  }
}
