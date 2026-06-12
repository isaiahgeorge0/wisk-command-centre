"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Send, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  clearConversation,
  getConversationHistory,
} from "@/app/(dashboard)/ai-digest/actions";
import type { ConversationMessage } from "@/lib/ai/types";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import { cn } from "@/lib/utils";

// ─── Example prompts ──────────────────────────────────────────────────────────

const EXAMPLE_PROMPTS = [
  "What's my pipeline worth?",
  "What should I focus on this week?",
  "How's my content streak doing?",
  "Which projects are stalling?",
];

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onPrompt }: { onPrompt: (text: string) => void }) {
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: MOTION_DURATION.normal, ease: MOTION_EASE.smooth }}
        className="flex flex-col items-center gap-4"
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-wisk-purple/20 to-wisk-teal/20">
          <Sparkles className="size-7 text-wisk-teal" aria-hidden />
        </div>
        <p className="text-base font-medium text-foreground">
          Ask Winston anything about your business.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPrompt(prompt)}
              className="rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-wisk-teal/40 hover:bg-wisk-teal/5 hover:text-foreground"
            >
              {prompt}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  reduced,
}: {
  message: ConversationMessage;
  reduced: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_DURATION.fast, ease: MOTION_EASE.smooth }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div className={cn("max-w-[80%] space-y-1", !isUser && "space-y-1.5")}>
        {!isUser ? (
          <div className="flex items-center gap-1.5 pl-1">
            <Sparkles className="size-3 text-wisk-teal" aria-hidden />
            <span className="text-xs font-medium text-muted-foreground">
              Winston
            </span>
          </div>
        ) : null}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-gradient-to-r from-wisk-purple to-wisk-teal text-white"
              : "border border-border/60 bg-card text-foreground"
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 pl-1">
          <Sparkles className="size-3 text-wisk-teal" aria-hidden />
          <span className="text-xs font-medium text-muted-foreground">
            Winston
          </span>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card px-4 py-3">
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="size-1.5 rounded-full bg-muted-foreground/60"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Clear confirmation dialog ────────────────────────────────────────────────

function ClearConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-6 w-full max-w-sm rounded-xl border border-border/60 bg-card p-5 shadow-lg">
        <h3 className="font-semibold text-foreground">Clear conversation?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          All messages will be permanently deleted.
        </p>
        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main chat client ─────────────────────────────────────────────────────────

export function WinstonChatClient() {
  const reduced = useReducedMotion() ?? false;

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearPending, startClearTransition] = useTransition();

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Load history on mount ───────────────────────────────────────────────────
  useEffect(() => {
    void (async () => {
      const result = await getConversationHistory();
      if (result.success && result.data) {
        setMessages(result.data);
      }
      setIsLoading(false);
    })();
  }, []);

  // ── Auto-scroll to bottom ───────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }, [messages, isSending, reduced]);

  // ── Textarea auto-resize ────────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [input]);

  // ── Send message ────────────────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;

    setInput("");
    setSendError(null);

    const optimisticMsg: ConversationMessage = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setIsSending(true);

    try {
      const res = await fetch("/api/winston/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const json = (await res.json()) as { reply?: string; error?: string };

      if (!res.ok || json.error) {
        setSendError(json.error ?? "Something went wrong. Please try again.");
        setMessages((prev) =>
          prev.filter((m) => m.id !== optimisticMsg.id)
        );
        setInput(text);
        return;
      }

      const replyMsg: ConversationMessage = {
        id: `reply-${Date.now()}`,
        role: "assistant",
        content: json.reply ?? "",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, replyMsg]);
    } catch {
      setSendError("Failed to reach Winston. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setInput(text);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleClearConfirm() {
    startClearTransition(async () => {
      await clearConversation();
      setMessages([]);
      setShowClearDialog(false);
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative flex h-[70vh] min-h-[480px] flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
      {/* Clear confirmation overlay */}
      {showClearDialog ? (
        <ClearConfirmDialog
          onConfirm={handleClearConfirm}
          onCancel={() => setShowClearDialog(false)}
        />
      ) : null}

      {/* Toolbar */}
      {messages.length > 0 ? (
        <div className="flex items-center justify-end border-b border-border/60 px-4 py-2">
          <button
            onClick={() => setShowClearDialog(true)}
            disabled={clearPending}
            aria-label="Clear conversation"
            title="Clear conversation"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Clear
          </button>
        </div>
      ) : null}

      {/* Message area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <EmptyState onPrompt={(text) => setInput(text)} />
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} reduced={reduced} />
              ))}
            </AnimatePresence>
            {isSending ? <TypingIndicator /> : null}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error banner */}
      {sendError ? (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <span className="flex-1">{sendError}</span>
          <button
            onClick={() => setSendError(null)}
            aria-label="Dismiss error"
            className="shrink-0 text-destructive/70 hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {/* Input area */}
      <div className="border-t border-border/60 bg-card/50 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Winston…"
            disabled={isSending}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-wisk-teal/40 disabled:opacity-50"
            style={{ maxHeight: "96px", overflowY: "auto" }}
          />
          <button
            onClick={() => void handleSend()}
            disabled={isSending || !input.trim()}
            aria-label="Send message"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-wisk-purple to-wisk-teal text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs text-muted-foreground/60">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
