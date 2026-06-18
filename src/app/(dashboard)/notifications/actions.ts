"use server";

import { revalidatePath } from "next/cache";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import {
  buildNotificationCandidates,
  candidateKey,
} from "@/lib/notifications/rules";
import type { Notification } from "@/lib/notifications/types";
import {
  buildSuggestions,
  mergeNotificationCandidates,
  suggestionsToNotificationCandidates,
} from "@/lib/suggestions";

export type NotificationsSnapshot = {
  notifications: Notification[];
  unreadCount: number;
};

export async function generateNotifications(): Promise<void> {
  const { supabase, userId } = await getScopedSupabase();

  const [tasksRes, projectsRes, goalsRes, leadsRes, existingRes, pendingConnectionsRes] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, due_date, completed")
        .eq("user_id", userId),
      supabase
        .from("projects")
        .select("id, project_name, status, deadline, updated_at")
        .eq("user_id", userId),
      supabase
        .from("goals")
        .select("id, title, status, deadline, current")
        .eq("user_id", userId),
      supabase
        .from("leads")
        .select("id, name, status, follow_up_date")
        .eq("user_id", userId),
      supabase
        .from("notifications")
        .select("id, type, reference_id")
        .eq("user_id", userId),
      supabase
        .from("user_connections")
        .select("id, requester_id")
        .eq("recipient_id", userId)
        .eq("status", "pending"),
    ]);

  if (tasksRes.error) throw new Error(tasksRes.error.message);
  if (projectsRes.error) throw new Error(projectsRes.error.message);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (existingRes.error) throw new Error(existingRes.error.message);

  // Fetch requester usernames for connection request notifications
  const pendingConnections = pendingConnectionsRes.data ?? [];
  const requesterIds = pendingConnections.map((c) => c.requester_id);
  const usernameMap = new Map<string, string>();
  if (requesterIds.length > 0) {
    const { data: requesters } = await supabase
      .from("users")
      .select("id, username")
      .in("id", requesterIds);
    for (const r of requesters ?? []) {
      if (r.username) usernameMap.set(r.id, r.username);
    }
  }

  const candidates = mergeNotificationCandidates(
    buildNotificationCandidates(
      tasksRes.data ?? [],
      projectsRes.data ?? [],
      goalsRes.data ?? [],
      leadsRes.data ?? [],
      pendingConnections.map((c) => ({
        id: c.id,
        requester_username: usernameMap.get(c.requester_id) ?? "someone",
      }))
    ),
    suggestionsToNotificationCandidates(
      await buildSuggestions(userId, supabase),
      userId
    )
  );

  const validKeys = new Set(candidates.map(candidateKey));
  const staleIds = (existingRes.data ?? [])
    .filter((row) => !validKeys.has(`${row.type}:${row.reference_id}`))
    .map((row) => row.id);

  if (staleIds.length > 0) {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .in("id", staleIds);
    if (error) throw new Error(error.message);
  }

  if (candidates.length > 0) {
    const { error } = await supabase.from("notifications").upsert(
      candidates.map((candidate) => ({
        user_id: userId,
        type: candidate.type,
        reference_id: candidate.reference_id,
        title: candidate.title,
        message: candidate.message,
        link_to: candidate.link_to,
      })),
      { onConflict: "user_id,type,reference_id", ignoreDuplicates: true }
    );
    if (error) throw new Error(error.message);
  }
}

export async function getNotifications(): Promise<NotificationsSnapshot> {
  const { supabase, userId } = await getScopedSupabase();

  const [listRes, countRes] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false),
  ]);

  if (listRes.error) throw new Error(listRes.error.message);
  if (countRes.error) throw new Error(countRes.error.message);

  return {
    notifications: (listRes.data ?? []) as Notification[],
    unreadCount: countRes.count ?? 0,
  };
}

export async function markNotificationRead(
  notificationId: string
): Promise<void> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(): Promise<void> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function clearAllReadNotifications(): Promise<void> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .eq("read", true);

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
