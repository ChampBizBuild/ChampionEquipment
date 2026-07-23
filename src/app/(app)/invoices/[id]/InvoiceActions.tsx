"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { InvoiceKind, InvoiceLineItem, InvoiceStatus } from "@/lib/types";
import { btnPrimary, btnSecondary, inputClass } from "@/components/ui";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

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

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  async function run(
    action:
      | "mark_sent"
      | "mark_paid"
      | "update_line_items"
      | "regenerate_pdf"
      | "rebuild_from_booking",
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

  function updateRow(
    index: number,
    patch: Partial<Pick<InvoiceLineItem, "description" | "quantity" | "unit_amount">>,
  ) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...patch };
        next.amount = round2(Number(next.quantity) * Number(next.unit_amount));
        return next;
      }),
    );
  }

  function addItem() {
    const quantity = Math.max(0, Number(qty) || 0);
    const unit_amount = Math.max(0, Number(unit) || 0);
    const description = desc.trim() || "Additional charge";
    setItems((prev) => [
      ...prev,
      {
        description,
        quantity,
        unit_amount,
        amount: round2(quantity * unit_amount),
      },
    ]);
    setDesc("");
    setQty("1");
    setUnit("");
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function saveItems() {
    void run("update_line_items", items);
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

  const draftSubtotal = round2(
    items.reduce((sum, li) => sum + Number(li.amount || 0), 0),
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-600">
        {kind === "hire"
          ? "Hire invoice — edit days/charges below if needed (e.g. afternoon pickup counts as fewer billable days)."
          : "Additional charges after return (damage, extra days, cleaning, etc.)."}
      </p>

      {canEdit ? (
        <div className="space-y-2 rounded border border-neutral-200 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Edit line items
          </p>
          {items.length === 0 ? (
            <p className="text-sm text-neutral-500">No line items yet.</p>
          ) : null}
          {items.map((item, i) => (
            <div
              key={i}
              className="space-y-1.5 rounded border border-neutral-100 bg-neutral-50 p-2"
            >
              <input
                className={inputClass}
                value={item.description}
                onChange={(e) => updateRow(i, { description: e.target.value })}
                placeholder="Description"
              />
              <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="1"
                  value={item.quantity}
                  onChange={(e) =>
                    updateRow(i, { quantity: Number(e.target.value) || 0 })
                  }
                  placeholder="Qty"
                />
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_amount}
                  onChange={(e) =>
                    updateRow(i, { unit_amount: Number(e.target.value) || 0 })
                  }
                  placeholder="Unit $"
                />
                <button
                  type="button"
                  className="text-xs text-rose-700"
                  onClick={() => removeItem(i)}
                >
                  Remove
                </button>
              </div>
              <p className="text-right text-xs text-neutral-500">
                Line total ${round2(Number(item.amount)).toFixed(2)}
              </p>
            </div>
          ))}

          <div className="border-t border-neutral-200 pt-2">
            <p className="mb-1.5 text-xs font-medium text-neutral-500">
              Add line
            </p>
            <input
              className={inputClass}
              placeholder={
                kind === "hire"
                  ? "Description e.g. Equipment hire - 3 days"
                  : "Description e.g. Extra day / cleaning"
              }
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
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
              className={`${btnSecondary} mt-2 w-full`}
              disabled={!!loading}
              onClick={addItem}
            >
              Add line item
            </button>
          </div>

          <div className="flex justify-between border-t border-neutral-200 pt-2 text-sm font-medium">
            <span>Edited subtotal</span>
            <span>${draftSubtotal.toFixed(2)}</span>
          </div>

          <button
            type="button"
            className={`${btnPrimary} w-full`}
            disabled={!!loading}
            onClick={saveItems}
          >
            {loading === "update_line_items"
              ? "Saving…"
              : "Save line items + PDF"}
          </button>

          {kind === "additional" &&
          (status === "draft" || status === "sent") ? (
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
        {loading === "regenerate_pdf" ? "Working…" : "Regenerate PDF"}
      </button>

      {kind === "hire" && canEdit ? (
        <button
          type="button"
          className={`${btnSecondary} w-full`}
          disabled={!!loading}
          onClick={() => {
            if (
              confirm(
                "Reset this invoice from booking dates/rates? Manual line edits will be overwritten.",
              )
            ) {
              void run("rebuild_from_booking");
            }
          }}
        >
          {loading === "rebuild_from_booking"
            ? "Working…"
            : "Recalculate from hire dates"}
        </button>
      ) : null}

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
