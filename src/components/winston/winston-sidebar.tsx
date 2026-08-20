"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CalendarPlus,
  FilePlus,
  Loader2,
  Lock,
  NotebookPen,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  getFreeDailyChatUsage,
  getOrCreateNoteConversation,
  getOrCreateScopedConversation,
} from "@/app/(dashboard)/ai-digest/actions";
import {
  appendResearchFindingToLead,
  listLeadsForResearchNotes,
} from "@/app/(dashboard)/research/actions";
import { useIsMobilePanel } from "@/components/calendar/use-is-mobile-panel";
import { MobileSendCompose } from "@/components/layout/mobile-send-compose";
import { MobileSheetShell } from "@/components/layout/mobile-sheet-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WinstonProposalReview } from "@/components/winston/winston-proposal-review";
import { WinstonProposalSuccessToast } from "@/components/winston/proposal-success-toast";
import { WinstonQuickAdd } from "@/components/winston/winston-quick-add";
import { useWinstonSidebar } from "@/components/winston/winston-sidebar-context";
import { consumeWinstonChatSse } from "@/lib/ai/consume-chat-stream";
import { useChatScrollFollow } from "@/lib/ai/use-chat-scroll-follow";
import type { ConversationMessage } from "@/lib/ai/types";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import { useMotionSafe } from "@/lib/motion/use-motion-safe";
import {
  WINSTON_PROPOSAL_ENTITY_TYPES,
  type WinstonProposal,
  type WinstonProposalCommitResult,
} from "@/lib/winston/proposal";
import {
  resolveWinstonContext,
  type WinstonTrigger,
} from "@/lib/winston/context-resolver";
import { cn } from "@/lib/utils";

type SidebarTab = "quick-add" | "chat";

function PanelHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-4 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-wisk-section-winston text-wisk-section-winston-fg">
          <Sparkles className="size-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Close Winston"
        onClick={onClose}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

function Teaser({
  title,
  onClose,
  variant = "ai",
}: {
  title: string;
  onClose: () => void;
  variant?: "ai" | "research_pro";
}) {
  const isResearch = variant === "research_pro";
  return (
    <>
      <PanelHeader
        title={title}
        subtitle={
          isResearch
            ? "Available on WISK Research Pro"
            : "Available on WISK AI and AI Pro"
        }
        onClose={onClose}
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-wisk-section-winston/15">
          <Lock className="size-5 text-wisk-section-winston" aria-hidden />
        </div>
        <p className="text-sm font-medium text-foreground">
          {isResearch
            ? "Open research chat needs Research Pro"
            : "This surface needs WISK AI"}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {isResearch
            ? "Ask any market or competitor question and get a cited answer. Research Pro unlocks this thread."
            : "The global Winston button still works on the free tier, this section-level thread is part of the full product."}
        </p>
        <Link
          href={isResearch ? "/upgrade/research-pro" : "/upgrade/ai"}
          className="inline-flex h-8 items-center justify-center rounded-lg bg-wisk-section-winston px-3 text-[0.8rem] font-medium text-wisk-section-winston-fg transition-opacity hover:opacity-90"
        >
          {isResearch ? "Upgrade to Research Pro" : "View plans"}
        </Link>
      </div>
    </>
  );
}

