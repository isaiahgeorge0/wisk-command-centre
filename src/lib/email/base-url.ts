/**
 * Base URL for links embedded in transactional emails (Resend).
 *
 * Never use NEXT_PUBLIC_SITE_URL here — that is often localhost in .env.local
 * while RESEND_API_KEY still points at production.
 *
 * Optional EMAIL_BASE_URL overrides the default (e.g. staging). Must not be a
 * loopback host; getEmailBaseUrl() throws if it is.
 */
export const DEFAULT_EMAIL_BASE_URL = "https://app.wiskapp.com";

const LOOPBACK_RE = /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/i;

export function isLoopbackUrl(value: string): boolean {
  return LOOPBACK_RE.test(value);
}

export function assertEmailBaseUrlSafe(url: string): void {
  if (isLoopbackUrl(url)) {
    throw new Error(
      `Refusing to send email with non-production base URL (${url}). Set EMAIL_BASE_URL to a public https origin.`
    );
  }
}

export function getEmailBaseUrl(): string {
  const raw = (process.env.EMAIL_BASE_URL ?? DEFAULT_EMAIL_BASE_URL)
    .trim()
    .replace(/\/$/, "");
  assertEmailBaseUrlSafe(raw);
  return raw;
}

/** Absolute URL for a path inside outbound email HTML. */
export function emailUrl(path = ""): string {
  const base = getEmailBaseUrl();
  if (!path) return base;
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalised}`;
}

/** Final backstop before Resend — HTML must not contain loopback hosts. */
export function assertEmailHtmlSafe(html: string): void {
  if (isLoopbackUrl(html)) {
    throw new Error(
      "Refusing to send email whose HTML contains a localhost/loopback URL"
    );
  }
}
