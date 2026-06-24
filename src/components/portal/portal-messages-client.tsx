"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getLandlordLastSeen,
  markTenantMessagesAsRead,
  sendTenantMessage,
} from "@/app/portal/actions";
import { MessageThread } from "@/components/properties/communication/message-thread";
import { PresenceLabel } from "@/components/properties/communication/presence-label";
import { PortalPage } from "@/components/portal/portal-page";
import {
  useTenantMessagesRealtime,
  useTypingPresence,
} from "@/lib/properties/use-tenant-messages-realtime";
import type { TenantMessage } from "@/lib/properties/types";

type PortalMessagesClientProps = {
  initialMessages: TenantMessage[];
  tenantId: string;
  senderId: string;
  landlordName: string;
  landlordLastSeenAt: string | null;
  propertyName: string;
  propertyId: string;
  landlordUserId: string;
};

function dispatchPortalMessagesRead() {
  window.dispatchEvent(new CustomEvent("wisk:portal-messages-read"));
}

export function PortalMessagesClient({
  initialMessages,
  tenantId,
  senderId,
  landlordName,
  landlordLastSeenAt: initialLandlordLastSeenAt,
  propertyName,
  propertyId,
  landlordUserId,
}: PortalMessagesClientProps) {
  const [messages, setMessages] = useState<TenantMessage[]>(initialMessages);
  const [landlordLastSeenAt, setLandlordLastSeenAt] = useState(
    initialLandlordLastSeenAt
  );
  const [isOtherPartyTyping, setIsOtherPartyTyping] = useState(false);
  const markedRef = useRef(false);

  const { setTyping } = useTypingPresence({
    channelName: `typing-${tenantId}`,
    currentUserId: senderId,
    onTypingChange: (ids) => setIsOtherPartyTyping(ids.length > 0),
  });

  const refreshLandlordLastSeen = useCallback(() => {
    void getLandlordLastSeen().then(setLandlordLastSeenAt);
  }, []);

  const markRead = useCallback(async () => {
    await markTenantMessagesAsRead();
    setMessages((prev) =>
      prev.map((m) =>
        m.sender_type === "landlord" ? { ...m, read: true } : m
      )
    );
    dispatchPortalMessagesRead();
  }, []);

  useEffect(() => {
    refreshLandlordLastSeen();
  }, [refreshLandlordLastSeen]);

  useEffect(() => {
    if (!markedRef.current) {
      markedRef.current = true;
      void markRead();
    }
  }, [markRead]);

  const handleRealtimeInsert = useCallback(
    (message: TenantMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      if (message.sender_type === "landlord") {
        void markRead();
        refreshLandlordLastSeen();
      }
    },
    [markRead, refreshLandlordLastSeen]
  );

  useTenantMessagesRealtime({
    tenantId,
    onInsert: handleRealtimeInsert,
  });

  const handleSend = async (text: string) => {
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: TenantMessage = {
      id: optimisticId,
      property_id: propertyId,
      tenant_id: tenantId,
      landlord_user_id: landlordUserId,
      sender_type: "tenant",
      sender_id: senderId,
      message: text,
      read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);

    const result = await sendTenantMessage(text);
    if (!result.success || !result.data) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      return;
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === optimisticId ? result.data! : m))
    );
  };

  return (
    <PortalPage>
      <div className="flex min-h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] shadow-[var(--portal-shadow)]">
        <MessageThread
          messages={messages}
          currentSenderId={senderId}
          onSend={handleSend}
          isOtherPartyTyping={isOtherPartyTyping}
          onTypingChange={setTyping}
          typingUserName={landlordName}
          header={
            <div>
              <p className="font-semibold text-[var(--portal-text)]">
                {landlordName}
              </p>
              <p className="text-sm text-[var(--portal-muted)]">
                {propertyName}
              </p>
              <PresenceLabel lastSeenAt={landlordLastSeenAt} />
            </div>
          }
        />
      </div>
    </PortalPage>
  );
}
