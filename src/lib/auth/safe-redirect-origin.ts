/**
 * Origin for links that land in Supabase Auth emails (reset, magic link,
 * signup confirm). Same incident class as EMAIL_BASE_URL: a local browser
 * pointed at production Supabase would otherwise email real users
 * http://localhost:… redirects. emailUrl() cannot run here — these calls
 * are client-side supabase.auth.* — so this is the client-safe counterpart.
 */

import { DEFAULT_EMAIL_BASE_URL, isLoopbackUrl } from "@/lib/email/base-url";

function supabaseProjectIsRemote(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  if (!url) return true;
  return !isLoopbackUrl(url);
}

/**
 * Resolves NEXT_PUBLIC_SITE_URL ?? window.location.origin, then refuses a
 * loopback host whenever the app is talking to a remote Supabase project.
 */
export function getSafeAuthRedirectOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? "";
  const fromWindow =
    typeof window !== "undefined"
      ? window.location.origin.replace(/\/$/, "")
      : "";
  const resolved = fromEnv || fromWindow;

  if (!resolved) {
    return DEFAULT_EMAIL_BASE_URL;
  }

  if (isLoopbackUrl(resolved) && supabaseProjectIsRemote()) {
    console.error(
      `[auth] Refusing loopback auth redirect origin (${resolved}) while NEXT_PUBLIC_SUPABASE_URL is remote. Using ${DEFAULT_EMAIL_BASE_URL}.`
    );
    return DEFAULT_EMAIL_BASE_URL;
  }

  return resolved;
}

export function authEmailRedirectUrl(path: string): string {
  const origin = getSafeAuthRedirectOrigin();
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalised}`;
}
