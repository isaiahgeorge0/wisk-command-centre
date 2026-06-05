export const NAV_ITEMS = [
  { label: "Overview", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Tasks", href: "/tasks" },
  { label: "Goals", href: "/goals" },
  { label: "Ideas", href: "/ideas" },
  { label: "Calendar", href: "/calendar" },
  { label: "Leads", href: "/leads" },
  { label: "Content", href: "/content" },
  { label: "AI Digest", href: "/ai-digest" },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

/** Bottom nav routes (subset of NAV_ITEMS — no AI Digest). */
export const MOBILE_NAV_ITEMS = [
  { label: "Overview", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Tasks", href: "/tasks" },
  { label: "Goals", href: "/goals" },
  { label: "Content", href: "/content" },
  { label: "Leads", href: "/leads" },
] as const;

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const PAGE_TITLE_CLASS =
  "text-2xl font-semibold tracking-tight leading-tight text-foreground md:text-3xl";

export const PAGE_SUBTITLE_CLASS =
  "mt-1 text-sm leading-relaxed text-muted-foreground";
