"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Check, Loader2, Sparkles, X, Zap } from "lucide-react";

import { generateUserDigest, toggleAIAccess } from "@/app/(dashboard)/admin/actions";
import type {
  ActiveSubscriptionSummary,
  AdminUserHealth,
  UserHealthSummary,
} from "@/lib/admin/platform";
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

// ─── Per-row Winston toggle ───────────────────────────────────────────────────

function WinstonToggle({
  userId,
  initialValue,
}: {
  userId: string;
  initialValue: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(initialValue);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      setOptimistic(!optimistic);
      await toggleAIAccess(userId);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      aria-label={optimistic ? "Revoke Winston access" : "Grant Winston access"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-150",
        optimistic
          ? "border-wisk-teal/40 bg-wisk-teal/10 text-wisk-teal hover:bg-wisk-teal/20"
          : "border-border bg-muted text-muted-foreground hover:border-wisk-purple/40 hover:bg-wisk-purple/10 hover:text-wisk-purple",
        pending && "cursor-not-allowed opacity-60"
      )}
    >
      <Sparkles className="size-3" aria-hidden />
      {optimistic ? "Enabled" : "Off"}
    </button>
  );
}

// ─── Per-row generate digest button ──────────────────────────────────────────

type DigestState = "idle" | "loading" | "success" | "error";

function GenerateDigestButton({ userId }: { userId: string }) {
  const [state, setState] = useState<DigestState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setState("loading");
    setErrorMsg(null);

    startTransition(async () => {
      const result = await generateUserDigest(userId);

      if (result.success) {
        setState("success");
        setTimeout(() => setState("idle"), 2000);
      } else {
        setState("error");
        setErrorMsg(result.error ?? "Failed to generate digest");
        setTimeout(() => setState("idle"), 3000);
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleClick}
        disabled={pending || state === "loading"}
        aria-label="Generate Winston digest"
        title={errorMsg ?? "Generate Winston digest"}
        className={cn(
          "inline-flex items-center justify-center rounded-full border p-1.5 transition-colors duration-150",
          state === "idle" &&
            "border-border bg-muted text-muted-foreground hover:border-wisk-teal/40 hover:bg-wisk-teal/10 hover:text-wisk-teal",
          state === "loading" &&
            "cursor-not-allowed border-border bg-muted text-muted-foreground opacity-60",
          state === "success" &&
            "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
          state === "error" &&
            "border-red-500/40 bg-red-500/10 text-red-500"
        )}
      >
        {state === "loading" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : state === "success" ? (
          <Check className="size-4" aria-hidden />
        ) : state === "error" ? (
          <X className="size-4" aria-hidden />
        ) : (
          <Zap className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}

// ─── Subscription badges ──────────────────────────────────────────────────────

const PACKAGE_LABEL: Record<string, string> = {
  ai: "WISK AI",
  ai_pro: "WISK AI Pro",
  social: "Social",
  commerce: "Commerce",
  properties: "Properties",
  max: "WISK Max",
};

const PACKAGE_CLASS: Record<string, string> = {
  ai: "border-wisk-teal/30 bg-wisk-teal/10 text-wisk-teal",
  ai_pro: "border-wisk-purple/30 bg-wisk-purple/10 text-wisk-purple",
  social: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  commerce:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  properties:
    "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  max: "border-wisk-teal/30 bg-wisk-teal/10 text-foreground",
};

function SubscriptionBadges({
  subscriptions,
}: {
  subscriptions: ActiveSubscriptionSummary[];
}) {
  if (subscriptions.length === 0) {
    return <span className="text-muted-foreground/40">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {subscriptions.map((sub) => (
        <Badge
          key={sub.package}
          variant="outline"
          className={cn(
            "text-xs",
            PACKAGE_CLASS[sub.package] ??
              "border-border bg-muted text-muted-foreground"
          )}
        >
          {PACKAGE_LABEL[sub.package] ?? sub.package}
        </Badge>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Last login</th>
              <th className="px-4 py-3 font-medium">Projects</th>
              <th className="px-4 py-3 font-medium">Tasks</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">
                <span className="flex items-center gap-1">
                  <Sparkles className="size-3 text-wisk-teal" aria-hidden />
                  Winston
                </span>
              </th>
              <th className="px-4 py-3 font-medium">Subscriptions</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Digest
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
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
                  <td className="px-4 py-3">
                    {user.username ? (
                      <span className="font-mono text-xs text-foreground">
                        @{user.username}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
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
                  <td className="px-4 py-3">
                    <WinstonToggle
                      userId={user.id}
                      initialValue={user.ai_access}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <SubscriptionBadges subscriptions={user.subscriptions} />
                  </td>
                  <td className="px-4 py-3">
                    {user.ai_access ? (
                      <GenerateDigestButton userId={user.id} />
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
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
