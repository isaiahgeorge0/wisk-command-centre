"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Mail, Search, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOTION_EASE } from "@/lib/motion/config";
import { formatEmailRelativeTime } from "@/lib/email/utils";
import type { EmailActionItem, EmailCategory, EmailProvider, EmailThread } from "@/lib/email/types";
import { cn } from "@/lib/utils";

type ProviderFilter = "all" | EmailProvider;
type CategoryFilter = "all" | EmailCategory;

type EmailListProps = {
  emails: EmailThread[];
  selectedEmailId: string | null;
  connectedProviders: EmailProvider[];
  connectedAccountCount: number;
  activeProvider: ProviderFilter;
  searchQuery: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  actionItems: EmailActionItem[];
  onSelectEmail: (email: EmailThread) => void;
  onProviderChange: (provider: ProviderFilter) => void;
  onSearchChange: (query: string) => void;
  onLoadMore: () => void;
};

const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "leads", label: "Leads" },
  { id: "clients", label: "Clients" },
  { id: "admin", label: "Admin" },
  { id: "newsletters", label: "Newsletters" },
  { id: "other", label: "Other" },
];

function ListSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border/40 p-3">
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function ProviderBadge({
  email,
  show,
}: {
  email: EmailThread;
  show: boolean;
}) {
  if (!show) return null;

  const label =
    email.accountLabel?.trim() ||
    email.accountEmail ||
    (email.provider === "gmail" ? "Gmail" : "Outlook");

  return (
    <span
      className={cn(
        "max-w-[140px] truncate rounded-full px-2 py-0.5 text-[10px] font-medium",
        email.provider === "gmail"
          ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
          : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
      )}
      title={label}
    >
      {label}
    </span>
  );
}

function ActionIndicator({
  actionItem,
}: {
  actionItem: EmailActionItem | undefined;
}) {
  if (!actionItem) return null;

  const colourClass =
    actionItem.urgency === "high"
      ? "bg-wisk-coral"
      : actionItem.urgency === "medium"
        ? "bg-amber-500"
        : "bg-muted-foreground";

  return (
    <span
      className={cn("mt-1.5 size-2 shrink-0 rounded-full", colourClass)}
      title={actionItem.action}
      aria-label={actionItem.action}
    />
  );
}

function RelativeTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(formatEmailRelativeTime(iso));
  }, [iso]);

  return <span>{label ?? "\u00a0"}</span>;
}

export function EmailList({
  emails,
  selectedEmailId,
  connectedProviders,
  connectedAccountCount,
  activeProvider,
  searchQuery,
  isLoading,
  isLoadingMore,
  hasMore,
  actionItems,
  onSelectEmail,
  onProviderChange,
  onSearchChange,
  onLoadMore,
}: EmailListProps) {
  const reduced = useReducedMotion() ?? false;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const showProviderBadges = connectedAccountCount > 1;
  const showProviderTabs = connectedProviders.length > 1;

  const actionItemMap = useMemo(
    () => new Map(actionItems.map((item) => [item.emailId, item])),
    [actionItems]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      all: emails.length,
      leads: 0,
      clients: 0,
      admin: 0,
      newsletters: 0,
      other: 0,
    };

    for (const email of emails) {
      counts[email.category] += 1;
    }

    return counts;
  }, [emails]);

  const visibleEmails = useMemo(() => {
    if (activeCategory === "all") return emails;
    return emails.filter((email) => email.category === activeCategory);
  }, [activeCategory, emails]);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchInput = (value: string) => {
    setLocalSearch(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 500);
  };

  if (connectedProviders.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
        <Mail className="mb-4 size-10 text-muted-foreground" />
        <h2 className="text-lg font-medium text-foreground">No email connected</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Connect Gmail or Outlook in Settings to start reading your inbox here.
        </p>
        <Link href="/settings?tab=integrations" className="mt-6">
          <Button size="sm">Go to Settings</Button>
        </Link>
      </div>
    );
  }

  const providerTabs: { id: ProviderFilter; label: string }[] = [
    ...(showProviderTabs ? [{ id: "all" as const, label: "All" }] : []),
    ...(connectedProviders.includes("gmail")
      ? [{ id: "gmail" as const, label: "Gmail" }]
      : []),
    ...(connectedProviders.includes("outlook")
      ? [{ id: "outlook" as const, label: "Outlook" }]
      : []),
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-border/60 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(event) => handleSearchInput(event.target.value)}
            placeholder="Search emails"
            className="min-h-11 pl-9"
          />
        </div>

        {showProviderTabs ? (
          <div className="flex flex-wrap gap-1">
            {providerTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onProviderChange(tab.id)}
                className={cn(
                  "min-h-11 rounded-md px-3 text-xs font-medium transition-colors md:min-h-8",
                  activeProvider === tab.id
                    ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors md:min-h-8",
                activeCategory === tab.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {categoryCounts[tab.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : visibleEmails.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <Mail className="mb-4 size-10 text-muted-foreground" />
          <h2 className="text-lg font-medium text-foreground">No emails found</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {searchQuery.trim()
              ? "Try a different search term or clear the search."
              : activeCategory === "all"
                ? "Your inbox is empty or no messages matched the selected provider."
                : "No emails in this category."}
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {visibleEmails.map((email, index) => {
              const selected = email.id === selectedEmailId;
              const actionItem = actionItemMap.get(email.id);

              return (
                <motion.li
                  key={`${email.integrationId}:${email.id}`}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: 0.3,
                    delay: reduced ? 0 : index * 0.04,
                    ease: MOTION_EASE.easeOut,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectEmail(email)}
                    className={cn(
                      "w-full rounded-lg border border-transparent px-3 py-3 text-left transition-colors",
                      selected
                        ? "border-blue-500/30 bg-blue-500/10"
                        : "hover:bg-muted/50",
                      email.category === "leads" &&
                        "border-l-2 border-l-teal-500/60"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {actionItem ? (
                        <ActionIndicator actionItem={actionItem} />
                      ) : !email.isRead ? (
                        <span
                          className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500"
                          aria-hidden
                        />
                      ) : (
                        <span className="mt-1.5 size-2 shrink-0" aria-hidden />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <p
                              className={cn(
                                "truncate text-sm",
                                email.isRead
                                  ? "font-medium text-foreground"
                                  : "font-semibold text-foreground"
                              )}
                            >
                              {email.from.name}
                            </p>
                            {email.isFromKnownContact ? (
                              <span
                                className="inline-flex items-center gap-0.5 rounded-full bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 dark:text-teal-300"
                                title="Known contact"
                              >
                                <User className="size-2.5" aria-hidden />
                                <span className="hidden sm:inline">Known</span>
                              </span>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            <RelativeTime iso={email.date} />
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <p
                            className={cn(
                              "min-w-0 flex-1 truncate text-sm",
                              email.isRead
                                ? "text-foreground/80"
                                : "font-medium text-foreground"
                            )}
                          >
                            {email.subject}
                          </p>
                          <ProviderBadge
                            email={email}
                            show={showProviderBadges}
                          />
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {email.preview}
                        </p>
                      </div>
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </ul>

          {hasMore ? (
            <div className="p-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isLoadingMore}
                onClick={onLoadMore}
              >
                {isLoadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
