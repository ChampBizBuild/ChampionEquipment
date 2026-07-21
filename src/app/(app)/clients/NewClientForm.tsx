"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, Field, inputClass } from "@/components/ui";

export function NewClientForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("clients")
      .insert({
        business_name: String(fd.get("business_name") || ""),
        contact_name: String(fd.get("contact_name") || ""),
        abn: String(fd.get("abn") || "") || null,
        email: String(fd.get("email") || ""),
        phone: String(fd.get("phone") || "") || null,
        billing_address: String(fd.get("billing_address") || "") || null,
        notes: String(fd.get("notes") || "") || null,
      })
      .select("id")
      .single();

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push(`/clients/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Business name">
        <input name="business_name" required className={inputClass} />
      </Field>
      <Field label="Contact name">
        <input name="contact_name" required className={inputClass} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required className={inputClass} />
      </Field>
      <Field label="Phone">
        <input name="phone" className={inputClass} />
      </Field>
      <Field label="ABN">
        <input name="abn" className={inputClass} />
      </Field>
      <Field label="Billing address">
        <textarea name="billing_address" rows={2} className={inputClass} />
      </Field>
      <Field label="Notes">
        <textarea name="notes" rows={2} className={inputClass} />
      </Field>
      <button type="submit" disabled={loading} className={btnPrimary}>
        {loading ? "Saving…" : "Save client"}
      </button>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
