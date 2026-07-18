"use client";

import { NotebookPen } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { NoteEditor } from "@/components/notes/note-editor";
import { NotesList } from "@/components/notes/notes-list";
import type { Note } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

type NotesPageClientProps = {
  initialNotes: Note[];
};

export function NotesPageClient({ initialNotes }: NotesPageClientProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [mobileShowEditor, setMobileShowEditor] = useState(false);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const sortedNotes = useMemo(
    () =>
      [...notes].sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ),
    [notes]
  );

  const selectedNote =
    sortedNotes.find((note) => note.id === selectedNoteId) ?? null;

  const handleSelectNote = useCallback((id: string) => {
    setSelectedNoteId(id);
    setMobileShowEditor(true);
  }, []);

  const handleNoteCreated = useCallback((note: Note) => {
    setNotes((prev) => [note, ...prev]);
  }, []);

  const handleNoteUpdated = useCallback(
    (update: Partial<Note> & { id: string }) => {
      setNotes((prev) =>
        prev
          .map((note) => (note.id === update.id ? { ...note, ...update } : note))
          .sort(
            (a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )
      );
    },
    []
  );

  const handleNoteDeleted = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.filter((note) => note.id !== id);
      return next;
    });
    setSelectedNoteId((current) => (current === id ? null : current));
    setMobileShowEditor(false);
  }, []);

  const handleMobileBack = useCallback(() => {
    setMobileShowEditor(false);
  }, []);

  return (
    <PageTransition>
      <div className="mb-4 md:mb-6">
        <PageHeader
          className="mb-0"
          title="Notes"
          subtitle="Capture thoughts, plans, and ideas in one place."
          icon={<NotebookPen className="size-6 text-wisk-section-notes" />}
          accent="notes"
        />
      </div>

      <div className="flex min-h-[calc(100dvh-12rem)] flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40 md:h-[calc(100dvh-11rem)] md:min-h-0 md:flex-row">
        <aside
          className={cn(
            "min-h-0 border-border/60 md:w-[280px] md:shrink-0 md:border-r",
            mobileShowEditor ? "hidden md:flex md:flex-col" : "flex min-h-0 flex-1 flex-col md:flex-none"
          )}
        >
          <NotesList
            notes={sortedNotes}
            selectedNoteId={selectedNoteId}
            onSelectNote={handleSelectNote}
            onNoteCreated={handleNoteCreated}
            onNoteDeleted={handleNoteDeleted}
          />
        </aside>

        <section
          className={cn(
            "min-h-0 flex-1 bg-card/80",
            mobileShowEditor ? "flex flex-col" : "hidden md:flex md:flex-col"
          )}
        >
          <NoteEditor
            note={selectedNote}
            onNoteUpdated={handleNoteUpdated}
            onBack={handleMobileBack}
            showBackButton={mobileShowEditor}
          />
        </section>
      </div>
    </PageTransition>
  );
}
