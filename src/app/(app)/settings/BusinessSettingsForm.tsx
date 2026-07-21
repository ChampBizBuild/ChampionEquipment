"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, Field, inputClass } from "@/components/ui";
import type { BusinessSettings } from "@/lib/types";

export function BusinessSettingsForm({
  settings,
}: {
  settings: BusinessSettings;
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
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("business_settings")
      .update({
        business_name: String(fd.get("business_name") || ""),
        trading_as: String(fd.get("trading_as") || ""),
        abn: String(fd.get("abn") || ""),
        email: String(fd.get("email") || ""),
        phone: String(fd.get("phone") || ""),
        address: String(fd.get("address") || ""),
        bank_name: String(fd.get("bank_name") || ""),
        bsb: String(fd.get("bsb") || ""),
        account_number: String(fd.get("account_number") || ""),
        account_name: String(fd.get("account_name") || ""),
        gst_registered: fd.get("gst_registered") === "on",
        invoice_prefix: String(fd.get("invoice_prefix") || "CE"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage("Saved.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Business name">
        <input
          name="business_name"
          defaultValue={settings.business_name}
          required
          className={inputClass}
        />
      </Field>
      <Field label="Trading as">
        <input
          name="trading_as"
          defaultValue={settings.trading_as}
          className={inputClass}
        />
      </Field>
      <Field label="ABN">
        <input name="abn" defaultValue={settings.abn} className={inputClass} />
      </Field>
      <Field label="Email">
        <input
          name="email"
          type="email"
          defaultValue={settings.email}
          className={inputClass}
        />
      </Field>
      <Field label="Phone">
        <input
          name="phone"
          defaultValue={settings.phone}
          className={inputClass}
        />
      </Field>
      <Field label="Address">
        <textarea
          name="address"
          rows={2}
          defaultValue={settings.address}
          className={inputClass}
        />
      </Field>
      <Field label="Account name">
        <input
          name="account_name"
          defaultValue={settings.account_name}
          className={inputClass}
        />
      </Field>
      <Field label="Bank">
        <input
          name="bank_name"
          defaultValue={settings.bank_name}
          className={inputClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="BSB">
          <input name="bsb" defaultValue={settings.bsb} className={inputClass} />
        </Field>
        <Field label="Account number">
          <input
            name="account_number"
            defaultValue={settings.account_number}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Invoice prefix">
        <input
          name="invoice_prefix"
          defaultValue={settings.invoice_prefix}
          className={inputClass}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          name="gst_registered"
          type="checkbox"
          defaultChecked={settings.gst_registered}
        />
        <span>
          GST registered — only tick this if you must charge GST.
          <span className="block text-xs text-neutral-500">
            Leave unticked for sole trader / not GST-registered (invoices stay
            ex GST, no 10% added).
          </span>
        </span>
      </label>
      <button type="submit" disabled={loading} className={btnPrimary}>
        {loading ? "Saving…" : "Save business settings"}
      </button>
      {message ? <p className="text-sm text-brand-green">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
