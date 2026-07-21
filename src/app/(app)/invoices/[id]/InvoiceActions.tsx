"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InvoiceKind, InvoiceLineItem, InvoiceStatus } from "@/lib/types";
import { btnPrimary, btnSecondary, inputClass } from "@/components/ui";

export function InvoiceActions({
  invoiceId,
  status,
  kind,
  pdfUrl,
  initialItems,
}: {
  invoiceId: string;
  status: InvoiceStatus;
  kind: InvoiceKind;
  pdfUrl: string | null;
  initialItems: InvoiceLineItem[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<InvoiceLineItem[]>(initialItems);
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("");

  const canEdit = status !== "paid";

  async function run(
    action: "mark_sent" | "mark_paid" | "update_line_items" | "regenerate_pdf",
    line_items?: InvoiceLineItem[],
  ) {
    setLoading(action);
    setError(null);
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        line_items,
      }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error || "Update failed");
      return;
    }
    router.refresh();
  }

  function addItem() {
    const quantity = Math.max(0, Number(qty) || 0);
    const unit_amount = Math.max(0, Number(unit) || 0);
    const description = desc.trim() || "Additional charge";
    const next = [
      ...items,
      {
        description,
        quantity,
        unit_amount,
        amount: Math.round(quantity * unit_amount * 100) / 100,
      },
    ];
    setItems(next);
    setDesc("");
    setQty("1");
    setUnit("");
    void run("update_line_items", next);
  }

  function removeItem(index: number) {
    const next = items.filter((_, i) => i !== index);
    setItems(next);
    void run("update_line_items", next);
  }

  async function noExtraCharges() {
    const next: InvoiceLineItem[] = [
      {
        description: "No additional charges",
        quantity: 1,
        unit_amount: 0,
        amount: 0,
      },
    ];
    setItems(next);
    setLoading("no_extra");
    setError(null);
    const save = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_line_items", line_items: next }),
    });
    if (!save.ok) {
      const data = await save.json();
      setLoading(null);
      setError(data.error || "Update failed");
      return;
    }
    const paid = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_paid" }),
    });
    setLoading(null);
    if (!paid.ok) {
      const data = await paid.json();
      setError(data.error || "Could not close invoice");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-600">
        {kind === "hire"
          ? "Hire invoice — must be paid before scheduling."
          : "Additional charges after return (damage, extra days, cleaning, etc.)."}
      </p>

      {canEdit && kind === "additional" ? (
        <div className="space-y-2 rounded border border-neutral-200 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Add charges
          </p>
          {items.map((item, i) => (
            <div
              key={`${item.description}-${i}`}
              className="flex items-start justify-between gap-2 text-sm"
            >
              <span>
                {item.description} × {item.quantity} @ $
                {Number(item.unit_amount).toFixed(2)}
              </span>
              <button
                type="button"
                className="text-xs text-rose-700"
                onClick={() => removeItem(i)}
              >
                Remove
              </button>
            </div>
          ))}
          <input
            className={inputClass}
            placeholder="Description e.g. Extra day / cleaning"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className={inputClass}
              placeholder="Qty"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Unit $"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={`${btnSecondary} w-full`}
            disabled={!!loading}
            onClick={addItem}
          >
            {loading === "update_line_items" ? "Saving…" : "Add line item"}
          </button>
          {status === "draft" || status === "sent" ? (
            <button
              type="button"
              className={`${btnSecondary} w-full`}
              disabled={!!loading}
              onClick={() => void noExtraCharges()}
            >
              {loading === "no_extra"
                ? "Closing…"
                : "No additional charges — close"}
            </button>
          ) : null}
        </div>
      ) : null}

      {pdfUrl ? (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className={`${btnSecondary} w-full`}
        >
          Download / view PDF
        </a>
      ) : (
        <p className="text-sm text-neutral-500">PDF not generated yet.</p>
      )}

      <button
        type="button"
        className={`${btnSecondary} w-full`}
        disabled={!!loading}
        onClick={() => run("regenerate_pdf")}
      >
        {loading === "regenerate_pdf"
          ? "Working…"
          : kind === "hire"
            ? "Rebuild hire + LCC + GST / PDF"
            : "Regenerate PDF + GST"}
      </button>

      {status === "draft" ? (
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={!!loading}
          onClick={() => run("mark_sent")}
        >
          {loading === "mark_sent" ? "Working…" : "Mark as sent"}
        </button>
      ) : null}

      {status === "sent" || status === "overdue" || status === "draft" ? (
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={!!loading}
          onClick={() => run("mark_paid")}
        >
          {loading === "mark_paid"
            ? "Working…"
            : kind === "hire"
              ? "Mark hire invoice paid"
              : "Mark as paid"}
        </button>
      ) : null}

      {status === "paid" ? (
        <p className="text-sm text-brand-green">
          {kind === "hire"
            ? "Hire invoice paid — you can schedule the hire."
            : "Additional invoice paid. Booking closed."}
        </p>
      ) : null}

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
