"use client";

import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { MessageToast } from "@/components/properties/communication/message-toast";
import { truncateMessagePreview } from "@/lib/properties/format";
import { useLandlordMessagesRealtime } from "@/lib/properties/use-tenant-messages-realtime";
import type { TenantMessage } from "@/lib/properties/types";

type Props = {
  landlordUserId: string;
  children: React.ReactNode;
};

type ToastState = {
  tenantId: string;
  tenantName: string;
  preview: string;
} | null;

export function PropertiesMessageToastProvider({
  landlordUserId,
  children,
}: Props) {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleInsert = useCallback((message: TenantMessage) => {
    if (message.sender_type !== "tenant") return;
    if (message.sender_id === message.landlord_user_id) return;
    if (pathnameRef.current === "/properties/communication") return;

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

    setToast({
      tenantId: message.tenant_id,
      tenantName: "Tenant",
      preview: truncateMessagePreview(message.message),
    });

    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useLandlordMessagesRealtime({
    landlordUserId,
    channelSuffix: "toast",
    onInsert: handleInsert,
  });

  return (
    <>
      {children}
      <AnimatePresence>
        {toast ? (
          <MessageToast
            senderName={toast.tenantName}
            preview={toast.preview}
            onDismiss={() => setToast(null)}
            onClick={() => {
              setToast(null);
              window.location.href = "/properties/communication";
            }}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
