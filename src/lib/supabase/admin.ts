import { createClient } from "@supabase/supabase-js";

/** Service-role client for public accept flow and privileged writes. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Next.js App Router caches fetch by default — without this, public
    // pages keep stale equipment lists/rates after operator edits.
    global: {
      fetch: (input, init = {}) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