function ChatPane({
  trigger,
  canAccessWinston,
  onClose,
}: {
  trigger: WinstonTrigger;
  canAccessWinston: boolean;
  onClose: () => void;
}) {
  const resolved = resolveWinstonContext(trigger);
  const router = useRouter();
  const reduced = useReducedMotion() ?? false;
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState<"monthly" | "daily" | null>(null);
  const [dailyUsed, setDailyUsed] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<WinstonProposal | null>(null);
  const [proposalSummary, setProposalSummary] = useState<string | null>(null);
  const [proposalCitations, setProposalCitations] = useState<string | null>(
    null
  );
  const [proposalToast, setProposalToast] =
    useState<WinstonProposalCommitResult | null>(null);
  const [insertedIds, setInsertedIds] = useState<Set<string>>(new Set());
  const [leadNoteMessage, setLeadNoteMessage] =
    useState<ConversationMessage | null>(null);
  const [leadOptions, setLeadOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [leadNoteError, setLeadNoteError] = useState<string | null>(null);
  const [isSavingLeadNote, setIsSavingLeadNote] = useState(false);
  const [leadNoteSaved, setLeadNoteSaved] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { scrollRef, stickToBottom } = useChatScrollFollow([
    messages,
    isSending,
  ]);
  const onInsertText =
    trigger.tier === "record" && trigger.entity === "note"
      ? trigger.onInsertText
      : undefined;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setMessages([]);
    setConversationId(null);
    setProposal(null);
    setProposalSummary(null);
    setProposalCitations(null);
    setScheduleError(null);
    setLeadNoteMessage(null);
    setLeadNoteError(null);
    setLeadNoteSaved(null);
    setLimitHit(null);
    setInsertedIds(new Set());
    stickToBottom();

    const load = resolved.noteId
      ? getOrCreateNoteConversation(resolved.noteId)
      : getOrCreateScopedConversation(resolved.scopeKey!);

    void load.then((result) => {
      if (cancelled) return;
      if (!result.success || !result.data) {
        setLoadError(result.success ? "Could not open Winston" : result.error);
        setLoading(false);
        return;
      }
      stickToBottom();
      setConversationId(result.data.conversation.id);
      setMessages(result.data.messages);
      setLoading(false);
    });

    if (!canAccessWinston) {
      void getFreeDailyChatUsage().then((result) => {
        if (cancelled || !result.success || !result.data) return;
        setDailyUsed(result.data.used);
        setDailyLimit(result.data.limit);
        if (result.data.used >= result.data.limit) setLimitHit("daily");
      });
    }

    return () => {
      cancelled = true;
    };
  }, [resolved.noteId, resolved.scopeKey, canAccessWinston, stickToBottom]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [input]);

  async function handleSchedule(message: ConversationMessage) {
    if (!conversationId || !message.content.trim() || schedulingId) return;
    setSchedulingId(message.id);
    setScheduleError(null);
    try {
      const res = await fetch(
        `/api/winston/conversations/${conversationId}/schedule`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageId: message.id.startsWith("optimistic-") ||
              message.id.startsWith("reply-")
              ? undefined
              : message.id,
            focusMessageContent: message.content,
          }),
        }
      );
      const data = (await res.json()) as {
        found?: boolean;
        message?: string | null;
        citations?: string | null;
        proposal?: WinstonProposal;
        error?: string;
      };
      if (!res.ok) {
        setScheduleError(data.error ?? "Could not build a proposal");
        return;
      }
      if (!data.found || !data.proposal) {
        setScheduleError(
          data.message ?? "Not enough detail yet. Keep chatting."
        );
        return;
      }
      setProposal(data.proposal);
      setProposalSummary(data.message ?? null);
      setProposalCitations(data.citations?.trim() || null);
    } catch {
      setScheduleError("Could not reach Winston. Please try again.");
    } finally {
      setSchedulingId(null);
    }
  }

  async function openLeadNotesDialog(message: ConversationMessage) {
    setLeadNoteMessage(message);
    setLeadNoteError(null);
    setLeadNoteSaved(null);
    setSelectedLeadId("");
    const result = await listLeadsForResearchNotes();
    if (!result.success || !result.data) {
      setLeadNoteError(result.success ? "Could not load leads" : result.error);
      setLeadOptions([]);
      return;
    }
    setLeadOptions(result.data);
  }

  async function handleAppendLeadNotes() {
    if (!leadNoteMessage || !selectedLeadId || isSavingLeadNote) return;
    setIsSavingLeadNote(true);
    setLeadNoteError(null);
    try {
      const result = await appendResearchFindingToLead({
        leadId: selectedLeadId,
        content: leadNoteMessage.content,
      });
      if (!result.success) {
        setLeadNoteError(result.error);
        return;
      }
      const leadName =
        leadOptions.find((lead) => lead.id === selectedLeadId)?.name ?? "lead";
      setLeadNoteSaved(`Added to ${leadName}'s notes`);
      setLeadNoteMessage(null);
      router.refresh();
    } finally {
      setIsSavingLeadNote(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending || limitHit || loading) return;

    setInput("");
    setSendError(null);
    setScheduleError(null);

    const optimisticMsg: ConversationMessage = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    const replyId = `reply-${Date.now()}`;
    setMessages((prev) => [...prev, optimisticMsg]);
    setIsSending(true);

    let replyStarted = false;
    let streamFailed = false;

    try {
      const res = await fetch("/api/winston/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId ?? undefined,
          noteId: resolved.noteId ?? undefined,
          scopeKey: resolved.scopeKey ?? undefined,
        }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/event-stream")) {
        const json = (await res.json()) as {
          error?: string;
          limitType?: "monthly" | "short_term" | "daily";
        };
        setSendError(json.error ?? "Something went wrong. Please try again.");
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        if (json.limitType === "monthly" || json.limitType === "daily") {
          setLimitHit(json.limitType);
        } else {
          setInput(text);
        }
        return;
      }

      if (!res.ok || !res.body) {
        setSendError("Something went wrong. Please try again.");
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        setInput(text);
        return;
      }

      const ensureReplyBubble = () => {
        if (replyStarted) return;
        replyStarted = true;
        setMessages((prev) => [
          ...prev,
          {
            id: replyId,
            role: "assistant",
            content: "",
            created_at: new Date().toISOString(),
          },
        ]);
      };

      await consumeWinstonChatSse(res.body, {
        onMeta: (id) => setConversationId(id),
        onDelta: (delta) => {
          ensureReplyBubble();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === replyId ? { ...m, content: m.content + delta } : m
            )
          );
        },
        onDone: ({ conversationId: id }) => {
          setConversationId(id);
          setIsSending(false);
          if (!canAccessWinston) {
            setDailyUsed((prev) => (prev == null ? 1 : prev + 1));
          }
        },
        onError: (error, limitType) => {
          streamFailed = true;
          setSendError(error);
          setMessages((prev) =>
            prev.filter((m) => m.id !== optimisticMsg.id && m.id !== replyId)
          );
          if (limitType === "monthly" || limitType === "daily") {
            setLimitHit(limitType);
          } else {
            setInput(text);
          }
        },
      });

      if (!replyStarted && !streamFailed) {
        setSendError("Winston returned an empty reply. Please try again.");
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        setInput(text);
      }
    } catch {
      setSendError("Failed to reach Winston. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setInput(text);
    } finally {
      setIsSending(false);
    }
  }

  const composerLocked = Boolean(limitHit);

  if (proposal) {
    return (
      <>
        <PanelHeader
          title="Review Winston’s proposals"
          subtitle="Nothing is created until you confirm"
          onClose={onClose}
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {proposalSummary ? (
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              {proposalSummary}
            </p>
          ) : null}
          <WinstonProposalReview
            proposal={proposal}
            allowedEntityTypes={[...WINSTON_PROPOSAL_ENTITY_TYPES]}
            title="Review Winston’s proposals"
            commitLabel="Create selected"
            contextNote={proposalCitations}
            onCancel={() => {
              setProposal(null);
              setProposalSummary(null);
              setProposalCitations(null);
            }}
            onCommitted={(result) => {
              setProposalToast(result);
              router.refresh();
              if (result.errors.length === 0) {
                setProposal(null);
                setProposalSummary(null);
                setProposalCitations(null);
              }
            }}
          />
        </div>
        <WinstonProposalSuccessToast
          result={proposalToast}
          onDismiss={() => setProposalToast(null)}
        />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <PanelHeader
          title={resolved.title}
          subtitle={resolved.subtitle}
          onClose={onClose}
        />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <PanelHeader
          title={resolved.title}
          subtitle={resolved.subtitle}
          onClose={onClose}
        />
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="text-sm text-destructive">{loadError}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PanelHeader
        title={resolved.title}
        subtitle={resolved.subtitle}
        onClose={onClose}
      />
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-3 py-6 text-center">
            <p className="text-sm font-medium text-foreground">{resolved.title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {resolved.empty}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                const isResearchScope = resolved.scopeKey === "research";
                const canAct =
                  !isUser &&
                  Boolean(msg.content.trim()) &&
                  !isSending &&
                  Boolean(conversationId);
                return (
                  <motion.div
                    key={msg.id}
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: MOTION_DURATION.fast,
                      ease: MOTION_EASE.smooth,
                    }}
                    className={cn(
                      "flex w-full",
                      isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className="max-w-[90%] space-y-1.5">
                      {!isUser ? (
                        <div className="flex items-center gap-1.5 pl-1">
                          <Sparkles
                            className="size-3 text-wisk-section-winston"
                            aria-hidden
                          />
                          <span className="text-xs font-medium text-muted-foreground">
                            Winston
                          </span>
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                          isUser
                            ? "bg-wisk-section-winston text-wisk-section-winston-fg"
                            : "border border-border/60 bg-card text-foreground"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      {canAct ? (
                        <div className="flex flex-wrap gap-2 pl-1">
                          <button
                            type="button"
                            onClick={() => void handleSchedule(msg)}
                            disabled={schedulingId === msg.id}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-wisk-section-winston hover:underline disabled:opacity-60"
                          >
                            {schedulingId === msg.id ? (
                              <Loader2 className="size-3 animate-spin" aria-hidden />
                            ) : (
                              <CalendarPlus className="size-3" aria-hidden />
                            )}
                            {schedulingId === msg.id
                              ? "Building proposal…"
                              : "Create this"}
                          </button>
                          {isResearchScope ? (
                            <button
                              type="button"
                              onClick={() => void openLeadNotesDialog(msg)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-wisk-section-winston hover:underline"
                            >
                              <NotebookPen className="size-3" aria-hidden />
                              Add to lead notes
                            </button>
                          ) : null}
                          {onInsertText ? (
                            <button
                              type="button"
                              onClick={() => {
                                onInsertText(msg.content);
                                setInsertedIds((prev) => new Set(prev).add(msg.id));
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-wisk-section-winston hover:underline"
                            >
                              <FilePlus className="size-3" aria-hidden />
                              {insertedIds.has(msg.id)
                                ? "Insert again"
                                : "Insert into note"}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {isSending && messages[messages.length - 1]?.role !== "assistant" ? (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-border/60 bg-card px-4 py-3">
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {scheduleError ? (
        <div className="mx-4 mb-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {scheduleError}
        </div>
      ) : null}

      {leadNoteSaved ? (
        <div className="mx-4 mb-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-foreground">
          {leadNoteSaved}
        </div>
      ) : null}

      {sendError ? (
        <div className="mx-4 mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {sendError}
        </div>
      ) : null}

      {limitHit === "daily" ? (
        <div className="mx-4 mb-2 rounded-lg border border-wisk-section-winston/30 bg-wisk-section-winston/10 px-3 py-2 text-xs text-foreground">
          That’s today’s free Winston messages.{" "}
          <Link href="/upgrade/ai" className="font-medium text-wisk-section-winston hover:underline">
            Unlock WISK AI
          </Link>{" "}
          for full conversations.
        </div>
      ) : null}

      <MobileSendCompose className="shrink-0 border-t border-border/60 px-3 py-3">
        {!canAccessWinston && dailyLimit != null && dailyUsed != null && !limitHit ? (
          <p className="mb-2 text-center text-[11px] text-muted-foreground">
            {Math.max(0, dailyLimit - dailyUsed)} of {dailyLimit} free messages left today
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={
              limitHit === "monthly"
                ? "Monthly limit reached"
                : limitHit === "daily"
                  ? "Daily free limit reached"
                  : resolved.placeholder
            }
            disabled={isSending || composerLocked}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-base leading-relaxed text-foreground placeholder:text-muted-foreground outline-none origin-center transition-[transform,box-shadow,background-color,border-color] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] focus-visible:scale-[1.015] focus-visible:border-ring focus-visible:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.22)] focus-visible:ring-1 focus-visible:ring-wisk-section-winston/40 disabled:opacity-50"
            style={{ maxHeight: "96px", overflowY: "auto" }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={isSending || !input.trim() || composerLocked}
            aria-label="Send message"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-wisk-section-winston text-wisk-section-winston-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Send className="size-3.5" aria-hidden />
            )}
          </button>
        </div>
      </MobileSendCompose>
      <WinstonProposalSuccessToast
        result={proposalToast}
        onDismiss={() => setProposalToast(null)}
      />
      <Dialog
        open={Boolean(leadNoteMessage)}
        onOpenChange={(open) => {
          if (!open) setLeadNoteMessage(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to lead notes</DialogTitle>
            <DialogDescription>
              Appends this research finding to the lead&apos;s notes. Talking
              points don&apos;t map to a Winston proposal type, this keeps them
              on the lead without inventing a task or idea.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Select
              value={selectedLeadId || undefined}
              onValueChange={(value) => setSelectedLeadId(value ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a lead" />
              </SelectTrigger>
              <SelectContent>
                {leadOptions.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {leadNoteError ? (
              <p className="text-xs text-destructive">{leadNoteError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLeadNoteMessage(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleAppendLeadNotes()}
              disabled={!selectedLeadId || isSavingLeadNote}
            >
              {isSavingLeadNote ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Add to notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PanelShell({
  isMobile,
  onClose,
  children,
}: {
  isMobile: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { reduced } = useMotionSafe();

  if (isMobile) {
    return (
      <MobileSheetShell onClose={onClose} closeLabel="Close Winston">
        {children}
      </MobileSheetShell>
    );
  }

  return (
    <motion.aside
      className="fixed top-16 right-4 bottom-24 z-50 hidden w-96 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xl md:flex md:bottom-6"
      initial={reduced ? false : { x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={reduced ? undefined : { x: 24, opacity: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: MOTION_DURATION.normal, ease: MOTION_EASE.smooth }
      }
    >
      {children}
    </motion.aside>
  );
}

export function WinstonSidebar() {
  const {
    open,
    trigger,
    canAccessWinston,
    canAccessResearchPro,
    closeSidebar,
  } = useWinstonSidebar();
  const isMobile = useIsMobilePanel();
  const [tab, setTab] = useState<SidebarTab>("quick-add");

  useEffect(() => {
    if (!open || !trigger) return;
    setTab(trigger.tier === "global" ? "quick-add" : "chat");
  }, [open, trigger]);

  useEffect(() => {
    if (!open || !isMobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeSidebar]);

  const resolved = trigger ? resolveWinstonContext(trigger) : null;
  const isResearchSection =
    trigger?.tier === "section" && trigger.section === "research";
  const showChat =
    trigger &&
    (trigger.tier === "global" ||
      (isResearchSection ? canAccessResearchPro : canAccessWinston));
  const showTeaser =
    trigger &&
    trigger.tier !== "global" &&
    (isResearchSection ? !canAccessResearchPro : !canAccessWinston);

  return (
    <AnimatePresence>
      {open && trigger && resolved ? (
        <PanelShell key="winston-sidebar" isMobile={isMobile} onClose={closeSidebar}>
          <div className="flex min-h-0 flex-1 flex-col">
            {showTeaser ? (
              <Teaser
                title={resolved.title}
                onClose={closeSidebar}
                variant={isResearchSection ? "research_pro" : "ai"}
              />
            ) : (
              <>
                {resolved.showQuickAdd ? (
                  <div className="flex shrink-0 border-b border-border/60 px-2 pt-2">
                    {(
                      [
                        ["quick-add", "Quick add"],
                        ["chat", "Winston"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id)}
                        className={cn(
                          "flex-1 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors",
                          tab === id
                            ? "bg-wisk-section-winston/10 text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : null}
                {tab === "quick-add" && resolved.showQuickAdd ? (
                  <>
                    <PanelHeader
                      title={resolved.title}
                      subtitle={resolved.subtitle}
                      onClose={closeSidebar}
                    />
                    <WinstonQuickAdd
                      onAskWinston={() => setTab("chat")}
                      onCreated={closeSidebar}
                    />
                  </>
                ) : showChat ? (
                  <ChatPane
                    trigger={trigger}
                    canAccessWinston={
                      canAccessWinston ||
                      (isResearchSection && canAccessResearchPro)
                    }
                    onClose={closeSidebar}
                  />
                ) : null}
              </>
            )}
          </div>
        </PanelShell>
      ) : null}
    </AnimatePresence>
  );
}
