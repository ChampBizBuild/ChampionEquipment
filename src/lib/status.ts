import type { BookingStatus, EquipmentStatus } from "./types";

export const BOOKING_STATUSES: BookingStatus[] = [
  "enquiry",
  "terms_sent",
  "confirmed",
  "out",
  "returned",
  "invoiced",
  "paid",
  "cancelled",
];

/** Allowed forward transitions (plus cancelled from most open states). */
export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  enquiry: ["terms_sent", "cancelled"],
  terms_sent: ["confirmed", "cancelled"],
  confirmed: ["out", "cancelled"],
  out: ["returned", "cancelled"],
  returned: ["invoiced", "cancelled"],
  invoiced: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

export function canTransition(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  return BOOKING_TRANSITIONS[from].includes(to);
}

export function bookingStatusLabel(status: BookingStatus): string {
  return status.replace(/_/g, " ");
}

export function equipmentStatusLabel(status: EquipmentStatus): string {
  return status;
}

export const EQUIPMENT_STATUSES: EquipmentStatus[] = [
  "available",
  "booked",
  "out",
  "returned",
  "service",
];
