"use client";

import {
  Building2,
  FileText,
  FileWarning,
  HardHat,
  LayoutDashboard,
  MessageSquare,
  PoundSterling,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useUnreadMessageCount } from "@/lib/properties/use-unread-message-count";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Dashboard", href: "/properties/dashboard", icon: LayoutDashboard },
  { label: "Properties", href: "/properties/list", icon: Building2 },
  { label: "Tenants", href: "/properties/tenants", icon: Users },
  { label: "Reliability", href: "/properties/reliability", icon: ShieldCheck },
  { label: "Notices", href: "/properties/notices", icon: FileWarning },
  { label: "Maintenance", href: "/properties/maintenance", icon: Wrench },
  { label: "Finances", href: "/properties/finances", icon: PoundSterling },
  { label: "Documents", href: "/properties/documents", icon: FileText },
  { label: "Contractors", href: "/properties/contractors", icon: HardHat },
  { label: "Communication", href: "/properties/communication", icon: MessageSquare },
  { label: "Winston", href: "/properties/winston", icon: Sparkles },
];

const FINANCES_ROUTES = [
  "/properties/finances",
  "/properties/yield-analytics",
  "/properties/reports",
  "/properties/sa105",
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type PropertiesSidebarProps = {
  className?: string;
  unreadMessageCount?: number;
};

export function PropertiesSidebar({
  className,
  unreadMessageCount = 0,
}: PropertiesSidebarProps) {
  const pathname = usePathname();
  const localUnreadCount = useUnreadMessageCount(unreadMessageCount);

  return (
    <aside
      className={cn(
        "flex w-[240px] shrink-0 flex-col border-r border-border/60 bg-card/40",
        className
      )}
    >
      <div className="h-1 shrink-0 bg-wisk-ferrari" aria-hidden />
      <div className="border-b border-border/60 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-wisk-ferrari/10">
            <Building2 className="size-4 text-wisk-ferrari" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-foreground">Properties</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2" aria-label="Properties navigation">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/properties/finances"
                ? FINANCES_ROUTES.some(
                    (route) =>
                      pathname === route || pathname.startsWith(`${route}/`)
                  )
                : isActive(pathname, item.href);
            const Icon = item.icon;
            const showUnreadBadge =
              item.href === "/properties/communication" &&
              localUnreadCount > 0;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-wisk-ferrari/10 text-wisk-ferrari"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <span className="relative shrink-0">
                    <Icon className="size-4" aria-hidden />
                    {showUnreadBadge ? (
                      <span
                        className={cn(
                          "absolute -top-1.5 -right-1.5 flex min-w-4 items-center justify-center rounded-full bg-wisk-ferrari px-1 text-[10px] font-semibold leading-none text-white",
                          localUnreadCount > 9 ? "min-w-[18px]" : "size-4"
                        )}
                      >
                        {localUnreadCount > 99 ? "99+" : localUnreadCount}
                      </span>
                    ) : null}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

export const PROPERTIES_MOBILE_NAV = [
  { label: "Dashboard", href: "/properties/dashboard", icon: "LayoutDashboard" },
  { label: "Properties", href: "/properties/list", icon: "Building2" },
  { label: "Tenants", href: "/properties/tenants", icon: "Users" },
  { label: "Maintenance", href: "/properties/maintenance", icon: "Wrench" },
  { label: "Winston", href: "/properties/winston", icon: "Sparkles" },
] as const;
