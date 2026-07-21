import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel } from "@/components/ui";
import { EquipmentBadge, BookingBadge } from "@/components/StatusBadge";
import { shortDate } from "@/lib/format";
import { EquipmentEditForm } from "./EquipmentEditForm";
import Link from "next/link";

export default async function EquipmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: equipment } = await supabase
    .from("equipment")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!equipment) notFound();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, clients(business_name)")
    .eq("equipment_id", params.id)
    .order("pickup_date", { ascending: false })
    .limit(20);

  return (
    <div>
      <PageHeader
        title={equipment.name}
        subtitle={
          [
            equipment.asset_id ? `Plant ID ${equipment.asset_id}` : null,
            equipment.make_model,
          ]
            .filter(Boolean)
            .join(" · ") || "Equipment detail"
        }
        actions={<EquipmentBadge status={equipment.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Rates & status">
          <EquipmentEditForm equipment={equipment} />
        </Panel>
        <Panel title="Recent bookings">
          <table>
            <thead>
              <tr>
                <th>Client</th>
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
                      {b.clients?.business_name}
                    </Link>
                  </td>
                  <td>
                    {shortDate(b.pickup_date)} → {shortDate(b.dropoff_date)}
                  </td>
                  <td>
                    <BookingBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!bookings?.length ? (
            <p className="text-sm text-neutral-500">No bookings yet.</p>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
