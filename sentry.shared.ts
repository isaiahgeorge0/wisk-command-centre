import type { NodeOptions } from "@sentry/nextjs";

/** Shared Sentry options for client, server, and edge runtimes. */
export const sentryOptions: NodeOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Low sample rate to manage costs; increase if needed.
  tracesSampleRate: 0.1,

  // Session replay disabled initially.
  // No replaysSessionSampleRate or replaysOnErrorSampleRate configured.

  // Privacy-conscious: do not send email, IP, or other default PII.
  sendDefaultPii: false,

  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
};
