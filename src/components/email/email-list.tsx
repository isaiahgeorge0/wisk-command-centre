"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, FolderInput, Mail, Search, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ManageInboxesButton } from "@/components/email/manage-inboxes-panel";
import { WinstonDraftPanel } from "@/components/email/winston-draft-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { EmailCategory } from "@/lib/email/categoriser";
import { emailWindowLabel } from "@/lib/email/uk-window";
import { MOTION_EASE } from "@/lib/motion/config";
import { formatEmailRelativeTime } from "@/lib/email/utils";
import type {
  CustomInbox,
  Email,
  EmailActionItem,
  EmailProvider,
  EmailThread,
  WinstonPick,
  WinstonPicksResult,
} from "@/lib/email/types";
import { cn } from "@/lib/utils";

type ProviderFilter = "all" | EmailProvider;
type CategoryFilter = "all" | EmailCategory;
type TabFilter =
  | { kind: "all" }
  | { kind: "category"; id: CategoryFilter }
  | { kind: "custom_inbox"; id: string };

type EmailListProps = {
  emails: EmailThread[];
  customInboxes: CustomInbox[];
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
  onOpenManagePanel: () => void;
  onAssignEmail: (
    email: EmailThread,
    assignment: {
      targetType: "custom_inbox" | "default_category";
      targetId: string;
    }
  ) => void;
  onCreateRuleForSender: (email: EmailThread) => void;
  winstonPicks: WinstonPicksResult | null;
  isLoadingPicks: boolean;
  onRegeneratePicks: () => void;
};

const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "leads", label: "Leads" },
  { id: "clients", label: "Clients" },
  { id: "admin", label: "Admin" },
  { id: "newsletters", label: "Newsletters" },
  { id: "other", label: "Other" },
];

