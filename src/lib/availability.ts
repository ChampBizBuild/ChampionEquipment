import type { BookingStatus } from "./types";

/** Bookings that still hold the machine for their date range. */
export const BLOCKING_BOOKING_STATUSES: BookingStatus[] = [
  "enquiry",
  "terms_sent",
  "confirmed",
  "out",
];

/** Inclusive calendar overlap: A and B share any day. */
export function datesOverlap(
  pickupA: string,
  dropoffA: string,
  pickupB: string,
  dropoffB: string,
): boolean {
  return pickupA <= dropoffB && dropoffA >= pickupB;
}

export function isValidHireRange(pickup: string, dropoff: string): boolean {
  if (!pickup || !dropoff) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickup) || !/^\d{4}-\d{2}-\d{2}$/.test(dropoff)) {
    return false;
  }
  return dropoff >= pickup;
}

type BookingRow = {
  id?: string;
  equipment_id: string;
  pickup_date: string;
  dropoff_date: string;
  status: string;
};

/**
 * Returns equipment IDs that already have a blocking booking overlapping
 * the requested hire window.
 */
export function busyEquipmentIds(
  bookings: BookingRow[],
  pickup: string,
  dropoff: string,
): Set<string> {
  const busy = new Set<string>();
  for (const b of bookings) {
    if (!BLOCKING_BOOKING_STATUSES.includes(b.status as BookingStatus)) {
      continue;
    }
    if (datesOverlap(pickup, dropoff, b.pickup_date, b.dropoff_date)) {
      busy.add(b.equipment_id);
    }
  }
  return busy;
}

/**
 * Returns overlapping hire windows keyed by equipment id
 * (first clash is enough for the public label).
 */
export function busyHireWindows(
  bookings: BookingRow[],
  pickup: string,
  dropoff: string,
): Map<string, { pickup_date: string; dropoff_date: string }> {
  const map = new Map<string, { pickup_date: string; dropoff_date: string }>();
  for (const b of bookings) {
    if (!BLOCKING_BOOKING_STATUSES.includes(b.status as BookingStatus)) {
      continue;
    }
    if (!datesOverlap(pickup, dropoff, b.pickup_date, b.dropoff_date)) {
      continue;
    }
    if (!map.has(b.equipment_id)) {
      map.set(b.equipment_id, {
        pickup_date: b.pickup_date,
        dropoff_date: b.dropoff_date,
      });
    }
  }
  return map;
}

export function findOverlappingBooking(
  bookings: BookingRow[],
  equipmentId: string,
  pickup: string,
  dropoff: string,
  excludeBookingId?: string,
): BookingRow | null {
  for (const b of bookings) {
    if (b.equipment_id !== equipmentId) continue;
    if (excludeBookingId && b.id === excludeBookingId) continue;
    if (!BLOCKING_BOOKING_STATUSES.includes(b.status as BookingStatus)) {
      continue;
    }
    if (datesOverlap(pickup, dropoff, b.pickup_date, b.dropoff_date)) {
      return b;
    }
  }
  return null;
}
