"use server";

import { revalidatePath } from "next/cache";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import type { PublicUserProfile, UserConnection } from "@/lib/collaboration/types";

export type ConnectionActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function searchUsers(
  query: string
): Promise<ConnectionActionResult<PublicUserProfile[]>> {
  const trimmed = query.trim().replace(/^@/, "");
  if (trimmed.length < 2) {
    return { success: true, data: [] };
  }

  const { supabase, userId } = await getScopedSupabase();

  // Fetch existing connections so we can exclude them
  const { data: existing } = await supabase
    .from("user_connections")
    .select("requester_id, recipient_id")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);

  const connectedIds = new Set<string>();
  for (const row of existing ?? []) {
    connectedIds.add(row.requester_id === userId ? row.recipient_id : row.requester_id);
  }
  connectedIds.add(userId);

  const { data, error } = await supabase
    .from("users")
    .select("id, username, name")
    .ilike("username", `%${trimmed}%`)
    .not("username", "is", null)
    .limit(20);

  if (error) {
    return { success: false, error: error.message };
  }

  const filtered = (data ?? [])
    .filter((u) => !connectedIds.has(u.id) && u.username)
    .slice(0, 10)
    .map((u) => ({
      id: u.id,
      username: u.username as string,
      name: u.name,
    }));

  return { success: true, data: filtered };
}

export async function sendConnectionRequest(
  recipientId: string
): Promise<ConnectionActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  if (recipientId === userId) {
    return { success: false, error: "Cannot connect with yourself" };
  }

  // Check not already connected
  const { data: existing } = await supabase
    .from("user_connections")
    .select("id")
    .or(
      `and(requester_id.eq.${userId},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${userId})`
    )
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Connection already exists" };
  }

  const { error } = await supabase.from("user_connections").insert({
    requester_id: userId,
    recipient_id: recipientId,
    status: "pending",
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/connections");
  return { success: true };
}

export async function acceptConnection(
  connectionId: string
): Promise<ConnectionActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("user_connections")
    .update({ status: "accepted" })
    .eq("id", connectionId)
    .eq("recipient_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/connections");
  return { success: true };
}

export async function declineConnection(
  connectionId: string
): Promise<ConnectionActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("user_connections")
    .update({ status: "declined" })
    .eq("id", connectionId)
    .eq("recipient_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/connections");
  return { success: true };
}

export async function removeConnection(
  connectionId: string
): Promise<ConnectionActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("user_connections")
    .delete()
    .eq("id", connectionId)
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/connections");
  return { success: true };
}

export async function getConnections(): Promise<
  ConnectionActionResult<UserConnection[]>
> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("user_connections")
    .select("id, requester_id, recipient_id, status, created_at, updated_at")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  const rows = data ?? [];
  const otherIds = rows.map((r) =>
    r.requester_id === userId ? r.recipient_id : r.requester_id
  );

  let profileMap = new Map<string, PublicUserProfile>();
  if (otherIds.length > 0) {
    const { data: profiles } = await supabase
      .from("users")
      .select("id, username, name")
      .in("id", otherIds);

    for (const p of profiles ?? []) {
      if (p.username) {
        profileMap.set(p.id, { id: p.id, username: p.username, name: p.name });
      }
    }
  }

  const connections: UserConnection[] = rows.map((r) => {
    const otherId = r.requester_id === userId ? r.recipient_id : r.requester_id;
    return {
      ...r,
      other_user: profileMap.get(otherId),
    };
  });

  return { success: true, data: connections };
}

export async function getPendingRequests(): Promise<
  ConnectionActionResult<UserConnection[]>
> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("user_connections")
    .select("id, requester_id, recipient_id, status, created_at, updated_at")
    .eq("status", "pending")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  const rows = data ?? [];
  const requesterIds = rows.map((r) => r.requester_id);

  let profileMap = new Map<string, PublicUserProfile>();
  if (requesterIds.length > 0) {
    const { data: profiles } = await supabase
      .from("users")
      .select("id, username, name")
      .in("id", requesterIds);

    for (const p of profiles ?? []) {
      if (p.username) {
        profileMap.set(p.id, { id: p.id, username: p.username, name: p.name });
      }
    }
  }

  const requests: UserConnection[] = rows.map((r) => ({
    ...r,
    other_user: profileMap.get(r.requester_id),
  }));

  return { success: true, data: requests };
}
