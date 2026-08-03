import { createAdminClient } from "@/lib/supabase/admin";
import { buildExtraHireLineItem, extraHireDays } from "@/lib/overstay";
import { shortDate } from "@/lib/format";
import type {
  ConditionInspection,
  FuelLevel,
  InspectionPhase,
  InvoiceLineItem,
} from "@/lib/types";

export type PreviousReturnSource = ConditionInspection & {
  source_client_name: string | null;
  source_booking_id: string;
};

export const FUEL_LEVELS: FuelLevel[] = [
  "empty",
  "1/4",
  "1/2",
  "3/4",
  "full",
];

export const PHOTO_SIDES = ["front", "rear", "left", "right"] as const;
export type PhotoSide = (typeof PHOTO_SIDES)[number];

const FUEL_TOPUP_DEFAULTS: Record<FuelLevel, number> = {
  empty: 120,
  "1/4": 90,
  "1/2": 60,
  "3/4": 30,
  full: 0,
};

export function suggestedReturnCharges(params: {
  fuelLevel: FuelLevel;
  dropoffDate: string;
  returnDate: string;
  dayRate: number;
  /** Extra days already billed on mid-term extension invoices. */
  alreadyBilledExtraDays?: number;
}): InvoiceLineItem[] {
  const items: InvoiceLineItem[] = [];
  const fuelAmount = FUEL_TOPUP_DEFAULTS[params.fuelLevel] ?? 0;
  if (params.fuelLevel !== "full" && fuelAmount > 0) {
    items.push({
      description: `Fuel top-up (returned at ${params.fuelLevel})`,
      quantity: 1,
      unit_amount: fuelAmount,
      amount: fuelAmount,
    });
  }

  const lateDays = extraHireDays(params.dropoffDate, params.returnDate);
  const unbilled = Math.max(
    0,
    lateDays - Math.max(0, params.alreadyBilledExtraDays || 0),
  );
  if (unbilled > 0) {
    items.push(buildExtraHireLineItem(unbilled, params.dayRate));
  }

  return items;
}

export async function getInspection(
  bookingId: string,
  phase: InspectionPhase,
): Promise<ConditionInspection | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("condition_inspections")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("phase", phase)
    .maybeSingle();
  return (data as ConditionInspection) || null;
}

/** Latest completed return inspection for this machine (other bookings). */
export async function getLatestReturnForEquipment(
  equipmentId: string,
  excludeBookingId?: string,
): Promise<PreviousReturnSource | null> {
  const admin = createAdminClient();
  let query = admin
    .from("condition_inspections")
    .select("*")
    .eq("equipment_id", equipmentId)
    .eq("phase", "return")
    .not("photo_front_url", "is", null)
    .not("photo_rear_url", "is", null)
    .not("photo_left_url", "is", null)
    .not("photo_right_url", "is", null)
    .order("inspected_at", { ascending: false })
    .limit(8);

  if (excludeBookingId) {
    query = query.neq("booking_id", excludeBookingId);
  }

  const { data, error } = await query;
  if (error || !data?.length) return null;

  const row = data[0] as ConditionInspection;
  const { data: sourceBooking } = await admin
    .from("bookings")
    .select("id, clients(business_name)")
    .eq("id", row.booking_id)
    .maybeSingle();

  const clients = sourceBooking?.clients as
    | { business_name?: string }
    | { business_name?: string }[]
    | null
    | undefined;
  const clientName = Array.isArray(clients)
    ? clients[0]?.business_name || null
    : clients?.business_name || null;

  return {
    ...row,
    source_booking_id: row.booking_id,
    source_client_name: clientName,
  };
}

/**
 * Copy the machine's last return register onto this booking as outbound.
 * Photos/hours/fuel carry across; client ack is fresh for the new hirer.
 */
