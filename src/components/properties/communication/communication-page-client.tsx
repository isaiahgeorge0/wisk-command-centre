"use client";

import { ArrowLeft, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  getConversations,
  getMessages,
  markMessagesAsRead,
  sendLandlordMessage,
} from "@/app/(dashboard)/properties/actions";
import { MessageThread } from "@/components/properties/communication/message-thread";
import { PresenceLabel } from "@/components/properties/communication/presence-label";
import { PageHeader } from "@/components/layout/page-header";
import { PROPERTIES_ACCENT } from "@/lib/properties/constants";
import {
  formatMessageTimestamp,
  truncateMessagePreview,
} from "@/lib/properties/format";
import { useLandlordMessageEvent } from "@/lib/properties/use-landlord-message-event";
import { useTypingPresence } from "@/lib/properties/use-tenant-messages-realtime";
import type { ConversationSummary, TenantMessage } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type CommunicationPageClientProps = {
  initialConversations: ConversationSummary[];
  landlordUserId: string;
};

function upsertConversation(
  conversations: ConversationSummary[],
  message: TenantMessage,
  tenantName: string,
  propertyName: string,
  incrementUnread: boolean
): ConversationSummary[] {
  const existing = conversations.find((c) => c.tenant_id === message.tenant_id);
  const updated: ConversationSummary = {
    tenant_id: message.tenant_id,
    tenant_name: existing?.tenant_name ?? tenantName,
    property_id: message.property_id,
    property_name: existing?.property_name ?? propertyName,
    latest_message: message.message,
    latest_message_at: message.created_at,
    unread_count:
      (existing?.unread_count ?? 0) + (incrementUnread ? 1 : 0),
    other_party_last_seen_at: existing?.other_party_last_seen_at ?? null,
  };

  const rest = conversations.filter((c) => c.tenant_id !== message.tenant_id);
  return [updated, ...rest].sort(
    (a, b) =>
      new Date(b.latest_message_at).getTime() -
      new Date(a.latest_message_at).getTime()
  );
}

