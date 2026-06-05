import type { ChangelogEntry } from "@/lib/changelog/types";
import {
  CHANGELOG_TYPE_BADGE_CLASSES,
  CHANGELOG_TYPE_LABELS,
} from "@/lib/changelog/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ChangelogPanelProps = {
  entries: ChangelogEntry[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ChangelogPanel({ entries }: ChangelogPanelProps) {
  if (entries.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        No updates yet. Check back soon.
      </div>
    );
  }

  return (
    <div className="max-h-[min(28rem,70vh)] overflow-y-auto px-1 py-1">
      <ul className="space-y-3">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="rounded-lg border border-border/60 bg-card/50 px-3 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(CHANGELOG_TYPE_BADGE_CLASSES[entry.type])}
              >
                {CHANGELOG_TYPE_LABELS[entry.type]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(entry.published_at)}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              {entry.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {entry.description}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
