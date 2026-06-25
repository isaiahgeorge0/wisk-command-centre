"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";
import type { TenantMessage } from "@/lib/properties/types";

type Props = {
  landlordUserId: string;
  children: React.ReactNode;
};

export const LANDLORD_MESSAGE_EVENT = "wisk:landlord-message";

export function PropertiesRealtimeProvider({
  landlordUserId,
  children,
}: Props) {
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
        },
        (payload) => {
          const message = payload.new as TenantMessage;
          if (message.landlord_user_id !== landlordUserId) return;
          window.dispatchEvent(
            new CustomEvent(LANDLORD_MESSAGE_EVENT, { detail: message })
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [landlordUserId]);

  return <>{children}</>;
}
