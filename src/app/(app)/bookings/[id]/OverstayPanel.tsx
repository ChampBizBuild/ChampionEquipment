"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, btnSecondary } from "@/components/ui";
import { money } from "@/lib/format";
import type { OverstaySummary } from "@/lib/overstay";

export function OverstayPanel({
  bookingId,
  status,
  summary,
}: {
  bookingId: string;
  status: string;
  summary: OverstaySummary;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "out") return null;
  if (summary.extraDays <= 0 && summary.billedDays <= 0) return null;

  async function invoiceExtraHire() {
    if (
      !confirm(
        `Create a mid-term invoice for ${summary.unbilledDays} extra hire day${
          summary.unbilledDays === 1 ? "" : "s"
        } (${money(summary.estimatedUnbilledAmount)} ex GST)?`,
      )
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}/extension-invoice`, {
      method: "POST",
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not create invoice");
      return;
    }
    if (data.invoice?.id) {
      router.push(`/invoices/${data.invoice.id}`);
      router.refresh();
      return;
    }
    router.refresh();
  }

  return (
    <div
      className={`space-y-3 rounded border p-3 ${
        summary.suggestInvoice
          ? "border-amber-300 bg-amber-50"
          : "border-neutral-200 bg-neutral-50"
      }`}
    >
      <div>
        <p className="text-sm font-semibold text-brand-black">
          Extra hire tracking
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          Past drop-off · {summary.extraDays} day
          {summary.extraDays === 1 ? "" : "s"} total · {summary.billedDays}{" "}
          already on mid-term invoices ·{" "}
          <span className="font-medium text-brand-black">
            {summary.unbilledDays} unbilled
          </span>
        </p>
      </div>

      {summary.suggestInvoice ? (
        <p className="text-sm text-amber-900">
          {summary.unbilledDays} unbilled days (suggest at{" "}
          {summary.suggestThreshold}+). Ready to invoice mid-term.
        </p>
      ) : summary.unbilledDays > 0 ? (
        <p className="text-sm text-neutral-600">
          Suggestion triggers at {summary.suggestThreshold} unbilled days. You
          can still invoice earlier if needed.
        </p>
      ) : (
        <p className="text-sm text-brand-green">
          All extra days so far are already on a mid-term invoice.
        </p>
      )}

      {summary.unbilledDays > 0 ? (
        <button
          type="button"
          className={summary.suggestInvoice ? btnPrimary : btnSecondary}
          disabled={loading}
          onClick={() => void invoiceExtraHire()}
        >
          {loading
            ? "Creating…"
            : `Invoice ${summary.unbilledDays} extra day${
                summary.unbilledDays === 1 ? "" : "s"
              } (${money(summary.estimatedUnbilledAmount)})`}
        </button>
      ) : null}

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
