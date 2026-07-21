"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { HireAgreementDocument } from "@/components/HireAgreementDocument";
import { btnPrimary } from "@/components/ui";
import {
  hireDetailsFromFormData,
  normalizeHireDetails,
  type HireDetails,
} from "@/lib/hireAgreement";

export function HireAgreementEditor({
  bookingId,
  values,
  initialDetails,
}: {
  bookingId: string;
  values: {
    businessName: string;
    businessAbn: string;
    businessPhone: string;
    businessEmail: string;
    businessAddress: string;
    clientBusiness: string;
    clientContact: string;
    clientPhone: string;
    clientEmail: string;
    equipmentName: string;
    dayRate: number;
    pickupDate: string;
    dropoffDate: string;
  };
  initialDetails: HireDetails | Record<string, unknown> | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const hire_details = hireDetailsFromFormData(fd);

    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hire_details }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }
    setMessage("Hire agreement details saved.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <HireAgreementDocument
        mode="edit"
        values={{
          ...values,
          details: normalizeHireDetails(initialDetails),
        }}
      />
      <button type="submit" disabled={loading} className={btnPrimary}>
        {loading ? "Saving…" : "Save hire agreement details"}
      </button>
      {message ? <p className="text-sm text-brand-green">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
