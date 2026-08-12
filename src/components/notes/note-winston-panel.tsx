"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Lock, Send, Sparkles, FilePlus, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { getOrCreateNoteConversation } from "@/app/(dashboard)/ai-digest/actions";
import { Button } from "@/components/ui/button";
import { consumeWinstonChatSse } from "@/lib/ai/consume-chat-stream";
import { useChatScrollFollow } from "@/lib/ai/use-chat-scroll-follow";
import type { ConversationMessage } from "@/lib/ai/types";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import type { Note } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

type NoteWinstonPanelProps = {
  note: Note;
  open: boolean;
  canAccessWinston: boolean;
  onClose: () => void;
  onInsertIntoNote: (text: string) => void;
};

function TeaserContent({ onClose }: { onClose: () => void }) {
  return (
    <>
      <PanelHeader title="Brainstorm with Winston" onClose={onClose} />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-wisk-section-winston/15">
          <Lock className="size-5 text-wisk-section-winston" aria-hidden />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Winston brainstorming needs WISK AI
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Talk through ideas on this note and insert Winston&apos;s replies
            with one click — available on WISK AI and AI Pro.
          </p>
        </div>
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

function PanelHeader({
  title,
  onClose,
}: {
  title: string;
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
          <p className="mt-0.5 text-xs text-muted-foreground">
            Grounded in this note&apos;s content
          </p>
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

function AccessContent({
  note,
  onClose,
  onInsertIntoNote,
}: {
  note: Note;
  onClose: () => void;
  onInsertIntoNote: (text: string) => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [monthlyLimitHit, setMonthlyLimitHit] = useState(false);
  const [insertedIds, setInsertedIds] = useState<Set<string>>(() => new Set());
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
    setInsertedIds(new Set());
    stickToBottom();

    void getOrCreateNoteConversation(note.id).then((result) => {
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
  }, [note.id, stickToBottom]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [input]);

  const handleInsert = useCallback(
    (message: ConversationMessage) => {
      if (!message.content.trim()) return;
      onInsertIntoNote(message.content);
      setInsertedIds((prev) => new Set(prev).add(message.id));
    },
    [onInsertIntoNote]
  );

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending || monthlyLimitHit) return;

    setInput("");
    setSendError(null);

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
          noteId: note.id,
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

  return (
    <>
      <PanelHeader title="Brainstorm with Winston" onClose={onClose} />
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Opening conversation…
          </div>
        ) : loadError ? (
          <p className="py-8 text-center text-xs text-destructive">{loadError}</p>
        ) : messages.length === 0 ? (
          <div className="space-y-3 py-6 text-center">
            <p className="text-sm font-medium text-foreground">
              Brainstorm on this note
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Ask Winston to expand an idea, poke holes in a plan, or suggest
              what to write next. Insert any reply into the note when you like
              it.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                const canInsert =
                  !isUser && Boolean(msg.content.trim()) && !isSending;
                const inserted = insertedIds.has(msg.id);
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
                      {canInsert ? (
                        <button
                          type="button"
                          onClick={() => handleInsert(msg)}
                          className="inline-flex items-center gap-1 pl-1 text-[11px] font-medium text-wisk-section-notes hover:underline"
                        >
                          <FilePlus className="size-3" aria-hidden />
                          {inserted ? "Insert again" : "Insert into note"}
                        </button>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {isSending && messages[messages.length - 1]?.role !== "assistant" ? (
              <div className="flex justify-start">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 pl-1">
                    <Sparkles
                      className="size-3 text-wisk-section-winston"
                      aria-hidden
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      Winston
                    </span>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card px-4 py-3">
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

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
              monthlyLimitHit ? "Monthly limit reached" : "Brainstorm with Winston…"
            }
            disabled={isSending || monthlyLimitHit || loading || Boolean(loadError)}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-wisk-section-winston/40 disabled:opacity-50"
            style={{ maxHeight: "96px", overflowY: "auto" }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={
              isSending ||
              !input.trim() ||
              monthlyLimitHit ||
              loading ||
              Boolean(loadError)
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

export function NoteWinstonPanel({
  note,
  open,
  canAccessWinston,
  onClose,
  onInsertIntoNote,
}: NoteWinstonPanelProps) {
  if (!open) return null;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-t border-border/60 bg-card/90 md:w-[360px] md:shrink-0 md:border-l md:border-t-0">
      {canAccessWinston ? (
        <AccessContent
          note={note}
          onClose={onClose}
          onInsertIntoNote={onInsertIntoNote}
        />
      ) : (
        <TeaserContent onClose={onClose} />
      )}
    </aside>
  );
}
