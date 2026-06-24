"use client";

import { useCallback, useEffect, useState } from "react";

import { getTotalUnreadMessageCount } from "@/app/(dashboard)/properties/actions";
import { useLandlordMessagesRealtime } from "@/lib/properties/use-tenant-messages-realtime";
import type { TenantMessage } from "@/lib/properties/types";

export function useUnreadMessageCount(
  landlordUserId: string,
  initialCount: number
) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const handleInsert = useCallback((message: TenantMessage) => {
    if (message.sender_type !== "tenant") return;
    void getTotalUnreadMessageCount().then(setCount);
  }, []);

  useLandlordMessagesRealtime({
    landlordUserId,
    channelSuffix: "unread",
    onInsert: handleInsert,
  });

  useEffect(() => {
    const handler = () => {
      void getTotalUnreadMessageCount().then(setCount);
    };
    window.addEventListener("wisk:messages-read", handler);
    return () => window.removeEventListener("wisk:messages-read", handler);
  }, []);

  return count;
}
