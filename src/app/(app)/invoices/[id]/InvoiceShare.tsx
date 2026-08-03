"use client";

import { ClientShare } from "@/components/ClientShare";
import { money, shortDate } from "@/lib/format";

export function InvoiceShare({
  invoiceNumber,
  pdfUrl,
  total,
  dueDate,
  clientName,
  clientPhone,
  equipmentName,
  kind,
}: {
  invoiceNumber: string;
  pdfUrl: string;
  total: number;
  dueDate: string;
  clientName?: string | null;
  clientPhone?: string | null;
  equipmentName?: string | null;
  kind: "hire" | "additional" | "extension";
}) {
  const firstName = clientName?.split(" ")[0];
  const kindLabel =
    kind === "additional"
      ? "additional charges invoice"
      : kind === "extension"
        ? "mid-term extra hire invoice"
        : "hire invoice";

  const shareText = [
    "Hi" + (firstName ? ` ${firstName}` : "") + ",",
    "",
    `Please find your Champion Equipment ${kindLabel} ${invoiceNumber}${
      equipmentName ? ` for the ${equipmentName}` : ""
    }.`,
    "",
    `Total: ${money(total)}`,
    `Due: ${shortDate(dueDate)}`,
    "",
    "View / download PDF:",
    pdfUrl,
    "",
    "Thanks,",
    "Champion Equipment",
  ].join("\n");

  return (
    <ClientShare
      title={`Invoice ${invoiceNumber}`}
      helpText="Email sending is not set up yet. Send the invoice PDF link by text, WhatsApp, or your own email."
      shareText={shareText}
      link={pdfUrl}
      linkLabel="PDF link"
      clientPhone={clientPhone}
    />
  );
}
