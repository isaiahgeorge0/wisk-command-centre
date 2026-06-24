import { Resend } from "resend";

import type {
  CertificateAlertType,
  InsuranceAlertType,
  MortgageAlertType,
} from "@/lib/properties/types";

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
  const isOverdueAlert =
    alertType === "7_days_overdue" || alertType === "30_days_overdue";
  const isExpired =
    alertType === "expired" || daysUntilExpiry < 0 || isOverdueAlert;
  const daysOverdue = isOverdueAlert
    ? alertType === "7_days_overdue"
      ? 7
      : 30
    : daysUntilExpiry < 0
      ? Math.abs(daysUntilExpiry)
      : 0;
  const accentColor = isExpired ? "#ef4444" : "#f59e0b";
  const accentBg = isExpired ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)";
  const accentBorder = isExpired
    ? "rgba(239,68,68,0.25)"
    : "rgba(245,158,11,0.25)";

  const subject = isOverdueAlert
    ? `OVERDUE: ${certificateType} certificate expired ${daysOverdue} days ago — ${propertyName}`
    : isExpired
      ? `ACTION REQUIRED: ${certificateType} certificate has expired — ${propertyName}`
      : `[${Math.max(daysUntilExpiry, 0)} days] ${certificateType} certificate expiring — ${propertyName}`;

  const headline = isOverdueAlert
    ? `${certificateType} certificate is overdue`
    : isExpired
      ? `${certificateType} certificate has expired`
      : `${certificateType} certificate expiring soon`;

  const bodyText = isOverdueAlert
    ? `The ${certificateType} certificate for <strong style="color:#f4f4f5;">${propertyName}</strong> expired on ${formattedExpiry} — that's ${daysOverdue} days ago. Action is required to renew and stay compliant.`
    : isExpired
      ? `The ${certificateType} certificate for <strong style="color:#f4f4f5;">${propertyName}</strong> expired on ${formattedExpiry}. Please arrange renewal to stay compliant.`
      : `The ${certificateType} certificate for <strong style="color:#f4f4f5;">${propertyName}</strong> expires on ${formattedExpiry} — that's ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"} away. A timely renewal will keep everything on track.`;

  const ctaLabel = isExpired ? "Renew certificate" : "View certificates";
  const ctaUrl = portalAppUrl(`/properties/${propertyId}?tab=certificates`);

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
      <a href="${ctaUrl}" style="display:inline-block;background:${isExpired ? "#ef4444" : "#f59e0b"};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;margin:24px 0;">${ctaLabel}</a>
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

function portalAppUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://app.wiskapp.com";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildMortgageAlertHtml({
  displayName,
  propertyAddress,
  lender,
  fixedRateEndDate,
  daysUntil,
  alertType,
  propertyUrl,
}: {
  displayName: string;
  propertyAddress: string;
  lender: string;
  fixedRateEndDate: string;
  daysUntil: number;
  alertType: MortgageAlertType;
  propertyUrl: string;
}): { subject: string; html: string } {
  const greeting = displayName.trim() || "there";
  const formattedDate = formatExpiryDate(fixedRateEndDate);
  const subject =
    alertType === "180_days"
      ? "Your fixed rate mortgage ends in 6 months — time to review your options"
      : `${daysUntil} days until your fixed rate ends — ${lender} mortgage at ${propertyAddress}`;

  const headline =
    alertType === "180_days"
      ? "Fixed rate ending in 6 months"
      : "Fixed rate mortgage ending soon";

  const bodyText =
    alertType === "180_days"
      ? `Your fixed rate with <strong style="color:#f4f4f5;">${lender}</strong> at <strong style="color:#f4f4f5;">${propertyAddress}</strong> ends on ${formattedDate}. Now is a good time to review your remortgage options.`
      : `Your fixed rate with <strong style="color:#f4f4f5;">${lender}</strong> at <strong style="color:#f4f4f5;">${propertyAddress}</strong> ends on ${formattedDate} — that's ${daysUntil} day${daysUntil === 1 ? "" : "s"} away. Remortgaging is a normal part of property ownership, and planning ahead gives you the best options.`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:48px 24px;">
    <div style="font-size:20px;font-weight:700;color:#f59e0b;letter-spacing:-0.5px;margin-bottom:40px;">WISK Properties</div>
    <div style="background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:36px 32px;">
      <h1 style="color:#f4f4f5;font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-0.3px;">${headline}</h1>
      <p style="color:#71717a;font-size:14px;margin:0 0 24px;">Hi ${greeting} — a heads-up about your mortgage.</p>
      <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-left:4px solid #f59e0b;border-radius:8px;padding:16px 20px;margin:20px 0;">
        <p style="color:#f59e0b;font-size:12px;font-weight:600;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.08em;">Fixed rate ends</p>
        <p style="color:#f4f4f5;font-size:18px;font-weight:700;margin:0;">${formattedDate}</p>
      </div>
      <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 20px;">${bodyText}</p>
      <a href="${propertyUrl}" style="display:inline-block;background:#f59e0b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;margin:24px 0;">View mortgage details</a>
    </div>
    <div style="margin-top:32px;color:#52525b;font-size:12px;text-align:center;">WISK &middot; Built by Isaiah George Creative</div>
  </div>
</body>
</html>`;

  return { subject, html };
}

export async function sendMortgageAlertEmail({
  to,
  displayName,
  propertyAddress,
  lender,
  fixedRateEndDate,
  daysUntil,
  alertType,
  propertyUrl,
}: {
  to: string;
  displayName: string;
  propertyAddress: string;
  lender: string;
  fixedRateEndDate: string;
  daysUntil: number;
  alertType: MortgageAlertType;
  propertyUrl: string;
}): Promise<boolean> {
  const client = getResend();
  if (!client) return false;

  const { subject, html } = buildMortgageAlertHtml({
    displayName,
    propertyAddress,
    lender,
    fixedRateEndDate,
    daysUntil,
    alertType,
    propertyUrl,
  });

  const { error } = await client.resend.emails.send({
    from: client.from,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("sendMortgageAlertEmail:", error);
    return false;
  }

  return true;
}

function buildInsuranceAlertHtml({
  displayName,
  propertyAddress,
  insurer,
  insuranceType,
  renewalDate,
  daysUntil,
  propertyUrl,
}: {
  displayName: string;
  propertyAddress: string;
  insurer: string;
  insuranceType: string;
  renewalDate: string;
  daysUntil: number;
  propertyUrl: string;
}): { subject: string; html: string } {
  const greeting = displayName.trim() || "there";
  const formattedDate = formatExpiryDate(renewalDate);
  const subject = `${daysUntil} days until your ${insuranceType} insurance renews — ${propertyAddress}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:48px 24px;">
    <div style="font-size:20px;font-weight:700;color:#f59e0b;letter-spacing:-0.5px;margin-bottom:40px;">WISK Properties</div>
    <div style="background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:36px 32px;">
      <h1 style="color:#f4f4f5;font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-0.3px;">Insurance renewal coming up</h1>
      <p style="color:#71717a;font-size:14px;margin:0 0 24px;">Hi ${greeting} — a calm reminder about your insurance.</p>
      <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-left:4px solid #f59e0b;border-radius:8px;padding:16px 20px;margin:20px 0;">
        <p style="color:#f59e0b;font-size:12px;font-weight:600;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.08em;">Renewal date</p>
        <p style="color:#f4f4f5;font-size:18px;font-weight:700;margin:0;">${formattedDate}</p>
      </div>
      <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 20px;">Your <strong style="color:#f4f4f5;">${insuranceType}</strong> policy with <strong style="color:#f4f4f5;">${insurer}</strong> at <strong style="color:#f4f4f5;">${propertyAddress}</strong> renews in ${daysUntil} day${daysUntil === 1 ? "" : "s"}. Reviewing your cover now helps avoid any gaps.</p>
      <a href="${propertyUrl}" style="display:inline-block;background:#f59e0b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;margin:24px 0;">View insurance details</a>
    </div>
    <div style="margin-top:32px;color:#52525b;font-size:12px;text-align:center;">WISK &middot; Built by Isaiah George Creative</div>
  </div>
</body>
</html>`;

  return { subject, html };
}

export async function sendInsuranceAlertEmail({
  to,
  displayName,
  propertyAddress,
  insurer,
  insuranceType,
  renewalDate,
  daysUntil,
  alertType,
  propertyUrl,
}: {
  to: string;
  displayName: string;
  propertyAddress: string;
  insurer: string;
  insuranceType: string;
  renewalDate: string;
  daysUntil: number;
  alertType: InsuranceAlertType;
  propertyUrl: string;
}): Promise<boolean> {
  const client = getResend();
  if (!client) return false;

  void alertType;

  const { subject, html } = buildInsuranceAlertHtml({
    displayName,
    propertyAddress,
    insurer,
    insuranceType,
    renewalDate,
    daysUntil,
    propertyUrl,
  });

  const { error } = await client.resend.emails.send({
    from: client.from,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("sendInsuranceAlertEmail:", error);
    return false;
  }

  return true;
}

export async function sendTenantPortalInviteEmail({
  to,
  tenantName,
  propertyAddress,
  landlordName,
  setupUrl,
}: {
  to: string;
  tenantName: string;
  propertyAddress: string;
  landlordName: string;
  setupUrl: string;
}): Promise<boolean> {
  const client = getResend();
  if (!client) return false;

  const greeting = tenantName.trim() || "there";
  const landlord = landlordName.trim() || "your landlord";
  const subject = "You've been invited to manage your tenancy online";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:48px 24px;">
    <div style="font-size:20px;font-weight:700;color:#f59e0b;letter-spacing:-0.5px;margin-bottom:40px;">WISK</div>
    <div style="background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:36px 32px;">
      <h1 style="color:#f4f4f5;font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-0.3px;">Your tenancy portal is ready</h1>
      <p style="color:#71717a;font-size:14px;margin:0 0 24px;">Hi ${greeting} — ${landlord} has invited you to manage your tenancy online.</p>
      <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 16px;">View your tenancy details, submit maintenance requests, and communicate with your landlord — all in one place.</p>
      <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px;">This is only for managing your tenancy at <strong style="color:#f4f4f5;">${propertyAddress}</strong>.</p>
      <a href="${setupUrl}" style="display:inline-block;background:#f59e0b;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;margin:8px 0 24px;">Set up your account</a>
      <p style="color:#71717a;font-size:13px;line-height:1.5;border-top:1px solid rgba(255,255,255,0.07);padding-top:20px;margin:8px 0 0;">This link expires in 7 days. If you need a new invite, contact your landlord.</p>
    </div>
    <div style="margin-top:32px;color:#52525b;font-size:12px;text-align:center;">Powered by WISK</div>
  </div>
</body>
</html>`;

  const { error } = await client.resend.emails.send({
    from: client.from,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("sendTenantPortalInviteEmail:", error);
    return false;
  }

  return true;
}

export async function sendMaintenanceRequestEmail({
  to,
  landlordName,
  tenantName,
  propertyAddress,
  issueTitle,
  issueDescription,
  priority,
  winstonAttempted,
  winstonSteps,
  propertyUrl,
}: {
  to: string;
  landlordName: string;
  tenantName: string;
  propertyAddress: string;
  issueTitle: string;
  issueDescription: string;
  priority: string;
  winstonAttempted: boolean;
  winstonSteps: string[] | null;
  propertyUrl: string;
}): Promise<boolean> {
  const client = getResend();
  if (!client) return false;

  const greeting = landlordName.trim() || "there";
  const subject = `Maintenance request: ${issueTitle} — ${propertyAddress}`;

  const winstonHtml =
    winstonAttempted && winstonSteps && winstonSteps.length > 0
      ? `<div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:8px;padding:16px 20px;margin:20px 0;">
      <p style="color:#f59e0b;font-size:12px;font-weight:600;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.08em;">Winston troubleshooting attempted</p>
      <ol style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0;padding-left:20px;">
        ${winstonSteps.map((step) => `<li style="margin-bottom:8px;">${step}</li>`).join("")}
      </ol>
    </div>`
      : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:48px 24px;">
    <div style="font-size:20px;font-weight:700;color:#f59e0b;letter-spacing:-0.5px;margin-bottom:40px;">WISK Properties</div>
    <div style="background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:36px 32px;">
      <h1 style="color:#f4f4f5;font-size:22px;font-weight:700;margin:0 0 8px;">New maintenance request</h1>
      <p style="color:#71717a;font-size:14px;margin:0 0 24px;">Hi ${greeting} — ${tenantName} has reported an issue at ${propertyAddress}.</p>
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px 20px;margin:20px 0;">
        <p style="color:#f4f4f5;font-size:16px;font-weight:600;margin:0 0 8px;">${issueTitle}</p>
        <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 12px;">${issueDescription.replace(/\n/g, "<br />")}</p>
        <p style="color:#f59e0b;font-size:12px;font-weight:600;margin:0;text-transform:uppercase;">Priority: ${priority}</p>
      </div>
      ${winstonHtml}
      <a href="${propertyUrl}" style="display:inline-block;background:#f59e0b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;margin:24px 0;">View in WISK</a>
    </div>
    <div style="margin-top:32px;color:#52525b;font-size:12px;text-align:center;">WISK &middot; Built by Isaiah George Creative</div>
  </div>
</body>
</html>`;

  const { error } = await client.resend.emails.send({
    from: client.from,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("sendMaintenanceRequestEmail:", error);
    return false;
  }

  return true;
}

export { portalAppUrl };
