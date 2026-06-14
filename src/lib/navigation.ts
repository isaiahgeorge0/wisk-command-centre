export type NavChild = {
  label: string;
  href: string;
};

export type NavGroup = {
  label: string;
  href: string;
  icon: string;
  children?: NavChild[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    href: "/",
    icon: "LayoutDashboard",
  },
  {
    label: "Work",
    href: "/projects",
    icon: "Briefcase",
    children: [
      { label: "Projects", href: "/projects" },
      { label: "Tasks", href: "/tasks" },
      { label: "Goals", href: "/goals" },
    ],
  },
  {
    label: "Plan",
    href: "/calendar",
    icon: "CalendarDays",
    children: [
      { label: "Calendar", href: "/calendar" },
      { label: "Content", href: "/content" },
      { label: "Ideas", href: "/ideas" },
    ],
  },
  {
    label: "Grow",
    href: "/leads",
    icon: "TrendingUp",
  },
  {
    label: "Winston",
    href: "/ai-digest",
    icon: "Sparkles",
    children: [
      { label: "Digest", href: "/ai-digest" },
      { label: "Chat", href: "/ai-digest/chat" },
    ],
  },
];

/** @deprecated Use NAV_GROUPS — flat list of all navigable routes. */
export const NAV_ITEMS = NAV_GROUPS.flatMap((group) =>
  group.children ?? [{ label: group.label, href: group.href }]
);

export type NavItem = (typeof NAV_ITEMS)[number];

/** @deprecated Use NAV_GROUPS — parent-level mobile nav items. */
export const MOBILE_NAV_ITEMS = NAV_GROUPS.map((group) => ({
  label: group.label,
  href: group.href,
}));

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isGroupActive(pathname: string, group: NavGroup): boolean {
  if (group.href === "/") return pathname === "/";
  if (!group.children) return isNavActive(pathname, group.href);
  return group.children.some((child) => isNavActive(pathname, child.href));
}

/** Active state for a child link when siblings share a path prefix (e.g. Digest vs Chat). */
export function isChildNavActive(
  pathname: string,
  child: NavChild,
  siblings: NavChild[]
): boolean {
  if (pathname === child.href) return true;
  if (!pathname.startsWith(`${child.href}/`)) return false;
  const exactMatch = siblings.find((s) => pathname === s.href);
  if (exactMatch) return exactMatch.href === child.href;
  return true;
}

export const PAGE_TITLE_CLASS =
  "text-2xl font-semibold tracking-tight leading-tight text-foreground md:text-3xl";

export const PAGE_SUBTITLE_CLASS =
  "mt-1 text-sm leading-relaxed text-muted-foreground";
