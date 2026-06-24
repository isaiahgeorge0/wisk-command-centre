"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";
import type { TenantMessage } from "@/lib/properties/types";

type LandlordRealtimeOptions = {
  landlordUserId: string;
  propertyId?: string;
  channelSuffix?: string;
  onInsert: (message: TenantMessage) => void;
  onUpdate?: (message: TenantMessage) => void;
};

type TenantRealtimeOptions = {
  tenantId: string;
  channelSuffix?: string;
  onInsert: (message: TenantMessage) => void;
  onUpdate?: (message: TenantMessage) => void;
};

type TypingPresenceOptions = {
  channelName: string;
  currentUserId: string;
  onTypingChange: (typingUserIds: string[]) => void;
};

export function useLandlordMessagesRealtime({
  landlordUserId,
  propertyId,
  channelSuffix,
  onInsert,
  onUpdate,
}: LandlordRealtimeOptions) {
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  onInsertRef.current = onInsert;
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const supabase = createClient();
    const channelName = propertyId
      ? `landlord-messages-${landlordUserId}-${propertyId}${channelSuffix ? `-${channelSuffix}` : ""}`
      : `landlord-messages-${landlordUserId}${channelSuffix ? `-${channelSuffix}` : ""}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tenant_messages",
          filter: `landlord_user_id=eq.${landlordUserId}`,
        },
        (payload) => {
          const message = payload.new as TenantMessage;
          if (propertyId && message.property_id !== propertyId) return;
          onInsertRef.current(message);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tenant_messages",
          filter: `landlord_user_id=eq.${landlordUserId}`,
        },
        (payload) => {
          const message = payload.new as TenantMessage;
          if (propertyId && message.property_id !== propertyId) return;
          onUpdateRef.current?.(message);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [landlordUserId, propertyId, channelSuffix]);
}

export function useTenantMessagesRealtime({
  tenantId,
  channelSuffix,
  onInsert,
  onUpdate,
}: TenantRealtimeOptions) {
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  onInsertRef.current = onInsert;
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const supabase = createClient();
    const channelName = channelSuffix
      ? `tenant-messages-${tenantId}-${channelSuffix}`
      : `tenant-messages-${tenantId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tenant_messages",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          onInsertRef.current(payload.new as TenantMessage);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tenant_messages",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          onUpdateRef.current?.(payload.new as TenantMessage);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId, channelSuffix]);
}

export function useTypingPresence({
  channelName,
  currentUserId,
  onTypingChange,
}: TypingPresenceOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onTypingChangeRef = useRef(onTypingChange);
  onTypingChangeRef.current = onTypingChange;

  useEffect(() => {
    if (!channelName || channelName === "typing-none") return;

    const supabase = createClient();
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: currentUserId },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ typing: boolean }>();
        const typingIds = Object.keys(state).filter(
          (id) => id !== currentUserId && state[id]?.[0]?.typing === true
        );
        onTypingChangeRef.current(typingIds);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        if (key === currentUserId) return;
        if (newPresences[0]?.typing) {
          onTypingChangeRef.current([key]);
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        if (key === currentUserId) return;
        onTypingChangeRef.current([]);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channelRef.current = channel;
        }
      });

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelName, currentUserId]);

  const setTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current) return;
    void channelRef.current.track({ typing: isTyping });
  }, []);

  return { setTyping };
}
