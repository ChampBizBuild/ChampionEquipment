import { bookingStatusLabel } from "@/lib/status";
import type { BookingStatus, EquipmentStatus, InvoiceStatus } from "@/lib/types";

const BOOKING_COLORS: Record<BookingStatus, string> = {
  enquiry: "bg-neutral-100 text-neutral-700",
  terms_sent: "bg-brand-yellow/30 text-brand-black",
  confirmed: "bg-brand-green/15 text-brand-green",
  out: "bg-brand-yellow text-brand-black",
  returned: "bg-neutral-200 text-brand-black",
  invoiced: "bg-brand-yellow/50 text-brand-black",
  paid: "bg-brand-green text-white",
  cancelled: "bg-rose-100 text-rose-700",
};

const EQUIPMENT_COLORS: Record<EquipmentStatus, string> = {
  available: "bg-brand-green/15 text-brand-green",
  booked: "bg-brand-yellow/30 text-brand-black",
  out: "bg-brand-yellow text-brand-black",
  returned: "bg-neutral-200 text-brand-black",
  service: "bg-rose-100 text-rose-700",
};

const INVOICE_COLORS: Record<InvoiceStatus, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  sent: "bg-brand-yellow/40 text-brand-black",
  paid: "bg-brand-green text-white",
  overdue: "bg-rose-100 text-rose-700",
};

export function BookingBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize ${BOOKING_COLORS[status]}`}
    >
      {bookingStatusLabel(status)}
    </span>
  );
}

export function EquipmentBadge({ status }: { status: EquipmentStatus }) {
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize ${EQUIPMENT_COLORS[status]}`}
    >
      {status}
    </span>
  );
}

export function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize ${INVOICE_COLORS[status]}`}
    >
      {status}
    </span>
  );
}
