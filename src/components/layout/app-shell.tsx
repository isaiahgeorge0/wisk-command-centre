"use client";

import React, { Suspense } from "react";

import { AnnouncementBanner } from "@/components/announcements/announcement-banner";
import { PasswordUpdatedToastHandler } from "@/components/auth/password-updated-toast-handler";
import { FeedbackWelcomeModal } from "@/components/feedback/feedback-welcome-modal";
import { OnboardingOverlay } from "@/components/onboarding/onboarding-overlay";
import { UsernamePromptModal } from "@/components/username/username-prompt-modal";
import { OnboardingProvider } from "@/components/onboarding/onboarding-context";
import { BottomNav } from "@/components/layout/bottom-nav";
import { QuickAddFab } from "@/components/layout/quick-add-fab";
import { TopNav } from "@/components/layout/top-nav";
import { PreferencesProvider } from "@/components/preferences/preferences-context";
import { QuickAddProvider, useQuickAdd } from "@/components/quick-add/quick-add-context";
import { ProjectTourCelebration } from "@/components/spotlight-tour/project-tour-celebration";
import { SpotlightTourOverlay } from "@/components/spotlight-tour/spotlight-tour-overlay";
import { SpotlightTourProvider } from "@/components/spotlight-tour/spotlight-tour-context";
import { ContentFormDialog } from "@/components/content/content-form-dialog";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import type { Goal } from "@/lib/goals/types";
import type { ChangelogEntry } from "@/lib/changelog/types";
import type { ActiveAnnouncement } from "@/lib/admin/types";
import type { Notification } from "@/lib/notifications/types";
import type { FieldVisibility } from "@/lib/preferences/types";
import type { ProjectOption } from "@/lib/tasks/types";

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
  announcements: ActiveAnnouncement[];
  displayName: string;
  feedbackWelcomeShown: boolean;
  changelogEntries: ChangelogEntry[];
  unreadChangelogCount: number;
  projectOptions: ProjectOption[];
  contentGoals: Pick<Goal, "id" | "title">[];
  usernameSet: boolean;
};

function GlobalTaskFormDialog({
  projects,
}: {
  projects: ProjectOption[];
}) {
  const { taskAddOpen, setTaskAddOpen } = useQuickAdd();

  return (
    <TaskFormDialog
      open={taskAddOpen}
      onOpenChange={setTaskAddOpen}
      projects={projects}
    />
  );
}

function GlobalContentFormDialog({
  contentGoals,
}: {
  contentGoals: Pick<Goal, "id" | "title">[];
}) {
  const { contentAddOpen, setContentAddOpen } = useQuickAdd();

  return (
    <ContentFormDialog
      open={contentAddOpen}
      onOpenChange={setContentAddOpen}
      contentGoals={contentGoals}
    />
  );
}

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
  announcements,
  displayName,
  feedbackWelcomeShown,
  changelogEntries,
  unreadChangelogCount,
  projectOptions,
  contentGoals,
  usernameSet,
}: AppShellProps) {
  const [showUsernamePrompt, setShowUsernamePrompt] = React.useState(
    !usernameSet
  );

  const showFeedbackWelcome =
    onboardingCompleted &&
    projectTourCompleted &&
    !feedbackWelcomeShown;

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
                changelogEntries={changelogEntries}
                unreadChangelogCount={unreadChangelogCount}
              />
              <main className="mx-auto max-w-7xl px-4 pt-16 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-6 md:pb-24 lg:px-8">
                <AnnouncementBanner announcements={announcements} />
                {children}
              </main>
              <QuickAddFab />
              <GlobalTaskFormDialog projects={projectOptions} />
              <GlobalContentFormDialog contentGoals={contentGoals} />
              <BottomNav />
              <SpotlightTourOverlay />
              <ProjectTourCelebration displayName={displayName} />
              <FeedbackWelcomeModal
                displayName={displayName}
                open={showFeedbackWelcome}
              />
              <OnboardingOverlay />
              <Suspense fallback={null}>
                <PasswordUpdatedToastHandler />
              </Suspense>
              {showUsernamePrompt ? (
                <UsernamePromptModal
                  onComplete={() => setShowUsernamePrompt(false)}
                />
              ) : null}
            </div>
          </SpotlightTourProvider>
        </QuickAddProvider>
      </PreferencesProvider>
    </OnboardingProvider>
  );
}
