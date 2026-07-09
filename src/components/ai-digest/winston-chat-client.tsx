"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  HelpCircle,
  Loader2,
  PanelLeft,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef, useTransition, useCallback } from "react";

import {
  deleteConversation,
  getConversationMessages,
} from "@/app/(dashboard)/ai-digest/actions";
import type {
  AIConversation,
  ActiveProject,
  ConversationMessage,
  MonthlyUsage,
} from "@/lib/ai/types";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import { cn } from "@/lib/utils";

// ─── Usage bar ────────────────────────────────────────────────────────────────

const USAGE_TOOLTIP =
  "Winston usage resets monthly. View full details in Settings.";

function UsageBar({ percentage }: { percentage: number }) {
  const isAtLimit = percentage >= 100;

  return (
    <div className="border-b border-border/40 px-4 py-1.5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "text-xs truncate",
              isAtLimit ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {percentage}% of monthly usage
          </span>
          <span
            title={USAGE_TOOLTIP}
            aria-label={USAGE_TOOLTIP}
            className="inline-flex shrink-0 cursor-help text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <HelpCircle className="size-3" aria-hidden />
          </span>
        </div>
        <Link
          href="/settings?tab=preferences#winston"
          className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline transition-colors"
        >
          View details
        </Link>
      </div>
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-border/30">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isAtLimit
              ? "bg-destructive"
              : "bg-wisk-section-winston"
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

// ─── Conversations sidebar ────────────────────────────────────────────────────

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  conversations: AIConversation[];
  currentConversationId: string | null;
  activeProjects: ActiveProject[];
  onSelectConversation: (conv: AIConversation) => void;
  onNewChat: () => void;
  onStartProjectChat: (projectId: string) => void;
  onDeleteConversation: (id: string) => void;
};

function ConversationsSidebar({
  open,
  onClose,
  conversations,
  currentConversationId,
  activeProjects,
  onSelectConversation,
  onNewChat,
  onStartProjectChat,
  onDeleteConversation,
}: SidebarProps) {
  const reduced = useReducedMotion() ?? false;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel — desktop: static width push; mobile: fixed overlay */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.aside
            key="sidebar"
            className={cn(
              "flex flex-col bg-card border-r border-border/60 overflow-hidden",
              // Mobile: fixed overlay
              "fixed inset-y-0 left-0 z-50 w-72 md:static md:z-auto md:w-64 md:inset-auto md:shrink-0"
            )}
            initial={
              reduced
                ? false
                : { x: "-100%", opacity: 0 }
            }
            animate={{ x: 0, opacity: 1 }}
            exit={
              reduced
                ? { opacity: 0 }
                : { x: "-100%", opacity: 0 }
            }
            transition={{
              x: { duration: reduced ? 0 : 0.25, ease: MOTION_EASE.easeOut },
              opacity: { duration: reduced ? 0 : 0.2 },
            }}
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
              <span className="text-sm font-semibold text-foreground">
                Conversations
              </span>
              <button
                onClick={onClose}
                aria-label="Close conversations"
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            {/* New chat button */}
            <div className="px-3 pt-3 shrink-0">
              <button
                onClick={onNewChat}
                className="flex w-full items-center gap-2 rounded-lg bg-wisk-section-winston px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                New chat
              </button>
            </div>

            {/* Project-scoped chat */}
            {activeProjects.length > 0 && (
              <div className="px-3 pt-3 shrink-0">
                <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">
                  Start project chat
                </p>
                <div className="space-y-0.5">
                  {activeProjects.slice(0, 5).map((project) => (
                    <button
                      key={project.id}
                      onClick={() => onStartProjectChat(project.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    >
                      <span className="size-1.5 shrink-0 rounded-full bg-wisk-section-winston/60" />
                      <span className="truncate">{project.project_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="mx-3 mt-3 border-t border-border/40 shrink-0" />

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
              {conversations.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  No conversations yet.
                  <br />
                  Start a new chat above.
                </p>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === currentConversationId;
                  const isHovered = hoveredId === conv.id;

                  return (
                    <div
                      key={conv.id}
                      className="relative"
                      onMouseEnter={() => setHoveredId(conv.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {confirmDeleteId === conv.id ? (
                        <div className="flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-1.5">
                          <span className="flex-1 text-xs text-destructive">
                            Delete?
                          </span>
                          <button
                            onClick={() => {
                              onDeleteConversation(conv.id);
                              setConfirmDeleteId(null);
                            }}
                            className="rounded px-1.5 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onSelectConversation(conv)}
                          className={cn(
                            "flex w-full flex-col gap-0.5 rounded-lg px-2 py-2 text-left transition-colors",
                            isActive
                              ? "border-l-2 border-wisk-section-winston bg-muted/60 pl-[6px]"
                              : "hover:bg-muted/40"
                          )}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span
                              className={cn(
                                "line-clamp-1 text-xs font-medium",
                                isActive
                                  ? "text-foreground"
                                  : "text-foreground/80"
                              )}
                            >
                              {conv.title}
                            </span>
                            {isHovered && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(conv.id);
                                }}
                                aria-label="Delete conversation"
                                className="shrink-0 rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-destructive"
                              >
                                <Trash2 className="size-3" aria-hidden />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground/60">
                              {relativeTime(conv.updated_at)}
                            </span>
                            {conv.project_name && (
                              <span className="rounded-full bg-wisk-section-winston/15 px-1.5 py-0.5 text-[9px] font-medium text-wisk-section-winston">
                                {conv.project_name}
                              </span>
                            )}
                          </div>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

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
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-wisk-section-winston/20 to-wisk-section-winston/20">
          <Sparkles className="size-7 text-wisk-section-winston" aria-hidden />
        </div>
        <p className="text-base font-medium text-foreground">
          Ask Winston anything about your business.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPrompt(prompt)}
              className="rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-wisk-section-winston/40 hover:bg-wisk-section-winston/5 hover:text-foreground"
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
            <Sparkles className="size-3 text-wisk-section-winston" aria-hidden />
            <span className="text-xs font-medium text-muted-foreground">
              Winston
            </span>
          </div>
        ) : null}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-wisk-section-winston text-wisk-dark"
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
          <Sparkles className="size-3 text-wisk-section-winston" aria-hidden />
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

// ─── Main chat client ─────────────────────────────────────────────────────────

type WinstonChatClientProps = {
  initialMessages: ConversationMessage[];
  initialConversationId: string | null;
  initialConversations: AIConversation[];
  initialUsage: MonthlyUsage;
  activeProjects: ActiveProject[];
};

export function WinstonChatClient({
  initialMessages,
  initialConversationId,
  initialConversations,
  initialUsage,
  activeProjects,
}: WinstonChatClientProps) {
  const reduced = useReducedMotion() ?? false;

  // ── Conversation state ──────────────────────────────────────────────────────
  const [conversations, setConversations] =
    useState<AIConversation[]>(initialConversations);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(initialConversationId);
  const [messages, setMessages] =
    useState<ConversationMessage[]>(initialMessages);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Usage / limits ──────────────────────────────────────────────────────────
  const [usage, setUsage] = useState(initialUsage);
  const [monthlyLimitHit, setMonthlyLimitHit] = useState(
    initialUsage.userInitiatedTokens >= initialUsage.limit
  );

  // ── Input / send state ──────────────────────────────────────────────────────
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // ── Select a conversation ───────────────────────────────────────────────────
  const handleSelectConversation = useCallback(
    async (conv: AIConversation) => {
      if (conv.id === currentConversationId) {
        setSidebarOpen(false);
        return;
      }
      setIsLoadingConversation(true);
      setSidebarOpen(false);

      const result = await getConversationMessages(conv.id);
      if (result.success && result.data) {
        setMessages(result.data);
        setCurrentConversationId(conv.id);
      }
      setIsLoadingConversation(false);
    },
    [currentConversationId]
  );

  // ── New chat ────────────────────────────────────────────────────────────────
  function handleNewChat() {
    setCurrentConversationId(null);
    setMessages([]);
    setSendError(null);
    setSidebarOpen(false);
  }

  // ── Start project-scoped chat ───────────────────────────────────────────────
  function handleStartProjectChat(projectId: string) {
    // The conversation will be created on first message send with projectId
    // We store it temporarily as a "pending project" and pass it with the request.
    // For simplicity, we trigger a new chat and note the projectId in the request.
    setCurrentConversationId(null);
    setMessages([]);
    setSendError(null);
    setSidebarOpen(false);
    // Store pending projectId for next send
    pendingProjectIdRef.current = projectId;
  }

  const pendingProjectIdRef = useRef<string | null>(null);

  // ── Delete a conversation ───────────────────────────────────────────────────
  function handleDeleteConversation(id: string) {
    startTransition(async () => {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    });
  }

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

    const projectId = pendingProjectIdRef.current;
    pendingProjectIdRef.current = null;

    try {
      const res = await fetch("/api/winston/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: currentConversationId ?? undefined,
          ...(projectId ? { projectId } : {}),
        }),
      });

      const json = (await res.json()) as {
        reply?: string;
        error?: string;
        limitType?: "monthly" | "short_term";
        usedTokens?: number;
        conversationId?: string;
        generatedTitle?: string;
      };

      if (!res.ok || json.error) {
        setSendError(json.error ?? "Something went wrong. Please try again.");
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        if (json.limitType !== "monthly") {
          setInput(text);
        } else {
          setMonthlyLimitHit(true);
        }
        return;
      }

      // If this was the first message in a new conversation, update state
      if (json.conversationId && json.conversationId !== currentConversationId) {
        const newConvId = json.conversationId;
        setCurrentConversationId(newConvId);

        const title = json.generatedTitle ?? "New conversation";
        const newConv: AIConversation = {
          id: newConvId,
          user_id: "",
          title,
          project_id: projectId ?? null,
          project_name:
            projectId
              ? (activeProjects.find((p) => p.id === projectId)?.project_name ??
                null)
              : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setConversations((prev) => [newConv, ...prev]);
      } else if (json.generatedTitle && currentConversationId) {
        // Update title for existing first-message conversation
        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConversationId
              ? { ...c, title: json.generatedTitle! }
              : c
          )
        );
      }

      // Update updated_at for current conversation
      if (json.conversationId) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === json.conversationId
              ? { ...c, updated_at: new Date().toISOString() }
              : c
          )
        );
      }

      const replyMsg: ConversationMessage = {
        id: `reply-${Date.now()}`,
        role: "assistant",
        content: json.reply ?? "",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, replyMsg]);

      if (json.usedTokens) {
        setUsage((prev) => {
          const userInitiatedTokens =
            prev.userInitiatedTokens + (json.usedTokens ?? 0);
          const chatTokens = prev.chatTokens + (json.usedTokens ?? 0);
          const total = userInitiatedTokens;
          const percentage = Math.min(
            100,
            Math.round((total / prev.limit) * 100)
          );
          if (userInitiatedTokens >= prev.limit) setMonthlyLimitHit(true);
          return {
            ...prev,
            chatTokens,
            userInitiatedTokens,
            total,
            percentage,
          };
        });
      }
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

  const isEmptyActive = messages.length === 0;

  return (
    <div className="relative flex h-[70vh] min-h-[480px] overflow-hidden rounded-xl border border-border/60 bg-background">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <ConversationsSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        currentConversationId={currentConversationId}
        activeProjects={activeProjects}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onStartProjectChat={handleStartProjectChat}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* ── Main chat area ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Usage bar */}
        <UsageBar percentage={usage.percentage} />

        {/* Chat header with sidebar trigger */}
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "Close conversations" : "Open conversations"}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors",
              sidebarOpen
                ? "bg-muted/60 text-foreground"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            <PanelLeft className="size-4 shrink-0" aria-hidden />
            <span className="hidden md:inline">Conversations</span>
          </button>

          {/* Current conversation title */}
          {currentConversationId && (
            <span className="flex-1 truncate px-3 text-center text-xs text-muted-foreground/70">
              {conversations.find((c) => c.id === currentConversationId)
                ?.title ?? ""}
            </span>
          )}

          {/* Placeholder to keep the title centred */}
          <div className="w-[88px] md:w-[116px]" />
        </div>

        {/* Message area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoadingConversation ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : isEmptyActive ? (
            <EmptyState onPrompt={(text) => setInput(text)} />
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    reduced={reduced}
                  />
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
        <div className="border-t border-border/60 bg-card/50 px-4 py-3 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                monthlyLimitHit ? "Monthly limit reached" : "Ask Winston…"
              }
              disabled={isSending || monthlyLimitHit}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-wisk-section-winston/40 disabled:opacity-50"
              style={{ maxHeight: "96px", overflowY: "auto" }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={isSending || !input.trim() || monthlyLimitHit}
              aria-label="Send message"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-wisk-section-winston text-wisk-dark transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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
    </div>
  );
}
