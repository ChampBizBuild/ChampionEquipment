import {
  differenceInCalendarDays,
  addDays,
  formatISO,
  parseISO,
} from "date-fns";
import type { InvoiceLineItem } from "./types";

export type HireQuote = {
  days: number;
  weeks: number;
  remainderDays: number;
  line_items: InvoiceLineItem[];
  subtotal: number;
  gst: number;
  total: number;
};

/** Prefer whole weeks at week_rate, remainder at day_rate. Min 1 day. */
export function calculateHireCharges(
  pickupDate: string,
  dropoffDate: string,
  dayRate: number,
  weekRate: number,
  gstRegistered: boolean,
): HireQuote {
  const pickup = parseISO(pickupDate);
  const dropoff = parseISO(dropoffDate);
  const rawDays = differenceInCalendarDays(dropoff, pickup) + 1;
  const days = Math.max(1, rawDays);

  const weeks = Math.floor(days / 7);
  const remainderDays = days % 7;

  const line_items: InvoiceLineItem[] = [];

  if (weeks > 0) {
    const amount = round2(weeks * weekRate);
    line_items.push({
      description: `Equipment hire - ${weeks} week${weeks === 1 ? "" : "s"}`,
      quantity: weeks,
      unit_amount: round2(weekRate),
      amount,
    });
  }

  if (remainderDays > 0 || weeks === 0) {
    const qty = weeks === 0 ? days : remainderDays;
    const amount = round2(qty * dayRate);
    line_items.push({
      description: `Equipment hire - ${qty} day${qty === 1 ? "" : "s"}`,
      quantity: qty,
      unit_amount: round2(dayRate),
      amount,
    });
  }

  const subtotal = round2(line_items.reduce((sum, li) => sum + li.amount, 0));
  const gst = gstRegistered ? round2(subtotal * 0.1) : 0;
  const total = round2(subtotal + gst);

  return {
    days,
    weeks,
    remainderDays: weeks === 0 ? days : remainderDays,
    line_items,
    subtotal,
    gst,
    total,
  };
}

/** Pull a dollar amount from free-text like "$350", "350.00", or "350 each way". */
export function parseMoneyAmount(raw: string | null | undefined): number {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/,/g, "").trim();
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const n = Number(match[0]);
  return Number.isFinite(n) && n > 0 ? round2(n) : 0;
}

/**
 * Adds Travel/Float (and optional additional hire charge) from the hire
 * agreement onto a hire quote. Does not affect LCC base.
 */
export function withHireAgreementExtras(
  quote: HireQuote,
  extras: {
    travelFloatFee?: string | null;
    additionalHireCharge?: string | null;
  },
  gstRegistered: boolean,
): HireQuote {
  const withoutExtras = quote.line_items.filter((li) => {
    const d = li.description.toLowerCase();
    return (
      !d.startsWith("travel") &&
      !d.includes("float") &&
      !d.startsWith("additional hire")
    );
  });

  const line_items: InvoiceLineItem[] = [...withoutExtras];

  const floatAmount = parseMoneyAmount(extras.travelFloatFee);
  if (floatAmount > 0) {
    line_items.push({
      description: "Travel / float fee",
      quantity: 1,
      unit_amount: floatAmount,
      amount: floatAmount,
    });
  }

  const additionalAmount = parseMoneyAmount(extras.additionalHireCharge);
  if (additionalAmount > 0) {
    line_items.push({
      description: "Additional hire charge",
      quantity: 1,
      unit_amount: additionalAmount,
      amount: additionalAmount,
    });
  }

  return {
    ...quote,
    line_items,
    ...totalsFromLineItems(line_items, gstRegistered),
  };
}

/**
 * When the hirer does not have their own LCC insurance, Champion provides
 * Loss/Damage/Cost coverage at 10% of the equipment hire charges (ex GST).
 * Float / extras are excluded from the LCC base. GST then applies to all lines.
 */
export function withOptionalLccCoverage(
  quote: HireQuote,
  needsChampionLcc: boolean,
  gstRegistered: boolean,
): HireQuote {
  const withoutLcc = quote.line_items.filter(
    (li) => !li.description.toLowerCase().startsWith("lcc"),
  );

  if (!needsChampionLcc) {
    return {
      ...quote,
      line_items: withoutLcc,
      ...totalsFromLineItems(withoutLcc, gstRegistered),
    };
  }

  const hireOnly = withoutLcc.filter((li) =>
    li.description.toLowerCase().startsWith("equipment hire"),
  );
  const other = withoutLcc.filter(
    (li) => !li.description.toLowerCase().startsWith("equipment hire"),
  );
  const hireSubtotal = round2(hireOnly.reduce((sum, li) => sum + li.amount, 0));
  const lccAmount = round2(hireSubtotal * 0.1);
  if (lccAmount <= 0) {
    return {
      ...quote,
      line_items: withoutLcc,
      ...totalsFromLineItems(withoutLcc, gstRegistered),
    };
  }

  const line_items: InvoiceLineItem[] = [
    ...hireOnly,
    ...other,
    {
      description:
        "LCC coverage (Loss, Damage or Cost) - 10% of hire",
      quantity: 1,
      unit_amount: lccAmount,
      amount: lccAmount,
    },
  ];

  return {
    ...quote,
    line_items,
    ...totalsFromLineItems(line_items, gstRegistered),
  };
}

/** Hire days/weeks + agreement extras + optional LCC. */
export function buildHireInvoiceQuote(params: {
  pickupDate: string;
  dropoffDate: string;
  dayRate: number;
  weekRate: number;
  gstRegistered: boolean;
  needsChampionLcc: boolean;
  travelFloatFee?: string | null;
  additionalHireCharge?: string | null;
}): HireQuote {
  const base = calculateHireCharges(
    params.pickupDate,
    params.dropoffDate,
    params.dayRate,
    params.weekRate,
    params.gstRegistered,
  );
  const withExtras = withHireAgreementExtras(
    base,
    {
      travelFloatFee: params.travelFloatFee,
      additionalHireCharge: params.additionalHireCharge,
    },
    params.gstRegistered,
  );
  return withOptionalLccCoverage(
    withExtras,
    params.needsChampionLcc,
    params.gstRegistered,
  );
}

export function defaultDueDate(fromDate = new Date(), days = 14): string {
  return formatISO(addDays(fromDate, days), { representation: "date" });
}

export function totalsFromLineItems(
  lineItems: InvoiceLineItem[],
  gstRegistered: boolean,
): { subtotal: number; gst: number; total: number } {
  const subtotal = round2(lineItems.reduce((sum, li) => sum + Number(li.amount), 0));
  const gst = gstRegistered ? round2(subtotal * 0.1) : 0;
  return { subtotal, gst, total: round2(subtotal + gst) };
}

export function normalizeLineItem(raw: {
  description?: string;
  quantity?: number;
  unit_amount?: number;
  amount?: number;
}): InvoiceLineItem {
  const description = String(raw.description || "").trim() || "Charge";
  const quantity = Math.max(0, Number(raw.quantity) || 0);
  const unit_amount = round2(Number(raw.unit_amount) || 0);
  const amount = round2(
    raw.amount != null ? Number(raw.amount) : quantity * unit_amount,
  );
  return { description, quantity, unit_amount, amount };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
