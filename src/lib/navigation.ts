export const NAV_ITEMS = [
  { label: "Overview", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Tasks", href: "/tasks" },
  { label: "Goals", href: "/goals" },
  { label: "Ideas", href: "/ideas" },
  { label: "AI Digest", href: "/ai-digest" },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
