"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  CalendarPlus,
  HelpCircle,
  Loader2,
  PanelLeft,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useTransition, useCallback } from "react";

import {
  deleteConversation,
  getConversationMessages,
  updateConversationTitle,
} from "@/app/(dashboard)/ai-digest/actions";
import { MobileSendCompose } from "@/components/layout/mobile-send-compose";
import { useMobileSheetBottom } from "@/components/layout/use-mobile-sheet-inset";
import { Input } from "@/components/ui/input";
import { WinstonProposalReview } from "@/components/winston/winston-proposal-review";
import { WinstonProposalSuccessToast } from "@/components/winston/proposal-success-toast";
import { consumeWinstonChatSse } from "@/lib/ai/consume-chat-stream";
import { useChatScrollFollow } from "@/lib/ai/use-chat-scroll-follow";
import type {
  AIConversation,
  ActiveProject,
  ConversationMessage,
  MonthlyUsage,
} from "@/lib/ai/types";
import { useIsMobile } from "@/lib/layout/use-is-mobile";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import {
  WINSTON_PROPOSAL_ENTITY_TYPES,
  type WinstonProposal,
  type WinstonProposalCommitResult,
} from "@/lib/winston/proposal";
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
  onRenameConversation: (id: string, title: string) => Promise<boolean>;
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
  onRenameConversation,
}: SidebarProps) {
  const reduced = useReducedMotion() ?? false;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  async function submitRename() {
    if (!editingId) return;
    setIsRenaming(true);
    const ok = await onRenameConversation(editingId, draftTitle);
    setIsRenaming(false);
    if (!ok) return;
    setEditingId(null);
    setDraftTitle("");
  }

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

      {/* Sidebar panel, desktop: static width push; mobile: fixed overlay */}
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
                className="flex w-full items-center gap-2 rounded-lg bg-wisk-section-winston px-3 py-2 text-sm font-medium text-wisk-section-winston-fg transition-opacity hover:opacity-90"
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

                  return (
                    <div key={conv.id} className="relative">
                      {editingId === conv.id ? (
                        <div className="space-y-2 rounded-lg border border-border/60 bg-card/80 p-2">
                          <Input
                            value={draftTitle}
                            onChange={(event) => setDraftTitle(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void submitRename();
                              } else if (event.key === "Escape") {
                                setEditingId(null);
                                setDraftTitle("");
                              }
                            }}
                            placeholder="Conversation title"
                            disabled={isRenaming}
                            autoFocus
                            className="h-9 text-sm"
                          />
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null);
                                setDraftTitle("");
                              }}
                              className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => void submitRename()}
                              disabled={isRenaming || !draftTitle.trim()}
                              className="rounded bg-wisk-section-winston px-2 py-1 text-xs font-medium text-wisk-section-winston-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isRenaming ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {confirmDeleteId === conv.id ? (
                        <div className="flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-1.5">
                          <span className="flex-1 text-xs text-destructive">
                            Delete?
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteConversation(conv.id);
                              setConfirmDeleteId(null);
                            }}
                            className="rounded px-1.5 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : editingId === conv.id ? null : (
                        <div
                          role="button"
                          tabIndex={0}
                          aria-current={isActive ? "true" : undefined}
                          aria-label={conv.title}
                          onClick={() => onSelectConversation(conv)}
                          onKeyDown={(event) => {
                            if (event.target !== event.currentTarget) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onSelectConversation(conv);
                            }
                          }}
                          className={cn(
                            "group flex w-full cursor-pointer flex-col gap-0.5 rounded-lg px-2 py-2 text-left transition-colors",
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
                            <div className="flex shrink-0 items-center gap-0.5">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setConfirmDeleteId(null);
                                  setEditingId(conv.id);
                                  setDraftTitle(conv.title);
                                }}
                                aria-label={`Rename ${conv.title}`}
                                className="rounded p-0.5 text-muted-foreground/70 opacity-100 transition-colors hover:bg-muted/60 hover:text-foreground md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                              >
                                <Pencil className="size-3" aria-hidden />
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setEditingId(null);
                                  setDraftTitle("");
                                  setConfirmDeleteId(conv.id);
                                }}
                                aria-label={`Delete ${conv.title}`}
                                className="rounded p-0.5 text-muted-foreground/70 opacity-100 transition-colors hover:bg-muted/60 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                              >
                                <Trash2 className="size-3" aria-hidden />
                              </button>
                            </div>
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
                        </div>
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
              ? "bg-wisk-section-winston text-wisk-section-winston-fg"
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
  const router = useRouter();
  const isMobile = useIsMobile();
  const proposalBottom = useMobileSheetBottom(true);

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
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<WinstonProposal | null>(null);
  const [proposalSummary, setProposalSummary] = useState<string | null>(null);
  const [proposalToast, setProposalToast] =
    useState<WinstonProposalCommitResult | null>(null);
  const [, startTransition] = useTransition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { scrollRef, stickToBottom } = useChatScrollFollow([
    messages,
    isSending,
  ]);

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
        stickToBottom();
        setMessages(result.data);
        setCurrentConversationId(conv.id);
      }
      setIsLoadingConversation(false);
    },
    [currentConversationId, stickToBottom]
  );

  // ── New chat ────────────────────────────────────────────────────────────────
  function handleNewChat() {
    stickToBottom();
    setCurrentConversationId(null);
    setMessages([]);
    setSendError(null);
    setScheduleError(null);
    setProposal(null);
    setProposalSummary(null);
    setSidebarOpen(false);
  }

  // ── Start project-scoped chat ───────────────────────────────────────────────
  function handleStartProjectChat(projectId: string) {
    // The conversation will be created on first message send with projectId
    // We store it temporarily as a "pending project" and pass it with the request.
    // For simplicity, we trigger a new chat and note the projectId in the request.
    stickToBottom();
    setCurrentConversationId(null);
    setMessages([]);
    setSendError(null);
    setScheduleError(null);
    setProposal(null);
    setProposalSummary(null);
    setSidebarOpen(false);
    // Store pending projectId for next send
    pendingProjectIdRef.current = projectId;
  }

  const pendingProjectIdRef = useRef<string | null>(null);

  // ── Delete a conversation ───────────────────────────────────────────────────
  function handleDeleteConversation(id: string) {
    startTransition(async () => {
      const result = await deleteConversation(id);
      if (!result.success) {
        setSendError(result.error);
        return;
      }
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([]);
        setScheduleError(null);
        setProposal(null);
        setProposalSummary(null);
      }
    });
  }

  async function handleRenameConversation(id: string, title: string) {
    const result = await updateConversationTitle(id, title);
    if (!result.success) {
      setSendError(result.error);
      return false;
    }

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === id
          ? { ...conversation, title: title.trim() }
          : conversation
      )
    );
    return true;
  }

  async function handleSchedule(message: ConversationMessage) {
    if (!currentConversationId || !message.content.trim() || schedulingId) return;
    setSchedulingId(message.id);
    setScheduleError(null);
    try {
      const res = await fetch(
        `/api/winston/conversations/${currentConversationId}/schedule`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
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
        setScheduleError(data.message ?? "Not enough detail yet. Keep chatting.");
        return;
      }
      setProposal(data.proposal);
      setProposalSummary(data.message ?? null);
    } catch {
      setScheduleError("Could not build a proposal");
    } finally {
      setSchedulingId(null);
    }
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
    const replyId = `reply-${Date.now()}`;
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

      const contentType = res.headers.get("content-type") ?? "";

      // Auth / rate-limit / validation still return JSON
      if (!contentType.includes("text/event-stream")) {
        const json = (await res.json()) as {
          error?: string;
          limitType?: "monthly" | "short_term";
        };

        setSendError(json.error ?? "Something went wrong. Please try again.");
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        if (json.limitType !== "monthly") {
          setInput(text);
        } else {
          setMonthlyLimitHit(true);
        }
        return;
      }

      if (!res.ok || !res.body) {
        setSendError("Something went wrong. Please try again.");
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        setInput(text);
        return;
      }

      let streamConversationId: string | null = null;
      let replyStarted = false;
      let streamFailed = false;

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

      const applyConversationMeta = (
        conversationId: string,
        generatedTitle?: string
      ) => {
        if (conversationId !== currentConversationId) {
          setCurrentConversationId(conversationId);
          setConversations((prev) => {
            if (prev.some((c) => c.id === conversationId)) {
              return prev.map((c) =>
                c.id === conversationId
                  ? {
                      ...c,
                      updated_at: new Date().toISOString(),
                      ...(generatedTitle ? { title: generatedTitle } : {}),
                    }
                  : c
              );
            }
            const newConv: AIConversation = {
              id: conversationId,
              user_id: "",
              title: generatedTitle ?? "New conversation",
              project_id: projectId ?? null,
              project_name: projectId
                ? (activeProjects.find((p) => p.id === projectId)
                    ?.project_name ?? null)
                : null,
              note_id: null,
              scope_key: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            return [newConv, ...prev];
          });
        } else {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId
                ? {
                    ...c,
                    updated_at: new Date().toISOString(),
                    ...(generatedTitle ? { title: generatedTitle } : {}),
                  }
                : c
            )
          );
        }
      };

      await consumeWinstonChatSse(res.body, {
        onMeta: (conversationId) => {
          streamConversationId = conversationId;
          applyConversationMeta(conversationId);
        },
        onDelta: (text) => {
          ensureReplyBubble();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === replyId ? { ...m, content: m.content + text } : m
            )
          );
        },
        onDone: ({ conversationId, usedTokens }) => {
          streamConversationId = conversationId;
          applyConversationMeta(conversationId);
          if (usedTokens) {
            setUsage((prev) => {
              const userInitiatedTokens = prev.userInitiatedTokens + usedTokens;
              const chatTokens = prev.chatTokens + usedTokens;
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
          setIsSending(false);
        },
        onTitle: (generatedTitle) => {
          const titleConversationId =
            streamConversationId ?? currentConversationId;
          if (titleConversationId) {
            applyConversationMeta(titleConversationId, generatedTitle);
          }
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  const isEmptyActive = messages.length === 0;

  const proposalContent = proposal ? (
    <>
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
        onCancel={() => {
          setProposal(null);
          setProposalSummary(null);
        }}
        onCommitted={(result) => {
          setProposalToast(result);
          router.refresh();
          if (result.errors.length === 0) {
            setProposal(null);
            setProposalSummary(null);
          }
        }}
      />
    </>
  ) : null;

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
        onRenameConversation={handleRenameConversation}
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
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {isLoadingConversation ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : isEmptyActive ? (
            <EmptyState onPrompt={(text) => setInput(text)} />
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  const canAct =
                    !isUser &&
                    Boolean(msg.content.trim()) &&
                    !isSending &&
                    Boolean(currentConversationId);

                  return (
                    <div key={msg.id} className="space-y-1.5">
                      <MessageBubble message={msg} reduced={reduced} />
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
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </AnimatePresence>
              {isSending &&
              messages[messages.length - 1]?.role !== "assistant" ? (
                <TypingIndicator />
              ) : null}
            </div>
          )}
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

        {scheduleError ? (
          <div className="mx-4 mb-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {scheduleError}
          </div>
        ) : null}

        <MobileSendCompose
          className="shrink-0 border-t border-border/60 bg-card/50 px-4 py-3"
          footer={
            <p className="mt-1.5 text-center text-xs text-muted-foreground/60">
              Enter to send · Shift+Enter for new line
            </p>
          }
        >
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
              className="flex-1 resize-none rounded-xl border border-border/60 bg-background px-4 py-2.5 text-base leading-relaxed text-foreground placeholder:text-muted-foreground outline-none origin-center transition-[transform,box-shadow,background-color,border-color] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] focus-visible:scale-[1.015] focus-visible:border-ring focus-visible:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.22)] focus-visible:ring-1 focus-visible:ring-wisk-section-winston/40 disabled:opacity-50"
              style={{ maxHeight: "96px", overflowY: "auto" }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={isSending || !input.trim() || monthlyLimitHit}
              aria-label="Send message"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-wisk-section-winston text-wisk-section-winston-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
            </button>
          </div>
        </MobileSendCompose>
      </div>

      {proposal && isMobile ? (
        <div
          className="fixed inset-x-0 top-0 z-[70] flex flex-col bg-background md:hidden"
          style={{ bottom: proposalBottom }}
        >
          <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
            <button
              type="button"
              onClick={() => {
                setProposal(null);
                setProposalSummary(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-wisk-section-winston hover:bg-wisk-section-winston/8"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back to chat
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">
                Review Winston’s proposals
              </h2>
              <p className="text-xs text-muted-foreground">
                Nothing is created until you confirm
              </p>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {proposalContent}
          </div>
        </div>
      ) : null}

      {proposal && !isMobile ? (
        <div className="absolute inset-0 z-20 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Review Winston’s proposals
              </h2>
              <p className="text-xs text-muted-foreground">
                Nothing is created until you confirm
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setProposal(null);
                setProposalSummary(null);
              }}
              className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            >
              Back to chat
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {proposalContent}
          </div>
        </div>
      ) : null}

      <WinstonProposalSuccessToast
        result={proposalToast}
        onDismiss={() => setProposalToast(null)}
      />
    </div>
  );
}
