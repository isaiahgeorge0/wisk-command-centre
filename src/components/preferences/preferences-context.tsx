"use client";

import { createContext, useContext } from "react";

import type { FieldVisibility } from "@/lib/preferences/types";

export type PreferencesContextValue = {
  fieldVisibility: FieldVisibility;
  serviceTypes: string[];
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: PreferencesContextValue;
}) {
  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return context;
}
