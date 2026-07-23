import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel } from "@/components/ui";
import { InvoiceBadge } from "@/components/StatusBadge";
import { money, shortDate } from "@/lib/format";
import type { InvoiceLineItem } from "@/lib/types";
import { InvoiceActions } from "./InvoiceActions";

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, bookings(*, clients(*), equipment(*))")
    .eq("id", params.id)
    .single();

  if (!invoice) notFound();

  const booking = invoice.bookings;
  const lineItems = (invoice.line_items || []) as InvoiceLineItem[];
  const kindLabel =
    invoice.kind === "additional" ? "Additional charges" : "Hire";

  return (
    <div>
      <PageHeader
        title={`Invoice ${invoice.invoice_number}`}
        subtitle={`${kindLabel} · ${booking?.clients?.business_name} · ${booking?.equipment?.name}`}
        actions={<InvoiceBadge status={invoice.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Line items">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li, i) => (
                  <tr key={i}>
                    <td>{li.description}</td>
                    <td>{li.quantity}</td>
                    <td>{money(li.unit_amount)}</td>
                    <td>{money(li.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!lineItems.length ? (
              <p className="mt-2 text-sm text-neutral-500">
                No line items yet — edit on the right.
              </p>
            ) : null}
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{money(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST</span>
                <span>
                  {Number(invoice.gst) > 0
                    ? money(invoice.gst)
                    : "Not applicable"}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{money(invoice.total)}</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Due</span>
                <span>{shortDate(invoice.due_date)}</span>
              </div>
            </div>
          </Panel>

          <Panel title="Hire reference">
            <p className="text-sm">
              Booking:{" "}
              <Link
                href={`/bookings/${invoice.booking_id}`}
                className="underline-offset-2 hover:underline"
              >
                {shortDate(booking?.pickup_date)} →{" "}
                {shortDate(booking?.dropoff_date)}
              </Link>
            </p>
          </Panel>
        </div>

        <Panel title="Actions">
          <InvoiceActions
            invoiceId={invoice.id}
            status={invoice.status}
            kind={invoice.kind === "additional" ? "additional" : "hire"}
            pdfUrl={invoice.pdf_url}
            initialItems={lineItems}
          />
        </Panel>
      </div>
    </div>
  );
}
