import { createAdminClient } from "@/lib/supabase/admin";
import { AcceptForm } from "./AcceptForm";
import { HireAgreementDocument } from "@/components/HireAgreementDocument";
import { normalizeHireDetails } from "@/lib/hireAgreement";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AcceptPage({
  params,
}: {
  params: { token: string };
}) {
  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("*, clients(*), equipment(*)")
    .eq("accept_token", params.token)
    .maybeSingle();

  if (!booking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-xl font-semibold">Link not found</h1>
        <p className="mt-2 text-sm text-neutral-600">
          This acceptance link is invalid or has expired. Contact Champion
          Equipment for a new link.
        </p>
      </div>
    );
  }

  const { data: templates } = await admin
    .from("document_templates")
    .select("*")
    .order("type");

  const { data: settings } = await admin
    .from("business_settings")
    .select("*")
    .limit(1)
    .single();

  const alreadyAccepted = [
    "confirmed",
    "out",
    "returned",
    "invoiced",
    "paid",
  ].includes(booking.status);

  const terms = (templates || []).find((t) => t.type === "terms_of_trade");

  const agreementValues = {
    businessName: settings?.business_name || "Champion Equipment",
    businessAbn: settings?.abn || "",
    businessPhone: settings?.phone || "1800 673 922",
    businessEmail: settings?.email || "admin@championequipment.com.au",
    businessAddress: settings?.address || "",
    clientBusiness: booking.clients?.business_name || "",
    clientContact: booking.clients?.contact_name || "",
    clientPhone: booking.clients?.phone || "",
    clientEmail: booking.clients?.email || "",
    equipmentName: booking.equipment?.name || "",
    dayRate: Number(booking.equipment?.day_rate || 0),
    pickupDate: booking.pickup_date,
    dropoffDate: booking.dropoff_date,
    details: normalizeHireDetails(booking.hire_details),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-4 inline-block border border-brand-black bg-white p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Champion Equipment"
          className="h-14 w-auto"
        />
      </div>
      <h1 className="text-xl font-semibold text-brand-black">
        Machine Hire Agreement
      </h1>
      <p className="mt-1 text-sm text-neutral-600">
        Review the filled agreement, complete any remaining fields, then accept.
        Hire period: {shortDate(booking.pickup_date)} →{" "}
        {shortDate(booking.dropoff_date)}
      </p>

      {alreadyAccepted ? (
        <div className="mt-6 space-y-4">
          <div className="rounded border border-brand-green/30 bg-brand-green/10 p-4 text-sm text-brand-green">
            These documents have already been accepted. Your hire is confirmed.
          </div>
          <HireAgreementDocument values={agreementValues} mode="readonly" />
        </div>
      ) : (
        <AcceptForm
          token={params.token}
          values={agreementValues}
          initialDetails={booking.hire_details}
          termsBody={
            terms?.body ||
            "Terms of Trade apply to all plant and equipment hire from Champion Equipment."
          }
        />
      )}
    </div>
  );
}
