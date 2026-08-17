"use client";

import { Mail } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { EmailList } from "@/components/email/email-list";
import { EmailReader } from "@/components/email/email-reader";
import {
  ManageInboxesPanel,
  type RulePrefill,
} from "@/components/email/manage-inboxes-panel";
import {
  applyEmailRules,
  emailMatchesRule,
} from "@/lib/email/categoriser";
import type { EmailCategory } from "@/lib/email/categoriser";
import { fingerprintActionItemEmails } from "@/lib/email/action-items-fingerprint";
import type {
  CustomInbox,
  Email,
  EmailActionItem,
  EmailProvider,
  EmailRule,
  EmailThread,
  InboxPageTokens,
  WinstonPicksResult,
} from "@/lib/email/types";
import { cn } from "@/lib/utils";

type ProviderFilter = "all" | EmailProvider;

type EmailPageClientProps = {
  connectedProviders: EmailProvider[];
  connectedAccountCount: number;
  initialCustomInboxes: CustomInbox[];
  initialEmailRules: EmailRule[];
};

type InboxResponse = {
  emails: EmailThread[];
  nextPageToken: InboxPageTokens;
  customInboxes?: CustomInbox[];
};

type OnceOverride = {
  category?: EmailCategory;
  customInboxId?: string | null;
};

function emailKey(email: EmailThread): string {
  return `${email.integrationId}:${email.id}`;
}

const ACTION_ITEMS_DEBOUNCE_MS = 400;

