"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, Field, inputClass } from "@/components/ui";
import type { DocumentTemplate } from "@/lib/types";

export function TemplatesForm({
  templates,
}: {
  templates: DocumentTemplate[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveOne(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setLoading(id);
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("document_templates")
      .update({
        title: String(fd.get("title") || ""),
        body: String(fd.get("body") || ""),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setLoading(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage("Template saved.");
    router.refresh();
  }

  if (!templates.length) {
    return (
      <p className="text-sm text-neutral-500">
        No templates found. Run the Supabase migration.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {templates.map((t) => (
        <form
          key={t.id}
          onSubmit={(e) => saveOne(e, t.id)}
          className="space-y-3 border-b border-neutral-100 pb-6 last:border-0"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {t.type.replace(/_/g, " ")}
          </div>
          <Field label="Title">
            <input
              name="title"
              defaultValue={t.title}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Body">
            <textarea
              name="body"
              rows={10}
              defaultValue={t.body}
              required
              className={inputClass}
            />
          </Field>
          <button
            type="submit"
            disabled={loading === t.id}
            className={btnPrimary}
          >
            {loading === t.id ? "Saving…" : "Save template"}
          </button>
        </form>
      ))}
      {message ? <p className="text-sm text-brand-green">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
