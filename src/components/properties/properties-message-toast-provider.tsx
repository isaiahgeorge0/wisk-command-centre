"use client";

import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { getConversations } from "@/app/(dashboard)/properties/actions";
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
  const [tenantNames, setTenantNames] = useState<Record<string, string>>({});
  const tenantNamesRef = useRef(tenantNames);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    tenantNamesRef.current = tenantNames;
  }, [tenantNames]);

  useEffect(() => {
    void getConversations().then((convs) => {
      const map: Record<string, string> = {};
      for (const c of convs) map[c.tenant_id] = c.tenant_name;
      setTenantNames(map);
    });
  }, []);

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
      tenantName: tenantNamesRef.current[message.tenant_id] ?? "Tenant",
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
