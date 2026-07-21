import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { shortDate } from "@/lib/format";
import { InspectAckForm } from "./InspectAckForm";

export const dynamic = "force-dynamic";

export default async function InspectPage({
  params,
}: {
  params: { token: string };
}) {
  const admin = createAdminClient();
  const { data: inspection } = await admin
    .from("condition_inspections")
    .select("*, bookings(*, clients(*)), equipment:equipment_id(*)")
    .eq("client_ack_token", params.token)
    .maybeSingle();

  if (!inspection) notFound();

  const booking = inspection.bookings;
  const equipment = inspection.equipment;
  const phaseLabel =
    inspection.phase === "outbound" ? "Pickup (outbound)" : "Return";

  const photos = [
    { label: "Front", url: inspection.photo_front_url },
    { label: "Rear", url: inspection.photo_rear_url },
    { label: "Left", url: inspection.photo_left_url },
    { label: "Right", url: inspection.photo_right_url },
  ].filter((p) => p.url);

  return (
    <div className="min-h-screen bg-[#f3f1eb]">
      <header className="border-b-4 border-brand-yellow bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Champion Equipment"
              width={200}
              height={60}
              className="h-12 w-auto"
            />
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Condition acknowledgment
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        <div className="border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-green">
            {phaseLabel} inspection
          </p>
          <h1 className="mt-2 text-2xl font-bold text-brand-black">
            {equipment?.name || "Equipment"}
            {equipment?.asset_id ? (
              <span className="text-lg font-semibold text-neutral-500">
                {" "}
                · {equipment.asset_id}
              </span>
            ) : null}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {booking?.clients?.business_name} · Hire{" "}
            {shortDate(booking?.pickup_date)} to{" "}
            {shortDate(booking?.dropoff_date)}
          </p>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-neutral-500">Hours</dt>
              <dd className="font-medium">
                {inspection.hours_reading ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Fuel</dt>
              <dd className="font-medium">{inspection.fuel_level}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Recorded</dt>
              <dd className="font-medium">
                {shortDate(inspection.inspected_at)}
              </dd>
            </div>
          </dl>
          {inspection.notes ? (
            <p className="mt-3 text-sm text-neutral-600">
              Notes: {inspection.notes}
            </p>
          ) : null}
          {inspection.needs_service ? (
            <p className="mt-2 text-sm font-medium text-amber-800">
              Flagged: may need service after return
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {photos.map((p) => (
            <a
              key={p.label}
              href={p.url!}
              target="_blank"
              rel="noreferrer"
              className="overflow-hidden border border-neutral-200 bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url!}
                alt={`${p.label} side`}
                className="h-48 w-full object-cover"
              />
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {p.label}
              </div>
            </a>
          ))}
        </div>

        <div className="border border-neutral-200 bg-white p-5 shadow-sm">
          <InspectAckForm
            token={params.token}
            alreadyDone={Boolean(inspection.client_ack_at)}
          />
          {inspection.client_ack_at ? (
            <p className="mt-3 text-xs text-neutral-500">
              Acknowledged by {inspection.client_ack_name} on{" "}
              {shortDate(inspection.client_ack_at)}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