export function CommunicationPageClient({
  initialConversations,
  landlordUserId,
}: CommunicationPageClientProps) {
  const [conversations, setConversations] =
    useState<ConversationSummary[]>(initialConversations);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TenantMessage[]>([]);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const [isOtherPartyTyping, setIsOtherPartyTyping] = useState(false);
  const [isLoadingMessages, startLoadMessages] = useTransition();
  const selectedTenantRef = useRef<string | null>(null);

  const selectedConversation = conversations.find(
    (c) => c.tenant_id === selectedTenantId
  );

  useEffect(() => {
    selectedTenantRef.current = selectedTenantId;
  }, [selectedTenantId]);

  useEffect(() => {
    if (!selectedTenantId) return;

    const interval = setInterval(async () => {
      const loaded = await getMessages(selectedTenantId);
      setMessages(loaded);
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedTenantId]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const updated = await getConversations();
      setConversations(updated);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const { setTyping } = useTypingPresence({
    channelName: selectedTenantId
      ? `typing-${selectedTenantId}`
      : "typing-none",
    currentUserId: landlordUserId,
    onTypingChange: (ids) => setIsOtherPartyTyping(ids.length > 0),
  });

  const handleRealtimeInsert = useCallback((message: TenantMessage) => {
    const isActive = selectedTenantRef.current === message.tenant_id;
    const incrementUnread =
      message.sender_type === "tenant" && !message.read && !isActive;

    setConversations((prev) => {
      const exists = prev.some((c) => c.tenant_id === message.tenant_id);
      if (!exists && message.sender_type === "tenant") {
        void getConversations().then(setConversations);
        return prev;
      }
      let updated = upsertConversation(
        prev,
        message,
        "Tenant",
        "Property",
        incrementUnread
      );
      if (isActive && message.sender_type === "tenant") {
        updated = updated.map((c) =>
          c.tenant_id === message.tenant_id
            ? { ...c, unread_count: 0 }
            : c
        );
      }
      return updated;
    });

    if (isActive) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      if (message.sender_type === "tenant") {
        void markMessagesAsRead(message.tenant_id);
        window.dispatchEvent(new CustomEvent("wisk:messages-read"));
      }
    }
  }, []);

  useLandlordMessageEvent(handleRealtimeInsert);

  const selectConversation = (conversation: ConversationSummary) => {
    setSelectedTenantId(conversation.tenant_id);
    setMobileView("thread");
    setIsOtherPartyTyping(false);
    setConversations((prev) =>
      prev.map((c) =>
        c.tenant_id === conversation.tenant_id
          ? { ...c, unread_count: 0 }
          : c
      )
    );

    startLoadMessages(async () => {
      const [loaded] = await Promise.all([
        getMessages(conversation.tenant_id),
        markMessagesAsRead(conversation.tenant_id),
      ]);
      setMessages(loaded);
      window.dispatchEvent(new CustomEvent("wisk:messages-read"));
    });
  };

  const handleSend = async (text: string) => {
    if (!selectedConversation) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: TenantMessage = {
      id: optimisticId,
      property_id: selectedConversation.property_id,
      tenant_id: selectedConversation.tenant_id,
      landlord_user_id: landlordUserId,
      sender_type: "landlord",
      sender_id: landlordUserId,
      message: text,
      read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setConversations((prev) =>
      upsertConversation(
        prev,
        optimistic,
        selectedConversation.tenant_name,
        selectedConversation.property_name,
        false
      )
    );

    const result = await sendLandlordMessage(
      selectedConversation.tenant_id,
      selectedConversation.property_id,
      text
    );

    if (!result.success || !result.data) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      return;
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === optimisticId ? result.data! : m))
    );
    setConversations((prev) =>
      upsertConversation(
        prev.filter((c) => c.tenant_id !== selectedConversation.tenant_id),
        result.data!,
        selectedConversation.tenant_name,
        selectedConversation.property_name,
        false
      )
    );
  };

  return (
    <div>
      <PageHeader
        title="Communication"
        subtitle="Messages with your tenants."
        icon={
          <MessageSquare
            className="size-6"
            style={{ color: PROPERTIES_ACCENT }}
          />
        }
        className="mb-6"
      />

      <div className="flex min-h-[calc(100dvh-12rem)] overflow-hidden rounded-xl border border-border/60 bg-card/40">
        <aside
          className={cn(
            "flex w-full flex-col border-border/60 md:w-1/3 md:border-r",
            mobileView === "thread" ? "hidden md:flex" : "flex"
          )}
        >
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Conversations
            </h2>
          </div>
          {conversations.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <MessageSquare className="mb-4 size-10 text-amber-500" />
              <h3 className="text-lg font-medium text-foreground">
                No conversations yet
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Messages from tenants will appear here.
              </p>
            </div>
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto divide-y divide-border/50">
              {conversations.map((conversation) => {
                const isActive =
                  conversation.tenant_id === selectedTenantId;
                return (
                  <li key={conversation.tenant_id}>
                    <button
                      type="button"
                      onClick={() => selectConversation(conversation)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                        isActive
                          ? "bg-amber-500/10"
                          : "hover:bg-muted/40"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-medium text-foreground">
                            {conversation.tenant_name}
                          </p>
                          <span
                            className="shrink-0 text-xs text-muted-foreground"
                            suppressHydrationWarning
                          >
                            {formatMessageTimestamp(
                              conversation.latest_message_at
                            )}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {conversation.property_name}
                        </p>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {truncateMessagePreview(conversation.latest_message)}
                        </p>
                      </div>
                      {conversation.unread_count > 0 ? (
                        <span
                          className="mt-2 size-2.5 shrink-0 rounded-full bg-amber-500"
                          aria-label={`${conversation.unread_count} unread`}
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            mobileView === "list" ? "hidden md:flex" : "flex"
          )}
        >
          {selectedConversation ? (
            <>
              <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3 md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileView("list")}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {selectedConversation.tenant_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedConversation.property_name}
                  </p>
                  <PresenceLabel
                    lastSeenAt={selectedConversation.other_party_last_seen_at}
                  />
                </div>
              </div>
              <MessageThread
                messages={messages}
                currentSenderId={landlordUserId}
                onSend={handleSend}
                isOtherPartyTyping={isOtherPartyTyping}
                onTypingChange={setTyping}
                typingUserName={selectedConversation.tenant_name}
                header={
                  <div className="hidden md:block">
                    <p className="font-medium text-foreground">
                      {selectedConversation.tenant_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.property_name}
                    </p>
                    <PresenceLabel
                      lastSeenAt={
                        selectedConversation.other_party_last_seen_at
                      }
                    />
                  </div>
                }
                className={cn(isLoadingMessages && "opacity-60")}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <MessageSquare className="mb-4 size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Select a conversation to view messages
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
