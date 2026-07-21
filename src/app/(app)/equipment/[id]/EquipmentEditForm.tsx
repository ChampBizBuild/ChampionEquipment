"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, Field, inputClass } from "@/components/ui";
import { EQUIPMENT_STATUSES } from "@/lib/status";
import type { Equipment } from "@/lib/types";

export function EquipmentEditForm({ equipment }: { equipment: Equipment }) {
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
      .from("equipment")
      .update({
        name: String(fd.get("name") || ""),
        make_model: String(fd.get("make_model") || "") || null,
        asset_id: String(fd.get("asset_id") || "").trim() || null,
        day_rate: Number(fd.get("day_rate") || 0),
        week_rate: Number(fd.get("week_rate") || 0),
        status: String(fd.get("status") || "available"),
        notes: String(fd.get("notes") || "") || null,
      })
      .eq("id", equipment.id);

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
      <Field label="Name">
        <input
          name="name"
          defaultValue={equipment.name}
          required
          className={inputClass}
        />
      </Field>
      <Field label="Make / model">
        <input
          name="make_model"
          defaultValue={equipment.make_model || ""}
          className={inputClass}
        />
      </Field>
      <Field label="Plant / asset ID">
        <input
          name="asset_id"
          defaultValue={equipment.asset_id || ""}
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
            defaultValue={Number(equipment.day_rate)}
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
            defaultValue={Number(equipment.week_rate)}
            required
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Status">
        <select
          name="status"
          defaultValue={equipment.status}
          className={inputClass}
        >
          {EQUIPMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Notes">
        <textarea
          name="notes"
          rows={3}
          defaultValue={equipment.notes || ""}
          className={inputClass}
        />
      </Field>
      <button type="submit" disabled={loading} className={btnPrimary}>
        {loading ? "Saving…" : "Save changes"}
      </button>
      {message ? <p className="text-sm text-brand-green">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
