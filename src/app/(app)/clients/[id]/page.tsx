import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel } from "@/components/ui";
import { BookingBadge, InvoiceBadge } from "@/components/StatusBadge";
import { money, shortDate } from "@/lib/format";

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!client) notFound();

  const [{ data: bookings }, { data: invoices }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, equipment(name)")
      .eq("client_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("*, bookings!inner(client_id, equipment(name))")
      .eq("bookings.client_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <PageHeader
        title={client.business_name}
        subtitle={`${client.contact_name} · ${client.email}`}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Panel title="Details">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-neutral-500">Phone</dt>
              <dd>{client.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">ABN</dt>
              <dd>{client.abn || "—"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Billing address</dt>
              <dd className="whitespace-pre-wrap">
                {client.billing_address || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Notes</dt>
              <dd className="whitespace-pre-wrap">{client.notes || "—"}</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Booking history">
          <table>
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Dates</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(bookings || []).map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link
                      href={`/bookings/${b.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {b.equipment?.name}
                    </Link>
                  </td>
                  <td>
                    {shortDate(b.pickup_date)} → {shortDate(b.dropoff_date)}
                    {b.scheduled_at ? (
                      <div className="text-xs font-semibold text-brand-green">
                        Scheduled
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <BookingBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!bookings?.length ? (
            <p className="text-sm text-neutral-500">No bookings.</p>
          ) : null}
        </Panel>

        <Panel title="Invoices">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Number</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(invoices || []).map((inv) => (
                <tr key={inv.id}>
                  <td className="capitalize">
                    {inv.kind === "additional" ? "Additional" : "Hire"}
                  </td>
                  <td>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td>{money(inv.total)}</td>
                  <td>
                    <InvoiceBadge status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!invoices?.length ? (
            <p className="text-sm text-neutral-500">No invoices.</p>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
