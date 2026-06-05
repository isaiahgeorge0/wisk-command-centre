"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ADMIN_LINKS = [
  { label: "Overview", href: "/admin" },
  { label: "Requests", href: "/admin/requests" },
  { label: "Users", href: "/admin/users" },
  { label: "Announcements", href: "/admin/announcements" },
  { label: "Feedback", href: "/admin/feedback", showBadge: true },
  { label: "Changelog", href: "/admin/changelog" },
] as const;

type AdminNavProps = {
  newFeedbackCount?: number;
};

export function AdminNav({ newFeedbackCount = 0 }: AdminNavProps) {
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
        const showBadge =
          "showBadge" in link && link.showBadge && newFeedbackCount > 0;

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
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors",
                isActive
                  ? "bg-orange-500/15 font-medium text-orange-700 dark:text-orange-300"
                  : "text-muted-foreground hover:bg-orange-500/10 hover:text-orange-700 dark:hover:text-orange-300"
              )}
            >
              {link.label}
              {showBadge ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {newFeedbackCount > 99 ? "99+" : newFeedbackCount}
                </span>
              ) : null}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
