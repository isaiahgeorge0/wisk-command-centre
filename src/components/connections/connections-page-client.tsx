"use client";

import { Check, Loader2, UserCheck, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  acceptConnection,
  declineConnection,
  removeConnection,
  searchUsers,
  sendConnectionRequest,
} from "@/app/(dashboard)/connections/actions";
import { PageTransition } from "@/components/layout/page-transition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PublicUserProfile, UserConnection } from "@/lib/collaboration/types";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";
import { getInitials } from "@/lib/user/initials";
import { cn } from "@/lib/utils";

type ConnectionsPageClientProps = {
  initialConnections: UserConnection[];
  initialPending: UserConnection[];
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function TimeAgoLabel({ iso }: { iso: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(timeAgo(iso));
  }, [iso]);

  return (
    <p className="mt-0.5 text-xs text-muted-foreground/60">
      {label ?? "\u00a0"}
    </p>
  );
}

function ProfileAvatar({
  name,
  username,
  size = "md",
}: {
  name: string | null;
  username: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = getInitials(name, `${username}@wisk`);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/30 to-wisk-teal/30 font-semibold text-foreground ring-2 ring-border/60",
        size === "sm" && "size-8 text-xs",
        size === "md" && "size-10 text-sm",
        size === "lg" && "size-12 text-base"
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}

// ─── Search section ───────────────────────────────────────────────────────────

function SearchSection() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim().replace(/^@/, "");

    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const result = await searchUsers(trimmed);
      setResults(result.success ? (result.data ?? []) : []);
      setSearching(false);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleConnect = async (userId: string) => {
    setPendingIds((prev) => new Set([...prev, userId]));
    const result = await sendConnectionRequest(userId);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    if (result.success) {
      setSentIds((prev) => new Set([...prev, userId]));
    }
  };

  const trimmedQuery = query.trim().replace(/^@/, "");
  const showResults = trimmedQuery.length >= 2;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-foreground">Find people</h2>
      <div className="relative max-w-sm">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm select-none">
          @
        </span>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="username"
          className="pl-7"
          spellCheck={false}
        />
        {searching ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </span>
        ) : null}
      </div>

      {!showResults ? (
        <p className="text-sm text-muted-foreground">
          Search by @username to find people
        </p>
      ) : results.length === 0 && !searching ? (
        <p className="text-sm text-muted-foreground">
          No users found matching &ldquo;@{trimmedQuery}&rdquo;
        </p>
      ) : (
        <ul className="max-w-sm divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-card/80">
          {results.map((user) => (
            <li key={user.id} className="flex items-center gap-3 px-4 py-3">
              <ProfileAvatar name={user.name} username={user.username} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.name ?? user.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{user.username}
                </p>
              </div>
              {sentIds.has(user.id) ? (
                <Badge
                  variant="outline"
                  className="shrink-0 border-wisk-teal/40 bg-wisk-teal/10 text-wisk-teal text-xs"
                >
                  <Check className="mr-1 size-3" />
                  Sent
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pendingIds.has(user.id)}
                  onClick={() => handleConnect(user.id)}
                  className="shrink-0 text-xs"
                >
                  {pendingIds.has(user.id) ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    "Connect"
                  )}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Pending requests section ─────────────────────────────────────────────────

function PendingRequestsSection({
  pending,
  onAccept,
  onDecline,
}: {
  pending: UserConnection[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  const handle = async (
    connectionId: string,
    action: "accept" | "decline"
  ) => {
    setProcessing((prev) => new Set([...prev, connectionId]));
    if (action === "accept") {
      await acceptConnection(connectionId);
      onAccept(connectionId);
    } else {
      await declineConnection(connectionId);
      onDecline(connectionId);
    }
    setProcessing((prev) => {
      const next = new Set(prev);
      next.delete(connectionId);
      return next;
    });
  };

  if (pending.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-foreground">Pending requests</h2>
        <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-xs">
          {pending.length}
        </Badge>
      </div>
      <ul className="max-w-lg divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-card/80">
        {pending.map((conn) => {
          const user = conn.other_user;
          const isPending = processing.has(conn.id);
          return (
            <li key={conn.id} className="flex items-center gap-3 px-4 py-3">
              <ProfileAvatar
                name={user?.name ?? null}
                username={user?.username ?? "?"}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.name ?? user?.username ?? "Unknown"}
                </p>
                {user?.username ? (
                  <p className="text-xs text-muted-foreground">
                    @{user.username}
                  </p>
                ) : null}
                <TimeAgoLabel iso={conn.created_at} />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => handle(conn.id, "accept")}
                  className="text-xs bg-wisk-teal/90 hover:bg-wisk-teal text-white"
                >
                  {isPending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    "Accept"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handle(conn.id, "decline")}
                  className="text-xs text-muted-foreground"
                >
                  <X className="size-3" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── Connections grid ─────────────────────────────────────────────────────────

function ConnectionsGrid({
  connections,
  onRemove,
}: {
  connections: UserConnection[];
  onRemove: (id: string) => void;
}) {
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const handleRemove = async (connectionId: string) => {
    setRemovingIds((prev) => new Set([...prev, connectionId]));
    await removeConnection(connectionId);
    onRemove(connectionId);
    setRemovingIds((prev) => {
      const next = new Set(prev);
      next.delete(connectionId);
      return next;
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-foreground">Your connections</h2>
        <Badge
          variant="outline"
          className="border-border text-muted-foreground text-xs"
        >
          {connections.length}
        </Badge>
      </div>

      {connections.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-indigo-500/10">
            <Users className="size-6 text-indigo-500" />
          </div>
          <p className="text-sm text-muted-foreground">
            No connections yet. Search for people above to get started.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((conn) => {
            const user = conn.other_user;
            return (
              <li
                key={conn.id}
                className="group relative flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 px-4 py-3"
              >
                <ProfileAvatar
                  name={user?.name ?? null}
                  username={user?.username ?? "?"}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.name ?? user?.username ?? "Unknown"}
                  </p>
                  {user?.username ? (
                    <p className="text-xs text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={removingIds.has(conn.id)}
                  onClick={() => handleRemove(conn.id)}
                  className="shrink-0 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Remove ${user?.username ?? "connection"}`}
                >
                  {removingIds.has(conn.id) ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    "Remove"
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ConnectionsPageClient({
  initialConnections,
  initialPending,
}: ConnectionsPageClientProps) {
  const [connections, setConnections] = useState(initialConnections);
  const [pending, setPending] = useState(initialPending);

  const handleAccept = (id: string) => {
    const conn = pending.find((c) => c.id === id);
    setPending((prev) => prev.filter((c) => c.id !== id));
    if (conn) {
      setConnections((prev) => [{ ...conn, status: "accepted" }, ...prev]);
    }
  };

  const handleDecline = (id: string) => {
    setPending((prev) => prev.filter((c) => c.id !== id));
  };

  const handleRemove = (id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <PageTransition>
      <div className="mb-8 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10">
          <UserCheck className="size-5 text-indigo-500" />
        </div>
        <div>
          <h1 className={PAGE_TITLE_CLASS}>Connections</h1>
          <p className={PAGE_SUBTITLE_CLASS}>
            Find and connect with other WISK users to collaborate on projects
            and tasks.
          </p>
        </div>
      </div>

      <div className="space-y-10">
        <SearchSection />

        {pending.length > 0 ? (
          <PendingRequestsSection
            pending={pending}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        ) : null}

        <ConnectionsGrid connections={connections} onRemove={handleRemove} />
      </div>
    </PageTransition>
  );
}
