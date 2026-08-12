"use client";

import { NotebookPen } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import {
  NoteEditor,
  type NoteEditorHandle,
} from "@/components/notes/note-editor";
import { NoteProjectProposalPanel } from "@/components/notes/note-project-proposal-panel";
import { NotesList } from "@/components/notes/notes-list";
import { NoteWinstonPanel } from "@/components/notes/note-winston-panel";
import { WinstonProposalSuccessToast } from "@/components/winston/proposal-success-toast";
import type { Note } from "@/lib/notes/types";
import type { WinstonProposalCommitResult } from "@/lib/winston/proposal";
import { cn } from "@/lib/utils";

type NotesPageClientProps = {
  initialNotes: Note[];
  canAccessWinston: boolean;
};

export function NotesPageClient({
  initialNotes,
  canAccessWinston,
}: NotesPageClientProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [mobileShowEditor, setMobileShowEditor] = useState(false);
  const [brainstormOpen, setBrainstormOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalToast, setProposalToast] =
    useState<WinstonProposalCommitResult | null>(null);
  const editorRef = useRef<NoteEditorHandle>(null);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  useEffect(() => {
    setBrainstormOpen(false);
    setProposalOpen(false);
  }, [selectedNoteId]);

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
    setBrainstormOpen(false);
    setProposalOpen(false);
  }, []);

  const handleMobileBack = useCallback(() => {
    setMobileShowEditor(false);
    setBrainstormOpen(false);
    setProposalOpen(false);
  }, []);

  const handleInsertIntoNote = useCallback((text: string) => {
    editorRef.current?.insertText(text);
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
            mobileShowEditor
              ? "hidden md:flex md:flex-col"
              : "flex min-h-0 flex-1 flex-col md:flex-none"
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
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              (brainstormOpen || proposalOpen) && selectedNote ? "md:flex-row" : ""
            )}
          >
            <div
              className={cn(
                "min-h-0 flex-1",
                (brainstormOpen || proposalOpen) && selectedNote
                  ? "hidden md:block"
                  : ""
              )}
            >
              <NoteEditor
                ref={editorRef}
                note={selectedNote}
                onNoteUpdated={handleNoteUpdated}
                onBack={handleMobileBack}
                showBackButton={mobileShowEditor}
                canAccessWinston={canAccessWinston}
                brainstormOpen={brainstormOpen}
                proposalOpen={proposalOpen}
                onToggleBrainstorm={
                  selectedNote
                    ? () => {
                        setProposalOpen(false);
                        setBrainstormOpen((open) => !open);
                      }
                    : undefined
                }
                onToggleProjectProposal={
                  selectedNote
                    ? () => {
                        setBrainstormOpen(false);
                        setProposalOpen((open) => !open);
                      }
                    : undefined
                }
              />
            </div>
            {selectedNote ? (
              <div
                className={cn(
                  "min-h-0",
                  brainstormOpen || proposalOpen
                    ? "flex flex-1 flex-col md:flex-none"
                    : "hidden"
                )}
              >
                {brainstormOpen ? (
                  <NoteWinstonPanel
                    note={selectedNote}
                    open={brainstormOpen}
                    canAccessWinston={canAccessWinston}
                    onClose={() => setBrainstormOpen(false)}
                    onInsertIntoNote={handleInsertIntoNote}
                  />
                ) : null}
                {proposalOpen ? (
                  <NoteProjectProposalPanel
                    note={selectedNote}
                    open={proposalOpen}
                    canAccessWinston={canAccessWinston}
                    onClose={() => setProposalOpen(false)}
                    onCommitted={(result) => {
                      setProposalToast(result);
                      setProposalOpen(false);
                    }}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>
      <WinstonProposalSuccessToast
        result={proposalToast}
        onDismiss={() => setProposalToast(null)}
      />
    </PageTransition>
  );
}
