import { Resend } from "resend";

import type { CertificateAlertType } from "@/lib/properties/types";

function getResend(): { resend: Resend; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error(
      "property emails: RESEND_API_KEY or RESEND_FROM_EMAIL is not set"
    );
    return null;
  }
  return { resend: new Resend(apiKey), from };
}

function formatExpiryDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildCertificateAlertHtml({
  displayName,
  propertyName,
  certificateType,
  expiryDate,
  daysUntilExpiry,
  alertType,
  propertyId,
}: {
  displayName: string;
  propertyName: string;
  certificateType: string;
  expiryDate: string;
  daysUntilExpiry: number;
  alertType: CertificateAlertType;
  propertyId: string;
}): { subject: string; html: string } {
  const greeting = displayName.trim() || "there";
  const formattedExpiry = formatExpiryDate(expiryDate);
  const isExpired = alertType === "expired" || daysUntilExpiry < 0;
  const accentColor = isExpired ? "#ef4444" : "#f59e0b";
  const accentBg = isExpired ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)";
  const accentBorder = isExpired
    ? "rgba(239,68,68,0.25)"
    : "rgba(245,158,11,0.25)";

  const subject = isExpired
    ? `ACTION REQUIRED: ${certificateType} certificate has expired — ${propertyName}`
    : `[${Math.max(daysUntilExpiry, 0)} days] ${certificateType} certificate expiring — ${propertyName}`;

  const headline = isExpired
    ? `${certificateType} certificate has expired`
    : `${certificateType} certificate expiring soon`;

  const bodyText = isExpired
    ? `The ${certificateType} certificate for <strong style="color:#f4f4f5;">${propertyName}</strong> expired on ${formattedExpiry}. Please arrange renewal to stay compliant.`
    : `The ${certificateType} certificate for <strong style="color:#f4f4f5;">${propertyName}</strong> expires on ${formattedExpiry} — that's ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"} away. A timely renewal will keep everything on track.`;

  const ctaUrl = `https://app.wiskapp.com/properties/${propertyId}?tab=certificates`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:48px 24px;">
    <div style="font-size:20px;font-weight:700;color:#f59e0b;letter-spacing:-0.5px;margin-bottom:40px;">WISK Properties</div>
    <div style="background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:36px 32px;">
      <h1 style="color:#f4f4f5;font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-0.3px;">${headline}</h1>
      <p style="color:#71717a;font-size:14px;margin:0 0 24px;">Hi ${greeting} — a quick reminder about one of your certificates.</p>
      <div style="background:${accentBg};border:1px solid ${accentBorder};border-left:4px solid ${accentColor};border-radius:8px;padding:16px 20px;margin:20px 0;">
        <p style="color:${accentColor};font-size:12px;font-weight:600;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.08em;">${isExpired ? "Expired" : "Expiry date"}</p>
        <p style="color:#f4f4f5;font-size:18px;font-weight:700;margin:0;">${formattedExpiry}</p>
      </div>
      <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 20px;">${bodyText}</p>
      <a href="${ctaUrl}" style="display:inline-block;background:#f59e0b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;margin:24px 0;">View certificates</a>
      <p style="color:#71717a;font-size:13px;line-height:1.5;border-top:1px solid rgba(255,255,255,0.07);padding-top:20px;margin:8px 0 0;">You can turn off certificate alerts for individual properties in your property settings.</p>
    </div>
    <div style="margin-top:32px;color:#52525b;font-size:12px;text-align:center;">WISK &middot; Built by Isaiah George Creative</div>
  </div>
</body>
</html>`;

  return { subject, html };
}

export async function sendCertificateAlertEmail({
  to,
  displayName,
  propertyName,
  certificateType,
  expiryDate,
  daysUntilExpiry,
  alertType,
  propertyId,
}: {
  to: string;
  displayName: string;
  propertyName: string;
  certificateType: string;
  expiryDate: string;
  daysUntilExpiry: number;
  alertType: CertificateAlertType;
  propertyId: string;
}): Promise<boolean> {
  const client = getResend();
  if (!client) return false;

  const { subject, html } = buildCertificateAlertHtml({
    displayName,
    propertyName,
    certificateType,
    expiryDate,
    daysUntilExpiry,
    alertType,
    propertyId,
  });

  const { error } = await client.resend.emails.send({
    from: client.from,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("sendCertificateAlertEmail:", error);
    return false;
  }

  return true;
}
