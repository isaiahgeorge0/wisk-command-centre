"use client";

import {
  Building2,
  FileText,
  LayoutDashboard,
  MessageSquare,
  PoundSterling,
  Sparkles,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV_ITEMS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Dashboard", href: "/properties/dashboard", icon: LayoutDashboard },
  { label: "Properties", href: "/properties/list", icon: Building2 },
  { label: "Tenants", href: "/properties/tenants", icon: Users },
  { label: "Maintenance", href: "/properties/maintenance", icon: Wrench },
  { label: "Finances", href: "/properties/finances", icon: PoundSterling },
  { label: "Documents", href: "/properties/documents", icon: FileText },
  { label: "Communication", href: "/properties/communication", icon: MessageSquare },
  { label: "Winston", href: "/properties/winston", icon: Sparkles },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PropertiesSidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex w-[240px] shrink-0 flex-col border-r border-border/60 bg-card/40",
        className
      )}
    >
      <div
        className="h-1 shrink-0 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500"
        aria-hidden
      />
      <div className="border-b border-border/60 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15">
            <Building2 className="size-4 text-amber-500" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-foreground">Properties</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2" aria-label="Properties navigation">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
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
