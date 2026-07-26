"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, btnSecondary, inputClass } from "@/components/ui";
import { compressImageFile } from "@/lib/imageUpload";
import { FUEL_LEVELS, PHOTO_SIDES } from "@/lib/inspections";
import type {
  ConditionInspection,
  InspectionPhase,
} from "@/lib/types";
import { shortDate } from "@/lib/format";

export function ConditionInspectionForm({
  bookingId,
  phase,
  assetId,
  equipmentName,
  initial,
  canEdit,
}: {
  bookingId: string;
  phase: InspectionPhase;
  assetId?: string | null;
  equipmentName: string;
  initial: ConditionInspection | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ackUrl, setAckUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const title = phase === "outbound" ? "Outbound inspection" : "Return inspection";
  const appUrl = useMemo(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }, []);

  const existingAck =
    initial?.client_ack_token && appUrl
      ? `${appUrl}/inspect/${initial.client_ack_token}`
      : null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const formEl = e.currentTarget;
      const fd = new FormData();
      fd.set("phase", phase);
      fd.set(
        "hours_reading",
        String(
          (formEl.elements.namedItem("hours_reading") as HTMLInputElement)
            ?.value || "",
        ),
      );
      fd.set(
        "fuel_level",
        String(
          (formEl.elements.namedItem("fuel_level") as HTMLSelectElement)
            ?.value || "",
        ),
      );
      fd.set(
        "notes",
        String(
          (formEl.elements.namedItem("notes") as HTMLTextAreaElement)?.value ||
            "",
        ),
      );
      fd.set(
        "needs_service",
        (formEl.elements.namedItem("needs_service") as HTMLInputElement)
          ?.checked
          ? "true"
          : "false",
      );

      for (const side of PHOTO_SIDES) {
        const input = formEl.elements.namedItem(
          `photo_${side}`,
        ) as HTMLInputElement | null;
        const file = input?.files?.[0];
        if (file && file.size > 0) {
          const compressed = await compressImageFile(file);
          fd.set(`photo_${side}`, compressed, compressed.name);
        }
      }

      const res = await fetch(`/api/bookings/${bookingId}/inspections`, {
        method: "POST",
        body: fd,
      });

      let data: { error?: string; ackUrl?: string } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(
          res.status === 413 || res.status >= 500
            ? "Upload failed — photos may be too large. Try again or use smaller images."
            : `Save failed (HTTP ${res.status}).`,
        );
      }

      if (!res.ok) {
        throw new Error(data.error || "Save failed");
      }

      setMessage("Inspection saved.");
      setAckUrl(data.ackUrl || null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-brand-black">{title}</h3>
        <p className="text-xs text-neutral-500">
          {equipmentName}
          {assetId ? ` · Plant ID ${assetId}` : ""} · hours, fuel, and four
          trailer-side photos
        </p>
      </div>

      {initial ? (
        <div className="rounded border border-brand-green/30 bg-brand-green/5 px-3 py-2 text-sm">
          <div className="font-medium text-brand-green">
            Recorded {shortDate(initial.inspected_at)}
            {initial.inspected_by ? ` by ${initial.inspected_by}` : ""}
          </div>
          <div className="mt-1 text-xs text-neutral-600">
            Hours: {initial.hours_reading ?? "—"} · Fuel: {initial.fuel_level}
            {initial.needs_service ? " · Needs service" : ""}
          </div>
          {initial.client_ack_at ? (
            <div className="mt-1 text-xs text-brand-green">
              Client acknowledged by {initial.client_ack_name} ·{" "}
              {shortDate(initial.client_ack_at)}
            </div>
          ) : (
            <div className="mt-1 text-xs text-amber-700">
              Waiting for client acknowledgment
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">No inspection saved yet.</p>
      )}

      {(ackUrl || existingAck) && !initial?.client_ack_at ? (
        <div className="space-y-2 rounded border border-neutral-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Client acknowledge link
          </p>
          <p className="break-all text-xs text-neutral-600">
            {ackUrl || existingAck}
          </p>
          <button
            type="button"
            className={btnSecondary}
            onClick={() => copyLink(ackUrl || existingAck || "")}
          >
            {copied ? "Copied" : "Copy link for client"}
          </button>
        </div>
      ) : null}

      {initial ? (
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["Front", initial.photo_front_url],
              ["Rear", initial.photo_rear_url],
              ["Left", initial.photo_left_url],
              ["Right", initial.photo_right_url],
            ] as const
          ).map(([label, url]) =>
            url ? (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden border border-neutral-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`${label} side`}
                  className="h-24 w-full object-cover"
                />
                <div className="bg-neutral-50 px-2 py-1 text-[10px] uppercase tracking-wide text-neutral-500">
                  {label}
                </div>
              </a>
            ) : null,
          )}
        </div>
      ) : null}

      {canEdit ? (
        <form onSubmit={onSubmit} className="space-y-3 border-t border-neutral-100 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Hours reading
              </label>
              <input
                name="hours_reading"
                type="number"
                step="0.1"
                min="0"
                defaultValue={initial?.hours_reading ?? ""}
                className={inputClass}
                placeholder="e.g. 1240.5"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Fuel level *
              </label>
              <select
                name="fuel_level"
                required
                defaultValue={initial?.fuel_level || "full"}
                className={inputClass}
              >
                {FUEL_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs text-neutral-500">
            Photos: on your phone you can choose <strong>Camera</strong> or{" "}
            <strong>Photo Library / Gallery</strong>. Images are compressed
            before upload.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {PHOTO_SIDES.map((side) => {
              const hasExisting =
                side === "front"
                  ? Boolean(initial?.photo_front_url)
                  : side === "rear"
                    ? Boolean(initial?.photo_rear_url)
                    : side === "left"
                      ? Boolean(initial?.photo_left_url)
                      : Boolean(initial?.photo_right_url);
              return (
                <div key={side}>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Photo {side} {hasExisting ? "(replace)" : "*"}
                  </label>
                  {/* No capture= — lets phone offer Camera OR Gallery */}
                  <input
                    name={`photo_${side}`}
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="block w-full text-xs"
                    required={!hasExisting}
                  />
                </div>
              );
            })}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Notes
            </label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={initial?.notes || ""}
              className={inputClass}
              placeholder="Damage, attachments on trailer, etc."
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              name="needs_service"
              type="checkbox"
              defaultChecked={Boolean(initial?.needs_service)}
            />
            Equipment may need service after return
          </label>

          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading
              ? "Saving…"
              : initial
                ? "Update inspection"
                : "Save inspection"}
          </button>
        </form>
      ) : null}

      {message ? <p className="text-sm text-brand-green">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
