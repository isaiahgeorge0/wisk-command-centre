"use client";

import { QuickAddFab } from "@/components/layout/quick-add-fab";
import { TopNav } from "@/components/layout/top-nav";
import { QuickAddProvider } from "@/components/quick-add/quick-add-context";
import { ThemeProvider } from "@/components/theme-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QuickAddProvider>
        <div className="min-h-screen">
          <TopNav />
          <main className="mx-auto max-w-7xl px-6 pt-16 pb-24 lg:px-8">
            {children}
          </main>
          <QuickAddFab />
        </div>
      </QuickAddProvider>
    </ThemeProvider>
  );
}
