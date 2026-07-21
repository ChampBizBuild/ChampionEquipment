import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendTermsEmail(params: {
  to: string;
  clientName: string;
  equipmentName: string;
  pickupDate: string;
  dropoffDate: string;
  acceptUrl: string;
  businessName: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const resend = getResend();
  const from =
    process.env.RESEND_FROM_EMAIL || "Champion Equipment <onboarding@resend.dev>";

  const subject = `${params.businessName}: Hire terms for ${params.equipmentName}`;
  const html = `
    <p>Hi ${params.clientName},</p>
    <p>Please review and accept the Terms of Trade and Hire Agreement for your booking:</p>
    <ul>
      <li><strong>Equipment:</strong> ${params.equipmentName}</li>
      <li><strong>Pickup:</strong> ${params.pickupDate}</li>
      <li><strong>Drop-off:</strong> ${params.dropoffDate}</li>
    </ul>
    <p><a href="${params.acceptUrl}">Review &amp; accept documents</a></p>
    <p>Or paste this link into your browser:<br/>${params.acceptUrl}</p>
    <p>Thanks,<br/>${params.businessName}</p>
  `;

  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing — accept link:", params.acceptUrl);
    return { ok: true, skipped: true };
  }

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject,
    html,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function sendConfirmationEmail(params: {
  to: string;
  clientName: string;
  equipmentName: string;
  pickupDate: string;
  dropoffDate: string;
  businessName: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const from =
    process.env.RESEND_FROM_EMAIL || "Champion Equipment <onboarding@resend.dev>";

  await resend.emails.send({
    from,
    to: params.to,
    subject: `${params.businessName}: Hire confirmed — ${params.equipmentName}`,
    html: `
      <p>Hi ${params.clientName},</p>
      <p>Your hire is confirmed. Pickup details:</p>
      <ul>
        <li><strong>Equipment:</strong> ${params.equipmentName}</li>
        <li><strong>Pickup:</strong> ${params.pickupDate}</li>
        <li><strong>Drop-off:</strong> ${params.dropoffDate}</li>
      </ul>
      <p>Thanks,<br/>${params.businessName}</p>
    `,
  });
}
