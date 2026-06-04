"use client";

import { QuickAddFab } from "@/components/layout/quick-add-fab";
import { TopNav } from "@/components/layout/top-nav";
import { PreferencesProvider } from "@/components/preferences/preferences-context";
import { QuickAddProvider } from "@/components/quick-add/quick-add-context";
import type { FieldVisibility } from "@/lib/preferences/types";

type AppShellProps = {
  children: React.ReactNode;
  userEmail: string;
  userName: string | null;
  fieldVisibility: FieldVisibility;
  serviceTypes: string[];
};

export function AppShell({
  children,
  userEmail,
  userName,
  fieldVisibility,
  serviceTypes,
}: AppShellProps) {
  return (
    <PreferencesProvider value={{ fieldVisibility, serviceTypes }}>
      <QuickAddProvider>
        <div className="min-h-screen">
          <TopNav userEmail={userEmail} userName={userName} />
          <main className="mx-auto max-w-7xl px-6 pt-16 pb-24 lg:px-8">
            {children}
          </main>
          <QuickAddFab />
        </div>
      </QuickAddProvider>
    </PreferencesProvider>
  );
}
