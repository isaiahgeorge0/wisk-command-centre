"use client";

import { ArrowLeft, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { WinstonDraftPanel } from "@/components/email/winston-draft-panel";
import { sanitizeEmailHtml } from "@/lib/email/utils";
import type { Email, EmailProvider, EmailThread } from "@/lib/email/types";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

type EmailReaderProps = {
  email: Email | null;
  thread: EmailThread | null;
  isLoading: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
};

function ReaderSkeleton() {
  return (
    <div className="space-y-4 px-6 py-6">
      <div className="h-8 w-2/3 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-1/3 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
      <div className="mt-6 space-y-3">
        <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}

function ProviderBadge({ provider }: { provider: EmailProvider }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        provider === "gmail"
          ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
          : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
      )}
    >
      {provider === "gmail" ? "Gmail" : "Outlook"}
    </span>
  );
}

export function EmailReader({
  email,
  thread,
  isLoading,
  showBackButton = false,
  onBack,
}: EmailReaderProps) {
  const [draftOpen, setDraftOpen] = useState(false);

  const renderedBody = useMemo(() => {
    if (!email?.body) return "";

    const looksLikeHtml = /<[a-z][\s\S]*>/i.test(email.body);
    if (!looksLikeHtml) return null;

    return sanitizeEmailHtml(email.body);
  }, [email?.body]);

  if (!email && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="text-sm text-muted-foreground">Select an email to read it</p>
      </div>
    );
  }

  if (isLoading) {
    return <ReaderSkeleton />;
  }

  if (!email) {
    return null;
  }

  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(email.date));

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 md:hidden">
        {showBackButton ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11 shrink-0"
            onClick={onBack}
            aria-label="Back to inbox"
          >
            <ArrowLeft className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <ProviderBadge provider={email.provider} />
          {thread ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setDraftOpen(true)}
              className="gap-1.5 bg-gradient-to-r from-wisk-purple to-wisk-teal text-white hover:opacity-90"
            >
              <Sparkles className="size-3.5" aria-hidden />
              Ask Winston
            </Button>
          ) : null}
        </div>

        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {email.subject}
        </h2>

        <div className="mt-4 space-y-2 border-b border-border/60 pb-4 text-sm">
          <div className="flex flex-wrap gap-x-2">
            <span className="font-medium text-muted-foreground">From</span>
            <span className="text-foreground">
              {email.from.name} &lt;{email.from.email}&gt;
            </span>
          </div>
          {email.to.length > 0 ? (
            <div className="flex flex-wrap gap-x-2">
              <span className="font-medium text-muted-foreground">To</span>
              <span className="text-foreground">
                {email.to
                  .map((recipient) => `${recipient.name} <${recipient.email}>`)
                  .join(", ")}
              </span>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-x-2">
            <span className="font-medium text-muted-foreground">Date</span>
            <span className="text-foreground">{formattedDate}</span>
          </div>
        </div>

        <div className="mt-5 text-sm leading-relaxed text-foreground">
          {renderedBody ? (
            <div
              className="prose-email [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_p]:my-3"
              dangerouslySetInnerHTML={{ __html: renderedBody }}
            />
          ) : (
            <div className="whitespace-pre-wrap">{email.body}</div>
          )}
        </div>
      </div>

      {thread ? (
        <WinstonDraftPanel
          email={email}
          thread={thread}
          open={draftOpen}
          onClose={() => setDraftOpen(false)}
        />
      ) : null}
    </div>
  );
}
