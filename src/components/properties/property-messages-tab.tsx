"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  getMessages,
  markMessagesAsRead,
  sendLandlordMessage,
} from "@/app/(dashboard)/properties/actions";
import { MessageThread } from "@/components/properties/communication/message-thread";
import { PresenceLabel } from "@/components/properties/communication/presence-label";
import { getTenantFullName } from "@/lib/properties/tenant-form";
import {
  useLandlordMessagesRealtime,
  useTypingPresence,
} from "@/lib/properties/use-tenant-messages-realtime";
import type { Tenant, TenantMessage } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type PropertyMessagesTabProps = {
  propertyId: string;
  tenants: Tenant[];
  landlordUserId: string;
};

export function PropertyMessagesTab({
  propertyId,
  tenants,
  landlordUserId,
}: PropertyMessagesTabProps) {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(
    tenants.length === 1 ? tenants[0]?.id ?? null : null
  );
  const [messages, setMessages] = useState<TenantMessage[]>([]);
  const [isOtherPartyTyping, setIsOtherPartyTyping] = useState(false);
  const [isLoading, startLoad] = useTransition();
  const selectedTenantRef = useRef<string | null>(null);

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  useEffect(() => {
    selectedTenantRef.current = selectedTenantId;
  }, [selectedTenantId]);

  const { setTyping } = useTypingPresence({
    channelName: selectedTenantId
      ? `typing-${selectedTenantId}`
      : "typing-none",
    currentUserId: landlordUserId,
    onTypingChange: (ids) => setIsOtherPartyTyping(ids.length > 0),
  });

  const loadThread = useCallback((tenantId: string) => {
    startLoad(async () => {
      const [loaded] = await Promise.all([
        getMessages(tenantId),
        markMessagesAsRead(tenantId),
      ]);
      setMessages(loaded);
      window.dispatchEvent(new CustomEvent("wisk:messages-read"));
    });
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      setIsOtherPartyTyping(false);
      loadThread(selectedTenantId);
    } else {
      setMessages([]);
    }
  }, [selectedTenantId, loadThread]);

  const handleRealtimeInsert = useCallback((message: TenantMessage) => {
    if (message.property_id !== propertyId) return;

    if (selectedTenantRef.current === message.tenant_id) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      if (message.sender_type === "tenant") {
        void markMessagesAsRead(message.tenant_id);
        window.dispatchEvent(new CustomEvent("wisk:messages-read"));
      }
    }
  }, [propertyId]);

  useLandlordMessagesRealtime({
    landlordUserId,
    propertyId,
    onInsert: handleRealtimeInsert,
  });

  const handleSend = async (text: string) => {
    if (!selectedTenant) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: TenantMessage = {
      id: optimisticId,
      property_id: propertyId,
      tenant_id: selectedTenant.id,
      landlord_user_id: landlordUserId,
      sender_type: "landlord",
      sender_id: landlordUserId,
      message: text,
      read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);

    const result = await sendLandlordMessage(
      selectedTenant.id,
      propertyId,
      text
    );

    if (!result.success || !result.data) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      return;
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === optimisticId ? result.data! : m))
    );
  };

  if (tenants.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-amber-500/20 bg-card/40 px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Add a tenant to start messaging.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40">
      {tenants.length > 1 ? (
        <div className="flex gap-1 overflow-x-auto border-b border-border/60 p-2">
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              type="button"
              onClick={() => setSelectedTenantId(tenant.id)}
              className={cn(
                "min-h-10 shrink-0 rounded-md px-3 text-sm font-medium transition-colors",
                selectedTenantId === tenant.id
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {getTenantFullName(tenant)}
            </button>
          ))}
        </div>
      ) : null}

      {selectedTenant ? (
        <MessageThread
          messages={messages}
          currentSenderId={landlordUserId}
          onSend={handleSend}
          isOtherPartyTyping={isOtherPartyTyping}
          onTypingChange={setTyping}
          typingUserName={getTenantFullName(selectedTenant)}
          header={
            <div>
              <p className="font-medium text-foreground">
                {getTenantFullName(selectedTenant)}
              </p>
              <p className="text-sm text-muted-foreground">Tenant messages</p>
              <PresenceLabel lastSeenAt={selectedTenant.last_seen_at} />
            </div>
          }
          className={cn(isLoading && "opacity-60")}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Select a tenant to view messages
          </p>
        </div>
      )}
    </div>
  );
}
