"use client";

import { OnboardingOverlay } from "@/components/onboarding/onboarding-overlay";
import { OnboardingProvider } from "@/components/onboarding/onboarding-context";
import { BottomNav } from "@/components/layout/bottom-nav";
import { QuickAddFab } from "@/components/layout/quick-add-fab";
import { TopNav } from "@/components/layout/top-nav";
import { PreferencesProvider } from "@/components/preferences/preferences-context";
import { QuickAddProvider } from "@/components/quick-add/quick-add-context";
import { ProjectTourCelebration } from "@/components/spotlight-tour/project-tour-celebration";
import { SpotlightTourOverlay } from "@/components/spotlight-tour/spotlight-tour-overlay";
import { SpotlightTourProvider } from "@/components/spotlight-tour/spotlight-tour-context";
import type { Notification } from "@/lib/notifications/types";
import type { FieldVisibility } from "@/lib/preferences/types";

type AppShellProps = {
  children: React.ReactNode;
  userEmail: string;
  userName: string | null;
  fieldVisibility: FieldVisibility;
  serviceTypes: string[];
  onboardingCompleted: boolean;
  hasProjects: boolean;
  projectTourCompleted: boolean;
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
  hasProjects,
  projectTourCompleted,
  notifications,
  unreadNotificationCount,
}: AppShellProps) {
  return (
    <OnboardingProvider initialOpen={!onboardingCompleted}>
      <PreferencesProvider value={{ fieldVisibility, serviceTypes }}>
        <QuickAddProvider>
          <SpotlightTourProvider
            hasProjects={hasProjects}
            projectTourCompleted={projectTourCompleted}
          >
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
              <SpotlightTourOverlay />
              <ProjectTourCelebration />
              <OnboardingOverlay />
            </div>
          </SpotlightTourProvider>
        </QuickAddProvider>
      </PreferencesProvider>
    </OnboardingProvider>
  );
}
