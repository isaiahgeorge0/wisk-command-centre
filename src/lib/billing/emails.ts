import { Resend } from "resend";

import type { WiskPackage } from "@/lib/billing/types";
import { siteUrl } from "@/lib/url";

// ─── Package display names ─────────────────────────────────────────────────────

const PACKAGE_DISPLAY_NAMES: Record<WiskPackage, string> = {
  ai: "WISK AI",
  ai_pro: "WISK AI Pro",
  social: "WISK Social",
  commerce: "WISK Commerce",
  properties: "WISK Properties",
  properties_pro: "WISK Properties Pro",
  max: "WISK Max",
};

export function getPackageDisplayName(pkg: WiskPackage): string {
  return PACKAGE_DISPLAY_NAMES[pkg];
}

// ─── Package-specific features (keyed by display name) ────────────────────────

const PACKAGE_FEATURES: Record<string, string[]> = {
  "WISK AI": [
    "AI Digest every Sunday",
    "WISK Chat",
    "Smart suggestions",
    "100,000 tokens per month",
  ],
  "WISK AI Pro": [
    "Everything in WISK AI",
    "Gmail + Outlook integration",
    "AI email organiser",
    "Higher usage limits",
    "Priority support",
  ],
  "WISK Properties": [
    "Portfolio dashboard",
    "Tenant management",
    "Maintenance tracking",
    "Rent tracking",
    "Certificate alerts",
    "Document storage",
    "Winston property insights",
  ],
  "WISK Properties Pro": [
    "SA105 tax summary",
    "Legal notice templates",
    "Winston Pro property insights",
    "Yield analytics",
    "Tenant reliability scoring",
    "Financial reports",
  ],
};

// ─── Package CTA destinations ─────────────────────────────────────────────────

function getPackageCtaUrl(packageName: string): string {
  const urls: Record<string, string> = {
    "WISK AI": siteUrl("/ai-digest"),
    "WISK AI Pro": siteUrl("/ai-digest"),
    "WISK Properties": siteUrl("/properties"),
    "WISK Properties Pro": siteUrl("/properties"),
  };
  return urls[packageName] ?? siteUrl();
}

function getPackageCtaLabel(packageName: string): string {
  if (packageName === "WISK AI" || packageName === "WISK AI Pro") {
    return "Go to Winston";
  }
  if (
    packageName === "WISK Properties" ||
    packageName === "WISK Properties Pro"
  ) {
    return "Go to Properties";
  }
  return "Go to WISK";
}

// ─── Date formatting ──────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Resend client helper ─────────────────────────────────────────────────────

function getResend(): { resend: Resend; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error(
      "billing emails: RESEND_API_KEY or RESEND_FROM_EMAIL is not set"
    );
    return null;
  }
  return { resend: new Resend(apiKey), from };
}

// ─── Shared HTML primitives ───────────────────────────────────────────────────

const SHARED_STYLES = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:48px 24px;">
      <div style="font-size:20px;font-weight:700;background:linear-gradient(135deg,#a855f7,#14b8a6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-0.5px;margin-bottom:40px;">WISK</div>
      <div style="background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:36px 32px;">
`;

function htmlFooter(): string {
  return `
      </div>
      <div style="margin-top:32px;color:#52525b;font-size:12px;text-align:center;">
        WISK &middot; Built by Isaiah George Creative &middot;
        <a href="${siteUrl("/upgrade")}" style="color:#52525b;text-decoration:underline;">Manage subscription</a>
      </div>
    </div>
  </body>
  </html>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#0d9488);color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;margin:24px 0;">${label}</a>`;
}

function featureListHtml(features: string[]): string {
  const items = features
    .map(
      (f) =>
        `<li style="padding:5px 0;color:#a1a1aa;font-size:14px;line-height:1.5;">&#9670;&nbsp;&nbsp;${f}</li>`
    )
    .join("");
  return `<ul style="list-style:none;margin:0 0 8px;padding:0;">${items}</ul>`;
}

// ─── Template 1: Subscription Confirmed ──────────────────────────────────────

