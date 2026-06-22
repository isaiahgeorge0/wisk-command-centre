"use client";

import { Mail } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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
import type {
  CustomInbox,
  Email,
  EmailActionItem,
  EmailProvider,
  EmailRule,
  EmailThread,
  InboxPageTokens,
} from "@/lib/email/types";
import { cn } from "@/lib/utils";

const EMAIL_ACCENT = "#3b82f6";

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

        const unreadRecent = data.emails
          .filter((email) => !email.isRead)
          .slice(0, 10);

        if (unreadRecent.length > 0) {
          void fetch("/api/email/action-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emails: unreadRecent }),
          })
            .then(async (response) => {
              const payload = (await response.json()) as {
                actionItems?: EmailActionItem[];
              };
              if (response.ok && payload.actionItems) {
                setActionItems(payload.actionItems);
              }
            })
            .catch(() => {
              setActionItems([]);
            });
        } else {
          setActionItems([]);
        }
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
    [fetchInbox]
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
          icon={<Mail className="size-6" style={{ color: EMAIL_ACCENT }} />}
          accentColour={EMAIL_ACCENT}
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
