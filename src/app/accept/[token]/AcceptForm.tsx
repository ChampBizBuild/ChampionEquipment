"use client";

import { FormEvent, useState } from "react";
import { HireAgreementDocument } from "@/components/HireAgreementDocument";
import { btnPrimary, Field, inputClass } from "@/components/ui";
import {
  hireDetailsFromFormData,
  normalizeHireDetails,
  type HireDetails,
} from "@/lib/hireAgreement";

type AcceptValues = {
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

export function AcceptForm({
  token,
  values,
  initialDetails,
  termsBody,
}: {
  token: string;
  values: AcceptValues;
  initialDetails: HireDetails | Record<string, unknown> | null;
  termsBody: string;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const hire_details = hireDetailsFromFormData(fd);

    const res = await fetch(`/api/accept/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accepted_name: name,
        hire_details,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Acceptance failed");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mt-6 rounded border border-brand-green/30 bg-brand-green/10 p-4 text-sm text-brand-green">
        Thank you. Your acceptance has been recorded and the hire is confirmed.
        You will receive a confirmation email shortly.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <HireAgreementDocument
        mode="accept"
        values={{
          ...values,
          details: normalizeHireDetails(initialDetails),
        }}
      />

      <section className="border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 bg-brand-black px-4 py-2">
          <h3 className="text-sm font-semibold text-brand-yellow">
            Terms of Trade — Champion Equipment
          </h3>
        </div>
        <pre className="whitespace-pre-wrap p-4 font-sans text-sm leading-relaxed text-neutral-700">
          {termsBody}
        </pre>
      </section>

      <div className="space-y-4 rounded border border-brand-black border-t-4 border-t-brand-yellow bg-white p-4">
        <p className="text-sm text-neutral-600">
          By typing your full name and clicking Accept, you agree to the Machine
          Hire Agreement and Terms of Trade above. Your name, the time, and your
          IP address will be recorded, and a PDF snapshot will be stored.
        </p>
        <Field label="Full legal name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            className={inputClass}
            placeholder="Type your full name"
          />
        </Field>
        <button
          type="submit"
          disabled={loading || name.trim().length < 2}
          className={btnPrimary}
        >
          {loading ? "Recording…" : "I Accept"}
        </button>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </div>
    </form>
  );
}
