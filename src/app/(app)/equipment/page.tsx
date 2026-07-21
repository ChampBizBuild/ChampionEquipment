import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel } from "@/components/ui";
import { EquipmentBadge } from "@/components/StatusBadge";
import { money } from "@/lib/format";
import { NewEquipmentForm } from "./NewEquipmentForm";

export default async function EquipmentPage() {
  const supabase = createClient();
  const { data: equipment } = await supabase
    .from("equipment")
    .select("*")
    .order("name");

  return (
    <div>
      <PageHeader
        title="Equipment"
        subtitle="Machines, rates, and current status"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Fleet">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Plant ID</th>
                  <th>Day</th>
                  <th>Week</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(equipment || []).map((eq) => (
                  <tr key={eq.id}>
                    <td>
                      <Link
                        href={`/equipment/${eq.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {eq.name}
                      </Link>
                      {eq.make_model ? (
                        <div className="text-xs text-neutral-500">
                          {eq.make_model}
                        </div>
                      ) : null}
                    </td>
                    <td className="font-mono text-sm">
                      {eq.asset_id || "—"}
                    </td>
                    <td>{money(eq.day_rate)}</td>
                    <td>{money(eq.week_rate)}</td>
                    <td>
                      <EquipmentBadge status={eq.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
        <Panel title="Add equipment">
          <NewEquipmentForm />
        </Panel>
      </div>
    </div>
  );
}
