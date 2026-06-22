"use client";

import { motion, useReducedMotion } from "framer-motion";
import { NotebookPen, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { createNote } from "@/app/(dashboard)/notes/actions";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { Button } from "@/components/ui/button";
import { MOTION_EASE } from "@/lib/motion/config";
import {
  formatNoteRelativeTime,
  getNotePreview,
} from "@/lib/notes/utils";
import type { Note } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

type NotesListProps = {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onNoteCreated: (note: Note) => void;
  onNoteDeleted: (id: string) => void;
};

function RelativeTimeLabel({ iso }: { iso: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(formatNoteRelativeTime(iso));
  }, [iso]);

  return <span>{label ?? "\u00a0"}</span>;
}

export function NotesList({
  notes,
  selectedNoteId,
  onSelectNote,
  onNoteCreated,
  onNoteDeleted,
}: NotesListProps) {
  const reduced = useReducedMotion() ?? false;
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const handleCreateNote = () => {
    startTransition(async () => {
      const result = await createNote();
      if (!result.success || !result.data) return;
      onNoteCreated(result.data);
      onSelectNote(result.data.id);
    });
  };

  if (notes.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border/60 p-3">
          <Button
            className="w-full gap-2"
            onClick={handleCreateNote}
            disabled={isPending}
          >
            <Plus className="size-4" />
            {isPending ? "Creating…" : "New note"}
          </Button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <NotebookPen className="mb-4 size-10 text-muted-foreground" />
          <h2 className="text-lg font-medium text-foreground">No notes yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Create your first note to get started
          </p>
          <Button className="mt-6 gap-2" onClick={handleCreateNote} disabled={isPending}>
            <Plus className="size-4" />
            New note
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 p-3">
        <Button
          className="w-full gap-2"
          onClick={handleCreateNote}
          disabled={isPending}
        >
          <Plus className="size-4" />
          {isPending ? "Creating…" : "New note"}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {notes.map((note, index) => {
            const selected = note.id === selectedNoteId;
            const preview = getNotePreview(note.content);
            const displayTitle = note.title.trim() || "Untitled";

            return (
              <motion.li
                key={note.id}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.3,
                  delay: reduced ? 0 : index * 0.06,
                  ease: MOTION_EASE.easeOut,
                }}
              >
                <div
                  className={cn(
                    "group relative flex items-start gap-2 rounded-lg border border-transparent px-3 py-3 transition-colors",
                    selected
                      ? "border-sky-500/30 bg-sky-500/10"
                      : "hover:bg-muted/50"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectNote(note.id)}
                    className="min-h-11 min-w-0 flex-1 text-left md:min-h-0"
                  >
                    <p className="truncate text-sm font-medium text-foreground">
                      {displayTitle}
                    </p>
                    {preview ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {preview}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      <RelativeTimeLabel iso={note.updated_at} />
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${displayTitle}`}
                    className={cn(
                      "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive md:min-h-8 md:min-w-8",
                      "opacity-100 md:opacity-0 md:group-hover:opacity-100",
                      selected && "md:opacity-100"
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteTarget({ id: note.id, title: displayTitle });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>

      <DeleteNoteDialog
        noteId={deleteTarget?.id ?? null}
        noteTitle={deleteTarget?.title ?? ""}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={onNoteDeleted}
      />
    </div>
  );
}
