-- Conversations table
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id)
    on delete cascade,
  title text not null default 'New conversation',
  project_id uuid references public.projects(id)
    on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_conversations
  enable row level security;

create policy "Users can view own conversations"
  on public.ai_conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert own conversations"
  on public.ai_conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on public.ai_conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete own conversations"
  on public.ai_conversations for delete
  using (auth.uid() = user_id);

-- Add conversation_id to messages
alter table public.ai_conversation_messages
add column if not exists conversation_id uuid
  references public.ai_conversations(id)
  on delete cascade;

-- Index for fast conversation message lookup
create index ai_conversations_user_id_idx
  on public.ai_conversations (user_id, created_at desc);

create index ai_conversation_messages_conv_idx
  on public.ai_conversation_messages (conversation_id, created_at);

-- Auto-update updated_at on conversations
create or replace function
  public.set_conversation_updated_at()
returns trigger as $$
begin
  update public.ai_conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

create trigger conversation_updated_at
after insert on public.ai_conversation_messages
for each row
execute function public.set_conversation_updated_at();
