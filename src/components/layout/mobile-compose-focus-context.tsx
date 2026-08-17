"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type MobileComposeFocusContextValue = {
  isComposeFocused: boolean;
  setComposeFocused: (focused: boolean) => void;
};

const MobileComposeFocusContext =
  createContext<MobileComposeFocusContextValue | null>(null);

export function MobileComposeFocusProvider({ children }: { children: ReactNode }) {
  const [focusCount, setFocusCount] = useState(0);

  const setComposeFocused = useCallback((focused: boolean) => {
    setFocusCount((count) => {
      if (focused) return count + 1;
      return Math.max(0, count - 1);
    });
  }, []);

  const value = useMemo(
    () => ({
      isComposeFocused: focusCount > 0,
      setComposeFocused,
    }),
    [focusCount, setComposeFocused]
  );

  return (
    <MobileComposeFocusContext.Provider value={value}>
      {children}
    </MobileComposeFocusContext.Provider>
  );
}

export function useMobileComposeFocus() {
  const context = useContext(MobileComposeFocusContext);
  if (!context) {
    throw new Error(
      "useMobileComposeFocus must be used within MobileComposeFocusProvider"
    );
  }
  return context;
}

/** No-op when rendered outside the dashboard shell (e.g. tenant portal). */
export function useOptionalMobileComposeFocus() {
  const context = useContext(MobileComposeFocusContext);
  return (
    context ?? {
      isComposeFocused: false,
      setComposeFocused: () => {},
    }
  );
}