const MOVE_TARGETS: { id: EmailCategory; label: string }[] = [
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

function pickToEmail(pick: WinstonPick): Email {
  return {
    id: pick.emailId,
    provider: pick.provider,
    threadId: pick.emailId,
    subject: pick.subject,
    from: { name: pick.fromName, email: pick.fromEmail },
    to: [],
    date: new Date().toISOString(),
    preview: "",
    body: pick.draft.body,
    isRead: false,
    isStarred: false,
    labels: [],
  };
}

function pickToThread(pick: WinstonPick): EmailThread {
  return {
    id: pick.emailId,
    provider: pick.provider,
    subject: pick.subject,
    from: { name: pick.fromName, email: pick.fromEmail },
    date: new Date().toISOString(),
    preview: "",
    isRead: false,
    messageCount: 1,
    accountEmail: pick.draft.accountEmail,
    accountLabel: pick.accountLabel,
    integrationId: pick.integrationId,
    category: "other",
    customInboxId: null,
    isFromKnownContact: false,
    linkedLeadId: null,
    linkedLeadName: null,
  };
}

function WinstonPicksSection({
  winstonPicks,
  isLoading,
  onRegeneratePicks,
}: {
  winstonPicks: WinstonPicksResult | null;
  isLoading: boolean;
  onRegeneratePicks: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const [expanded, setExpanded] = useState(false);
  const [selectedPick, setSelectedPick] = useState<WinstonPick | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const showSection =
    isLoading || (winstonPicks !== null && winstonPicks.picks.length > 0);

  useEffect(() => {
    if (!isLoading) {
      setIsRegenerating(false);
    }
  }, [isLoading, winstonPicks]);

  if (!showSection) return null;

  const pickCount = winstonPicks?.picks.length ?? 0;
  const windowLabel = winstonPicks
    ? emailWindowLabel(winstonPicks.window)
    : "Winston's picks";

  const handleRegenerate = () => {
    setIsRegenerating(true);
    onRegeneratePicks();
  };

  return (
    <>
      <div className="border-b border-border/60 px-3 pt-3 pb-2">
        <div className="overflow-hidden rounded-lg border border-border/60 border-l-[3px] border-l-wisk-lime bg-wisk-lime/10">
          <button
            type="button"
            onClick={() => {
              if (!isLoading) setExpanded((current) => !current);
            }}
            className="flex min-h-11 w-full items-center gap-2 px-3 py-2.5 text-left"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-wisk-lime">
              <Sparkles className="size-3.5 text-white" aria-hidden />
            </div>

            {isLoading ? (
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted/70" />
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Winston&apos;s picks
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {windowLabel}
                  </span>
                  <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {pickCount}
                  </span>
                </div>
              </div>
            )}

            {!isLoading ? (
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  expanded && "rotate-180"
                )}
                aria-hidden
              />
            ) : null}
          </button>

          <AnimatePresence initial={false}>
            {expanded && !isLoading && winstonPicks ? (
              <motion.div
                initial={reduced ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reduced ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.25, ease: MOTION_EASE.easeOut }}
                className="overflow-hidden"
              >
                <ul className="space-y-2 border-t border-border/40 px-3 py-3">
                  {winstonPicks.picks.map((pick) => (
                    <li
                      key={`${pick.integrationId}:${pick.emailId}`}
                      className="rounded-lg border border-border/50 bg-background/60 px-3 py-2.5"
                    >
                      <p className="truncate text-sm font-medium text-foreground">
                        {pick.fromName}
                      </p>
                      <p className="truncate text-xs text-foreground/80">
                        {pick.subject}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {pick.priorityReason}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 h-8 min-h-8 gap-1 text-xs"
                        onClick={() => {
                          setSelectedPick(pick);
                          setDraftOpen(true);
                        }}
                      >
                        <Sparkles className="size-3" aria-hidden />
                        View draft
                      </Button>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-border/40 px-3 py-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 min-h-9 w-full text-xs"
                    disabled={isLoading || isRegenerating}
                    onClick={handleRegenerate}
                  >
                    {isRegenerating ? "Regenerating…" : "Regenerate"}
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {selectedPick ? (
        <WinstonDraftPanel
          email={pickToEmail(selectedPick)}
          thread={pickToThread(selectedPick)}
          open={draftOpen}
          onClose={() => {
            setDraftOpen(false);
            setSelectedPick(null);
          }}
          preGeneratedDraft={selectedPick.draft}
        />
      ) : null}
    </>
  );
}

function MoveEmailPopover({
  email,
  customInboxes,
  onAssignEmail,
  onCreateRuleForSender,
}: {
  email: EmailThread;
  customInboxes: CustomInbox[];
  onAssignEmail: EmailListProps["onAssignEmail"];
  onCreateRuleForSender: EmailListProps["onCreateRuleForSender"];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:min-h-8 md:min-w-8",
          "opacity-100 md:opacity-0 md:group-hover/email-row:opacity-100"
        )}
        aria-label="Move email"
        onClick={(event) => event.stopPropagation()}
      >
        <FolderInput className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-0">
        <p className="border-b border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground">
          Move to:
        </p>
        <div className="max-h-64 overflow-y-auto p-1">
          {MOVE_TARGETS.map((target) => (
            <button
              key={target.id}
              type="button"
              className="flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm hover:bg-muted"
              onClick={() => {
                onAssignEmail(email, {
                  targetType: "default_category",
                  targetId: target.id,
                });
                setOpen(false);
              }}
            >
              {target.label}
            </button>
          ))}
          {customInboxes.map((inbox) => (
            <button
              key={inbox.id}
              type="button"
              className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm hover:bg-muted"
              onClick={() => {
                onAssignEmail(email, {
                  targetType: "custom_inbox",
                  targetId: inbox.id,
                });
                setOpen(false);
              }}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: inbox.colour }}
                aria-hidden
              />
              {inbox.name}
            </button>
          ))}
        </div>
        <div className="border-t border-border/60 p-1">
          <button
            type="button"
            className="flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm text-primary hover:bg-muted"
            onClick={() => {
              onCreateRuleForSender(email);
              setOpen(false);
            }}
          >
            Create a rule for this sender
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function EmailList({
  emails,
  customInboxes,
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
  onOpenManagePanel,
  onAssignEmail,
  onCreateRuleForSender,
  winstonPicks,
  isLoadingPicks,
  onRegeneratePicks,
}: EmailListProps) {
  const reduced = useReducedMotion() ?? false;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [activeTab, setActiveTab] = useState<TabFilter>({ kind: "all" });
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
      if (email.customInboxId) continue;
      counts[email.category] += 1;
    }

    return counts;
  }, [emails]);

  const customInboxCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const inbox of customInboxes) {
      counts.set(inbox.id, 0);
    }
    for (const email of emails) {
      if (email.customInboxId && counts.has(email.customInboxId)) {
        counts.set(email.customInboxId, (counts.get(email.customInboxId) ?? 0) + 1);
      }
    }
    return counts;
  }, [customInboxes, emails]);

  const visibleEmails = useMemo(() => {
    if (activeTab.kind === "all") return emails;
    if (activeTab.kind === "custom_inbox") {
      return emails.filter((email) => email.customInboxId === activeTab.id);
    }
    if (activeTab.id === "all") return emails;
    return emails.filter(
      (email) => !email.customInboxId && email.category === activeTab.id
    );
  }, [activeTab, emails]);

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

  const emptyMessage =
    searchQuery.trim()
      ? "Try a different search term or clear the search."
      : activeTab.kind === "custom_inbox"
        ? "No emails in this inbox."
        : activeTab.kind === "category" && activeTab.id !== "all"
          ? "No emails in this category."
          : "Your inbox is empty or no messages matched the selected provider.";

  return (
    <div className="flex h-full flex-col">
      <WinstonPicksSection
        winstonPicks={winstonPicks}
        isLoading={isLoadingPicks}
        onRegeneratePicks={onRegeneratePicks}
      />

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

        <div className="flex flex-wrap items-center gap-1">
          {CATEGORY_TABS.map((tab) => {
            const selected =
              activeTab.kind === "category" && activeTab.id === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab({ kind: "category", id: tab.id })}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors md:min-h-8",
                  selected
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <span>{tab.label}</span>
                <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {categoryCounts[tab.id]}
                </span>
              </button>
            );
          })}

          {customInboxes.map((inbox) => {
            const selected =
              activeTab.kind === "custom_inbox" && activeTab.id === inbox.id;

            return (
              <button
                key={inbox.id}
                type="button"
                onClick={() =>
                  setActiveTab({ kind: "custom_inbox", id: inbox.id })
                }
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors md:min-h-8",
                  selected
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: inbox.colour }}
                  aria-hidden
                />
                <span>{inbox.name}</span>
                <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {customInboxCounts.get(inbox.id) ?? 0}
                </span>
              </button>
            );
          })}

          <ManageInboxesButton onClick={onOpenManagePanel} />
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : visibleEmails.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <Mail className="mb-4 size-10 text-muted-foreground" />
          <h2 className="text-lg font-medium text-foreground">No emails found</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{emptyMessage}</p>
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
                  <div
                    className={cn(
                      "group/email-row relative flex w-full items-stretch rounded-lg border border-transparent transition-colors",
                      selected
                        ? "border-blue-500/30 bg-blue-500/10"
                        : "hover:bg-muted/50",
                      email.category === "leads" &&
                        !email.customInboxId &&
                        "border-l-2 border-l-teal-500/60"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectEmail(email)}
                      className="min-w-0 flex-1 px-3 py-3 text-left"
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
                        <div className="min-w-0 flex-1 pr-8 md:pr-10">
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
                    <div className="absolute top-2 right-2">
                      <MoveEmailPopover
                        email={email}
                        customInboxes={customInboxes}
                        onAssignEmail={onAssignEmail}
                        onCreateRuleForSender={onCreateRuleForSender}
                      />
                    </div>
                  </div>
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
