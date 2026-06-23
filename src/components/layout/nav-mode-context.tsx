"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type NavMode = "standard" | "properties";

type NavModeContextValue = {
  navMode: NavMode;
  setNavMode: (mode: NavMode) => void;
};

const NavModeContext = createContext<NavModeContextValue | null>(null);

export function NavModeProvider({ children }: { children: React.ReactNode }) {
  const [navMode, setNavMode] = useState<NavMode>("standard");

  const value = useMemo(
    () => ({
      navMode,
      setNavMode,
    }),
    [navMode]
  );

  return (
    <NavModeContext.Provider value={value}>{children}</NavModeContext.Provider>
  );
}

export function useNavMode() {
  const context = useContext(NavModeContext);
  if (!context) {
    throw new Error("useNavMode must be used within NavModeProvider");
  }
  return context;
}
