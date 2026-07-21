"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { inputClass, btnPrimary } from "@/components/ui";

export function HireDateSearch({
  initialFrom = "",
  initialTo = "",
}: {
  initialFrom?: string;
  initialTo?: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!from || !to) {
      setError("Choose both pickup and drop-off dates");
      return;
    }
    if (to < from) {
      setError("Drop-off must be on or after pickup");
      return;
    }
    const params = new URLSearchParams({ from, to });
    router.push(`/?${params.toString()}`);
  }

  function clearDates() {
    setFrom("");
    setTo("");
    setError(null);
    router.push("/");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="border border-neutral-200 border-l-4 border-l-brand-yellow bg-white p-4 shadow-sm"
    >
      <p className="text-sm font-semibold text-brand-black">
        Check availability by hire dates
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        Machines already booked stay listed with a red hire mark and dates.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <div>
          <label
            htmlFor="hire-from"
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500"
          >
            Pickup
          </label>
          <input
            id="hire-from"
            type="date"
            className={inputClass}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
          />
        </div>
        <div>
          <label
            htmlFor="hire-to"
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500"
          >
            Drop-off
          </label>
          <input
            id="hire-to"
            type="date"
            className={inputClass}
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            required
          />
        </div>
        <button type="submit" className={btnPrimary}>
          Show available
        </button>
        {initialFrom || initialTo ? (
          <button
            type="button"
            onClick={clearDates}
            className="px-3 py-2 text-sm text-neutral-600 underline-offset-2 hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
