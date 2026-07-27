"use client";

import { ClientShare } from "@/components/ClientShare";
import { shortDate } from "@/lib/format";

export function ScheduleShare({
  scheduleUrl,
  clientName,
  clientPhone,
  equipmentName,
  pickupDate,
  dropoffDate,
  collectionTime,
  siteAddress,
}: {
  scheduleUrl: string;
  clientName?: string | null;
  clientPhone?: string | null;
  equipmentName?: string | null;
  pickupDate: string;
  dropoffDate: string;
  collectionTime?: string | null;
  siteAddress?: string | null;
}) {
  const firstName = clientName?.split(" ")[0];
  const shareText = [
    "Hi" + (firstName ? ` ${firstName}` : "") + ",",
    "",
    `Your Champion Equipment hire is scheduled${
      equipmentName ? ` for the ${equipmentName}` : ""
    }.`,
    "",
    `Pickup: ${shortDate(pickupDate)}${
      collectionTime ? ` (${collectionTime})` : ""
    }`,
    `Return: ${shortDate(dropoffDate)}`,
    siteAddress ? `Site: ${siteAddress}` : null,
    "",
    "Full details:",
    scheduleUrl,
    "",
    "Thanks,",
    "Champion Equipment",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return (
    <ClientShare
      title="Champion Equipment — Hire scheduled"
      helpText="Email sending is not set up yet. Send the schedule confirmation by text, WhatsApp, or your own email."
      shareText={shareText}
      link={scheduleUrl}
      linkLabel="schedule link"
      clientPhone={clientPhone}
    />
  );
}