export async function carryForwardOutboundFromPreviousReturn(params: {
  bookingId: string;
  inspectedBy?: string | null;
  force?: boolean;
}): Promise<{
  inspection: ConditionInspection;
  source: PreviousReturnSource | null;
  created: boolean;
}> {
  const admin = createAdminClient();
  const { data: booking, error } = await admin
    .from("bookings")
    .select("id, equipment_id, status")
    .eq("id", params.bookingId)
    .single();

  if (error || !booking) throw new Error(error?.message || "Booking not found");

  if (
    !["confirmed", "out", "returned", "invoiced"].includes(booking.status)
  ) {
    throw new Error(
      "Outbound can only be set once the booking is confirmed/scheduled",
    );
  }

  const existing = await getInspection(params.bookingId, "outbound");
  if (existing && !params.force) {
    return {
      inspection: existing,
      source: await getLatestReturnForEquipment(
        booking.equipment_id,
        params.bookingId,
      ),
      created: false,
    };
  }

  const source = await getLatestReturnForEquipment(
    booking.equipment_id,
    params.bookingId,
  );
  if (!source) {
    throw new Error("No previous return inspection found for this machine");
  }
  if (
    !source.photo_front_url ||
    !source.photo_rear_url ||
    !source.photo_left_url ||
    !source.photo_right_url
  ) {
    throw new Error("Previous return is missing side photos");
  }

  const carryNote = `Carried forward from previous return${
    source.source_client_name ? ` (${source.source_client_name}` : ""
  }${source.inspected_at ? ` · ${shortDate(source.inspected_at)}` : ""}${
    source.source_client_name ? ")" : ""
  }.`;
  const notes = [carryNote, source.notes].filter(Boolean).join("\n");

  const payload = {
    booking_id: params.bookingId,
    equipment_id: booking.equipment_id,
    phase: "outbound" as const,
    hours_reading: source.hours_reading,
    fuel_level: source.fuel_level,
    notes,
    needs_service: Boolean(source.needs_service),
    inspected_at: new Date().toISOString(),
    inspected_by: params.inspectedBy || "system:carry-forward",
    photo_front_url: source.photo_front_url,
    photo_rear_url: source.photo_rear_url,
    photo_left_url: source.photo_left_url,
    photo_right_url: source.photo_right_url,
    // Fresh client ack for this hire
    client_ack_name: null,
    client_ack_at: null,
    client_ack_ip: null,
  };

  let inspection: ConditionInspection;
  if (existing && params.force) {
    const { data, error: updateError } = await admin
      .from("condition_inspections")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (updateError || !data) {
      throw new Error(updateError?.message || "Could not update outbound");
    }
    inspection = data as ConditionInspection;
  } else {
    const { data, error: insertError } = await admin
      .from("condition_inspections")
      .insert(payload)
      .select("*")
      .single();
    if (insertError || !data) {
      throw new Error(insertError?.message || "Could not create outbound");
    }
    inspection = data as ConditionInspection;
  }

  return { inspection, source, created: true };
}

export async function requireInspection(
  bookingId: string,
  phase: InspectionPhase,
): Promise<ConditionInspection> {
  const row = await getInspection(bookingId, phase);
  if (!row) {
    throw new Error(
      phase === "outbound"
        ? "Complete the outbound condition inspection before marking Out"
        : "Complete the return condition inspection before marking Returned",
    );
  }
  if (
    !row.photo_front_url ||
    !row.photo_rear_url ||
    !row.photo_left_url ||
    !row.photo_right_url
  ) {
    throw new Error(
      "All four side photos are required on the condition inspection",
    );
  }
  return row;
}

export async function getInspectionByToken(token: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("condition_inspections")
    .select(
      "*, bookings(*, clients(*), equipment(*)), equipment:equipment_id(*)",
    )
    .eq("client_ack_token", token)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function acknowledgeInspection(params: {
  token: string;
  name: string;
  ip: string;
}) {
  const name = params.name.trim();
  if (name.length < 2) throw new Error("Please type your full name");

  const admin = createAdminClient();
  const { data: existing, error } = await admin
    .from("condition_inspections")
    .select("*")
    .eq("client_ack_token", params.token)
    .maybeSingle();

  if (error || !existing) throw new Error("Invalid or expired inspection link");

  if (existing.client_ack_at) {
    return { alreadyAcknowledged: true as const, inspection: existing };
  }

  const { data, error: updateError } = await admin
    .from("condition_inspections")
    .update({
      client_ack_name: name,
      client_ack_at: new Date().toISOString(),
      client_ack_ip: params.ip,
    })
    .eq("id", existing.id)
    .select("*")
    .single();

  if (updateError || !data) {
    throw new Error(updateError?.message || "Could not save acknowledgment");
  }

  return { alreadyAcknowledged: false as const, inspection: data };
}