function buildSubscriptionConfirmedHtml({
  displayName,
  packageName,
  price,
  periodEnd,
}: {
  displayName: string;
  packageName: string;
  price: string;
  periodEnd: Date;
}): string {
  const greeting = displayName.trim() || "there";
  const features = PACKAGE_FEATURES[packageName];
  const ctaUrl = getPackageCtaUrl(packageName);

  const featuresSection = features
    ? `
      <p style="color:#a1a1aa;font-size:14px;font-weight:600;margin:20px 0 8px;text-transform:uppercase;letter-spacing:0.05em;">What you've unlocked</p>
      ${featureListHtml(features)}
    `
    : `
      <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 20px;">Your ${packageName} features are now active.</p>
    `;

  const priceSection = price
    ? `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px 18px;margin:20px 0 4px;">
        <p style="color:#a1a1aa;font-size:13px;margin:0;">${price}, billed monthly &middot; renews ${formatDate(periodEnd)}</p>
      </div>`
    : "";

  return `${SHARED_STYLES}
      <h1 style="color:#f4f4f5;font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-0.3px;">Welcome to ${packageName}.</h1>
      <p style="color:#71717a;font-size:14px;margin:0 0 24px;">Hi ${greeting} — your subscription is active. Here's what you've unlocked.</p>
      ${featuresSection}
      ${priceSection}
      ${ctaButton(ctaUrl, getPackageCtaLabel(packageName))}
      <p style="margin:0 0 20px;">
        <a href="${siteUrl("/upgrade")}"
           style="color:#a855f7;font-size:13px;text-decoration:none;
                  border-bottom:1px solid rgba(168,85,247,0.3);
                  padding-bottom:1px;">
          Manage your subscription
        </a>
      </p>
      <p style="color:#71717a;font-size:13px;line-height:1.5;border-top:1px solid rgba(255,255,255,0.07);padding-top:20px;margin:8px 0 0;">This is an investment in your business. Make the most of it.</p>
  ${htmlFooter()}`;
}

// ─── Template 2: Subscription Cancelled ──────────────────────────────────────

function buildSubscriptionCancelledHtml({
  displayName,
  packageName,
  accessUntil,
}: {
  displayName: string;
  packageName: string;
  accessUntil: Date;
}): string {
  const greeting = displayName.trim() || "there";
  const dateStr = formatDate(accessUntil);

  return `${SHARED_STYLES}
      <h1 style="color:#f4f4f5;font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-0.3px;">Subscription cancelled.</h1>
      <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 20px;">Hi ${greeting} — your ${packageName} subscription has been cancelled. You'll keep full access until <strong style="color:#f4f4f5;">${dateStr}</strong>.</p>
      <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.25);border-radius:8px;padding:16px 20px;margin:20px 0;">
        <p style="color:#fbbf24;font-size:12px;font-weight:600;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.08em;">Access until</p>
        <p style="color:#f4f4f5;font-size:18px;font-weight:700;margin:0;">${dateStr}</p>
      </div>
      ${ctaButton(siteUrl("/upgrade"), "Reactivate your plan")}
      <p style="color:#71717a;font-size:13px;line-height:1.5;border-top:1px solid rgba(255,255,255,0.07);padding-top:20px;margin:8px 0 0;">Changed your mind? You can reactivate any time before your access expires.</p>
  ${htmlFooter()}`;
}

// ─── Template 3: Payment Failed ───────────────────────────────────────────────

function buildPaymentFailedHtml({
  displayName,
  packageName,
  portalUrl,
}: {
  displayName: string;
  packageName: string;
  portalUrl: string;
}): string {
  const greeting = displayName.trim() || "there";

  return `${SHARED_STYLES}
      <h1 style="color:#f4f4f5;font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-0.3px;">We couldn't process your payment.</h1>
      <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 20px;">Hi ${greeting} — your payment for ${packageName} didn't go through. This can happen when a card expires or details change.</p>
      <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 20px;">Your access hasn't been affected yet — update your payment method to keep everything running.</p>
      ${ctaButton(portalUrl, "Update payment method")}
      <p style="color:#71717a;font-size:13px;line-height:1.5;border-top:1px solid rgba(255,255,255,0.07);padding-top:20px;margin:8px 0 0;">Need help? Reply to this email and we'll sort it out.</p>
  ${htmlFooter()}`;
}

// ─── Template 4: Subscription Renewed ────────────────────────────────────────

