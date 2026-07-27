"use client";

import { useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/ui";

function digitsOnlyPhone(phone: string | null | undefined) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return `61${digits.slice(1)}`;
  }
  return digits;
}

export function ClientShare({
  title,
  helpText,
  shareText,
  link,
  linkLabel = "link",
  clientPhone,
}: {
  title?: string;
  helpText: string;
  shareText: string;
  link: string;
  linkLabel?: string;
  clientPhone?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const phoneIntl = digitsOnlyPhone(clientPhone);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setMessage(`${linkLabel} copied — paste into SMS, WhatsApp, or email.`);
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
        title: title || "Champion Equipment",
        text: shareText,
        url: link,
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
    window.location.href = to ? `sms:${to}?&body=${body}` : `sms:?&body=${body}`;
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
      <p className="text-sm text-neutral-600">{helpText}</p>

      <div className="break-all rounded border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-700">
        {link}
      </div>

      <div className="flex flex-col gap-2">
        <button type="button" className={btnPrimary} onClick={() => void copyLink()}>
          {copied ? "Copied!" : `Copy ${linkLabel}`}
        </button>
        <button
          type="button"
          className={btnSecondary}
          onClick={() => void copyMessage()}
        >
          Copy message + {linkLabel}
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
