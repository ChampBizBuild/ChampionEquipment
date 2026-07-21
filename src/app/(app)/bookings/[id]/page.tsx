import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel } from "@/components/ui";
import { BookingBadge, InvoiceBadge } from "@/components/StatusBadge";
import { shortDate } from "@/lib/format";
import type { ConditionInspection } from "@/lib/types";
import { BookingActions } from "./BookingActions";
import { HireAgreementEditor } from "./HireAgreementEditor";
import { OperatorReadyChecklist } from "./OperatorReadyChecklist";
import { ConditionInspectionForm } from "./ConditionInspectionForm";

export default async function BookingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, clients(*), equipment(*)")
    .eq("id", params.id)
    .single();

  if (!booking) notFound();

  const [
    { data: documents },
    { data: invoices },
    { data: settings },
    { data: inspections },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("booking_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("*")
      .eq("booking_id", params.id)
      .order("created_at", { ascending: false }),
    supabase.from("business_settings").select("*").limit(1).single(),
    supabase
      .from("condition_inspections")
      .select("*")
      .eq("booking_id", params.id),
  ]);

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002"
  ).replace(/\/$/, "");
  const acceptUrl = `${appUrl}/accept/${booking.accept_token}`;
  const hireInvoiceRow = (invoices || []).find(
    (i) => i.kind === "hire" || !i.kind,
  );
  const hireInvoice = hireInvoiceRow
    ? {
        id: hireInvoiceRow.id,
        invoice_number: hireInvoiceRow.invoice_number,
        status: hireInvoiceRow.status,
        total: Number(hireInvoiceRow.total),
      }
    : null;

  const outbound = ((inspections || []) as ConditionInspection[]).find(
    (i) => i.phase === "outbound",
  );
  const returnInsp = ((inspections || []) as ConditionInspection[]).find(
    (i) => i.phase === "return",
  );
  const showOutbound =
    Boolean(booking.scheduled_at) ||
    ["confirmed", "out", "returned", "invoiced", "paid"].includes(
      booking.status,
    );
  const showReturn = ["out", "returned", "invoiced", "paid"].includes(
    booking.status,
  );

  return (
    <div>
      <PageHeader
        title={`Booking · ${booking.equipment?.name}`}
        subtitle={`${booking.clients?.business_name} · ${shortDate(booking.pickup_date)} → ${shortDate(booking.dropoff_date)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {booking.scheduled_at ? (
              <span className="bg-brand-green px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                Scheduled
              </span>
            ) : null}
            <BookingBadge status={booking.status} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Details">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-neutral-500">Client</dt>
                <dd>
                  <Link
                    href={`/clients/${booking.client_id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {booking.clients?.business_name}
                  </Link>
                  <div className="text-neutral-500">
                    {booking.clients?.contact_name} · {booking.clients?.email}
                  </div>
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Equipment</dt>
                <dd>
                  <Link
                    href={`/equipment/${booking.equipment_id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {booking.equipment?.name}
                  </Link>
                  {booking.equipment?.asset_id ? (
                    <div className="text-neutral-500">
                      Plant ID {booking.equipment.asset_id}
                    </div>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Pickup</dt>
                <dd>{shortDate(booking.pickup_date)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Drop-off</dt>
                <dd>{shortDate(booking.dropoff_date)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Scheduled</dt>
                <dd>
                  {booking.scheduled_at ? (
                    <span className="font-medium text-brand-green">
                      Yes · {shortDate(booking.scheduled_at)}
                    </span>
                  ) : (
                    <span className="text-neutral-500">Not yet</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Hire payment</dt>
                <dd>
                  {booking.payment_received_at ? (
                    <span className="font-medium text-brand-green">
                      Received · {shortDate(booking.payment_received_at)}
                    </span>
                  ) : (
                    <span className="text-neutral-500">Awaiting hire invoice payment</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-neutral-500">Notes</dt>
                <dd className="whitespace-pre-wrap">{booking.notes || "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-neutral-500">Accept link</dt>
                <dd className="break-all text-xs text-neutral-600">{acceptUrl}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Machine Hire Agreement">
            <HireAgreementEditor
              bookingId={booking.id}
              initialDetails={booking.hire_details}
              values={{
                businessName: settings?.business_name || "Champion Equipment",
                businessAbn: settings?.abn || "",
                businessPhone: settings?.phone || "",
                businessEmail: settings?.email || "",
                businessAddress: settings?.address || "",
                clientBusiness: booking.clients?.business_name || "",
                clientContact: booking.clients?.contact_name || "",
                clientPhone: booking.clients?.phone || "",
                clientEmail: booking.clients?.email || "",
                equipmentName: booking.equipment?.name || "",
                dayRate: Number(booking.equipment?.day_rate || 0),
                pickupDate: booking.pickup_date,
                dropoffDate: booking.dropoff_date,
              }}
            />
          </Panel>

          <Panel title="Documents">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Sent</th>
                  <th>Accepted</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {(documents || []).map((d) => (
                  <tr key={d.id}>
                    <td className="capitalize">{d.type.replace(/_/g, " ")}</td>
                    <td>{d.sent_at ? shortDate(d.sent_at) : "—"}</td>
                    <td>
                      {d.accepted_at ? (
                        <div>
                          <div>{shortDate(d.accepted_at)}</div>
                          <div className="text-xs text-neutral-500">
                            {d.accepted_name} · {d.accepted_ip}
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {d.pdf_url ? (
                        <a
                          href={d.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline-offset-2 hover:underline"
                        >
                          Open
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!documents?.length ? (
              <p className="text-sm text-neutral-500">No documents yet.</p>
            ) : null}
          </Panel>

          <Panel title="Invoices">
            {(invoices || []).length ? (
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
                  {invoices!.map((inv) => (
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
                      <td>${Number(inv.total).toFixed(2)}</td>
                      <td>
                        <InvoiceBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-neutral-500">
                Hire invoice is created after acceptance. Additional charges
                invoice is created when marked returned.
              </p>
            )}
          </Panel>
        </div>

        <Panel title="Status actions">
          <BookingActions
            bookingId={booking.id}
            status={booking.status}
            needsService={booking.needs_service}
            hasOutboundInspection={Boolean(outbound)}
            hasReturnInspection={Boolean(returnInsp)}
          />
        </Panel>

        <Panel title="Ready to schedule">
          <OperatorReadyChecklist
            bookingId={booking.id}
            status={booking.status}
            paymentReceivedAt={booking.payment_received_at}
            scheduledAt={booking.scheduled_at}
            hireInvoice={hireInvoice}
          />
        </Panel>

        {showOutbound ? (
          <Panel title="Condition register · outbound">
            <ConditionInspectionForm
              bookingId={booking.id}
              phase="outbound"
              assetId={booking.equipment?.asset_id}
              equipmentName={booking.equipment?.name || "Equipment"}
              initial={outbound || null}
              canEdit={["confirmed", "out"].includes(booking.status)}
            />
          </Panel>
        ) : null}

        {showReturn ? (
          <Panel title="Condition register · return">
            <ConditionInspectionForm
              bookingId={booking.id}
              phase="return"
              assetId={booking.equipment?.asset_id}
              equipmentName={booking.equipment?.name || "Equipment"}
              initial={returnInsp || null}
              canEdit={["out", "returned"].includes(booking.status)}
            />
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
