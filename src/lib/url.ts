export function siteUrl(path = ""): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.wiskapp.com";
  return `${base.replace(/\/$/, "")}${path}`;
}

export function portalUrl(path = ""): string {
  return siteUrl(path);
}

export function contractorUrl(token: string): string {
  return siteUrl(`/contractor/${token}`);
}
