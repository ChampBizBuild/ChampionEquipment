import { differenceInCalendarDays, parseISO } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ConditionInspection,
  FuelLevel,
  InspectionPhase,
  InvoiceLineItem,
} from "@/lib/types";

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

  const dropoff = parseISO(params.dropoffDate);
  const returned = parseISO(
    params.returnDate.includes("T")
      ? params.returnDate.slice(0, 10)
      : params.returnDate,
  );
  const lateDays = Math.max(0, differenceInCalendarDays(returned, dropoff));
  if (lateDays > 0) {
    const amount =
      Math.round(lateDays * Number(params.dayRate) * 100) / 100;
    items.push({
      description: `Extra hire days (late return · ${lateDays} day${lateDays === 1 ? "" : "s"})`,
      quantity: lateDays,
      unit_amount: Number(params.dayRate),
      amount,
    });
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
