"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Copy,
  ExternalLink,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { buildProviderComposeUrl } from "@/lib/email/compose-urls";
import type { DraftTone, Email, EmailThread, WinstonDraft } from "@/lib/email/types";
import { cn } from "@/lib/utils";

type WinstonDraftPanelProps = {
  email: Email;
  thread: EmailThread;
  open: boolean;
  onClose: () => void;
  preGeneratedDraft?: WinstonDraft | null;
};

const TONES: { id: DraftTone; label: string }[] = [
  { id: "professional", label: "Professional" },
  { id: "friendly", label: "Friendly" },
  { id: "casual", label: "Casual" },
];

function buildComposeBody(draft: WinstonDraft): string {
  if (!draft.signaturePlain?.trim()) return draft.body;
  return `${draft.body}\n\n--\n${draft.signaturePlain.trim()}`;
}

export function WinstonDraftPanel({
  email,
  thread,
  open,
  onClose,
  preGeneratedDraft = null,
}: WinstonDraftPanelProps) {
  const [tone, setTone] = useState<DraftTone>(
    preGeneratedDraft?.tone ?? "professional"
  );
  const [draft, setDraft] = useState<WinstonDraft | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateDraft = useCallback(
    async (selectedTone: DraftTone) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/email/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailId: thread.id,
            integrationId: thread.integrationId,
            provider: thread.provider,
            tone: selectedTone,
          }),
        });

        const data = (await response.json()) as {
          draft?: WinstonDraft;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Could not generate draft");
        }

        if (!data.draft) {
          throw new Error("No draft returned");
        }

        setDraft(data.draft);
      } catch (draftError) {
        setError(
          draftError instanceof Error
            ? draftError.message
            : "Could not generate draft"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [thread.id, thread.integrationId, thread.provider]
  );

  useEffect(() => {
    if (!open) return;
    setCopied(false);

    if (preGeneratedDraft && tone === preGeneratedDraft.tone) {
      setDraft(preGeneratedDraft);
      setError(null);
      setIsLoading(false);
      return;
    }

    setDraft(null);
    void generateDraft(tone);
  }, [open, preGeneratedDraft, generateDraft, tone]);

  useEffect(() => {
    if (open && preGeneratedDraft) {
      setTone(preGeneratedDraft.tone);
    }
  }, [open, preGeneratedDraft]);

  const handleToneChange = (nextTone: DraftTone) => {
    if (nextTone === tone) return;
    setTone(nextTone);
  };

  const handleCopy = async () => {
    if (!draft?.body) return;
    const text = buildComposeBody(draft);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const composeUrl =
    draft &&
    buildProviderComposeUrl({
      provider: draft.provider,
      toEmail: email.from.email,
      subject: email.subject,
      body: buildComposeBody(draft),
    });

  const openLabel =
    draft?.provider === "gmail" ? "Open in Gmail" : "Open in Outlook";

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close Winston draft panel"
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className={cn(
              "z-50 flex min-h-0 flex-col border-border/60 bg-card/95 backdrop-blur",
              "fixed inset-y-0 right-0 w-full max-w-md border-l shadow-xl",
              "md:absolute md:inset-y-0 md:right-0 md:w-[360px]"
            )}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-wisk-lime">
                  <Sparkles className="size-4 text-white" aria-hidden />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Ask Winston
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Draft a reply in your chosen tone
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="border-b border-border/60 px-4 py-3">
              <div className="flex flex-wrap gap-1">
                {TONES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleToneChange(option.id)}
                    disabled={isLoading}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      tone === option.id
                        ? "bg-gradient-to-r from-wisk-lime/20 to-wisk-turquoise/20 text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Sparkles
                    className="mb-3 size-8 animate-pulse text-wisk-lime"
                    aria-hidden
                  />
                  <p className="text-sm text-muted-foreground">
                    Winston is drafting your reply…
                  </p>
                </div>
              ) : error ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : draft ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Draft
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {draft.body}
                    </p>
                  </div>
                  {draft.signature ? (
                    <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                      <div className="mb-2 border-b border-border/40 pb-2">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Signature
                        </p>
                      </div>
                      <div
                        className="prose-email text-sm leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: draft.signature }}
                      />
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleCopy}
                  >
                    <Copy className="size-3.5" aria-hidden />
                    {copied ? "Copied" : "Copy to clipboard"}
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="space-y-2 border-t border-border/60 p-4">
              <Button
                type="button"
                className="w-full gap-1.5 bg-wisk-lime text-wisk-dark hover:opacity-90"
                disabled={!composeUrl || isLoading}
                onClick={() => {
                  if (composeUrl) window.open(composeUrl, "_blank", "noopener");
                }}
              >
                <ExternalLink className="size-3.5" aria-hidden />
                {openLabel}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isLoading}
                onClick={() => void generateDraft(tone)}
              >
                {isLoading ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : null}
                Regenerate
              </Button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
