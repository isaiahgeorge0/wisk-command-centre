import type {
  GitHubActivity,
  VercelDeploymentHealth,
  VercelProjectSummary,
} from "@/lib/integrations/types";

const VERCEL_API = "https://api.vercel.com";
const GITHUB_API = "https://api.github.com";

type VercelProjectResponse = {
  id: string;
  name: string;
  targets?: {
    production?: {
      url?: string;
      alias?: string[];
    };
  };
  link?: {
    type?: string;
    repo?: string;
  };
};

type VercelProjectsResponse = {
  projects?: VercelProjectResponse[];
};

type VercelDeploymentResponse = {
  deployments?: Array<{
    state?: string;
    created?: number;
    url?: string;
    readyState?: string;
  }>;
};

type GitHubUserResponse = {
  login: string;
  avatar_url: string;
  name: string | null;
};

type GitHubCommitResponse = Array<{
  commit: {
    message: string;
  };
  committer?: {
    date?: string;
  };
}>;

type GitHubIssueResponse = Array<{
  pull_request?: unknown;
}>;

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

function getVercelProductionUrl(project: VercelProjectResponse): string | null {
  const production = project.targets?.production;
  if (production?.url) {
    return production.url.startsWith("http")
      ? production.url
      : `https://${production.url}`;
  }

  const alias = production?.alias?.[0];
  if (alias) {
    return alias.startsWith("http") ? alias : `https://${alias}`;
  }

  return null;
}

export async function validateVercelToken(token: string): Promise<void> {
  const response = await fetch(`${VERCEL_API}/v2/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Invalid Vercel API token. Check your token at vercel.com/account/tokens."
        : `Vercel API error: ${await readErrorMessage(response)}`
    );
  }
}

export async function listVercelProjects(
  token: string,
  importedIds: Set<string>
): Promise<VercelProjectSummary[]> {
  const response = await fetch(`${VERCEL_API}/v9/projects?limit=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Invalid Vercel API token. Check your token at vercel.com/account/tokens."
        : `Vercel API error: ${await readErrorMessage(response)}`
    );
  }

  const body = (await response.json()) as VercelProjectsResponse;

  return (body.projects ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    productionUrl: getVercelProductionUrl(project),
    alreadyImported: importedIds.has(project.id),
  }));
}

export async function fetchVercelDeploymentHealth(
  token: string,
  vercelProjectId: string
): Promise<VercelDeploymentHealth> {
  const response = await fetch(
    `${VERCEL_API}/v6/deployments?projectId=${encodeURIComponent(vercelProjectId)}&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Vercel API error: ${await readErrorMessage(response)}`);
  }

  const body = (await response.json()) as VercelDeploymentResponse;
  const deployment = body.deployments?.[0];

  if (!deployment) {
    return { state: "unknown", createdAt: null, url: null };
  }

  const rawState = deployment.readyState ?? deployment.state ?? "unknown";
  let state: VercelDeploymentHealth["state"] = "unknown";

  if (rawState === "READY") state = "ready";
  else if (rawState === "ERROR" || rawState === "CANCELED") state = "error";
  else if (rawState === "BUILDING" || rawState === "INITIALIZING")
    state = "building";
  else if (rawState === "QUEUED") state = "queued";

  return {
    state,
    createdAt: deployment.created
      ? new Date(deployment.created).toISOString()
      : null,
    url: deployment.url
      ? deployment.url.startsWith("http")
        ? deployment.url
        : `https://${deployment.url}`
      : null,
  };
}

export async function validateGitHubToken(token: string): Promise<{
  login: string;
  avatar_url: string;
  name: string | null;
}> {
  const response = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Invalid GitHub personal access token."
        : `GitHub API error: ${await readErrorMessage(response)}`
    );
  }

  const user = (await response.json()) as GitHubUserResponse;

  return {
    login: user.login,
    avatar_url: user.avatar_url,
    name: user.name,
  };
}

export function parseGitHubRepo(repo: string): { owner: string; name: string } | null {
  const trimmed = repo.trim();

  if (!trimmed) return null;

  const urlMatch = trimmed.match(
    /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i
  );
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      name: urlMatch[2],
    };
  }

  const shortMatch = trimmed.match(/^([^/]+)\/([^/]+)$/);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      name: shortMatch[2],
    };
  }

  return null;
}

export async function fetchGitHubRepoActivity(
  token: string,
  repo: string
): Promise<
  | { success: true; data: GitHubActivity }
  | { success: false; error: string; code: "not_accessible" | "invalid_repo" }
> {
  const parsed = parseGitHubRepo(repo);

  if (!parsed) {
    return {
      success: false,
      error: "Invalid GitHub repository format. Use owner/repo or a GitHub URL.",
      code: "invalid_repo",
    };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const repoPath = `${parsed.owner}/${parsed.name}`;

  const [commitsRes, issuesRes] = await Promise.all([
    fetch(`${GITHUB_API}/repos/${repoPath}/commits?per_page=1`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${GITHUB_API}/repos/${repoPath}/issues?state=open&per_page=100`, {
      headers,
      cache: "no-store",
    }),
  ]);

  if (commitsRes.status === 404 || issuesRes.status === 404) {
    return {
      success: false,
      error: "Repository not accessible",
      code: "not_accessible",
    };
  }

  if (commitsRes.status === 403 || issuesRes.status === 403) {
    return {
      success: false,
      error: "Repository not accessible",
      code: "not_accessible",
    };
  }

  if (!commitsRes.ok) {
    return {
      success: false,
      error: "Repository not accessible",
      code: "not_accessible",
    };
  }

  const commits = (await commitsRes.json()) as GitHubCommitResponse;
  const latestCommit = commits[0];

  let openIssuesCount = 0;

  if (issuesRes.ok) {
    const issues = (await issuesRes.json()) as GitHubIssueResponse;
    openIssuesCount = issues.filter((issue) => !issue.pull_request).length;
  }

  return {
    success: true,
    data: {
      lastCommitMessage: latestCommit?.commit.message ?? null,
      lastCommitAt: latestCommit?.committer?.date ?? null,
      openIssuesCount,
    },
  };
}
