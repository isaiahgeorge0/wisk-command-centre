export const INTEGRATION_PROVIDERS = ["vercel", "github"] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export type SafeIntegration = {
  id: string;
  provider: IntegrationProvider;
  metadata: Record<string, unknown>;
  connected_at: string;
  last_synced_at: string | null;
  email_address?: string | null;
  label?: string | null;
  display_order?: number;
};

export type IntegrationsSummary = {
  vercel: boolean;
  github: boolean;
};

export type VercelProjectSummary = {
  id: string;
  name: string;
  productionUrl: string | null;
  alreadyImported: boolean;
};

export type VercelDeploymentHealth = {
  state: "ready" | "error" | "building" | "queued" | "unknown";
  createdAt: string | null;
  url: string | null;
};

export type GitHubActivity = {
  lastCommitMessage: string | null;
  lastCommitAt: string | null;
  openIssuesCount: number;
};

export type GitHubRepoActivityResult =
  | { success: true; data: GitHubActivity }
  | { success: false; error: string; code?: "not_accessible" | "invalid_repo" | "not_connected" };

export type IntegrationActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };
