"use server";

import { revalidatePath } from "next/cache";

import type {
  AccessRequest,
  AccessRequestFilter,
  ActionResult,
  ActiveAnnouncement,
  AdminStats,
  AdminUser,
  Announcement,
} from "@/lib/admin/types";
import type {
  AdminFeedback,
  FeedbackFilter,
  FeedbackStats,
  FeedbackStatus,
} from "@/lib/feedback/types";
import type { ChangelogEntry, ChangelogType } from "@/lib/changelog/types";
import {
  SECTION_BAR_COLORS,
  SECTION_LABELS,
  type AdminUserHealth,
  type PlatformMetrics,
  type SectionKey,
  type UserActivityStatus,
  type UserHealthSummary,
} from "@/lib/admin/platform";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function startOfWeekUtc(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysFromMonday
    )
  );
  return monday.toISOString();
}

function revalidateAdminPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/users");
  revalidatePath("/admin/announcements");
  revalidatePath("/admin/feedback");
  revalidatePath("/admin/changelog");
  revalidatePath("/");
}

function sortAccessRequests(requests: AccessRequest[]): AccessRequest[] {
  return [...requests].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") {
      return -1;
    }
    if (b.status === "pending" && a.status !== "pending") {
      return 1;
    }
    if (a.status === "pending" && b.status === "pending") {
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

async function getAuthLastSignInMap(
  supabase: ReturnType<typeof createAdminClient>
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error("getAuthLastSignInMap:", error);
      break;
    }

    for (const user of data.users) {
      map.set(user.id, user.last_sign_in_at ?? null);
    }

    if (data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  return map;
}

function countByUserId(
  rows: { user_id: string }[] | null
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }
  return counts;
}

function getActivityStatus(lastSignIn: string | null): UserActivityStatus {
  if (!lastSignIn) {
    return "dormant";
  }
  const days = Math.floor(
    (Date.now() - new Date(lastSignIn).getTime()) / 86_400_000
  );
  if (days <= 7) {
    return "active";
  }
  if (days <= 30) {
    return "inactive";
  }
  return "dormant";
}

export async function getAccessRequests(
  filter: AccessRequestFilter = "all"
): Promise<AccessRequest[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  let query = supabase
    .from("access_requests")
    .select("id, name, email, status, created_at, notes")
    .order("created_at", { ascending: false });

  if (filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getAccessRequests:", error);
    return [];
  }

  return sortAccessRequests((data ?? []) as AccessRequest[]);
}

