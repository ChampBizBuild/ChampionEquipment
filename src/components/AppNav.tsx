"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/equipment", label: "Equipment" },
  { href: "/bookings/new", label: "New booking" },
  { href: "/settings", label: "Settings" },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-brand-black bg-brand-black">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Champion Equipment"
              width={160}
              height={48}
              className="h-10 w-auto bg-white px-1.5 py-0.5"
              priority
            />
            <span className="hidden text-xs font-medium uppercase tracking-wide text-brand-yellow sm:inline">
              Operator
            </span>
          </Link>
          <nav className="flex flex-wrap gap-1">
            {LINKS.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded px-2.5 py-1.5 text-sm font-medium ${
                    active
                      ? "bg-brand-yellow text-brand-black"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="text-sm text-white/70 hover:text-brand-yellow"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
