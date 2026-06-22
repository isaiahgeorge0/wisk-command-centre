"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { VERCEL_IMPORT_SERVICE_TYPE } from "@/lib/integrations/constants";
import {
  decryptIntegrationToken,
  encryptIntegrationToken,
} from "@/lib/integrations/crypto";
import {
  getImportedVercelProjectIds,
  getIntegrationAccessToken,
} from "@/lib/integrations/get-integration-token";
import {
  fetchGitHubRepoActivity,
  fetchVercelDeploymentHealth,
  listVercelProjects,
  validateGitHubToken,
  validateVercelToken,
} from "@/lib/integrations/providers/index";
import type {
  GitHubRepoActivityResult,
  IntegrationActionResult,
  IntegrationProvider,
  SafeIntegration,
  VercelDeploymentHealth,
  VercelProjectSummary,
} from "@/lib/integrations/types";

const tokenSchema = z.string().trim().min(1, "Token is required");
const providerSchema = z.enum(["vercel", "github"]);
const importSchema = z.array(z.string().trim().min(1)).min(1);

const REVALIDATE_PATHS = ["/settings", "/projects", "/"] as const;

function revalidateIntegrationPaths() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

function toSafeIntegration(row: {
  id: string;
  provider: string;
  metadata: unknown;
  connected_at: string;
  last_synced_at: string | null;
  email_address?: string | null;
  label?: string | null;
  display_order?: number;
}): SafeIntegration {
  return {
    id: row.id,
    provider: row.provider as IntegrationProvider,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    connected_at: row.connected_at,
    last_synced_at: row.last_synced_at,
    email_address: row.email_address ?? null,
    label: row.label ?? null,
    display_order: row.display_order ?? 0,
  };
}

export async function getIntegrations(): Promise<SafeIntegration[]> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("user_integrations")
    .select(
      "id, provider, metadata, connected_at, last_synced_at, email_address, label, display_order"
    )
    .eq("user_id", userId)
    .order("display_order", { ascending: true })
    .order("connected_at", { ascending: false });

  if (error) {
    console.error("getIntegrations:", error);
    return [];
  }

  return (data ?? []).map(toSafeIntegration);
}

export async function connectVercel(
  token: string
): Promise<
  IntegrationActionResult<{ projects: VercelProjectSummary[] }>
> {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid token" };
  }

  try {
    await validateVercelToken(parsed.data);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid Vercel token",
    };
  }

  const { supabase, userId } = await getScopedSupabase();
  const importedIds = await getImportedVercelProjectIds(userId);

  let projects: VercelProjectSummary[];

  try {
    projects = await listVercelProjects(parsed.data, importedIds);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not fetch Vercel projects",
    };
  }

  const encryptedToken = encryptIntegrationToken(parsed.data);

  const { error } = await supabase.from("user_integrations").upsert(
    {
      user_id: userId,
      provider: "vercel",
      access_token: encryptedToken,
      metadata: {},
      connected_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );

  if (error) {
    console.error("connectVercel:", error);
    return { success: false, error: error.message };
  }

  revalidateIntegrationPaths();
  return { success: true, data: { projects } };
}

export async function importVercelProjects(
  vercelProjectIds: string[]
): Promise<
  IntegrationActionResult<{ imported: number; skipped: number }>
> {
  const parsed = importSchema.safeParse(vercelProjectIds);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Select at least one project",
    };
  }

  const token = await getIntegrationAccessToken("vercel");
  if (!token) {
    return { success: false, error: "Connect Vercel before importing projects." };
  }

  const { supabase, userId } = await getScopedSupabase();
  const importedIds = await getImportedVercelProjectIds(userId);

  let projects: VercelProjectSummary[];

  try {
    projects = await listVercelProjects(token, importedIds);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not fetch Vercel projects",
    };
  }

  const selected = new Set(parsed.data);
  const toImport = projects.filter(
    (project) => selected.has(project.id) && !project.alreadyImported
  );
  const skipped = parsed.data.filter((id) => importedIds.has(id)).length;

  if (toImport.length === 0) {
    return {
      success: true,
      data: { imported: 0, skipped },
    };
  }

  const rows = toImport.map((project) => ({
    user_id: userId,
    project_name: project.name,
    client_name: null,
    service_type: VERCEL_IMPORT_SERVICE_TYPE,
    status: "active" as const,
    site_url: project.productionUrl,
    vercel_project_id: project.id,
  }));

  const { error } = await supabase.from("projects").insert(rows);

  if (error) {
    console.error("importVercelProjects:", error);
    return { success: false, error: error.message };
  }

  await supabase
    .from("user_integrations")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", "vercel");

  revalidateIntegrationPaths();
  return { success: true, data: { imported: toImport.length, skipped } };
}

