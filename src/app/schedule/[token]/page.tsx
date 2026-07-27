import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeHireDetails } from "@/lib/hireAgreement";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ScheduleConfirmPage({
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

  if (!booking) notFound();

  const { data: settings } = await admin
    .from("business_settings")
    .select("business_name, phone, email")
    .limit(1)
    .single();

  const details = normalizeHireDetails(booking.hire_details);
  const businessName = settings?.business_name || "Champion Equipment";
  const scheduled = Boolean(booking.scheduled_at);

  return (
    <div className="min-h-screen bg-[#f3f1eb] px-4 py-10">
      <div className="mx-auto max-w-lg border-2 border-brand-black bg-white p-6 shadow-[8px_8px_0_#FDB813] md:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">
          {businessName}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-wide text-brand-black">
          {scheduled ? "Hire scheduled" : "Hire details"}
        </h1>
        <p className="mt-3 text-sm text-neutral-600">
          {scheduled
            ? "Your machine is locked into the schedule. See pickup details below."
            : "Booking details for your hire."}
        </p>

        <dl className="mt-6 space-y-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Equipment
            </dt>
            <dd className="font-medium">{booking.equipment?.name}</dd>
            {booking.equipment?.asset_id ? (
              <dd className="text-neutral-500">
                Plant ID {booking.equipment.asset_id}
              </dd>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Pickup
              </dt>
              <dd className="font-medium">{shortDate(booking.pickup_date)}</dd>
              {details.preferred_collection_time ? (
                <dd className="text-neutral-500">
                  {details.preferred_collection_time}
                </dd>
              ) : null}
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Return
              </dt>
              <dd className="font-medium">{shortDate(booking.dropoff_date)}</dd>
              {details.preferred_return_time ? (
                <dd className="text-neutral-500">
                  {details.preferred_return_time}
                </dd>
              ) : null}
            </div>
          </div>
          {details.site_address ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Site
              </dt>
              <dd className="font-medium">{details.site_address}</dd>
              {details.site_contact || details.site_phone ? (
                <dd className="text-neutral-500">
                  {[details.site_contact, details.site_phone]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
              ) : null}
            </div>
          ) : null}
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Client
            </dt>
            <dd className="font-medium">{booking.clients?.business_name}</dd>
            <dd className="text-neutral-500">
              {booking.clients?.contact_name}
            </dd>
          </div>
        </dl>

        <div className="mt-8 border-t border-neutral-200 pt-4 text-sm text-neutral-600">
          Questions? Call{" "}
          <a
            href={`tel:${(settings?.phone || "").replace(/\s/g, "")}`}
            className="font-medium text-brand-black underline-offset-2 hover:underline"
          >
            {settings?.phone || "Champion Equipment"}
          </a>
          {settings?.email ? (
            <>
              {" "}
              or email{" "}
              <a
                href={`mailto:${settings.email}`}
                className="font-medium text-brand-black underline-offset-2 hover:underline"
              >
                {settings.email}
              </a>
            </>
          ) : null}
          .
        </div>
      </div>
    </div>
  );
}
