import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel } from "@/components/ui";
import { shortDate } from "@/lib/format";
import { NewClientForm } from "./NewClientForm";

export default async function ClientsPage() {
  const supabase = createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("business_name");

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Client records persist across bookings"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="All clients">
            <table>
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {(clients || []).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/clients/${c.id}`}
                        className="font-medium text-brand-black underline-offset-2 hover:underline"
                      >
                        {c.business_name}
                      </Link>
                    </td>
                    <td>{c.contact_name}</td>
                    <td>{c.email}</td>
                    <td>{shortDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!clients?.length ? (
              <p className="mt-3 text-sm text-neutral-500">No clients yet.</p>
            ) : null}
          </Panel>
        </div>
        <Panel title="Add client">
          <NewClientForm />
        </Panel>
      </div>
    </div>
  );
}