function buildSubscriptionRenewedHtml({
  displayName,
  packageName,
  price,
  nextRenewalDate,
}: {
  displayName: string;
  packageName: string;
  price: string;
  nextRenewalDate: Date;
}): string {
  const greeting = displayName.trim() || "there";
  const nextDateStr = formatDate(nextRenewalDate);

  return `${SHARED_STYLES}
      <h1 style="color:#f4f4f5;font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-0.3px;">Subscription renewed.</h1>
      <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 20px;">Hi ${greeting} — your ${packageName} subscription has renewed.</p>
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:18px 20px;margin:0 0 8px;">
        <p style="color:#a1a1aa;font-size:14px;margin:0 0 8px;">Plan: <span style="color:#f4f4f5;font-weight:600;">${packageName}</span></p>
        ${price ? `<p style="color:#a1a1aa;font-size:14px;margin:0 0 8px;">Amount: <span style="color:#f4f4f5;font-weight:600;">${price}</span></p>` : ""}
        <p style="color:#a1a1aa;font-size:14px;margin:0;">Next renewal: <span style="color:#f4f4f5;font-weight:600;">${nextDateStr}</span></p>
      </div>
      ${ctaButton(siteUrl(), "Go to WISK")}
      <p style="color:#71717a;font-size:13px;line-height:1.5;border-top:1px solid rgba(255,255,255,0.07);padding-top:20px;margin:8px 0 0;">WISK &middot; <a href="${siteUrl("/upgrade")}" style="color:#71717a;text-decoration:underline;">Manage subscription</a></p>
  ${htmlFooter()}`;
}

// ─── Exported email functions ─────────────────────────────────────────────────

export async function sendSubscriptionConfirmedEmail({
  to,
  displayName,
  packageName,
  price,
  periodEnd,
}: {
  to: string;
  displayName: string;
  packageName: string;
  price: string;
  periodEnd: Date;
}): Promise<void> {
  try {
    const client = getResend();
    if (!client) return;

    const { error } = await client.resend.emails.send({
      from: client.from,
      to: to.trim().toLowerCase(),
      subject: `You're in. Welcome to ${packageName}.`,
      html: buildSubscriptionConfirmedHtml({ displayName, packageName, price, periodEnd }),
    });

    if (error) {
      console.error("sendSubscriptionConfirmedEmail: Resend error:", error.message);
    }
  } catch (err) {
    console.error("sendSubscriptionConfirmedEmail: unexpected error:", err);
  }
}

export async function sendSubscriptionCancelledEmail({
  to,
  displayName,
  packageName,
  accessUntil,
}: {
  to: string;
  displayName: string;
  packageName: string;
  accessUntil: Date;
}): Promise<void> {
  try {
    const client = getResend();
    if (!client) return;

    const { error } = await client.resend.emails.send({
      from: client.from,
      to: to.trim().toLowerCase(),
      subject: `Your ${packageName} subscription has been cancelled.`,
      html: buildSubscriptionCancelledHtml({ displayName, packageName, accessUntil }),
    });

    if (error) {
      console.error("sendSubscriptionCancelledEmail: Resend error:", error.message);
    }
  } catch (err) {
    console.error("sendSubscriptionCancelledEmail: unexpected error:", err);
  }
}

export async function sendPaymentFailedEmail({
  to,
  displayName,
  packageName,
  portalUrl,
}: {
  to: string;
  displayName: string;
  packageName: string;
  portalUrl: string;
}): Promise<void> {
  try {
    const client = getResend();
    if (!client) return;

    const { error } = await client.resend.emails.send({
      from: client.from,
      to: to.trim().toLowerCase(),
      subject: `Action needed — payment failed for ${packageName}.`,
      html: buildPaymentFailedHtml({ displayName, packageName, portalUrl }),
    });

    if (error) {
      console.error("sendPaymentFailedEmail: Resend error:", error.message);
    }
  } catch (err) {
    console.error("sendPaymentFailedEmail: unexpected error:", err);
  }
}

export async function sendSubscriptionRenewedEmail({
  to,
  displayName,
  packageName,
  price,
  nextRenewalDate,
}: {
  to: string;
  displayName: string;
  packageName: string;
  price: string;
  nextRenewalDate: Date;
}): Promise<void> {
  try {
    const client = getResend();
    if (!client) return;

    const { error } = await client.resend.emails.send({
      from: client.from,
      to: to.trim().toLowerCase(),
      subject: `Your ${packageName} subscription has renewed.`,
      html: buildSubscriptionRenewedHtml({ displayName, packageName, price, nextRenewalDate }),
    });

    if (error) {
      console.error("sendSubscriptionRenewedEmail: Resend error:", error.message);
    }
  } catch (err) {
    console.error("sendSubscriptionRenewedEmail: unexpected error:", err);
  }
}
