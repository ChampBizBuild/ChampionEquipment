"use client";

import { FormEvent, Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, Field, inputClass } from "@/components/ui";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth"
      ? "Sign-in failed. Check your email and password."
      : null,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm rounded border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex justify-center border border-brand-black bg-white p-2">
        <Image
          src="/logo.png"
          alt="Champion Equipment"
          width={280}
          height={90}
          className="h-auto w-full max-w-[260px]"
          priority
        />
      </div>
      <h1 className="text-center text-lg font-semibold text-brand-black">
        Operator login
      </h1>
      <p className="mt-1 text-center text-sm text-neutral-500">
        Email and password — for Champion Equipment staff only
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Email">
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </Field>
        <button
          type="submit"
          disabled={loading}
          className={`${btnPrimary} w-full`}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
      <p className="mt-6 text-center text-xs text-neutral-500">
        Looking to hire?{" "}
        <a href="/" className="text-brand-green underline-offset-2 hover:underline">
          View available equipment
        </a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
