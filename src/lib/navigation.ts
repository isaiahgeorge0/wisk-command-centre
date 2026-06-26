export type NavDropdownItem = {
  label: string;
  href: string;
  description: string;
  icon:
    | "FolderKanban"
    | "CheckSquare"
    | "Target"
    | "Lightbulb"
    | "FileText"
    | "Calendar"
    | "TrendingUp"
    | "CalendarDays";
};

export type NavDropdownGroupConfig = {
  label: string;
  items: NavDropdownItem[];
};

export const DESKTOP_DROPDOWN_GROUPS: NavDropdownGroupConfig[] = [
  {
    label: "Work",
    items: [
      {
        label: "Projects",
        href: "/projects",
        description: "Client work and active projects",
        icon: "FolderKanban",
      },
      {
        label: "Tasks",
        href: "/tasks",
        description: "Your daily task list",
        icon: "CheckSquare",
      },
    ],
  },
  {
    label: "Plan",
    items: [
      {
        label: "Goals",
        href: "/goals",
        description: "Track progress toward targets",
        icon: "Target",
      },
      {
        label: "Ideas",
        href: "/ideas",
        description: "Capture and develop ideas",
        icon: "Lightbulb",
      },
      {
        label: "Notes",
        href: "/notes",
        description: "Your notes and documents",
        icon: "FileText",
      },
      {
        label: "Calendar",
        href: "/calendar",
        description: "Schedule and upcoming events",
        icon: "Calendar",
      },
    ],
  },
  {
    label: "Grow",
    items: [
      {
        label: "Leads",
        href: "/leads",
        description: "Pipeline and sales tracking",
        icon: "TrendingUp",
      },
      {
        label: "Content",
        href: "/content",
        description: "Content calendar and board",
        icon: "CalendarDays",
      },
    ],
  },
];

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

export const DESKTOP_STANDALONE_NAV = [
  { label: "Overview", href: "/" },
  { label: "Email", href: "/email" },
  { label: "Winston", href: "/ai-digest" },
  { label: "Properties", href: "/properties", requiresProperties: true },
] as const;

/** Desktop nav order: Overview · Work · Plan · Grow · Email · Winston (+ Properties when entitled). */
export const DESKTOP_NAV_OVERVIEW = DESKTOP_STANDALONE_NAV[0];
export const DESKTOP_NAV_AFTER_DROPDOWNS = DESKTOP_STANDALONE_NAV.slice(1);

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
    ],
  },
  {
    label: "Plan",
    href: "/goals",
    icon: "CalendarDays",
    children: [
      { label: "Goals", href: "/goals" },
      { label: "Ideas", href: "/ideas" },
      { label: "Notes", href: "/notes" },
      { label: "Calendar", href: "/calendar" },
    ],
  },
  {
    label: "Grow",
    href: "/leads",
    icon: "TrendingUp",
    children: [
      { label: "Leads", href: "/leads" },
      { label: "Content", href: "/content" },
    ],
  },
  {
    label: "Social",
    href: "/email",
    icon: "MessageSquare",
    children: [{ label: "Email", href: "/email" }],
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

export const NAV_ITEMS = [
  { label: "Overview", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Tasks", href: "/tasks" },
  { label: "Goals", href: "/goals" },
  { label: "Ideas", href: "/ideas" },
  { label: "Notes", href: "/notes" },
  { label: "Calendar", href: "/calendar" },
  { label: "Leads", href: "/leads" },
  { label: "Content", href: "/content" },
  { label: "Email", href: "/email" },
  { label: "Winston", href: "/ai-digest" },
  { label: "Properties", href: "/properties" },
] as const;

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

export function isDropdownGroupActive(
  pathname: string,
  items: NavDropdownItem[]
): boolean {
  return items.some((item) => isNavActive(pathname, item.href));
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
