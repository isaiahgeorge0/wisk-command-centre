"use client";

import {
  FileText,
  Home,
  LogOut,
  MessageSquare,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { signOutPortal } from "@/app/portal/actions";
import { formatPropertyAddress } from "@/lib/properties/format";
import { getTenantFullName } from "@/lib/properties/tenant-form";
import type { Property, Tenant } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

const PORTAL_ACCENT = "#f59e0b";

const NAV_ITEMS = [
  { href: "/portal", label: "Home", icon: Home, exact: true },
  { href: "/portal/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/portal/documents", label: "Documents", icon: FileText },
  { href: "/portal/messages", label: "Messages", icon: MessageSquare },
] as const;

type PortalShellProps = {
  tenant: Tenant;
  property: Property;
  landlordName: string | null;
  children: React.ReactNode;
};

export function PortalShell({
  tenant,
  property,
  landlordName,
  children,
}: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isBareRoute =
    pathname === "/portal/login" ||
    pathname === "/portal/setup" ||
    pathname.startsWith("/portal/setup");

  if (isBareRoute) {
    return <>{children}</>;
  }

  const handleSignOut = async () => {
    await signOutPortal();
    router.push("/portal/login");
    router.refresh();
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-sm font-bold tracking-[0.2em] uppercase"
              style={{ color: PORTAL_ACCENT }}
            >
              WISK
            </p>
            <p className="truncate text-sm font-medium text-foreground">
              {getTenantFullName(tenant)}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {formatPropertyAddress(property)}
            </p>
            {landlordName ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                Landlord: {landlordName}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 px-4 py-4 pb-24">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-border/60 bg-background/95 backdrop-blur">
        <div className="grid grid-cols-4 gap-1 px-2 py-2">
          {NAV_ITEMS.map((item) => {
            const { href, label, icon: Icon } = item;
            const exact = "exact" in item && item.exact === true;
            const active = exact
              ? pathname === href
              : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium transition-colors",
                  active
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
