"use client";

import { Loader2, Mail, Sparkles } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { addLeadActivity } from "@/app/(dashboard)/leads/actions";
import { Button } from "@/components/ui/button";
import {
  buildLeadEmailUrl,
  getDefaultEmailBody,
  getDefaultEmailSubject,
  wrapWinstonEmailBody,
} from "@/lib/leads/email";
import type { Lead } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

type LeadEmailActionsProps = {
  lead: Lead;
  canAccessWinston: boolean;
};

type EmailLogPromptProps = {
  onConfirm: () => void;
  onDismiss: () => void;
  isPending: boolean;
};

function EmailLogPrompt({ onConfirm, onDismiss, isPending }: EmailLogPromptProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 15000);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-xl border border-border/60 bg-card px-4 py-3 shadow-lg md:inset-x-auto md:right-6 md:bottom-6"
    >
      <p className="text-sm text-foreground">
        Did you send the email? Log it as an activity
      </p>
      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onConfirm}
          disabled={isPending}
          className="bg-gradient-to-r from-wisk-purple to-wisk-teal text-white hover:opacity-90"
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Yes, log it
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          disabled={isPending}
        >
          No thanks
        </Button>
      </div>
    </div>
  );
}

const emailButtonClass =
  "border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/10 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300";

export function LeadEmailActions({
  lead,
  canAccessWinston,
}: LeadEmailActionsProps) {
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [pendingSubject, setPendingSubject] = useState<string | null>(null);
  const [isLogging, startLogTransition] = useTransition();

  if (!lead.email) return null;

  const openMailto = (subject: string, body: string) => {
    window.location.href = buildLeadEmailUrl(lead, subject, body);
    setPendingSubject(subject);
  };

  const handleStandardEmail = () => {
    setDraftError(null);
    openMailto(getDefaultEmailSubject(lead), getDefaultEmailBody(lead));
  };

  const handleWinstonDraft = async () => {
    setDrafting(true);
    setDraftError(null);

    try {
      const response = await fetch("/api/winston/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });

      const data = (await response.json()) as {
        subject?: string;
        body?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not draft email");
      }

      if (!data.subject || !data.body) {
        throw new Error("No draft returned from Winston");
      }

      openMailto(data.subject, wrapWinstonEmailBody(lead, data.body));
    } catch (error) {
      setDraftError(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setDrafting(false);
    }
  };

  const handleLogActivity = () => {
    if (!pendingSubject) return;

    startLogTransition(async () => {
      const result = await addLeadActivity(lead.id, {
        activity_type: "email",
        title: `Email sent to ${lead.name}`,
        content: pendingSubject,
      });

      if (!result.success) {
        setDraftError(result.error);
        return;
      }

      setPendingSubject(null);
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(emailButtonClass)}
          onClick={handleStandardEmail}
        >
          <Mail className="size-3.5" aria-hidden />
          Email {lead.name}
        </Button>

        {canAccessWinston ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              emailButtonClass,
              "border-wisk-purple/30 text-wisk-purple hover:bg-wisk-purple/10"
            )}
            onClick={handleWinstonDraft}
            disabled={drafting}
          >
            {drafting ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-3.5" aria-hidden />
            )}
            Draft with Winston
          </Button>
        ) : null}
      </div>

      {draftError ? (
        <p className="text-xs text-destructive">{draftError}</p>
      ) : null}

      {pendingSubject ? (
        <EmailLogPrompt
          onConfirm={handleLogActivity}
          onDismiss={() => setPendingSubject(null)}
          isPending={isLogging}
        />
      ) : null}
    </>
  );
}
