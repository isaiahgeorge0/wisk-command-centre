# Notes — Feature Specification

## Current State

What is built and working today.

- Standalone Notes section, lives in the "Plan" nav group alongside Projects/Tasks/Goals
- Route: `/notes`
- Rich text editor (TipTap) — content stored as serialized TipTap JSON inside a `text` column
- Create, edit, delete (with confirmation dialog)
- Client-side search across title and a plain-text-extracted preview
- List view, sorted by most recently updated
- **Brainstorm with Winston** (section) — header button, `scope_key: 'notes'`. No specific note in context. Isolated from record-level and global threads.
- **Winston** (record) — in the note editor, opens the shared sidebar scoped to that note (`ai_conversations.note_id`, migration 069). Context is the note's title + plain text. Each reply has "Insert into note" — cursor insert or append, immediate save, one explicit click, never automatic.
- **Find projects & tasks** — separate entry point from brainstorming (one-shot generation, not a conversation). Reads the note plus a lightweight list of the user's existing active projects, so it can attach a task to something that already exists rather than always proposing something new. Produces a reviewable proposal (shared Winston proposal pattern — see `winston.md`) of `project`/`task` items, each with a stated reason. Committing sets `projects.source_note_id` (migration 070) so created projects trace back to the note they came from. Returns a clear "nothing actionable found" state when appropriate rather than forcing output.
- Section and record Winston are gated behind `ai_access` (upgrade teaser otherwise). The global FAB still offers a capped free conversation — see `winston.md`.

## Gaps and Missing Features

What is missing or underdeveloped, with a priority rating (High/Medium/Low) per item.

- No tags or categorisation — **Medium**
- No server-side search/filtering or pagination — client-side only, will not scale — **Medium**
- No "last brainstorm/proposal generated at" indicator on the note — intentionally left out for now to keep the initial build scoped to infrastructure + entry points; worth adding if usage shows people want it — **Low**

## Planned Additions (Phase 2)

- Winston brainstorming — COMPLETE
- Note → project/task conversion via Winston — COMPLETE

## Future Considerations (Phase 3+)

- Tags/categorisation
- Server-side search
- Rich text improvements beyond current TipTap baseline

## Technical Notes

- Migration: `supabase/migrations/039_notes.sql`
- Table: `public.notes` — `id, user_id, title (default 'Untitled'), content, created_at, updated_at`
- Index: `notes_user_updated_idx (user_id, updated_at desc)`
- RLS: scoped to own notes (select/insert/update/delete)
- Editor: `src/components/notes/note-editor.tsx` (TipTap), content persisted via `JSON.stringify(editor.getJSON())`
- Reader/parsing: `parseNoteContent()` and `extractPlainTextFromNoteContent()` in `src/lib/notes/utils.ts` — reused directly by both Winston features rather than re-parsing TipTap JSON
- Search: `matchesNoteSearch()` + `getNotePreview()`, both client-side, in `src/lib/notes/utils.ts`
- `notes` has no foreign key to any other table (only `notes.user_id -> users.id`); the reverse link now exists via `projects.source_note_id` (migration 070) for anything created through the projects/tasks conversion flow
- Brainstorming: `ai_conversations.note_id` (migration 069, unique per user/note, `on delete cascade`). Panel calls `getOrCreateNoteConversation` on open and renders existing `ai_conversation_messages` before new input. Chat route persists user messages before Anthropic and assistant replies after the stream completes server-side.
- Projects/tasks conversion route: `src/app/api/winston/notes/[noteId]/propose-projects/route.ts` (`claude-sonnet-4-6`) — validates non-empty `reasoning` on every proposed item before returning
- UI: `src/components/notes/note-project-proposal-panel.tsx` renders the shared `WinstonProposalReview` with `allowedEntityTypes={["project", "task"]}`
