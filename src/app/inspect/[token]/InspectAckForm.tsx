"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, inputClass } from "@/components/ui";

export function InspectAckForm({
  token,
  alreadyDone,
}: {
  token: string;
  alreadyDone: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (alreadyDone) {
    return (
      <p className="text-sm font-medium text-brand-green">
        You have already acknowledged this inspection. Thank you.
      </p>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/inspect/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: String(fd.get("name") || "") }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not save");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm text-neutral-600">
        Type your full name to confirm you have reviewed the condition photos,
        hours, and fuel level recorded for this hire.
      </p>
      <input
        name="name"
        required
        minLength={2}
        placeholder="Full legal name"
        className={inputClass}
      />
      <button type="submit" disabled={loading} className={btnPrimary}>
        {loading ? "Saving…" : "I confirm this condition record"}
      </button>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
