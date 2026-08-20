"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { WinstonTrigger } from "@/lib/winston/context-resolver";

type WinstonSidebarContextValue = {
  open: boolean;
  trigger: WinstonTrigger | null;
  canAccessWinston: boolean;
  canAccessResearchPro: boolean;
  openSidebar: (trigger: WinstonTrigger) => void;
  closeSidebar: () => void;
  toggleSidebar: (trigger: WinstonTrigger) => void;
};

const WinstonSidebarContext = createContext<WinstonSidebarContextValue | null>(
  null
);

function triggerKey(trigger: WinstonTrigger | null): string {
  if (!trigger) return "";
  if (trigger.tier === "global") return "global";
  if (trigger.tier === "section") return `section:${trigger.section}`;
  if (trigger.entity === "note") return `note:${trigger.noteId}`;
  return `record:${trigger.entity}:${trigger.recordId}`;
}

export function WinstonSidebarProvider({
  children,
  canAccessWinston,
  canAccessResearchPro = false,
}: {
  children: ReactNode;
  canAccessWinston: boolean;
  canAccessResearchPro?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<WinstonTrigger | null>(null);

  const openSidebar = useCallback((next: WinstonTrigger) => {
    setTrigger(next);
    setOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setOpen(false);
  }, []);

  const toggleSidebar = useCallback((next: WinstonTrigger) => {
    setTrigger((current) => {
      if (open && triggerKey(current) === triggerKey(next)) {
        setOpen(false);
        return current;
      }
      setOpen(true);
      return next;
    });
  }, [open]);

  const value = useMemo(
    () => ({
      open,
      trigger,
      canAccessWinston,
      canAccessResearchPro,
      openSidebar,
      closeSidebar,
      toggleSidebar,
    }),
    [
      open,
      trigger,
      canAccessWinston,
      canAccessResearchPro,
      openSidebar,
      closeSidebar,
      toggleSidebar,
    ]
  );

  return (
    <WinstonSidebarContext.Provider value={value}>
      {children}
    </WinstonSidebarContext.Provider>
  );
}

export function useWinstonSidebar() {
  const context = useContext(WinstonSidebarContext);
  if (!context) {
    throw new Error("useWinstonSidebar must be used within WinstonSidebarProvider");
  }
  return context;
}
