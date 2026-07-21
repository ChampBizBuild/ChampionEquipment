import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { EnquireForm } from "./EnquireForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EnquirePage() {
  noStore();
  const admin = createAdminClient();
  const [{ data: equipment }, { data: settings }] = await Promise.all([
    admin
      .from("equipment")
      .select("id, name, day_rate, week_rate, status")
      .neq("status", "service")
      .order("name"),
    admin
      .from("business_settings")
      .select("business_name, phone, email")
      .limit(1)
      .single(),
  ]);

  const phone = settings?.phone || "1800 673 922";
  const email = settings?.email || "admin@championequipment.com.au";

  return (
    <div className="min-h-screen bg-[#f3f1eb]">
      <header className="enquire-topbar">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Champion Equipment"
              width={260}
              height={78}
              className="h-14 w-auto md:h-16"
              priority
            />
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/"
              className="text-neutral-600 underline-offset-2 hover:text-brand-black hover:underline"
            >
              Available equipment
            </Link>
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="enquire-phone"
            >
              {phone}
            </a>
          </div>
        </div>
      </header>

      <section className="enquire-hero">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2"
          style={{
            background:
              "linear-gradient(110deg, transparent 20%, rgba(253,184,19,0.28) 50%, transparent 80%)",
            animation: "enquire-pulse-line 4s ease-in-out infinite",
          }}
        />

        <div className="relative mx-auto flex min-h-[42vh] max-w-5xl flex-col justify-center px-4 py-10 md:px-6 md:py-14">
          <div className="max-w-2xl">
            <p className="enquire-display enquire-rise enquire-rise-delay-1 enquire-accent text-base font-semibold md:text-lg">
              Champion Equipment
            </p>
            <div className="enquire-bar mt-3 h-1.5 w-28 bg-brand-yellow" />
            <h1 className="enquire-display enquire-rise enquire-rise-delay-2 mt-5 text-5xl font-extrabold leading-[0.95] md:text-6xl">
              Request a
              <br />
              <span className="enquire-accent">machine hire</span>
            </h1>
            <p
              className="enquire-rise enquire-rise-delay-3 mt-5 max-w-lg text-base leading-relaxed md:text-lg"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              Submit your details below. After you accept the agreement and
              payment is confirmed, we schedule the hire.
            </p>
            <p
              className="enquire-rise enquire-rise-delay-3 mt-4 text-sm"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Or email {email}
            </p>
          </div>
        </div>
      </section>

      <main
        id="enquire-form"
        className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16"
      >
        <div className="mb-8">
          <h2 className="enquire-display text-3xl font-bold text-brand-black md:text-4xl">
            Hire details
          </h2>
          <p className="mt-2 text-sm text-neutral-600 md:text-base">
            Takes a couple of minutes. ABN is required. Other required fields are marked.
          </p>
        </div>

        <Suspense
          fallback={<p className="text-sm text-neutral-500">Loading form…</p>}
        >
          <EnquireForm equipment={equipment || []} />
        </Suspense>
      </main>

      <footer className="border-t border-neutral-200 bg-brand-black px-4 py-6 text-center text-xs text-white/50">
        Champion Equipment · Craig R Champion · {phone}
      </footer>
    </div>
  );
}
