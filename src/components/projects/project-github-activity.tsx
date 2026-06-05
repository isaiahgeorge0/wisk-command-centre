"use client";

import { GitCommitHorizontal } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { fetchGitHubRepoActivityAction } from "@/app/(dashboard)/settings/integrations/actions";
import type { GitHubActivity } from "@/lib/integrations/types";

type ProjectGitHubActivityProps = {
  repo: string;
  enabled: boolean;
  expanded: boolean;
};

export function ProjectGitHubActivity({
  repo,
  enabled,
  expanded,
}: ProjectGitHubActivityProps) {
  const [activity, setActivity] = useState<GitHubActivity | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!enabled || !expanded || !repo.trim() || loaded) return;

    startTransition(async () => {
      const result = await fetchGitHubRepoActivityAction(repo);
      setLoaded(true);

      if (!result.success) {
        setActivity(null);
        setMessage(
          result.code === "not_accessible"
            ? "Repository not accessible"
            : result.error
        );
        return;
      }

      setMessage(null);
      setActivity(result.data);
    });
  }, [enabled, expanded, repo, loaded]);

  useEffect(() => {
    setLoaded(false);
    setActivity(null);
    setMessage(null);
  }, [repo]);

  if (!enabled || !repo.trim()) return null;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        GitHub activity
      </p>
      {!expanded ? null : isPending && !loaded ? (
        <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
      ) : message ? (
        <p className="mt-2 text-xs text-muted-foreground">{message}</p>
      ) : activity ? (
        <div className="mt-2 space-y-2">
          {activity.lastCommitMessage ? (
            <div className="flex items-start gap-2">
              <GitCommitHorizontal
                className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm text-foreground">
                  {activity.lastCommitMessage}
                </p>
                {activity.lastCommitAt ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(activity.lastCommitAt))}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No commits found.</p>
          )}
          <p className="text-xs text-muted-foreground">
            {activity.openIssuesCount} open issue
            {activity.openIssuesCount === 1 ? "" : "s"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
