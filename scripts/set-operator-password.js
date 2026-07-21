/**
 * Set an operator password without sending email.
 *
 * Usage (PowerShell):
 *   $env:OPERATOR_EMAIL="you@example.com"
 *   $env:OPERATOR_PASSWORD="YourNewPassword123"
 *   node scripts/set-operator-password.js
 */
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = (process.env.OPERATOR_EMAIL || "").trim().toLowerCase();
  const password = process.env.OPERATOR_PASSWORD || "";

  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  if (!email || !password) {
    console.error(
      "Set OPERATOR_EMAIL and OPERATOR_PASSWORD first, e.g.\n" +
        '  $env:OPERATOR_EMAIL="you@example.com"\n' +
        '  $env:OPERATOR_PASSWORD="YourNewPassword123"\n' +
        "  node scripts/set-operator-password.js",
    );
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) {
    console.error("Could not list users:", error.message);
    process.exit(1);
  }

  const user = (data.users || []).find(
    (u) => (u.email || "").toLowerCase() === email,
  );
  if (!user) {
    console.error(`No user found with email: ${email}`);
    console.error(
      "Create one in Supabase → Authentication → Users → Add user first.",
    );
    process.exit(1);
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(
    user.id,
    { password, email_confirm: true },
  );
  if (updateError) {
    console.error("Failed to set password:", updateError.message);
    process.exit(1);
  }

  console.log(`Password updated for ${email}`);
  console.log("Now sign in at http://localhost:3002/login");
}

main();
