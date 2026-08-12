-- Note-scoped Winston conversations (mirrors project_id on ai_conversations).
alter table public.ai_conversations
  add column note_id uuid references public.notes(id) on delete cascade;

create index ai_conversations_note_id_idx
  on public.ai_conversations (note_id)
  where note_id is not null;

-- One brainstorm thread per user per note.
create unique index ai_conversations_user_note_id_uidx
  on public.ai_conversations (user_id, note_id)
  where note_id is not null;
