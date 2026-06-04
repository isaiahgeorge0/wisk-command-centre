"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type QuickAddContextValue = {
  projectAddOpen: boolean;
  setProjectAddOpen: (open: boolean) => void;
  openProjectAdd: () => void;
};

const QuickAddContext = createContext<QuickAddContextValue | null>(null);

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [projectAddOpen, setProjectAddOpen] = useState(false);

  const openProjectAdd = useCallback(() => {
    setProjectAddOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      projectAddOpen,
      setProjectAddOpen,
      openProjectAdd,
    }),
    [projectAddOpen, openProjectAdd]
  );

  return (
    <QuickAddContext.Provider value={value}>{children}</QuickAddContext.Provider>
  );
}

export function useQuickAdd() {
  const context = useContext(QuickAddContext);
  if (!context) {
    throw new Error("useQuickAdd must be used within QuickAddProvider");
  }
  return context;
}
