"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import {
  createChangelogEntry,
  deleteChangelogEntry,
} from "@/app/(dashboard)/admin/actions";
import type { ChangelogEntry, ChangelogType } from "@/lib/changelog/types";
import {
  CHANGELOG_TYPE_BADGE_CLASSES,
  CHANGELOG_TYPE_LABELS,
} from "@/lib/changelog/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChangelogAdminClientProps = {
  entries: ChangelogEntry[];
};

const CHANGELOG_TYPES: ChangelogType[] = ["feature", "improvement", "fix"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ChangelogAdminClient({ entries }: ChangelogAdminClientProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ChangelogType>("feature");
  const [publishedAt, setPublishedAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isCreating, startCreateTransition] = useTransition();
  const [, startDeleteTransition] = useTransition();

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startCreateTransition(async () => {
      const result = await createChangelogEntry({
        title,
        description,
        type,
        publishedAt,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setTitle("");
      setDescription("");
      setType("feature");
      setPublishedAt("");
    });
  }

  function handleDelete(id: string) {
    setError(null);
    setPendingId(id);

    startDeleteTransition(async () => {
      const result = await deleteChangelogEntry(id);
      setPendingId(null);
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create changelog entry</CardTitle>
          <CardDescription>
            Published entries appear in the user-facing What&apos;s new panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="changelog-title">Title</Label>
              <Input
                id="changelog-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="changelog-description">Description</Label>
              <Textarea
                id="changelog-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="changelog-type">Type</Label>
                <Select
                  value={type}
                  onValueChange={(value) => setType(value as ChangelogType)}
                >
                  <SelectTrigger id="changelog-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANGELOG_TYPES.map((entryType) => (
                      <SelectItem key={entryType} value={entryType}>
                        {CHANGELOG_TYPE_LABELS[entryType]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="changelog-published">Published date</Label>
                <Input
                  id="changelog-published"
                  type="date"
                  value={publishedAt}
                  onChange={(event) => setPublishedAt(event.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating…" : "Publish entry"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-base font-medium">All entries</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changelog entries yet.</p>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(CHANGELOG_TYPE_BADGE_CLASSES[entry.type])}
                      >
                        {CHANGELOG_TYPE_LABELS[entry.type]}
                      </Badge>
                      <CardTitle>{entry.title}</CardTitle>
                    </div>
                    <CardDescription className="mt-1">
                      Published {formatDate(entry.published_at)}
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pendingId === entry.id}
                    onClick={() => handleDelete(entry.id)}
                    aria-label={`Delete ${entry.title}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {entry.description}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
