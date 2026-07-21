import Image from "next/image";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { money, shortDate } from "@/lib/format";
import { HireDateSearch } from "@/components/HireDateSearch";
import {
  BLOCKING_BOOKING_STATUSES,
  busyHireWindows,
  isValidHireRange,
} from "@/lib/availability";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicHomePage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  noStore();
  const from = searchParams.from || "";
  const to = searchParams.to || "";
  const hasRange = isValidHireRange(from, to);

  const admin = createAdminClient();
  const [{ data: equipment }, { data: settings }, { data: bookings }] =
    await Promise.all([
      admin
        .from("equipment")
        .select("id, name, make_model, day_rate, week_rate, status, notes")
        .neq("status", "service")
        .order("name"),
      admin
        .from("business_settings")
        .select("business_name, phone, email")
        .limit(1)
        .single(),
      hasRange
        ? admin
            .from("bookings")
            .select("equipment_id, pickup_date, dropoff_date, status")
            .in("status", BLOCKING_BOOKING_STATUSES)
        : Promise.resolve({
            data: [] as {
              equipment_id: string;
              pickup_date: string;
              dropoff_date: string;
              status: string;
            }[],
          }),
    ]);

  const busyWindows = hasRange
    ? busyHireWindows(bookings || [], from, to)
    : new Map<string, { pickup_date: string; dropoff_date: string }>();

  // Always show the fleet (except service). Without dates, mark non-available as unavailable.
  const listed = (equipment || []).map((eq) => {
    const clash = busyWindows.get(eq.id);
    const unavailable = hasRange
      ? Boolean(clash)
      : eq.status !== "available";
    return {
      ...eq,
      unavailable,
      bookedFrom: clash?.pickup_date || null,
      bookedTo: clash?.dropoff_date || null,
    };
  });

  const freeCount = listed.filter((eq) => !eq.unavailable).length;
  const phone = settings?.phone || "1800 673 922";
  const email = settings?.email || "admin@championequipment.com.au";
  const enquireDates = hasRange
    ? `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    : "";

  return (
    <div className="min-h-screen bg-[#f3f1eb]">
      <header className="border-b-4 border-brand-yellow bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Image
            src="/logo.png"
            alt="Champion Equipment"
            width={240}
            height={72}
            className="h-12 w-auto md:h-14"
            priority
          />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="font-medium text-brand-black hover:text-brand-green"
            >
              {phone}
            </a>
            <Link
              href={hasRange ? `/enquire?from=${from}&to=${to}` : "/enquire"}
              className="bg-brand-yellow px-4 py-2 font-semibold text-brand-black hover:brightness-95"
            >
              Send enquiry
            </Link>
            <Link
              href="/login"
              className="text-neutral-500 underline-offset-2 hover:text-brand-black hover:underline"
            >
              Operator login
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-brand-black px-4 py-12 text-white md:px-6 md:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-yellow">
            Champion Equipment
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
            Plant &amp; equipment ready to hire
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/75 md:text-lg">
            Pick your hire dates to see what&apos;s free. Machines already booked
            stay on the page with the hire period marked in red.
          </p>
          <ol className="mt-8 grid gap-3 text-sm text-white/70 sm:grid-cols-4">
            <li>
              <span className="font-semibold text-brand-yellow">1.</span> Choose
              dates
            </li>
            <li>
              <span className="font-semibold text-brand-yellow">2.</span> Pick
              equipment
            </li>
            <li>
              <span className="font-semibold text-brand-yellow">3.</span> Accept
              &amp; pay
            </li>
            <li>
              <span className="font-semibold text-brand-yellow">4.</span> We
              schedule it
            </li>
          </ol>
        </div>
      </section>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-12 md:px-6">
        <HireDateSearch initialFrom={from} initialTo={to} />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-brand-black">
              {hasRange ? "Fleet for your dates" : "Available now"}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {hasRange
                ? `${shortDate(from)} to ${shortDate(to)} · ${freeCount} free · booked machines shown with a red hire mark`
                : "Choose hire dates above to see booked periods on each machine."}
            </p>
          </div>
          <Link
            href={hasRange ? `/enquire?from=${from}&to=${to}` : "/enquire"}
            className="text-sm font-medium text-brand-green underline-offset-2 hover:underline"
          >
            Enquire without selecting →
          </Link>
        </div>

        {listed.length === 0 ? (
          <div className="border border-neutral-200 bg-white p-8 text-sm text-neutral-600">
            No equipment listed right now. Call {phone} or email {email} and
            we&apos;ll help.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listed.map((eq) => (
              <article
                key={eq.id}
                className={`relative flex flex-col overflow-hidden border bg-white p-5 shadow-sm ${
                  eq.unavailable
                    ? "border-rose-300 border-l-4 border-l-rose-600"
                    : "border-neutral-200 border-l-4 border-l-brand-green"
                }`}
              >
                {eq.unavailable ? (
                  <>
                    {/* Diagonal red strike */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 z-10"
                    >
                      <div className="absolute left-[-10%] top-1/2 h-1 w-[120%] -translate-y-1/2 -rotate-[18deg] bg-rose-600/90 shadow-sm" />
                    </div>
                    <div className="absolute right-3 top-3 z-20 max-w-[70%] rounded bg-rose-600 px-2 py-1 text-right text-[11px] font-bold leading-tight text-white shadow">
                      BOOKED
                      {eq.bookedFrom && eq.bookedTo ? (
                        <div className="mt-0.5 font-semibold normal-case tracking-normal">
                          {shortDate(eq.bookedFrom)} – {shortDate(eq.bookedTo)}
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : null}

                <div
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    eq.unavailable ? "text-rose-700" : "text-brand-green"
                  }`}
                >
                  {eq.unavailable
                    ? hasRange
                      ? "Unavailable for your dates"
                      : "Not available"
                    : hasRange
                      ? "Free for these dates"
                      : "Available"}
                </div>
                <h3
                  className={`mt-2 text-xl font-bold ${
                    eq.unavailable
                      ? "text-neutral-500 line-through decoration-rose-600 decoration-2"
                      : "text-brand-black"
                  }`}
                >
                  {eq.name}
                </h3>
                {eq.make_model ? (
                  <p className="mt-1 text-sm text-neutral-500">{eq.make_model}</p>
                ) : null}

                {eq.unavailable && eq.bookedFrom && eq.bookedTo ? (
                  <p className="relative z-20 mt-3 text-sm font-semibold text-rose-700">
                    Hire duration: {shortDate(eq.bookedFrom)} –{" "}
                    {shortDate(eq.bookedTo)}
                  </p>
                ) : null}

                <div
                  className={`mt-4 space-y-1 text-sm ${
                    eq.unavailable ? "opacity-50" : ""
                  }`}
                >
                  <div>
                    <span className="text-neutral-500">Day rate</span>
                    <div className="text-lg font-semibold text-brand-black">
                      {money(eq.day_rate)}
                      <span className="text-sm font-normal text-neutral-500">
                        {" "}
                        ex GST
                      </span>
                    </div>
                  </div>
                  <div className="text-neutral-600">
                    Week rate {money(eq.week_rate)}
                  </div>
                </div>
                {eq.notes ? (
                  <p className="mt-3 line-clamp-2 text-xs text-neutral-500">
                    {eq.notes}
                  </p>
                ) : null}

                {eq.unavailable ? (
                  <div className="relative z-20 mt-auto pt-5">
                    <span className="inline-flex w-full cursor-not-allowed items-center justify-center bg-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-500">
                      Not available for these dates
                    </span>
                  </div>
                ) : (
                  <Link
                    href={`/enquire?equipment=${eq.id}${enquireDates}`}
                    className="mt-auto pt-5"
                  >
                    <span className="inline-flex w-full items-center justify-center bg-brand-yellow px-3 py-2.5 text-sm font-semibold text-brand-black hover:brightness-95">
                      Enquire about this machine
                    </span>
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-neutral-200 bg-brand-black px-4 py-6 text-center text-xs text-white/50">
        Champion Equipment · {phone} · {email}
      </footer>
    </div>
  );
}
