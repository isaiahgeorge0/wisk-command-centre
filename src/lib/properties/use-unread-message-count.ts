"use client";

import { useCallback, useEffect, useState } from "react";

import { getTotalUnreadMessageCount } from "@/app/(dashboard)/properties/actions";
import { useLandlordMessageEvent } from "@/lib/properties/use-landlord-message-event";
import type { TenantMessage } from "@/lib/properties/types";

export function useUnreadMessageCount(initialCount: number) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useLandlordMessageEvent(
    useCallback((message: TenantMessage) => {
      if (message.sender_type !== "tenant") return;
      void getTotalUnreadMessageCount().then(setCount);
    }, [])
  );

  useEffect(() => {
    const handler = () => {
      void getTotalUnreadMessageCount().then(setCount);
    };
    window.addEventListener("wisk:messages-read", handler);
    return () => window.removeEventListener("wisk:messages-read", handler);
  }, []);

  return count;
}
