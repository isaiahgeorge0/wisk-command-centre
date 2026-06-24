"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";

import { updatePortalTheme } from "@/app/portal/actions";
import type { PortalTheme } from "@/lib/portal/types";
import { cn } from "@/lib/utils";

import "./portal-theme.css";

type PortalThemeContextValue = {
  theme: PortalTheme;
  toggleTheme: () => void;
  isPending: boolean;
};

const PortalThemeContext = createContext<PortalThemeContextValue | null>(null);

export function usePortalTheme() {
  const context = useContext(PortalThemeContext);
  if (!context) {
    throw new Error("usePortalTheme must be used within PortalThemeProvider");
  }
  return context;
}

type PortalThemeProviderProps = {
  initialTheme?: PortalTheme;
  persistTheme?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function PortalThemeProvider({
  initialTheme = "light",
  persistTheme = true,
  className,
  children,
}: PortalThemeProviderProps) {
  const [theme, setTheme] = useState<PortalTheme>(initialTheme);
  const [isPending, startTransition] = useTransition();

  const toggleTheme = useCallback(() => {
    const nextTheme: PortalTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);

    if (!persistTheme) return;

    startTransition(async () => {
      const result = await updatePortalTheme(nextTheme);
      if (!result.success) {
        setTheme(theme);
      }
    });
  }, [persistTheme, theme]);

  const value = useMemo(
    () => ({ theme, toggleTheme, isPending }),
    [theme, toggleTheme, isPending]
  );

  return (
    <PortalThemeContext.Provider value={value}>
      <div
        className={cn(
          "portal-root",
          theme === "dark" ? "portal-dark" : "portal-light",
          className
        )}
      >
        {children}
      </div>
    </PortalThemeContext.Provider>
  );
}
