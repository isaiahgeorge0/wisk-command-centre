"use client";

import { useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";
import type { TenantMessage } from "@/lib/properties/types";

type LandlordRealtimeOptions = {
  landlordUserId: string;
  propertyId?: string;
  onInsert: (message: TenantMessage) => void;
  onUpdate?: (message: TenantMessage) => void;
};

type TenantRealtimeOptions = {
  tenantId: string;
  onInsert: (message: TenantMessage) => void;
  onUpdate?: (message: TenantMessage) => void;
};

export function useLandlordMessagesRealtime({
  landlordUserId,
  propertyId,
  onInsert,
  onUpdate,
}: LandlordRealtimeOptions) {
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  onInsertRef.current = onInsert;
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`landlord-messages-${landlordUserId}`)
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
  }, [landlordUserId, propertyId]);
}

export function useTenantMessagesRealtime({
  tenantId,
  onInsert,
  onUpdate,
}: TenantRealtimeOptions) {
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  onInsertRef.current = onInsert;
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`tenant-messages-${tenantId}`)
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
  }, [tenantId]);
}
