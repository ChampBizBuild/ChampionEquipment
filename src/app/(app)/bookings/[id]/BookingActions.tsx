"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BOOKING_TRANSITIONS } from "@/lib/status";
import type { BookingStatus } from "@/lib/types";
import { btnDanger, btnPrimary, btnSecondary } from "@/components/ui";

const ACTION_LABELS: Partial<Record<BookingStatus, string>> = {
  terms_sent: "Send terms email",
  confirmed: "Mark confirmed",
  out: "Mark out (picked up)",
  returned: "Mark returned (create extras invoice)",
  invoiced: "Mark invoiced",
  paid: "Mark paid",
  cancelled: "Cancel booking",
};

export function BookingActions({
  bookingId,
  status,
  needsService,
  hasOutboundInspection,
  hasReturnInspection,
}: {
  bookingId: string;
  status: BookingStatus;
  needsService: boolean;
  hasOutboundInspection: boolean;
  hasReturnInspection: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [service, setService] = useState(needsService);
  const next = BOOKING_TRANSITIONS[status];

  async function run(to: BookingStatus) {
    setLoading(to);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/bookings/${bookingId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, needs_service: service }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error || "Update failed");
      return;
    }
    if (to === "terms_sent") {
      setMessage(formatEmailResult(data));
    }
    if (data.invoice?.id) {
      router.push(`/invoices/${data.invoice.id}`);
      router.refresh();
      return;
    }
    router.refresh();
  }

  async function resendTerms() {
    setLoading("resend");
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/bookings/${bookingId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "terms_sent" }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error || "Resend failed");
      return;
    }
    setMessage(formatEmailResult(data));
    router.refresh();
  }

  if (status === "paid" || status === "cancelled") {
    return (
      <p className="text-sm text-neutral-500">
        This booking is closed ({status}).
      </p>
    );
  }

  const canResendTerms =
    status === "enquiry" || status === "terms_sent" || status === "confirmed";
  // Send/resend is handled by the dedicated button below
  const forwardActions = next.filter(
    (s) => s !== "cancelled" && s !== "terms_sent",
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500">
        Current status:{" "}
        <span className="capitalize">{status.replace(/_/g, " ")}</span>
      </p>

      {status === "confirmed" && !hasOutboundInspection ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Complete the <strong>outbound condition register</strong> (hours,
          fuel, 4 photos) before marking Out.
        </p>
      ) : null}

      {status === "out" && !hasReturnInspection ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Complete the <strong>return condition register</strong> before marking
          Returned. Fuel / late days will draft onto the extras invoice.
        </p>
      ) : null}

      {status === "out" || next.includes("returned") ? (
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={service}
            onChange={(e) => setService(e.target.checked)}
          />
          Needs service after return
        </label>
      ) : null}

      <div className="flex flex-col gap-2">
        {forwardActions.map((to) => (
          <button
            key={to}
            type="button"
            disabled={!!loading}
            onClick={() => run(to)}
            className={btnPrimary}
          >
            {loading === to ? "Working…" : ACTION_LABELS[to] || to}
          </button>
        ))}

        {canResendTerms ? (
          <button
            type="button"
            disabled={!!loading}
            onClick={() => resendTerms()}
            className={btnSecondary}
          >
            {loading === "resend" || loading === "terms_sent"
              ? "Sending…"
              : status === "enquiry"
                ? "Send terms email"
                : "Resend terms email"}
          </button>
        ) : null}

        {next.includes("cancelled") ? (
          <button
            type="button"
            disabled={!!loading}
            onClick={() => run("cancelled")}
            className={btnDanger}
          >
            {loading === "cancelled" ? "Working…" : "Cancel booking"}
          </button>
        ) : null}
        {status === "enquiry" ? (
          <button
            type="button"
            disabled={!!loading}
            onClick={() => run("confirmed")}
            className={btnSecondary}
          >
            Skip accept — mark confirmed
          </button>
        ) : null}
      </div>
      {message ? <p className="text-sm text-brand-green">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}

function formatEmailResult(data: {
  acceptUrl?: string;
  emailResult?: { ok?: boolean; skipped?: boolean; error?: string };
}): string {
  const email = data.emailResult;
  if (email?.skipped) {
    return `Terms marked sent. Email not configured yet — use the Accept link on this page.`;
  }
  if (email?.ok === false) {
    return `Send failed: ${email.error || "unknown error"}. Use the Accept link on this page.`;
  }
  if (email?.ok) {
    return "Terms email sent to the client.";
  }
  return "Terms send completed.";
}
