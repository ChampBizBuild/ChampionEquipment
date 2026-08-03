import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel, btnPrimary } from "@/components/ui";
import { BookingBadge, EquipmentBadge } from "@/components/StatusBadge";
import { money, shortDate } from "@/lib/format";
import {
  EXTENSION_SUGGEST_DAYS,
  summarizeOverstay,
  todayDateString,
} from "@/lib/overstay";
import type { BookingStatus, Invoice } from "@/lib/types";

const ACTIVE: BookingStatus[] = [
  "enquiry",
  "terms_sent",
  "confirmed",
  "out",
  "returned",
  "invoiced",
];

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data: bookings }, { data: equipment }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "*, clients(business_name, contact_name), equipment(name, status, day_rate)",
      )
      .in("status", ACTIVE)
      .order("pickup_date", { ascending: true }),
    supabase.from("equipment").select("*").order("name"),
  ]);

  const outBookingIds = (bookings || [])
    .filter((b) => b.status === "out")
    .map((b) => b.id);

  const { data: outInvoices } = outBookingIds.length
    ? await supabase
        .from("invoices")
        .select("booking_id, kind, line_items, status")
        .in("booking_id", outBookingIds)
    : { data: [] as Array<Pick<Invoice, "kind" | "line_items" | "status"> & { booking_id: string }> };

  const invoicesByBooking = new Map<string, typeof outInvoices>();
  for (const inv of outInvoices || []) {
    const list = invoicesByBooking.get(inv.booking_id) || [];
    list.push(inv);
    invoicesByBooking.set(inv.booking_id, list);
  }

  const midTermDue = (bookings || [])
    .filter((b) => b.status === "out")
    .map((b) => {
      const summary = summarizeOverstay({
        dropoffDate: b.dropoff_date,
        asOfDate: todayDateString(),
        dayRate: Number(b.equipment?.day_rate || 0),
        invoices: invoicesByBooking.get(b.id) || [],
      });
      return { booking: b, summary };
    })
    .filter((row) => row.summary.suggestInvoice);

  const byDay = new Map<string, typeof bookings>();
  for (const b of bookings || []) {
    const key = b.pickup_date;
    const list = byDay.get(key) || [];
    list.push(b);
    byDay.set(key, list);
  }

  const calendarDays = Array.from(byDay.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const enquiries = (bookings || []).filter((b) => b.status === "enquiry");

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Bookings calendar and equipment status"
        actions={
          <Link href="/bookings/new" className={btnPrimary}>
            New booking
          </Link>
        }
      />

      {midTermDue.length > 0 ? (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-950">
            Mid-term invoice due ({midTermDue.length}) · {EXTENSION_SUGGEST_DAYS}+
            unbilled extra days
          </div>
          <div className="mt-2 space-y-2">
            {midTermDue.map(({ booking: b, summary }) => (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-amber-200 bg-white px-3 py-2 text-sm hover:bg-amber-50"
              >
                <span>
                  {b.equipment?.name} · {b.clients?.business_name} ·{" "}
                  {summary.unbilledDays} unbilled day
                  {summary.unbilledDays === 1 ? "" : "s"} (
                  {money(summary.estimatedUnbilledAmount)})
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Invoice extra hire
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {enquiries.length > 0 ? (
        <div className="mb-4 rounded border border-brand-yellow bg-brand-yellow/15 p-4">
          <div className="text-sm font-semibold text-brand-black">
            Open enquiries ({enquiries.length})
          </div>
          <div className="mt-2 space-y-2">
            {enquiries.map((b) => (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-brand-black/10 bg-white px-3 py-2 text-sm hover:bg-brand-yellow/10"
              >
                <span>
                  {b.equipment?.name} · {b.clients?.business_name} ·{" "}
                  {shortDate(b.pickup_date)} → {shortDate(b.dropoff_date)}
                </span>
                <BookingBadge status={b.status} />
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Panel title="Upcoming / active bookings">
            {calendarDays.length === 0 ? (
              <p className="text-sm text-neutral-500">No active bookings.</p>
            ) : (
              <div className="space-y-4">
                {calendarDays.map(([date, items]) => (
                  <div key={date}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {shortDate(date)}
                    </div>
                    <div className="space-y-2">
                      {(items || []).map((b) => (
                        <Link
                          key={b.id}
                          href={`/bookings/${b.id}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded border border-neutral-200 border-l-4 border-l-brand-yellow px-3 py-2 hover:bg-brand-yellow/10"
                        >
                          <div>
                            <div className="text-sm font-medium text-brand-black">
                              {b.equipment?.name} · {b.clients?.business_name}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {shortDate(b.pickup_date)} →{" "}
                              {shortDate(b.dropoff_date)}
                              {b.scheduled_at ? (
                                <span className="ml-2 font-semibold text-brand-green">
                                  · Scheduled
                                </span>
                              ) : b.status === "confirmed" ? (
                                <span className="ml-2 text-amber-700">
                                  · Not scheduled yet
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <BookingBadge status={b.status} />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Equipment board">
          <div className="space-y-2">
            {(equipment || []).map((eq) => (
              <Link
                key={eq.id}
                href={`/equipment/${eq.id}`}
                className="flex items-center justify-between gap-2 rounded border border-neutral-200 border-l-4 border-l-brand-green px-3 py-2 hover:bg-brand-yellow/10"
              >
                <div>
                  <div className="text-sm font-medium">{eq.name}</div>
                  <div className="text-xs text-neutral-500">
                    ${Number(eq.day_rate).toFixed(0)}/day · $
                    {Number(eq.week_rate).toFixed(0)}/wk
                  </div>
                </div>
                <EquipmentBadge status={eq.status} />
              </Link>
            ))}
            {!equipment?.length ? (
              <p className="text-sm text-neutral-500">No equipment yet.</p>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
