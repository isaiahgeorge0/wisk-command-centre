import { Resend } from "resend";

import type { MorningBriefingContent } from "@/lib/morning/briefing-generator";

const URGENCY_COLOURS = {
  high: "#e8001d",
  medium: "#ff5d00",
  low: "#aca0ff",
} as const;

const CATEGORY_EMOJIS: Record<string, string> = {
  Tasks: "✓",
  Leads: "◎",
  Goals: "◈",
  Content: "◻",
  Properties: "⌂",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendMorningBriefingEmail({
  to,
  displayName,
  content,
}: {
  to: string;
  displayName: string;
  content: MorningBriefingContent;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const resend = new Resend(apiKey);
  const focusesHtml = content.focuses
    .map((focus) => {
      const colour = URGENCY_COLOURS[focus.urgency] ?? URGENCY_COLOURS.low;
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:8px;">
                  <div style="width:3px;height:32px;border-radius:2px;background:${colour};margin-right:12px;"></div>
                </td>
                <td style="padding-left:10px;">
                  <span style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${colour};">
                    ${CATEGORY_EMOJIS[focus.category] ?? "·"} ${escapeHtml(focus.category)}
                  </span><br />
                  <span style="font-size:14px;color:#ffffff;font-weight:500;">
                    ${escapeHtml(focus.item)}
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join("");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.wiskapp.com";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Your WISK Morning Briefing</title>
</head>
<body style="margin:0;padding:0;background-color:#141b27;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#141b27;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <img src="${siteUrl}/wisk-logo-white.png" alt="WISK" height="28"
                style="filter:brightness(0) saturate(100%) invert(93%) sepia(55%) saturate(900%) hue-rotate(33deg) brightness(105%);">
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:8px;text-align:center;">
              <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:rgba(255,255,255,0.4);">
                ${escapeHtml(content.date)}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:8px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                ${escapeHtml(content.greeting)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.5;">
                ${escapeHtml(content.headline)}
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0"
                style="overflow:hidden;background:#1a2235;border:1px solid rgba(255,255,255,0.08);border-radius:16px;">
                <tr>
                  <td style="height:3px;background:linear-gradient(to right,#c3ff32,#016c81);"></td>
                </tr>
                <tr>
                  <td style="padding:20px 24px 12px;">
                    <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#c3ff32;">
                      Today&apos;s focuses
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 24px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${focusesHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 32px;text-align:center;">
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.45);font-style:italic;line-height:1.6;">
                &ldquo;${escapeHtml(content.encouragement)}&rdquo;
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.25);">— Winston</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <a href="${siteUrl}" style="display:inline-block;padding:12px 28px;background:#c3ff32;border-radius:10px;color:#141b27;font-size:13px;font-weight:700;letter-spacing:0.02em;text-decoration:none;">
                Open WISK
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);line-height:1.6;">
                You&apos;re receiving this because you have WISK AI Pro.<br>
                <a href="${siteUrl}/settings" style="color:rgba(255,255,255,0.35);text-decoration:underline;">
                  Manage email preferences
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "WISK <hello@wiskapp.com>",
    to: to.trim().toLowerCase(),
    subject: `Good morning, ${displayName} — your WISK briefing`,
    html,
  });

  if (error) {
    throw new Error(`Resend morning briefing failed: ${error.message}`);
  }
}
