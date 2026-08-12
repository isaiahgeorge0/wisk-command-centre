"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarPlus, Loader2, Lock, Send, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getOrCreateScopedConversation } from "@/app/(dashboard)/ai-digest/actions";
import { Button } from "@/components/ui/button";
import { WinstonProposalReview } from "@/components/winston/winston-proposal-review";
import { consumeWinstonChatSse } from "@/lib/ai/consume-chat-stream";
import { useChatScrollFollow } from "@/lib/ai/use-chat-scroll-follow";
import type { ConversationMessage } from "@/lib/ai/types";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import type {
  WinstonProposal,
  WinstonProposalCommitResult,
  WinstonProposalEntityType,
} from "@/lib/winston/proposal";
import { BRAINSTORM_SURFACE_SCOPE } from "@/lib/winston/scope";
import { cn } from "@/lib/utils";

export type WinstonBrainstormSurface = "calendar" | "content";

type WinstonBrainstormPanelProps = {
  open: boolean;
  surface: WinstonBrainstormSurface;
  canAccessWinston: boolean;
  onClose: () => void;
  onCommitted: (result: WinstonProposalCommitResult) => void;
};

const SURFACE_COPY: Record<
  WinstonBrainstormSurface,
  {
    title: string;
    subtitle: string;
    empty: string;
    placeholder: string;
    allowedEntityTypes: WinstonProposalEntityType[];
    reviewTitle: string;
  }
> = {
  calendar: {
    title: "Brainstorm with Winston",
    subtitle: "Talk it through, then schedule — or park it if there’s no date",
    empty:
      "Describe the event. When a date is clear, Schedule this turns it into a calendar item. If not, it lands in Ideas.",
    placeholder: "What’s going on the calendar?",
    allowedEntityTypes: ["calendar_event", "idea"],
    reviewTitle: "Review calendar items",
  },
  content: {
    title: "Brainstorm with Winston",
    subtitle: "Talk it through, then turn it into a content post",
    empty:
      "Describe the post. Schedule this creates a content item — dated if you named a date, otherwise parked as an idea.",
    placeholder: "What content are you thinking about?",
    allowedEntityTypes: ["content_post"],
    reviewTitle: "Review content posts",
  },
};

function PanelHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-wisk-section-winston text-wisk-section-winston-fg">
          <Sparkles className="size-3.5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Close brainstorm panel"
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
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <>
      <PanelHeader
        title={title}
        subtitle="Available on WISK AI and AI Pro"
        onClose={onClose}
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-wisk-section-winston/15">
          <Lock className="size-5 text-wisk-section-winston" aria-hidden />
        </div>
        <p className="text-sm font-medium text-foreground">
          Winston brainstorming needs WISK AI
        </p>
        <Link
          href="/settings?tab=billing"
          className="inline-flex h-7 items-center justify-center rounded-lg bg-wisk-section-winston px-2.5 text-[0.8rem] font-medium text-wisk-section-winston-fg transition-opacity hover:opacity-90"
        >
          View plans
        </Link>
      </div>
    </>
  );
}

