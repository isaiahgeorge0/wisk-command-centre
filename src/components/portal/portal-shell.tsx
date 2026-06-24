"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  FileText,
  Home,
  MessageSquare,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PortalThemeToggle } from "@/components/portal/portal-theme-toggle";
import { formatPropertyAddress } from "@/lib/properties/format";
import { getTenantFullName } from "@/lib/properties/tenant-form";
import type { Property, Tenant } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/portal", label: "Home", icon: Home, exact: true },
  { href: "/portal/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/portal/documents", label: "Documents", icon: FileText },
  { href: "/portal/messages", label: "Messages", icon: MessageSquare },
] as const;

type PortalShellProps = {
  tenant: Tenant;
  property: Property;
  children: React.ReactNode;
};

export function PortalShell({ tenant, property, children }: PortalShellProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion() ?? false;

  const isBareRoute =
    pathname === "/portal/login" ||
    pathname === "/portal/setup" ||
    pathname.startsWith("/portal/setup");

  if (isBareRoute) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--portal-border)] bg-[var(--portal-bg)] px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-[0.18em] text-[var(--portal-amber)]">
              WISK
            </p>
            <p className="mt-2 truncate text-base font-medium text-[var(--portal-text)]">
              {getTenantFullName(tenant)}
            </p>
            <p className="mt-0.5 truncate text-sm text-[var(--portal-muted)]">
              {formatPropertyAddress(property)}
            </p>
          </div>
          <PortalThemeToggle />
        </div>
      </header>

      <main className="min-h-0 flex-1 px-5 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-[var(--portal-border)] bg-[var(--portal-nav-bg)] backdrop-blur-md">
        <div className="grid grid-cols-4 gap-1 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {NAV_ITEMS.map((item) => {
            const { href, label, icon: Icon } = item;
            const exact = "exact" in item && item.exact === true;
            const active = exact
              ? pathname === href
              : pathname.startsWith(href);

            return (
              <motion.div
                key={href}
                whileTap={reduced ? undefined : { scale: 0.95 }}
              >
                <Link
                  href={href}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors",
                    active
                      ? "text-[var(--portal-amber)]"
                      : "text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
                  )}
                >
                  <Icon
                    className={cn("size-5", active && "fill-current")}
                    aria-hidden
                  />
                  {label}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
