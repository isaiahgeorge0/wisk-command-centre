import { getProjects } from "@/app/(dashboard)/projects/actions";
import {
  generateNotifications,
  getNotifications,
} from "@/app/(dashboard)/notifications/actions";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { getOrCreateUserPreferences } from "@/lib/preferences/get-user-preferences";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getAuthContext();
  await generateNotifications();
  const [profile, preferences, notificationSnapshot, projects] =
    await Promise.all([
      getUserProfile(),
      getOrCreateUserPreferences(),
      getNotifications(),
      getProjects(),
    ]);

  const displayName =
    profile.name?.trim() ||
    profile.email.split("@")[0] ||
    null;

  return (
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
    >
      {children}
    </AppShell>
  );
}
