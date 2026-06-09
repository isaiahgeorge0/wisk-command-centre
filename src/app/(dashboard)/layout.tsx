import { headers } from "next/headers";

import { getGoals } from "@/app/(dashboard)/goals/actions";
import { getProjects } from "@/app/(dashboard)/projects/actions";
import { filterContentGoals } from "@/lib/content/selectors";
import {
  generateNotifications,
  getNotifications,
} from "@/app/(dashboard)/notifications/actions";
import { getActiveAnnouncements } from "@/app/(dashboard)/admin/actions";
import { getPublishedChangelog, getUnreadChangelogCount } from "@/app/(dashboard)/changelog/actions";
import { AppShell } from "@/components/layout/app-shell";
import { ThemePreferenceSync } from "@/components/theme/theme-preference-sync";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { resolveDisplayName } from "@/lib/auth/resolve-display-name";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { getOrCreateUserPreferences } from "@/lib/preferences/get-user-preferences";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isWelcomeRoute = pathname === "/welcome";

  const { user } = await getAuthContext();

  if (isWelcomeRoute) {
    const preferences = await getOrCreateUserPreferences();

    return (
      <>
        <ThemePreferenceSync
          themePreference={preferences.themePreference}
          enabled={!preferences.personalisationCompleted}
        />
        {children}
      </>
    );
  }

  await generateNotifications();
  const [profile, preferences, notificationSnapshot, projects, goals, announcements, changelogEntries, unreadChangelogCount] =
    await Promise.all([
      getUserProfile(),
      getOrCreateUserPreferences(),
      getNotifications(),
      getProjects(),
      getGoals(),
      getActiveAnnouncements(user.id),
      getPublishedChangelog(10),
      getUnreadChangelogCount(),
    ]);

  const displayName = resolveDisplayName({
    displayName: preferences.displayName,
    profileName: profile.name,
    email: profile.email,
  });

  return (
    <>
      <ThemePreferenceSync
        themePreference={preferences.themePreference}
        enabled={preferences.personalisationCompleted}
      />
      <AppShell
        userEmail={profile.email}
        userName={displayName}
        fieldVisibility={preferences.fieldVisibility}
        serviceTypes={preferences.serviceTypes}
        onboardingCompleted={preferences.onboardingCompleted}
        hasProjects={projects.length > 0}
        projectTourCompleted={preferences.projectTourCompleted}
        notifications={notificationSnapshot.notifications}
        unreadNotificationCount={notificationSnapshot.unreadCount}
        announcements={announcements}
        displayName={displayName}
        feedbackWelcomeShown={preferences.feedbackWelcomeShown}
        changelogEntries={changelogEntries}
        unreadChangelogCount={unreadChangelogCount}
        projectOptions={projects.map((project) => ({
          id: project.id,
          project_name: project.project_name,
        }))}
        contentGoals={filterContentGoals(goals).map((goal) => ({
          id: goal.id,
          title: goal.title,
        }))}
      >
        {children}
      </AppShell>
    </>
  );
}
