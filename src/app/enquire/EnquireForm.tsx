"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { hireDetailsFromFormData } from "@/lib/hireAgreement";

type EquipmentOption = {
  id: string;
  name: string;
  day_rate: number;
  week_rate: number;
  status: string;
};

function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-brand-green"
    >
      {children}
    </label>
  );
}

function Section({
  step,
  title,
  subtitle,
  children,
}: {
  step: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="enquire-section">
      <div className="enquire-section-head">
        <span className="enquire-step">{step}</span>
        <div>
          <h3 className="enquire-display text-xl font-bold leading-none text-brand-yellow">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-xs text-white/60">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-4 p-5 md:p-6">{children}</div>
    </section>
  );
}

const ATTACHMENTS: [string, string][] = [
  ["att_hydraulic_tilt_bucket", "Hydraulic Tilt Bucket"],
  ["att_auger_100", "Auger 100mm"],
  ["att_auger_300", "Auger 300mm"],
  ["att_auger_450", "Auger 450mm"],
  ["att_auger_600", "Auger 600mm"],
  ["att_rock_breaker", "Rock Breaker"],
  ["att_hydraulic_grab", "Hydraulic Grab"],
  ["att_bucket_4in1", "4 in 1 Bucket"],
];

export function EnquireForm({ equipment }: { equipment: EquipmentOption[] }) {
  const searchParams = useSearchParams();
  const preselected = searchParams.get("equipment") || "";
  const preFrom = searchParams.get("from") || "";
  const preTo = searchParams.get("to") || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const hire_details = hireDetailsFromFormData(fd);

    const payload = {
      business_name: String(fd.get("business_name") || ""),
      contact_name: String(fd.get("contact_name") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      abn: String(fd.get("abn") || ""),
      billing_address: String(fd.get("billing_address") || ""),
      equipment_id: String(fd.get("equipment_id") || ""),
      pickup_date: String(fd.get("pickup_date") || ""),
      dropoff_date: String(fd.get("dropoff_date") || ""),
      notes: String(fd.get("notes") || ""),
      hire_details,
    };

    const res = await fetch("/api/enquire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Submission failed");
      return;
    }

    setDone({ reference: data.reference });
  }

  if (done) {
    return (
      <div className="border-2 border-brand-black bg-white p-8 shadow-[8px_8px_0_#FDB813]">
        <p className="enquire-display text-sm font-semibold text-brand-green">
          Enquiry received
        </p>
        <h2 className="enquire-display mt-2 text-4xl font-extrabold text-brand-black">
          Thanks — we&apos;re on it
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-600">
          Champion Equipment has your hire request. We&apos;ll confirm details
          and send the Hire Agreement for acceptance.
        </p>
        <div className="mt-6 inline-block bg-brand-black px-4 py-2 text-sm text-brand-yellow">
          Reference{" "}
          <span className="enquire-display text-lg font-bold tracking-wide">
            {done.reference}
          </span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Section
        step="01"
        title="Your details"
        subtitle="Who should we invoice and contact?"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Business / client name *</Label>
            <input name="business_name" required className="enquire-input" />
          </div>
          <div>
            <Label>Contact name *</Label>
            <input name="contact_name" required className="enquire-input" />
          </div>
          <div>
            <Label>Email *</Label>
            <input
              name="email"
              type="email"
              required
              className="enquire-input"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <input name="phone" className="enquire-input" />
          </div>
          <div>
            <Label>ABN *</Label>
            <input
              name="abn"
              required
              className="enquire-input"
              placeholder="11 digits"
              inputMode="numeric"
              pattern="[\d\s]{11,14}"
              title="Enter an 11-digit Australian ABN"
            />
          </div>
          <div>
            <Label>Billing address</Label>
            <input name="billing_address" className="enquire-input" />
          </div>
        </div>
      </Section>

      <Section
        step="02"
        title="Hire request"
        subtitle="Machine, dates, and site"
      >
        <div>
          <Label>Equipment *</Label>
          <select
            name="equipment_id"
            required
            className="enquire-input"
            defaultValue={
              equipment.some((e) => e.id === preselected) ? preselected : ""
            }
          >
            <option value="">Select equipment…</option>
            {equipment.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name} — ${Number(eq.day_rate)}/day
                {eq.status !== "available" ? ` (${eq.status})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Start / pickup date *</Label>
            <input
              name="pickup_date"
              type="date"
              required
              className="enquire-input"
              defaultValue={preFrom}
            />
          </div>
          <div>
            <Label>End / drop-off date *</Label>
            <input
              name="dropoff_date"
              type="date"
              required
              className="enquire-input"
              defaultValue={preTo}
            />
          </div>
          <div>
            <Label>Preferred collection time</Label>
            <input
              name="preferred_collection_time"
              className="enquire-input"
              placeholder="e.g. 7:00 AM"
            />
          </div>
          <div>
            <Label>Preferred return time</Label>
            <input
              name="preferred_return_time"
              className="enquire-input"
              placeholder="e.g. 3:00 PM"
            />
          </div>
        </div>
        <div>
          <Label>Site address</Label>
          <textarea
            name="site_address"
            rows={2}
            className="enquire-input"
            placeholder="Where will the machine be working?"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Site contact</Label>
            <input name="site_contact" className="enquire-input" />
          </div>
          <div>
            <Label>Site phone</Label>
            <input name="site_phone" className="enquire-input" />
          </div>
        </div>
        <div>
          <Label>Job / PO reference</Label>
          <input name="job_reference" className="enquire-input" />
        </div>
        <div>
          <Label>Delivery / quantity notes</Label>
          <textarea name="quantity_notes" rows={2} className="enquire-input" />
        </div>
      </Section>

      <Section
        step="03"
        title="Attachments & extras"
        subtitle="Tick anything you need with the machine"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {ATTACHMENTS.map(([name, label]) => (
            <label key={name} className="enquire-chip">
              <input type="checkbox" name={name} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <div>
          <Label>Other attachments</Label>
          <input name="att_other" className="enquire-input" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Require an operator?</Label>
            <select name="require_operator" className="enquire-input">
              <option value="">Select…</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <Label>Do you have your own LCC insurance?</Label>
            <select name="lcc_insurance" className="enquire-input">
              <option value="">Select…</option>
              <option value="yes">Yes — I have my own cover</option>
              <option value="no">
                No — Champion Equipment LCC at 10% of hire
              </option>
            </select>
            <p className="mt-1 text-xs text-white/50">
              LCC = Loss, Damage or Cost coverage for the hired equipment.
            </p>
          </div>
        </div>
      </Section>

      <Section step="04" title="Anything else?" subtitle="Optional notes">
        <div>
          <Label>Notes</Label>
          <textarea name="notes" rows={3} className="enquire-input" />
        </div>
      </Section>

      <input type="hidden" name="travel_float_fee" value="" />
      <input type="hidden" name="additional_hire_charge" value="" />
      <input type="hidden" name="wet_weather" value="" />
      <input type="hidden" name="operator_name" value="" />
      <input type="hidden" name="operator_rate" value="" />

      <button type="submit" disabled={loading} className="enquire-submit">
        {loading ? "Submitting…" : "Submit hire enquiry"}
      </button>

      {error ? (
        <p className="border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <p className="text-center text-xs text-neutral-500">
        This submits an enquiry only. You&apos;ll receive the Hire Agreement to
        accept before the hire is confirmed.
      </p>
    </form>
  );
}