export function EmailPageClient({
  connectedProviders,
  connectedAccountCount,
  initialCustomInboxes,
  initialEmailRules,
}: EmailPageClientProps) {
  const [emails, setEmails] = useState<EmailThread[]>([]);
  const [customInboxes, setCustomInboxes] =
    useState<CustomInbox[]>(initialCustomInboxes);
  const [emailRules, setEmailRules] = useState<EmailRule[]>(initialEmailRules);
  const [onceOverrides, setOnceOverrides] = useState<Map<string, OnceOverride>>(
    new Map()
  );
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | null>(null);
  const [selectedEmailFull, setSelectedEmailFull] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  const [nextPageTokens, setNextPageTokens] = useState<InboxPageTokens>({
    gmail: null,
    outlook: null,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeProvider, setActiveProvider] = useState<ProviderFilter>("all");
  const [mobileShowReader, setMobileShowReader] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionItems, setActionItems] = useState<EmailActionItem[]>([]);
  const [managePanelOpen, setManagePanelOpen] = useState(false);
  const [rulePrefill, setRulePrefill] = useState<RulePrefill | null>(null);
  const [winstonPicks, setWinstonPicks] = useState<WinstonPicksResult | null>(
    null
  );
  const [isLoadingPicks, setIsLoadingPicks] = useState(false);

  const actionItemsFingerprintRef = useRef<string | null>(null);
  const actionItemsInFlightRef = useRef<string | null>(null);
  const actionItemsAbortRef = useRef<AbortController | null>(null);
  const actionItemsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const displayEmails = useMemo(() => {
    return emails.map((email) => {
      let thread = applyEmailRules(
        { ...email, customInboxId: null },
        emailRules,
        customInboxes
      );

      const override = onceOverrides.get(emailKey(email));
      if (override) {
        thread = { ...thread, ...override };
      }

      return thread;
    });
  }, [customInboxes, emailRules, emails, onceOverrides]);

  const selectedDisplayEmail = useMemo(() => {
    if (!selectedEmail) return null;
    return (
      displayEmails.find(
        (email) =>
          email.id === selectedEmail.id &&
          email.integrationId === selectedEmail.integrationId
      ) ?? selectedEmail
    );
  }, [displayEmails, selectedEmail]);

  const hasMore = useMemo(() => {
    if (activeProvider === "gmail") return Boolean(nextPageTokens.gmail);
    if (activeProvider === "outlook") return Boolean(nextPageTokens.outlook);
    return Boolean(nextPageTokens.gmail || nextPageTokens.outlook);
  }, [activeProvider, nextPageTokens]);

  const fetchInbox = useCallback(
    async (options?: {
      append?: boolean;
      pageTokens?: InboxPageTokens;
      search?: string;
      provider?: ProviderFilter;
    }) => {
      const provider = options?.provider ?? activeProvider;
      const search = options?.search ?? searchQuery;
      const pageTokens = options?.pageTokens ?? {
        gmail: null,
        outlook: null,
      };

      const params = new URLSearchParams({
        provider,
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (pageTokens.gmail) {
        params.set("gmailPageToken", pageTokens.gmail);
      }

      if (pageTokens.outlook) {
        params.set("outlookPageToken", pageTokens.outlook);
      }

      const response = await fetch(`/api/email/inbox?${params.toString()}`);
      const data = (await response.json()) as InboxResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load inbox");
      }

      return data;
    },
    [activeProvider, searchQuery]
  );

  const requestActionItems = useCallback((inboxEmails: EmailThread[]) => {
    const unreadRecent = inboxEmails
      .filter((email) => !email.isRead)
      .slice(0, 10);

    if (actionItemsDebounceRef.current) {
      clearTimeout(actionItemsDebounceRef.current);
      actionItemsDebounceRef.current = null;
    }

    if (unreadRecent.length === 0) {
      actionItemsAbortRef.current?.abort();
      actionItemsAbortRef.current = null;
      actionItemsInFlightRef.current = null;
      actionItemsFingerprintRef.current = "";
      setActionItems([]);
      return;
    }

    const fingerprint = fingerprintActionItemEmails(unreadRecent);

    // Same unread set already loaded or currently fetching — skip.
    if (
      fingerprint === actionItemsFingerprintRef.current ||
      fingerprint === actionItemsInFlightRef.current
    ) {
      return;
    }

    actionItemsDebounceRef.current = setTimeout(() => {
      actionItemsDebounceRef.current = null;

      // Re-check after debounce in case a newer request superseded this one.
      if (
        fingerprint === actionItemsFingerprintRef.current ||
        fingerprint === actionItemsInFlightRef.current
      ) {
        return;
      }

      actionItemsAbortRef.current?.abort();
      const controller = new AbortController();
      actionItemsAbortRef.current = controller;
      actionItemsInFlightRef.current = fingerprint;

      void fetch("/api/email/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: unreadRecent }),
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json()) as {
            actionItems?: EmailActionItem[];
          };
          if (!response.ok) {
            throw new Error("action-items request failed");
          }
          if (controller.signal.aborted) return;
          actionItemsFingerprintRef.current = fingerprint;
          setActionItems(payload.actionItems ?? []);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          setActionItems([]);
        })
        .finally(() => {
          if (actionItemsInFlightRef.current === fingerprint) {
            actionItemsInFlightRef.current = null;
          }
        });
    }, ACTION_ITEMS_DEBOUNCE_MS);
  }, []);

  const loadInbox = useCallback(
    async (provider: ProviderFilter, search: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchInbox({
          provider,
          search,
          pageTokens: { gmail: null, outlook: null },
        });

        setEmails(data.emails);
        if (data.customInboxes) {
          setCustomInboxes(data.customInboxes);
        }
        setNextPageTokens(data.nextPageToken);
        setOnceOverrides(new Map());
        setSelectedEmail(null);
        setSelectedEmailFull(null);
        setMobileShowReader(false);

        requestActionItems(data.emails);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load inbox"
        );
        setEmails([]);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchInbox, requestActionItems]
  );

  useEffect(() => {
    if (connectedProviders.length === 1) {
      setActiveProvider(connectedProviders[0]);
    }
  }, [connectedProviders]);

  useEffect(() => {
    if (connectedProviders.length === 0) {
      setIsLoading(false);
      return;
    }

    void loadInbox(activeProvider, searchQuery);
  }, [activeProvider, connectedProviders.length, loadInbox, searchQuery]);

  useEffect(() => {
    return () => {
      if (actionItemsDebounceRef.current) {
        clearTimeout(actionItemsDebounceRef.current);
      }
      actionItemsAbortRef.current?.abort();
    };
  }, []);

  const fetchWinstonPicks = useCallback(async (regenerate = false) => {
    setIsLoadingPicks(true);

    try {
      const url = regenerate
        ? "/api/email/winston-picks?regenerate=true"
        : "/api/email/winston-picks";
      const response = await fetch(url);
      const data = (await response.json()) as WinstonPicksResult & {
        outsideWindow?: boolean;
        disabled?: boolean;
        error?: string;
      };

      if (!response.ok || data.outsideWindow || data.disabled) {
        setWinstonPicks(null);
        return;
      }

      setWinstonPicks(data);
    } catch {
      setWinstonPicks(null);
    } finally {
      setIsLoadingPicks(false);
    }
  }, []);

  useEffect(() => {
    if (connectedProviders.length === 0) return;
    void fetchWinstonPicks();
  }, [connectedProviders.length, fetchWinstonPicks]);

  const handleSelectEmail = useCallback(async (email: EmailThread) => {
    setSelectedEmail(email);
    setSelectedEmailFull(null);
    setMobileShowReader(true);
    setIsLoadingMessage(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/email/message/${email.id}?provider=${email.provider}&integrationId=${email.integrationId}`
      );
      const data = (await response.json()) as Email & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load email");
      }

      setSelectedEmailFull(data);
    } catch (messageError) {
      setError(
        messageError instanceof Error
          ? messageError.message
          : "Could not load email"
      );
    } finally {
      setIsLoadingMessage(false);
    }
  }, []);

  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true);
    setError(null);

    try {
      const data = await fetchInbox({
        append: true,
        provider: activeProvider,
        search: searchQuery,
        pageTokens: nextPageTokens,
      });

      setEmails((current) => {
        const merged = new Map<string, EmailThread>();
        for (const email of [...current, ...data.emails]) {
          merged.set(emailKey(email), email);
        }
        return Array.from(merged.values()).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      });
      setNextPageTokens(data.nextPageToken);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load more emails"
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeProvider, fetchInbox, nextPageTokens, searchQuery]);

  const handleMobileBack = useCallback(() => {
    setMobileShowReader(false);
  }, []);

  const handleAssignEmail = useCallback(
    (
      email: EmailThread,
      assignment: {
        targetType: "custom_inbox" | "default_category";
        targetId: string;
      }
    ) => {
      setOnceOverrides((current) => {
        const next = new Map(current);
        const key = emailKey(email);

        if (assignment.targetType === "custom_inbox") {
          next.set(key, { customInboxId: assignment.targetId });
        } else {
          next.set(key, {
            category: assignment.targetId as EmailCategory,
            customInboxId: null,
          });
        }

        return next;
      });
    },
    []
  );

  const handleCreateRuleForSender = useCallback((email: EmailThread) => {
    setRulePrefill({
      ruleType: "sender",
      value: email.from.email,
    });
    setManagePanelOpen(true);
  }, []);

  const handleApplyAlwaysRuleToExisting = useCallback(
    (rule: EmailRule) => {
      if (rule.apply_type !== "always") return;

      setOnceOverrides((current) => {
        const next = new Map(current);
        for (const email of emails) {
          if (!emailMatchesRule(email, rule)) continue;
          next.delete(emailKey(email));
        }
        return next;
      });
    },
    [emails]
  );

  return (
    <PageTransition>
      <div className="mb-4 md:mb-6">
        <PageHeader
          className="mb-0"
          title="Email"
          subtitle="Read Gmail and Outlook in one unified inbox."
          icon={<Mail className="size-6 text-wisk-section-email" />}
          accent="email"
        />
      </div>

      {error ? (
        <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="relative flex min-h-[calc(100dvh-12rem)] flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40 md:h-[calc(100dvh-11rem)] md:min-h-0 md:flex-row">
        <aside
          className={cn(
            "min-h-0 border-border/60 md:w-[320px] md:shrink-0 md:border-r",
            mobileShowReader
              ? "hidden md:flex md:flex-col"
              : "flex min-h-0 flex-1 flex-col md:flex-none"
          )}
        >
          <EmailList
            emails={displayEmails}
            customInboxes={customInboxes}
            selectedEmailId={selectedEmail?.id ?? null}
            connectedProviders={connectedProviders}
            connectedAccountCount={connectedAccountCount}
            activeProvider={activeProvider}
            searchQuery={searchQuery}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            actionItems={actionItems}
            onSelectEmail={handleSelectEmail}
            onProviderChange={setActiveProvider}
            onSearchChange={setSearchQuery}
            onLoadMore={handleLoadMore}
            onOpenManagePanel={() => setManagePanelOpen(true)}
            onAssignEmail={handleAssignEmail}
            onCreateRuleForSender={handleCreateRuleForSender}
            winstonPicks={winstonPicks}
            isLoadingPicks={isLoadingPicks}
            onRegeneratePicks={() => void fetchWinstonPicks(true)}
          />
        </aside>

        <section
          className={cn(
            "min-h-0 flex-1 bg-card/80",
            mobileShowReader ? "flex flex-col" : "hidden md:flex md:flex-col"
          )}
        >
          <EmailReader
            email={selectedEmailFull}
            thread={selectedDisplayEmail}
            isLoading={isLoadingMessage}
            onBack={handleMobileBack}
            showBackButton={mobileShowReader}
          />
        </section>

        <ManageInboxesPanel
          open={managePanelOpen}
          onClose={() => setManagePanelOpen(false)}
          customInboxes={customInboxes}
          emailRules={emailRules}
          onCustomInboxesChange={setCustomInboxes}
          onEmailRulesChange={setEmailRules}
          onApplyAlwaysRuleToExisting={handleApplyAlwaysRuleToExisting}
          rulePrefill={rulePrefill}
          onRulePrefillConsumed={() => setRulePrefill(null)}
        />
      </div>
    </PageTransition>
  );
}
