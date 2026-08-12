/**
 * When true, morning-briefing routes enforce per-timezone local windows
 * (e.g. 07:25-07:35 generate / 07:30-07:40 send). That only works with a
 * frequent cron (Vercel Pro every-5-minutes). On Hobby, leave unset/false so a
 * once-daily cron invocation processes all eligible users.
 *
 * Set MORNING_BRIEFING_FREQUENT_CRON=true after upgrading to Pro and restoring
 * frequent schedules in vercel.json.
 */
export function isMorningBriefingFrequentCronEnabled(): boolean {
  const raw = process.env.MORNING_BRIEFING_FREQUENT_CRON?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
