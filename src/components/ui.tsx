import { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b-2 border-brand-yellow pb-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-black">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  children,
  actions,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded border border-neutral-200 bg-white shadow-sm">
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-brand-black px-4 py-2.5">
          {title ? (
            <h2 className="text-sm font-semibold text-brand-yellow">{title}</h2>
          ) : (
            <span />
          )}
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-brand-black">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-brand-black outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow";

export const btnPrimary =
  "inline-flex items-center justify-center rounded bg-brand-yellow px-3 py-2 text-sm font-semibold text-brand-black hover:brightness-95 disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center rounded border border-brand-black bg-white px-3 py-2 text-sm font-medium text-brand-black hover:bg-brand-yellow/15 disabled:opacity-50";

export const btnDanger =
  "inline-flex items-center justify-center rounded border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50";
