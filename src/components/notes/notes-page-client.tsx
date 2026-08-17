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
import { WinstonSectionEntry } from "@/components/winston/winston-entry-button";
import { WinstonProposalSuccessToast } from "@/components/winston/proposal-success-toast";
import { useWinstonSidebar } from "@/components/winston/winston-sidebar-context";
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
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalToast, setProposalToast] =
    useState<WinstonProposalCommitResult | null>(null);
  const editorRef = useRef<NoteEditorHandle>(null);
  const { open: winstonOpen, trigger, toggleSidebar, closeSidebar } =
    useWinstonSidebar();
  const triggerRef = useRef(trigger);
  triggerRef.current = trigger;
  const recordWinstonOpen =
    winstonOpen &&
    trigger?.tier === "record" &&
    trigger.entity === "note" &&
    trigger.noteId === selectedNoteId;

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  useEffect(() => {
    setProposalOpen(false);
  }, [selectedNoteId]);

  useEffect(() => {
    if (trigger?.tier !== "record" || trigger.entity !== "note") return;
    if (trigger.noteId !== selectedNoteId) {
      closeSidebar();
    }
  }, [selectedNoteId, trigger, closeSidebar]);

  useEffect(() => {
    return () => {
      const current = triggerRef.current;
      if (current?.tier === "record" && current.entity === "note") {
        closeSidebar();
      }
    };
  }, [closeSidebar]);

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
    setProposalOpen(false);
  }, []);

  const handleMobileBack = useCallback(() => {
    setMobileShowEditor(false);
    setProposalOpen(false);
  }, []);

  const handleInsertIntoNote = useCallback((text: string) => {
    editorRef.current?.insertText(text);
  }, []);

  return (
    <PageTransition>
      <div className="mb-4 flex flex-col gap-4 md:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          className="mb-0"
          title="Notes"
          subtitle="Capture thoughts, plans, and ideas in one place."
          icon={<NotebookPen className="size-6 text-wisk-section-notes" />}
          accent="notes"
        />
        <WinstonSectionEntry
          section="notes"
          className="self-end sm:self-auto"
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
              proposalOpen && selectedNote ? "md:flex-row" : ""
            )}
          >
            <div
              className={cn(
                "min-h-0 flex-1",
                proposalOpen && selectedNote ? "hidden md:block" : ""
              )}
            >
              <NoteEditor
                ref={editorRef}
                note={selectedNote}
                onNoteUpdated={handleNoteUpdated}
                onBack={handleMobileBack}
                showBackButton={mobileShowEditor}
                canAccessWinston={canAccessWinston}
                brainstormOpen={recordWinstonOpen}
                proposalOpen={proposalOpen}
                onToggleBrainstorm={
                  selectedNote
                    ? () => {
                        setProposalOpen(false);
                        toggleSidebar({
                          tier: "record",
                          entity: "note",
                          noteId: selectedNote.id,
                          noteTitle: selectedNote.title,
                          onInsertText: handleInsertIntoNote,
                        });
                      }
                    : undefined
                }
                onToggleProjectProposal={
                  selectedNote
                    ? () => {
                        if (recordWinstonOpen) closeSidebar();
                        setProposalOpen((open) => !open);
                      }
                    : undefined
                }
              />
            </div>
            {selectedNote && proposalOpen ? (
              <div className="flex min-h-0 flex-1 flex-col md:flex-none">
                <NoteProjectProposalPanel
                  note={selectedNote}
                  open={proposalOpen}
                  canAccessWinston={canAccessWinston}
                  onClose={() => setProposalOpen(false)}
                  onCommitted={(result) => {
                    setProposalToast(result);
                    if (result.errors.length === 0) {
                      setProposalOpen(false);
                    }
                  }}
                />
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
