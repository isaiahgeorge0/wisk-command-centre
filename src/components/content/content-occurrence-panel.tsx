"use client";

import { Repeat } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { upsertOccurrenceNotes } from "@/app/(dashboard)/content/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatSelectedDay } from "@/lib/calendar/grid";
import type { ContentPost } from "@/lib/content/types";

type ContentOccurrencePanelProps = {
  post: ContentPost | null;
  occurrenceDate: string;
  existingNotes: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
};

export function ContentOccurrencePanel({
  post,
  occurrenceDate,
  existingNotes,
  open,
  onOpenChange,
  disabled: externalDisabled,
}: ContentOccurrencePanelProps) {
  if (!post) return null;
  const [notes, setNotes] = useState(existingNotes ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Sync notes when async-fetched existingNotes arrives after the panel opens
  useEffect(() => {
    setNotes(existingNotes ?? "");
  }, [existingNotes]);

  const isDisabled = externalDisabled || isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setNotes(existingNotes ?? "");
      setSaved(false);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSave = () => {
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await upsertOccurrenceNotes(post.id, occurrenceDate, notes);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => {
        handleOpenChange(false);
      }, 900);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-base">{post.title}</DialogTitle>
            <Badge variant="secondary" className="gap-1 text-muted-foreground">
              <Repeat className="size-3" />
              <span>Recurring</span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatSelectedDay(occurrenceDate)}
          </p>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="occurrence-notes">Notes for this occurrence</Label>
            <Textarea
              id="occurrence-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes specific to this date…"
              rows={4}
              disabled={isDisabled}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            To edit the post title, platforms, or schedule,{" "}
            <a
              href="/content"
              className="underline underline-offset-2 hover:text-foreground"
            >
              edit the base post
            </a>{" "}
            on the content page.
          </p>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          {saved ? (
            <p className="text-sm text-emerald-500">Notes saved.</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isDisabled}>
            {isPending ? "Saving…" : "Save notes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
