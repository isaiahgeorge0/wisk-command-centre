-- Page-level Winston brainstorm scopes (Calendar, Content Calendar, future surfaces).
-- Additive alongside note_id / project_id — not a migration of existing rows.
alter table public.ai_conversations
  add column if not exists scope_key text;

create unique index if not exists ai_conversations_user_scope_key_idx
  on public.ai_conversations (user_id, scope_key)
  where scope_key is not null;
