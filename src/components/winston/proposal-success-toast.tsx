"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";

import type { WinstonProposalCommitResult } from "@/lib/winston/proposal";

type WinstonProposalSuccessToastProps = {
  result: WinstonProposalCommitResult | null;
  onDismiss: () => void;
};

function buildSummary(result: WinstonProposalCommitResult): {
  message: string;
  links: { href: string; label: string }[];
} {
  const parts: string[] = [];
  const links: { href: string; label: string }[] = [];
  const seen = new Set<string>();

  const pushLink = (href: string, label: string) => {
    if (seen.has(href)) return;
    seen.add(href);
    links.push({ href, label });
  };

  if (result.created.projects.length > 0) {
    const n = result.created.projects.length;
    parts.push(`${n} project${n === 1 ? "" : "s"}`);
    pushLink("/projects", "Projects");
  }
  if (result.created.tasks.length > 0) {
    const n = result.created.tasks.length;
    parts.push(`${n} task${n === 1 ? "" : "s"}`);
    pushLink("/tasks", "Tasks");
  }
  if (result.created.calendar_events.length > 0) {
    const n = result.created.calendar_events.length;
    parts.push(`${n} calendar event${n === 1 ? "" : "s"}`);
    pushLink("/calendar", "Calendar");
  }
  if (result.created.content_posts.length > 0) {
    const n = result.created.content_posts.length;
    parts.push(`${n} content post${n === 1 ? "" : "s"}`);
    pushLink("/content", "Content");
  }
  if (result.created.ideas.length > 0) {
    const n = result.created.ideas.length;
    parts.push(`${n} idea${n === 1 ? "" : "s"}`);
    pushLink("/ideas", "Ideas");
  }

  const message =
    parts.length === 0
      ? "Created."
      : parts.length === 1
        ? `Created ${parts[0]}.`
        : `Created ${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}.`;

  return { message, links };
}

export function WinstonProposalSuccessToast({
  result,
  onDismiss,
}: WinstonProposalSuccessToastProps) {
  useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [result, onDismiss]);

  const summary = useMemo(
    () => (result ? buildSummary(result) : null),
    [result]
  );

  if (!result || !summary) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-xl border border-border/60 bg-card px-4 py-3 shadow-lg md:inset-x-auto md:right-6 md:bottom-6"
    >
      <p className="text-sm text-foreground">
        {summary.message}
        {summary.links.length > 0 ? (
          <>
            {" "}
            {summary.links.map((link, index) => (
              <span key={link.href}>
                {index > 0 ? " · " : null}
                <Link
                  href={link.href}
                  className="font-medium text-wisk-section-winston hover:underline"
                  onClick={onDismiss}
                >
                  View {link.label} →
                </Link>
              </span>
            ))}
          </>
        ) : null}
      </p>
      {result.errors.length > 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {result.errors.length} item
          {result.errors.length === 1 ? "" : "s"} skipped.
        </p>
      ) : null}
    </div>
  );
}