export async function updateAccessRequestNotes(
  id: string,
  notes: string
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("access_requests")
    .update({ notes: notes.trim() || null })
    .eq("id", id);

  if (error) {
    console.error("updateAccessRequestNotes:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function approveRequest(
  id: string,
  email: string,
  name: string,
  welcomeMessage?: string
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    {
      data: {
        name: name.trim(),
        welcome_message: welcomeMessage?.trim() || undefined,
      },
      redirectTo: `${siteUrl}/auth/callback`,
    }
  );

  if (inviteError) {
    const alreadyRegistered =
      inviteError.message.toLowerCase().includes("already") ||
      inviteError.message.toLowerCase().includes("registered");

    if (!alreadyRegistered) {
      console.error("approveRequest invite:", inviteError);
      return { success: false, error: inviteError.message };
    }
  }

  const { error: updateError } = await supabase
    .from("access_requests")
    .update({ status: "approved" })
    .eq("id", id);

  if (updateError) {
    console.error("approveRequest update:", updateError);
    return { success: false, error: updateError.message };
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function declineRequest(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("access_requests")
    .update({ status: "declined" })
    .eq("id", id);

  if (error) {
    console.error("declineRequest:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function getUsers(): Promise<AdminUser[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUsers:", error);
    return [];
  }

  return (data ?? []) as AdminUser[];
}

export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin();
  const supabase = createAdminClient();
  const weekStart = startOfWeekUtc();

  const [
    totalRequestsResult,
    pendingRequestsResult,
    totalUsersResult,
    requestsThisWeekResult,
    recentRequestsResult,
    recentUsersResult,
  ] = await Promise.all([
    supabase.from("access_requests").select("id", { count: "exact", head: true }),
    supabase
      .from("access_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase
      .from("access_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekStart),
    supabase
      .from("access_requests")
      .select("id, name, email, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("users")
      .select("id, email, name, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    totalRequests: totalRequestsResult.count ?? 0,
    pendingRequests: pendingRequestsResult.count ?? 0,
    totalUsers: totalUsersResult.count ?? 0,
    requestsThisWeek: requestsThisWeekResult.count ?? 0,
    recentRequests: (recentRequestsResult.data ?? []) as AccessRequest[],
    recentUsers: (recentUsersResult.data ?? []) as AdminUser[],
  };
}

export async function getAnnouncements(): Promise<Announcement[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("announcements")
    .select(
      `
      id,
      title,
      message,
      created_at,
      expires_at,
      created_by,
      announcement_dismissals ( count )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAnnouncements:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const dismissals = row.announcement_dismissals as
      | { count: number }[]
      | null;
    return {
      id: row.id,
      title: row.title,
      message: row.message,
      created_at: row.created_at,
      expires_at: row.expires_at,
      created_by: row.created_by,
      dismissal_count: dismissals?.[0]?.count ?? 0,
    };
  });
}

export async function createAnnouncement(
  title: string,
  message: string,
  expiresAt?: string | null
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const trimmedTitle = title.trim();
  const trimmedMessage = message.trim();

  if (!trimmedTitle || !trimmedMessage) {
    return { success: false, error: "Title and message are required." };
  }

  const expiresValue = expiresAt?.trim();
  let parsedExpiresAt: string | null = null;
  if (expiresValue) {
    parsedExpiresAt = new Date(`${expiresValue}T23:59:59.999Z`).toISOString();
  }

  const { error } = await supabase.from("announcements").insert({
    title: trimmedTitle,
    message: trimmedMessage,
    expires_at: parsedExpiresAt,
    created_by: admin.id,
  });

  if (error) {
    console.error("createAnnouncement:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.from("announcements").delete().eq("id", id);

  if (error) {
    console.error("deleteAnnouncement:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function getActiveAnnouncements(
  userId: string
): Promise<ActiveAnnouncement[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: announcements, error: announcementsError }, { data: dismissals, error: dismissalsError }] =
    await Promise.all([
      supabase
        .from("announcements")
        .select("id, title, message, created_at, expires_at")
        .lte("created_at", now)
        .order("created_at", { ascending: true }),
      supabase
        .from("announcement_dismissals")
        .select("announcement_id")
        .eq("user_id", userId),
    ]);

  if (announcementsError) {
    console.error("getActiveAnnouncements:", announcementsError);
    return [];
  }

  if (dismissalsError) {
    console.error("getActiveAnnouncements dismissals:", dismissalsError);
    return [];
  }

  const dismissedIds = new Set(
    (dismissals ?? []).map((row) => row.announcement_id)
  );
  const nowMs = Date.now();

  return (announcements ?? [])
    .filter((row) => {
      if (dismissedIds.has(row.id)) {
        return false;
      }
      if (!row.expires_at) {
        return true;
      }
      return new Date(row.expires_at).getTime() > nowMs;
    })
    .map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
    }));
}

export async function dismissAnnouncement(
  announcementId: string
): Promise<ActionResult> {
  const { user } = await getAuthContext();
  const supabase = await createClient();

  const { error } = await supabase.from("announcement_dismissals").insert({
    user_id: user.id,
    announcement_id: announcementId,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: true };
    }
    console.error("dismissAnnouncement:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function getFeedback(
  filter: FeedbackFilter = "all"
): Promise<AdminFeedback[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  let query = supabase
    .from("feedback")
    .select(
      `
      id,
      user_id,
      type,
      message,
      status,
      created_at,
      admin_notes,
      users ( name, email )
    `
    )
    .order("created_at", { ascending: false });

  if (filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getFeedback:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const userRaw = row.users as
      | { name: string | null; email: string }
      | { name: string | null; email: string }[]
      | null;
    const user = Array.isArray(userRaw) ? userRaw[0] : userRaw;
    return {
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      message: row.message,
      status: row.status,
      created_at: row.created_at,
      admin_notes: row.admin_notes,
      user_name: user?.name ?? null,
      user_email: user?.email ?? "",
    };
  }) as AdminFeedback[];
}

export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("feedback")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("updateFeedbackStatus:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function updateFeedbackNotes(
  id: string,
  notes: string
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("feedback")
    .update({ admin_notes: notes.trim() || null })
    .eq("id", id);

  if (error) {
    console.error("updateFeedbackNotes:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function getFeedbackStats(): Promise<FeedbackStats> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");

  if (error) {
    console.error("getFeedbackStats:", error);
    return { newCount: 0 };
  }

  return { newCount: count ?? 0 };
}

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  await requireAdmin();
  const supabase = createAdminClient();

  const [
    projectsResult,
    tasksResult,
    goalsResult,
    ideasResult,
    leadsResult,
    contentResult,
  ] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("tasks").select("id", { count: "exact", head: true }),
    supabase.from("goals").select("id", { count: "exact", head: true }),
    supabase.from("ideas").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("content_posts").select("id", { count: "exact", head: true }),
  ]);

  const counts: Record<SectionKey, number> = {
    projects: projectsResult.count ?? 0,
    tasks: tasksResult.count ?? 0,
    goals: goalsResult.count ?? 0,
    ideas: ideasResult.count ?? 0,
    leads: leadsResult.count ?? 0,
    content: contentResult.count ?? 0,
  };

  const sectionActivity = (Object.keys(counts) as SectionKey[])
    .map((key) => ({
      key,
      label: SECTION_LABELS[key],
      count: counts[key],
      barClass: SECTION_BAR_COLORS[key],
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalProjects: counts.projects,
    totalTasks: counts.tasks,
    totalLeads: counts.leads,
    totalContentPosts: counts.content,
    sectionActivity,
  };
}

export async function getUsersWithHealth(): Promise<AdminUserHealth[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const [usersResult, projectsResult, tasksResult, authMap] = await Promise.all([
    supabase.from("users").select("id, email, name, created_at").order("created_at", { ascending: false }),
    supabase.from("projects").select("user_id"),
    supabase.from("tasks").select("user_id"),
    getAuthLastSignInMap(supabase),
  ]);

  if (usersResult.error) {
    console.error("getUsersWithHealth:", usersResult.error);
    return [];
  }

  const projectCounts = countByUserId(projectsResult.data);
  const taskCounts = countByUserId(tasksResult.data);
  const now = Date.now();

  return (usersResult.data ?? []).map((user) => {
    const lastSignIn = authMap.get(user.id) ?? null;
    const daysSinceJoined = Math.floor(
      (now - new Date(user.created_at).getTime()) / 86_400_000
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
      last_sign_in_at: lastSignIn,
      project_count: projectCounts.get(user.id) ?? 0,
      task_count: taskCounts.get(user.id) ?? 0,
      days_since_joined: daysSinceJoined,
      activity_status: getActivityStatus(lastSignIn),
    };
  });
}

export async function getUserHealthSummary(): Promise<UserHealthSummary> {
  const users = await getUsersWithHealth();
  return users.reduce(
    (acc, user) => {
      acc[user.activity_status] += 1;
      return acc;
    },
    { active: 0, inactive: 0, dormant: 0 }
  );
}

export async function createUserManually(
  name: string,
  email: string
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedName || !trimmedEmail) {
    return { success: false, error: "Name and email are required." };
  }

  const { error } = await supabase.auth.admin.inviteUserByEmail(trimmedEmail, {
    data: { name: trimmedName },
    redirectTo: `${siteUrl}/auth/callback`,
  });

  if (error) {
    console.error("createUserManually:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function resetUserOnboarding(userId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("user_preferences")
    .update({
      onboarding_completed: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("resetUserOnboarding:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function resetUserPersonalisation(
  userId: string
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("user_preferences")
    .update({
      personalisation_completed: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("resetUserPersonalisation:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  revalidatePath("/welcome");
  return { success: true };
}

export async function getChangelogEntries(): Promise<ChangelogEntry[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("changelog_entries")
    .select("id, title, description, type, published_at, created_by")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("getChangelogEntries:", error);
    return [];
  }

  return (data ?? []) as ChangelogEntry[];
}

export async function createChangelogEntry(input: {
  title: string;
  description: string;
  type: ChangelogType;
  publishedAt: string;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const title = input.title.trim();
  const description = input.description.trim();

  if (!title || !description) {
    return { success: false, error: "Title and description are required." };
  }

  const publishedAt = input.publishedAt.trim();
  const parsedPublishedAt = publishedAt
    ? new Date(`${publishedAt}T12:00:00.000Z`).toISOString()
    : new Date().toISOString();

  const { error } = await supabase.from("changelog_entries").insert({
    title,
    description,
    type: input.type,
    published_at: parsedPublishedAt,
    created_by: admin.id,
  });

  if (error) {
    console.error("createChangelogEntry:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  revalidatePath("/");
  return { success: true };
}

export async function deleteChangelogEntry(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("changelog_entries")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteChangelogEntry:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  revalidatePath("/");
  return { success: true };
}
