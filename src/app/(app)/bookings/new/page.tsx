import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel } from "@/components/ui";
import { NewBookingForm } from "./NewBookingForm";

export default async function NewBookingPage() {
  const supabase = createClient();
  const [{ data: clients }, { data: equipment }, { data: settings }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, business_name, contact_name, email, phone")
        .order("business_name"),
      supabase
        .from("equipment")
        .select("id, name, status, day_rate, week_rate")
        .order("name"),
      supabase.from("business_settings").select("*").limit(1).single(),
    ]);

  return (
    <div>
      <PageHeader
        title="New booking"
        subtitle="Client + machine auto-fill the Hire Agreement. Complete the rest, then send for acceptance."
      />
      <Panel>
        <NewBookingForm
          clients={clients || []}
          equipment={equipment || []}
          business={{
            business_name: settings?.business_name || "Champion Equipment",
            abn: settings?.abn || "",
            phone: settings?.phone || "",
            email: settings?.email || "",
            address: settings?.address || "",
          }}
        />
      </Panel>
    </div>
  );
}
