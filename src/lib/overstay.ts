import { differenceInCalendarDays, formatISO, parseISO } from "date-fns";
import type { Invoice, InvoiceLineItem } from "./types";

/** Suggest mid-term invoicing once this many unbilled extra days accumulate. */
export const EXTENSION_SUGGEST_DAYS = 7;

const EXTRA_HIRE_DESC_PREFIX = "Extra hire days";

export function todayDateString(now = new Date()): string {
  return formatISO(now, { representation: "date" });
}

/** Calendar days past drop-off (0 if on/before drop-off). */
export function extraHireDays(
  dropoffDate: string,
  asOfDate: string,
): number {
  const dropoff = parseISO(dropoffDate);
  const asOf = parseISO(
    asOfDate.includes("T") ? asOfDate.slice(0, 10) : asOfDate,
  );
  return Math.max(0, differenceInCalendarDays(asOf, dropoff));
}

export function isExtraHireLine(item: InvoiceLineItem): boolean {
  return item.description.toLowerCase().startsWith(EXTRA_HIRE_DESC_PREFIX.toLowerCase());
}

/** Days already billed on extension invoices (and late-day lines on additional). */
export function billedExtraHireDays(
  invoices: Array<Pick<Invoice, "kind" | "line_items" | "status">>,
): number {
  let days = 0;
  for (const inv of invoices) {
    if (inv.kind !== "extension" && inv.kind !== "additional") continue;
    for (const item of (inv.line_items || []) as InvoiceLineItem[]) {
      if (!isExtraHireLine(item)) continue;
      days += Math.max(0, Number(item.quantity) || 0);
    }
  }
  return days;
}

export function buildExtraHireLineItem(
  days: number,
  dayRate: number,
  labelSuffix?: string,
): InvoiceLineItem {
  const qty = Math.max(0, days);
  const unit = Number(dayRate) || 0;
  const amount = Math.round(qty * unit * 100) / 100;
  const suffix = labelSuffix ? ` · ${labelSuffix}` : "";
  return {
    description: `${EXTRA_HIRE_DESC_PREFIX} (late return · ${qty} day${qty === 1 ? "" : "s"}${suffix})`,
    quantity: qty,
    unit_amount: unit,
    amount,
  };
}

export type OverstaySummary = {
  dropoffDate: string;
  asOfDate: string;
  extraDays: number;
  billedDays: number;
  unbilledDays: number;
  dayRate: number;
  suggestInvoice: boolean;
  suggestThreshold: number;
  estimatedUnbilledAmount: number;
};

export function summarizeOverstay(params: {
  dropoffDate: string;
  asOfDate: string;
  dayRate: number;
  invoices: Array<Pick<Invoice, "kind" | "line_items" | "status">>;
  suggestThreshold?: number;
}): OverstaySummary {
  const threshold = params.suggestThreshold ?? EXTENSION_SUGGEST_DAYS;
  const extraDays = extraHireDays(params.dropoffDate, params.asOfDate);
  const billedDays = billedExtraHireDays(params.invoices);
  const unbilledDays = Math.max(0, extraDays - billedDays);
  const dayRate = Number(params.dayRate) || 0;
  return {
    dropoffDate: params.dropoffDate,
    asOfDate: params.asOfDate,
    extraDays,
    billedDays,
    unbilledDays,
    dayRate,
    suggestInvoice: unbilledDays >= threshold,
    suggestThreshold: threshold,
    estimatedUnbilledAmount: Math.round(unbilledDays * dayRate * 100) / 100,
  };
}
