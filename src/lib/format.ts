export function money(n: number | string | null | undefined): string {
  const value = Number(n || 0);
  return value.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso.includes("T") ? iso : `${iso}T00:00:00`).toLocaleDateString(
    "en-AU",
    { day: "numeric", month: "short", year: "numeric" },
  );
}
