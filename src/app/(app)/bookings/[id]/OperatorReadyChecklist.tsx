"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BookingStatus, InvoiceStatus } from "@/lib/types";
import { btnPrimary, btnSecondary } from "@/components/ui";
import { money, shortDate } from "@/lib/format";

function CheckRow({
  done,
  label,
  detail,
}: {
  done: boolean;
  label: string;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-neutral-100 py-2.5 last:border-0">
      <span
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-xs font-bold ${
          done
            ? "bg-brand-green text-white"
            : "border border-neutral-300 bg-white text-neutral-400"
        }`}
      >
        {done ? "✓" : ""}
      </span>
      <div>
        <div className="text-sm font-medium text-brand-black">{label}</div>
        {detail ? (
          <div className="text-xs text-neutral-500">{detail}</div>
        ) : null}
      </div>
    </div>
  );
}

export function OperatorReadyChecklist({
  bookingId,
  status,
  paymentReceivedAt,
  scheduledAt,
  hireInvoice,
}: {
  bookingId: string;
  status: BookingStatus;
  paymentReceivedAt: string | null;
  scheduledAt: string | null;
  hireInvoice: {
    id: string;
    invoice_number: string;
    status: InvoiceStatus;
    total: number;
  } | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enquiryDone = true;
  const agreementDone = [
    "confirmed",
    "out",
    "returned",
    "invoiced",
    "paid",
  ].includes(status);
  const hirePaid =
    hireInvoice?.status === "paid" || Boolean(paymentReceivedAt);
  const scheduledDone = Boolean(scheduledAt);
  const canSchedule = agreementDone && hirePaid && !scheduledDone;

  async function run(action: "create_hire_invoice" | "schedule") {
    setLoading(action);
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}/ready`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error || "Update failed");
      return;
    }
    if (action === "create_hire_invoice" && data.invoice?.id) {
      router.push(`/invoices/${data.invoice.id}`);
      router.refresh();
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-600">
        Create the hire invoice after acceptance. Mark it paid, then schedule
        the hire. A second invoice for extras is created on return.
      </p>

      <div className="rounded border border-neutral-200 bg-brand-cream/50 px-3">
        <CheckRow done={enquiryDone} label="Enquiry / details received" />
        <CheckRow
          done={agreementDone}
          label="Hire Agreement accepted"
          detail={
            agreementDone
              ? "Client has accepted terms"
              : "Send terms and wait for client accept link"
          }
        />
        <CheckRow
          done={Boolean(hireInvoice)}
          label="Hire invoice created"
          detail={
            hireInvoice
              ? `${hireInvoice.invoice_number} · ${money(hireInvoice.total)}`
              : "Draft hire charges for the booked dates"
          }
        />
        <CheckRow
          done={hirePaid}
          label="Hire invoice paid"
          detail={
            hirePaid
              ? paymentReceivedAt
                ? `Marked ${shortDate(paymentReceivedAt)}`
                : "Paid"
              : "Client must pay before you schedule"
          }
        />
        <CheckRow
          done={scheduledDone}
          label="Hire scheduled"
          detail={
            scheduledAt
              ? `Scheduled ${shortDate(scheduledAt)}`
              : "Lock the machine in once payment is in"
          }
        />
      </div>

      {hireInvoice ? (
        <Link
          href={`/invoices/${hireInvoice.id}`}
          className={`${btnPrimary} block w-full text-center`}
        >
          {hirePaid
            ? "Open hire invoice"
            : "Open hire invoice - mark paid"}
        </Link>
      ) : null}

      {agreementDone && !hireInvoice ? (
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={!!loading}
          onClick={() => run("create_hire_invoice")}
        >
          {loading === "create_hire_invoice"
            ? "Creating…"
            : "Create hire invoice"}
        </button>
      ) : null}

      {canSchedule ? (
        <button
          type="button"
          className={`${btnSecondary} w-full`}
          disabled={!!loading}
          onClick={() => run("schedule")}
        >
          {loading === "schedule" ? "Scheduling…" : "Schedule this hire"}
        </button>
      ) : null}

      {scheduledDone ? (
        <p className="text-sm text-brand-green">
          Hire is scheduled. On pickup day, mark the booking <strong>Out</strong>.
        </p>
      ) : null}

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
