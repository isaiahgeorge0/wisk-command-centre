"use client";

import { useMemo, useState } from "react";

import type { AdminUserHealth, UserHealthSummary } from "@/lib/admin/platform";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type UsersHealthClientProps = {
  users: AdminUserHealth[];
  summary: UserHealthSummary;
};

function formatDate(iso: string | null) {
  if (!iso) {
    return "Never";
  }
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ActivityBadge({
  status,
}: {
  status: AdminUserHealth["activity_status"];
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        status === "active" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        status === "inactive" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        status === "dormant" && "border-border bg-muted text-muted-foreground"
      )}
    >
      {status === "active"
        ? "Active"
        : status === "inactive"
          ? "Inactive"
          : "Dormant"}
    </Badge>
  );
}

export function UsersHealthClient({ users, summary }: UsersHealthClientProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return users;
    }
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(query) ||
        (user.name ?? "").toLowerCase().includes(query)
    );
  }, [search, users]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Active (7 days)
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
            {summary.active}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Inactive (8–30 days)
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-300">
            {summary.inactive}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Dormant (30+ days)
          </p>
          <p className="mt-1 text-2xl font-semibold">{summary.dormant}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {users.length} user{users.length === 1 ? "" : "s"} total
        </p>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or email…"
          className="sm:max-w-xs"
        />
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Last login</th>
              <th className="px-4 py-3 font-medium">Projects</th>
              <th className="px-4 py-3 font-medium">Tasks</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">
                    {user.name?.trim() || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.days_since_joined}d ago
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(user.last_sign_in_at)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.project_count}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.task_count}
                  </td>
                  <td className="px-4 py-3">
                    <ActivityBadge status={user.activity_status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
