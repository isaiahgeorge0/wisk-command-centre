"use client";

import { useCallback, useEffect, useState } from "react";

import { getPortalUnreadCount } from "@/app/portal/actions";
import { useTenantMessagesRealtime } from "@/lib/properties/use-tenant-messages-realtime";
import type { TenantMessage } from "@/lib/properties/types";

export function usePortalUnreadCount(tenantId: string, initialCount: number) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const handleInsert = useCallback((message: TenantMessage) => {
    if (message.sender_type !== "landlord") return;
    void getPortalUnreadCount().then(setCount);
  }, []);

  useTenantMessagesRealtime({
    tenantId,
    channelSuffix: "unread",
    onInsert: handleInsert,
  });

  useEffect(() => {
    const handler = () => {
      void getPortalUnreadCount().then(setCount);
    };
    window.addEventListener("wisk:portal-messages-read", handler);
    return () => window.removeEventListener("wisk:portal-messages-read", handler);
  }, []);

  return count;
}
