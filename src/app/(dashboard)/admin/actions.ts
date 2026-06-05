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
  revalidatePath("/");
}

export async function getAccessRequests(
  filter: AccessRequestFilter = "all"
): Promise<AccessRequest[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  let query = supabase
    .from("access_requests")
    .select("id, name, email, status, created_at")
    .order("created_at", { ascending: false });

  if (filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getAccessRequests:", error);
    return [];
  }

  return (data ?? []) as AccessRequest[];
}

export async function approveRequest(
  id: string,
  email: string,
  name: string
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    {
      data: { name: name.trim() },
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
