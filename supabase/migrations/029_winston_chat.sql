create table public.ai_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_conversation_messages enable row level security;

create policy "Users can view own messages"
  on public.ai_conversation_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert own messages"
  on public.ai_conversation_messages for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own messages"
  on public.ai_conversation_messages for delete
  using (auth.uid() = user_id);

create table public.ai_context_cache (
  user_id uuid primary key references public.users(id) on delete cascade,
  context jsonb not null,
  generated_at timestamptz not null default now()
);

alter table public.ai_context_cache enable row level security;

create policy "Users can view own context cache"
  on public.ai_context_cache for select
  using (auth.uid() = user_id);
