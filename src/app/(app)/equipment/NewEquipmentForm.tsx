"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, Field, inputClass } from "@/components/ui";

export function NewEquipmentForm() {
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
      .from("equipment")
      .insert({
        name: String(fd.get("name") || ""),
        make_model: String(fd.get("make_model") || "") || null,
        asset_id: String(fd.get("asset_id") || "").trim() || null,
        day_rate: Number(fd.get("day_rate") || 0),
        week_rate: Number(fd.get("week_rate") || 0),
        status: "available",
        notes: String(fd.get("notes") || "") || null,
      })
      .select("id")
      .single();

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push(`/equipment/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Name">
        <input
          name="name"
          required
          placeholder="1.8T Excavator"
          className={inputClass}
        />
      </Field>
      <Field label="Make / model">
        <input name="make_model" className={inputClass} />
      </Field>
      <Field label="Plant / asset ID">
        <input
          name="asset_id"
          placeholder="e.g. MRX371"
          className={inputClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Day rate">
          <input
            name="day_rate"
            type="number"
            step="0.01"
            min="0"
            required
            className={inputClass}
          />
        </Field>
        <Field label="Week rate">
          <input
            name="week_rate"
            type="number"
            step="0.01"
            min="0"
            required
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Notes">
        <textarea name="notes" rows={2} className={inputClass} />
      </Field>
      <button type="submit" disabled={loading} className={btnPrimary}>
        {loading ? "Saving…" : "Add equipment"}
      </button>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
