"use client";

import { useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/ui";

function digitsOnlyPhone(phone: string | null | undefined) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  // AU local 04… → 614…
  if (digits.length === 10 && digits.startsWith("0")) {
    return `61${digits.slice(1)}`;
  }
  return digits;
}

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
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const shareText = [
    "Hi" + (clientName ? ` ${clientName.split(" ")[0]}` : "") + ",",
    "",
    `Please review and accept the Champion Equipment hire agreement${
      equipmentName ? ` for the ${equipmentName}` : ""
    }:`,
    acceptUrl,
    "",
    "Thanks,",
    "Champion Equipment",
  ].join("\n");

  const phoneIntl = digitsOnlyPhone(clientPhone);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(acceptUrl);
      setCopied(true);
      setMessage("Link copied — paste into SMS, WhatsApp, or email.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage("Could not copy — select the link and copy manually.");
    }
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(shareText);
      setMessage("Full message copied — paste into SMS or WhatsApp.");
    } catch {
      setMessage("Could not copy message.");
    }
  }

  async function nativeShare() {
    if (!navigator.share) {
      setMessage("Share not available on this device — use Copy instead.");
      return;
    }
    try {
      await navigator.share({
        title: "Champion Equipment — Hire Agreement",
        text: shareText,
        url: acceptUrl,
      });
      setMessage("Shared.");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessage("Share cancelled or failed.");
    }
  }

  function openSms() {
    const body = encodeURIComponent(shareText);
    const to = phoneIntl ? `+${phoneIntl}` : "";
    // iOS uses &body=, Android often ;body= or ?body=
    const href = to
      ? `sms:${to}?&body=${body}`
      : `sms:?&body=${body}`;
    window.location.href = href;
  }

  function openWhatsApp() {
    const text = encodeURIComponent(shareText);
    const href = phoneIntl
      ? `https://wa.me/${phoneIntl}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-600">
        Email sending is not set up yet. Send the client this accept link by
        text, WhatsApp, or your own email — they open it, review terms, and
        accept in the browser.
      </p>

      <div className="break-all rounded border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-700">
        {acceptUrl}
      </div>

      <div className="flex flex-col gap-2">
        <button type="button" className={btnPrimary} onClick={() => void copyLink()}>
          {copied ? "Copied!" : "Copy accept link"}
        </button>
        <button
          type="button"
          className={btnSecondary}
          onClick={() => void copyMessage()}
        >
          Copy message + link
        </button>
        <button
          type="button"
          className={btnSecondary}
          onClick={() => void nativeShare()}
        >
          Share from phone…
        </button>
        <button type="button" className={btnSecondary} onClick={openSms}>
          Open SMS
          {clientPhone ? ` (${clientPhone})` : ""}
        </button>
        <button type="button" className={btnSecondary} onClick={openWhatsApp}>
          Open WhatsApp
        </button>
      </div>

      {message ? <p className="text-sm text-brand-green">{message}</p> : null}
    </div>
  );
}
