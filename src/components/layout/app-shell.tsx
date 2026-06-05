"use client";

import { OnboardingOverlay } from "@/components/onboarding/onboarding-overlay";
import { OnboardingProvider } from "@/components/onboarding/onboarding-context";
import { BottomNav } from "@/components/layout/bottom-nav";
import { QuickAddFab } from "@/components/layout/quick-add-fab";
import { TopNav } from "@/components/layout/top-nav";
import { PreferencesProvider } from "@/components/preferences/preferences-context";
import { QuickAddProvider } from "@/components/quick-add/quick-add-context";
import type { Notification } from "@/lib/notifications/types";
import type { FieldVisibility } from "@/lib/preferences/types";

type AppShellProps = {
  children: React.ReactNode;
  userEmail: string;
  userName: string | null;
  fieldVisibility: FieldVisibility;
  serviceTypes: string[];
  onboardingCompleted: boolean;
  notifications: Notification[];
  unreadNotificationCount: number;
};

export function AppShell({
  children,
  userEmail,
  userName,
  fieldVisibility,
  serviceTypes,
  onboardingCompleted,
  notifications,
  unreadNotificationCount,
}: AppShellProps) {
  return (
    <OnboardingProvider initialOpen={!onboardingCompleted}>
      <PreferencesProvider value={{ fieldVisibility, serviceTypes }}>
        <QuickAddProvider>
          <div className="min-h-screen overflow-x-hidden">
            <TopNav
              userEmail={userEmail}
              userName={userName}
              notifications={notifications}
              unreadNotificationCount={unreadNotificationCount}
            />
            <main className="mx-auto max-w-7xl px-4 pt-16 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-6 md:pb-24 lg:px-8">
              {children}
            </main>
            <QuickAddFab />
            <BottomNav />
            <OnboardingOverlay />
          </div>
        </QuickAddProvider>
      </PreferencesProvider>
    </OnboardingProvider>
  );
}
