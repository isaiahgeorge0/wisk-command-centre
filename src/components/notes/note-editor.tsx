"use client";

import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  ArrowLeft,
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListChecks,
  ListOrdered,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  updateNoteContent,
  updateNoteTitle,
} from "@/app/(dashboard)/notes/actions";
import { Button } from "@/components/ui/button";
import type { Note } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

type NoteEditorProps = {
  note: Note | null;
  onNoteUpdated: (note: Partial<Note> & { id: string }) => void;
  onBack?: () => void;
  showBackButton?: boolean;
};

type SaveState = "idle" | "saving" | "saved";

function parseNoteContent(content: string | null) {
  if (!content?.trim()) return "";
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

function ToolbarButton({
  label,
  isActive,
  onClick,
  children,
}: {
  label: string;
  isActive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors md:min-h-8 md:min-w-8",
        isActive
          ? "bg-sky-500/20 text-sky-700 ring-1 ring-sky-500/40 dark:text-sky-300"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function NoteEditor({
  note,
  onNoteUpdated,
  onBack,
  showBackButton = false,
}: NoteEditorProps) {
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [, setToolbarRevision] = useState(0);
  const [isTitlePending, startTitleTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteIdRef = useRef<string | null>(null);

  const scheduleContentSave = useCallback((serialized: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const noteId = noteIdRef.current;
      if (!noteId) return;

      setSaveState("saving");

      void (async () => {
        const result = await updateNoteContent(noteId, serialized);
        if (result.success) {
          setSaveState("saved");
          savedTimerRef.current = setTimeout(() => {
            setSaveState("idle");
          }, 2000);
        } else {
          setSaveState("idle");
        }
      })();
    }, 2000);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
    ],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[200px] px-4 py-3 text-sm leading-relaxed text-foreground outline-none [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0 [&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-start [&_ul[data-type=taskList]_li]:gap-2 [&_ul[data-type=taskList]_li_label]:mt-0.5",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (!noteIdRef.current) return;
      scheduleContentSave(JSON.stringify(currentEditor.getJSON()));
    },
    onSelectionUpdate: () => {
      setToolbarRevision((revision) => revision + 1);
    },
    onTransaction: () => {
      setToolbarRevision((revision) => revision + 1);
    },
  });

  useEffect(() => {
    const nextNoteId = note?.id ?? null;

    if (noteIdRef.current === nextNoteId && nextNoteId !== null) {
      return;
    }

    noteIdRef.current = nextNoteId;
    setSaveState("idle");

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!editor) return;

    if (!note) {
      setTitle("");
      editor.commands.clearContent();
      return;
    }

    setTitle(note.title);
    editor.commands.setContent(parseNoteContent(note.content));
  }, [editor, note]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const saveTitle = useCallback(() => {
    if (!note) return;

    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(note.title);
      return;
    }

    if (trimmed === note.title) return;

    startTitleTransition(async () => {
      const result = await updateNoteTitle(note.id, trimmed);
      if (result.success) {
        onNoteUpdated({
          id: note.id,
          title: trimmed,
          updated_at: new Date().toISOString(),
        });
      } else {
        setTitle(note.title);
      }
    });
  }, [note, onNoteUpdated, startTitleTransition, title]);

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Select a note or create a new one
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        {showBackButton ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11 shrink-0 md:hidden"
            onClick={onBack}
            aria-label="Back to notes"
          >
            <ArrowLeft className="size-4" />
          </Button>
        ) : null}
        <div className="min-w-0 flex-1" />
        <span className="text-xs text-muted-foreground">
          {saveState === "saving"
            ? "Saving..."
            : saveState === "saved"
              ? "Saved"
              : null}
        </span>
      </div>

      <div className="border-b border-border/60 px-4 py-3">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={saveTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              saveTitle();
              editor?.commands.focus("start");
            }
          }}
          disabled={isTitlePending}
          placeholder="Untitled"
          className="w-full bg-transparent text-2xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/60"
        />
      </div>

      {editor ? (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border/60 bg-card/95 px-2 py-1 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <ToolbarButton
            label="Bold"
            isActive={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            isActive={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Heading 1"
            isActive={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Heading 2"
            isActive={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Bullet list"
            isActive={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            isActive={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Task list"
            isActive={editor.isActive("taskList")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <ListChecks className="size-4" />
          </ToolbarButton>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
