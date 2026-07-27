"use client";

import { ClientShare } from "@/components/ClientShare";

export function AcceptLinkShare({
  acceptUrl,
  clientName,
  clientPhone,
  equipmentName,
}: {
  acceptUrl: string;
  clientName?: string | null;
  clientPhone?: string | null;
  equipmentName?: string | null;
}) {
  const firstName = clientName?.split(" ")[0];
  const shareText = [
    "Hi" + (firstName ? ` ${firstName}` : "") + ",",
    "",
    `Please review and accept the Champion Equipment hire agreement${
      equipmentName ? ` for the ${equipmentName}` : ""
    }:`,
    acceptUrl,
    "",
    "Thanks,",
    "Champion Equipment",
  ].join("\n");

  return (
    <ClientShare
      title="Champion Equipment — Hire Agreement"
      helpText="Email sending is not set up yet. Send the client this accept link by text, WhatsApp, or your own email — they open it, review terms, and accept in the browser."
      shareText={shareText}
      link={acceptUrl}
      linkLabel="accept link"
      clientPhone={clientPhone}
    />
  );
}
