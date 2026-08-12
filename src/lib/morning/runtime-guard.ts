/**
 * Guards morning-briefing cron routes from running against live data/Resend
 * when invoked from a non-production environment (typical local .env.local).
 *
 * Set ALLOW_LOCAL_MORNING_BRIEFING_CRON=true to deliberately override.
 */
export function assertMorningBriefingCronAllowed(
  action: "generate" | "send"
): void {
  if (process.env.ALLOW_LOCAL_MORNING_BRIEFING_CRON === "true") {
    console.warn(
      `[morning-briefing/${action}] ALLOW_LOCAL_MORNING_BRIEFING_CRON=true — running outside production`
    );
    return;
  }

  const vercelEnv = process.env.VERCEL_ENV;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const siteLooksLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/i.test(
    siteUrl
  );

  if (vercelEnv === "production" && !siteLooksLocal) {
    return;
  }

  throw new Error(
    `Refusing morning-briefing/${action}: not Vercel production` +
      ` (VERCEL_ENV=${vercelEnv ?? "unset"}, NEXT_PUBLIC_SITE_URL=${siteUrl || "unset"}).` +
      ` Set ALLOW_LOCAL_MORNING_BRIEFING_CRON=true only if you intentionally want to hit live users/Resend.`
  );
}
