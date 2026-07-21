import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel } from "@/components/ui";
import { BusinessSettingsForm } from "./BusinessSettingsForm";
import { TemplatesForm } from "./TemplatesForm";

export default async function SettingsPage() {
  const supabase = createClient();
  const [{ data: settings }, { data: templates }] = await Promise.all([
    supabase.from("business_settings").select("*").limit(1).single(),
    supabase.from("document_templates").select("*").order("type"),
  ]);

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002"
  ).replace(/\/$/, "");
  const enquireUrl = `${appUrl}/enquire`;

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Business details for invoices and editable legal templates"
      />
      <div className="mb-4">
        <Panel title="Public enquire link">
          <p className="text-sm text-neutral-600">
            Share this link instead of the Microsoft Form. Submissions create a
            client + enquiry booking for you to review, then send terms.
          </p>
          <a
            href={enquireUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block break-all text-sm font-medium text-brand-green underline-offset-2 hover:underline"
          >
            {enquireUrl}
          </a>
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Business / remittance">
          {settings ? (
            <BusinessSettingsForm settings={settings} />
          ) : (
            <p className="text-sm text-neutral-500">
              Run the Supabase migration to seed business settings.
            </p>
          )}
        </Panel>
        <Panel title="Document templates">
          <TemplatesForm templates={templates || []} />
        </Panel>
      </div>
    </div>
  );
}