function AccessContent({
  surface,
  onClose,
  onCommitted,
}: {
  surface: WinstonBrainstormSurface;
  onClose: () => void;
  onCommitted: (result: WinstonProposalCommitResult) => void;
}) {
  const copy = SURFACE_COPY[surface];
  const scopeKey = BRAINSTORM_SURFACE_SCOPE[surface];
  const reduced = useReducedMotion() ?? false;
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [monthlyLimitHit, setMonthlyLimitHit] = useState(false);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<WinstonProposal | null>(null);
  const [proposalSummary, setProposalSummary] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { scrollRef, stickToBottom } = useChatScrollFollow([
    messages,
    isSending,
  ]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setMessages([]);
    setConversationId(null);
    setProposal(null);
    setProposalSummary(null);
    setScheduleError(null);
    stickToBottom();

    void getOrCreateScopedConversation(scopeKey).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setLoadError(result.error);
        setLoading(false);
        return;
      }
      if (!result.data) {
        setLoadError("Could not open brainstorm");
        setLoading(false);
        return;
      }
      stickToBottom();
      setConversationId(result.data.conversation.id);
      setMessages(result.data.messages);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [scopeKey, stickToBottom]);

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
          body: JSON.stringify({ surface }),
        }
      );
      const data = (await res.json()) as {
        found?: boolean;
        message?: string | null;
        proposal?: WinstonProposal;
        error?: string;
      };

      if (!res.ok) {
        setScheduleError(data.error ?? "Could not build a proposal");
        return;
      }
      if (!data.found || !data.proposal) {
        setScheduleError(
          data.message ?? "Not enough detail yet — keep chatting."
        );
        return;
      }
      setProposal(data.proposal);
      setProposalSummary(data.message ?? null);
    } catch {
      setScheduleError("Could not reach Winston. Please try again.");
    } finally {
      setSchedulingId(null);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending || monthlyLimitHit || !conversationId || loading) {
      return;
    }

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
          conversationId,
          surface,
          scopeKey,
        }),
      });

      const contentType = res.headers.get("content-type") ?? "";

      if (!contentType.includes("text/event-stream")) {
        const json = (await res.json()) as {
          error?: string;
          limitType?: "monthly" | "short_term";
        };
        setSendError(json.error ?? "Something went wrong. Please try again.");
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        if (json.limitType === "monthly") {
          setMonthlyLimitHit(true);
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
        },
        onError: (error, limitType) => {
          streamFailed = true;
          setSendError(error);
          setMessages((prev) =>
            prev.filter((m) => m.id !== optimisticMsg.id && m.id !== replyId)
          );
          if (limitType === "monthly") {
            setMonthlyLimitHit(true);
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

  if (proposal) {
    return (
      <>
        <PanelHeader
          title={copy.reviewTitle}
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
            allowedEntityTypes={copy.allowedEntityTypes}
            title={copy.reviewTitle}
            commitLabel="Create selected"
            onCancel={() => {
              setProposal(null);
              setProposalSummary(null);
            }}
            onCommitted={onCommitted}
          />
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <PanelHeader title={copy.title} subtitle={copy.subtitle} onClose={onClose} />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <PanelHeader title={copy.title} subtitle={copy.subtitle} onClose={onClose} />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm text-destructive">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setLoadError(null);
              void getOrCreateScopedConversation(scopeKey).then((result) => {
                if (!result.success) {
                  setLoadError(result.error);
                  setLoading(false);
                  return;
                }
                if (!result.data) {
                  setLoadError("Could not open brainstorm");
                  setLoading(false);
                  return;
                }
                setConversationId(result.data.conversation.id);
                setMessages(result.data.messages);
                setLoading(false);
              });
            }}
            className="text-xs font-medium text-wisk-section-winston hover:underline"
          >
            Try again
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PanelHeader title={copy.title} subtitle={copy.subtitle} onClose={onClose} />
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-3 py-6 text-center">
            <p className="text-sm font-medium text-foreground">{copy.title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {copy.empty}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                const canSchedule =
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
                    <div
                      className={cn(
                        "max-w-[90%] space-y-1.5",
                        isUser && "space-y-1"
                      )}
                    >
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
                      {canSchedule ? (
                        <button
                          type="button"
                          onClick={() => void handleSchedule(msg)}
                          disabled={schedulingId === msg.id}
                          className="inline-flex items-center gap-1 pl-1 text-[11px] font-medium text-wisk-section-winston hover:underline disabled:opacity-60"
                        >
                          {schedulingId === msg.id ? (
                            <Loader2 className="size-3 animate-spin" aria-hidden />
                          ) : (
                            <CalendarPlus className="size-3" aria-hidden />
                          )}
                          {schedulingId === msg.id
                            ? "Building proposal…"
                            : "Schedule this"}
                        </button>
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

      {sendError ? (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <span className="flex-1">{sendError}</span>
          <button
            type="button"
            onClick={() => setSendError(null)}
            aria-label="Dismiss error"
            className="shrink-0"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className="shrink-0 border-t border-border/60 px-3 py-3">
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
              monthlyLimitHit ? "Monthly limit reached" : copy.placeholder
            }
            disabled={isSending || monthlyLimitHit || !conversationId}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-wisk-section-winston/40 disabled:opacity-50"
            style={{ maxHeight: "96px", overflowY: "auto" }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={
              isSending || !input.trim() || monthlyLimitHit || !conversationId
            }
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
      </div>
    </>
  );
}

export function WinstonBrainstormPanel({
  open,
  surface,
  canAccessWinston,
  onClose,
  onCommitted,
}: WinstonBrainstormPanelProps) {
  if (!open) return null;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-t border-border/60 bg-card/90 md:w-[400px] md:shrink-0 md:border-l md:border-t-0">
      {canAccessWinston ? (
        <AccessContent
          surface={surface}
          onClose={onClose}
          onCommitted={onCommitted}
        />
      ) : (
        <Teaser title={SURFACE_COPY[surface].title} onClose={onClose} />
      )}
    </aside>
  );
}
