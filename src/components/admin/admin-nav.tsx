"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ADMIN_LINKS = [
  { label: "Overview", href: "/admin" },
  { label: "Requests", href: "/admin/requests" },
  { label: "Users", href: "/admin/users" },
  { label: "Announcements", href: "/admin/announcements" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1">
      <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
        Admin
      </span>
      {ADMIN_LINKS.map((link, index) => {
        const isActive =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);

        return (
          <span key={link.href} className="flex items-center gap-1">
            {index > 0 ? (
              <span className="text-orange-400/60" aria-hidden="true">
                ·
              </span>
            ) : null}
            <Link
              href={link.href}
              className={cn(
                "rounded-md px-2 py-1 text-sm transition-colors",
                isActive
                  ? "bg-orange-500/15 font-medium text-orange-700 dark:text-orange-300"
                  : "text-muted-foreground hover:bg-orange-500/10 hover:text-orange-700 dark:hover:text-orange-300"
              )}
            >
              {link.label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
