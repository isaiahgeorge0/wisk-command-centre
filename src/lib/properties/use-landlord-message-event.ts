"use client";

import { useEffect } from "react";

import { LANDLORD_MESSAGE_EVENT } from "@/components/properties/properties-realtime-provider";
import type { TenantMessage } from "@/lib/properties/types";

export function useLandlordMessageEvent(
  onMessage: (message: TenantMessage) => void
) {
  useEffect(() => {
    const handler = (event: Event) => {
      const message = (event as CustomEvent<TenantMessage>).detail;
      onMessage(message);
    };
    window.addEventListener(LANDLORD_MESSAGE_EVENT, handler);
    return () => window.removeEventListener(LANDLORD_MESSAGE_EVENT, handler);
  }, [onMessage]);
}
