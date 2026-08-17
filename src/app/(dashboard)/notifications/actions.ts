"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasAIAccess } from "@/lib/billing/access";
import { toSafeActionError } from "@/lib/errors/to-safe-action-error";
import {
  buildNotificationCandidates,
  candidateKey,
} from "@/lib/notifications/rules";
import type { ActionResult, Notification } from "@/lib/notifications/types";
import {
  buildSuggestions,
  mergeNotificationCandidates,
  suggestionsToNotificationCandidates,
} from "@/lib/suggestions";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationsSnapshot = {
  notifications: Notification[];
  unreadCount: number;
};

const uuidParamSchema = z.string().uuid("Invalid notification id");

const awaitingDateNotificationSchema = z.object({
  referenceId: z.string().uuid("Invalid reference id"),
  title: z.string().trim().min(1, "Title is required"),
  linkTo: z.string().trim().min(1, "Link is required"),
});

function revalidateNotificationPaths() {
  revalidatePath("/", "layout");
}

export async function generateNotifications(): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const [tasksRes, projectsRes, goalsRes, leadsRes, existingRes, pendingConnectionsRes, prefsRes] =
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
      supabase
        .from("user_preferences")
        .select("ai_access")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  const fetchError =
    tasksRes.error ??
    projectsRes.error ??
    goalsRes.error ??
    leadsRes.error ??
    existingRes.error ??
    pendingConnectionsRes.error ??
    prefsRes.error;

  if (fetchError) {
    return {
      success: false,
      error: toSafeActionError(
        fetchError,
        "Could not generate notifications. Please try again."
      ),
    };
  }

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

  const canAccessWinston = await hasAIAccess(
    userId,
    createAdminClient(),
    prefsRes.data?.ai_access ?? false
  );

  const standardCandidates = buildNotificationCandidates(
    tasksRes.data ?? [],
    projectsRes.data ?? [],
    goalsRes.data ?? [],
    leadsRes.data ?? [],
    pendingConnections.map((c) => ({
      id: c.id,
      requester_username: usernameMap.get(c.requester_id) ?? "someone",
    }))
  );

  const suggestionCandidates = canAccessWinston
    ? suggestionsToNotificationCandidates(
        await buildSuggestions(userId, supabase),
        userId
      )
    : [];

  const candidates = mergeNotificationCandidates(
    standardCandidates,
    suggestionCandidates
  );

  const validKeys = new Set(candidates.map(candidateKey));
  const staleIds = (existingRes.data ?? [])
    .filter((row) => row.type !== "awaiting_date")
    .filter((row) => !validKeys.has(`${row.type}:${row.reference_id}`))
    .map((row) => row.id);

  if (staleIds.length > 0) {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .in("id", staleIds);
    if (error) {
      return {
        success: false,
        error: toSafeActionError(
          error,
          "Could not generate notifications. Please try again."
        ),
      };
    }
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
    if (error) {
      return {
        success: false,
        error: toSafeActionError(
          error,
          "Could not generate notifications. Please try again."
        ),
      };
    }
  }

  return { success: true };
}

export async function createAwaitingDateNotification(input: {
  referenceId: string;
  title: string;
  linkTo: string;
}): Promise<ActionResult> {
  const parsed = awaitingDateNotificationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase.from("notifications").upsert(
    {
      user_id: userId,
      type: "awaiting_date",
      reference_id: parsed.data.referenceId,
      title: "This idea needs a date",
      message: `“${parsed.data.title}” — set one when you're ready.`,
      link_to: parsed.data.linkTo,
    },
    { onConflict: "user_id,type,reference_id", ignoreDuplicates: true }
  );

  if (error) {
    return {
      success: false,
      error: toSafeActionError(
        error,
        "Could not create notification. Please try again."
      ),
    };
  }

  revalidateNotificationPaths();
  return { success: true };
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
): Promise<ActionResult> {
  const parsed = uuidParamSchema.safeParse(notificationId);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid notification id",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", parsed.data)
    .eq("user_id", userId);

  if (error) {
    return {
      success: false,
      error: toSafeActionError(
        error,
        "Could not mark notification as read. Please try again."
      ),
    };
  }

  revalidateNotificationPaths();
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    return {
      success: false,
      error: toSafeActionError(
        error,
        "Could not mark notifications as read. Please try again."
      ),
    };
  }

  revalidateNotificationPaths();
  return { success: true };
}

export async function clearAllReadNotifications(): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .eq("read", true);

  if (error) {
    return {
      success: false,
      error: toSafeActionError(
        error,
        "Could not clear notifications. Please try again."
      ),
    };
  }

  revalidateNotificationPaths();
  return { success: true };
}