export async function connectGitHub(
  token: string
): Promise<IntegrationActionResult<{ login: string; avatar_url: string }>> {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid token" };
  }

  let profile: { login: string; avatar_url: string; name: string | null };

  try {
    profile = await validateGitHubToken(parsed.data);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid GitHub token",
    };
  }

  const { supabase, userId } = await getScopedSupabase();
  const encryptedToken = encryptIntegrationToken(parsed.data);

  const { error } = await supabase.from("user_integrations").upsert(
    {
      user_id: userId,
      provider: "github",
      access_token: encryptedToken,
      metadata: {
        login: profile.login,
        avatar_url: profile.avatar_url,
        name: profile.name,
      },
      connected_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );

  if (error) {
    console.error("connectGitHub:", error);
    return { success: false, error: error.message };
  }

  revalidateIntegrationPaths();
  return {
    success: true,
    data: { login: profile.login, avatar_url: profile.avatar_url },
  };
}

export async function updateIntegrationLabel(
  integrationId: string,
  label: string
): Promise<IntegrationActionResult> {
  const { supabase, userId } = await getScopedSupabase();
  const trimmed = label.trim();

  const { error } = await supabase
    .from("user_integrations")
    .update({ label: trimmed || null })
    .eq("id", integrationId)
    .eq("user_id", userId);

  if (error) {
    console.error("updateIntegrationLabel:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function disconnectGmail(
  integrationId: string
): Promise<IntegrationActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { data: row } = await supabase
    .from("user_integrations")
    .select("access_token")
    .eq("id", integrationId)
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .maybeSingle();

  if (row?.access_token) {
    try {
      const accessToken = decryptIntegrationToken(row.access_token);
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`,
        { method: "POST" }
      );
    } catch {
      // Revocation failures are non-fatal — still remove the local record.
    }
  }

  const { error } = await supabase
    .from("user_integrations")
    .delete()
    .eq("id", integrationId)
    .eq("user_id", userId)
    .eq("provider", "gmail");

  if (error) {
    console.error("disconnectGmail:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function disconnectOutlook(
  integrationId: string
): Promise<IntegrationActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("user_integrations")
    .delete()
    .eq("id", integrationId)
    .eq("user_id", userId)
    .eq("provider", "outlook");

  if (error) {
    console.error("disconnectOutlook:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function disconnectIntegration(
  provider: IntegrationProvider
): Promise<IntegrationActionResult> {
  const parsed = providerSchema.safeParse(provider);
  if (!parsed.success) {
    return { success: false, error: "Invalid integration provider" };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("user_integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", parsed.data);

  if (error) {
    console.error("disconnectIntegration:", error);
    return { success: false, error: error.message };
  }

  revalidateIntegrationPaths();
  return { success: true };
}

export async function fetchVercelProjectHealthAction(
  wiskProjectId: string
): Promise<IntegrationActionResult<VercelDeploymentHealth>> {
  const { supabase, userId } = await getScopedSupabase();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("vercel_project_id")
    .eq("id", wiskProjectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (projectError || !project?.vercel_project_id) {
    return { success: false, error: "Project is not linked to Vercel." };
  }

  const token = await getIntegrationAccessToken("vercel");
  if (!token) {
    return { success: false, error: "Connect Vercel in Settings → Integrations." };
  }

  try {
    const health = await fetchVercelDeploymentHealth(
      token,
      project.vercel_project_id
    );
    return { success: true, data: health };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not fetch deployment health",
    };
  }
}

export async function fetchGitHubRepoActivityAction(
  repo: string
): Promise<GitHubRepoActivityResult> {
  const trimmed = repo.trim();
  if (!trimmed) {
    return { success: false, error: "No GitHub repository linked.", code: "invalid_repo" };
  }

  const token = await getIntegrationAccessToken("github");
  if (!token) {
    return {
      success: false,
      error: "Connect GitHub in Settings → Integrations.",
      code: "not_connected",
    };
  }

  return fetchGitHubRepoActivity(token, trimmed);
}

export async function listVercelProjectsForImport(): Promise<
  IntegrationActionResult<{ projects: VercelProjectSummary[] }>
> {
  const token = await getIntegrationAccessToken("vercel");
  if (!token) {
    return { success: false, error: "Connect Vercel before importing projects." };
  }

  const { userId } = await getScopedSupabase();
  const importedIds = await getImportedVercelProjectIds(userId);

  try {
    const projects = await listVercelProjects(token, importedIds);
    return { success: true, data: { projects } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not fetch Vercel projects",
    };
  }
}
