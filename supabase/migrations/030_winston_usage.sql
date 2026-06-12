create table public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  feature text not null check (feature in ('chat', 'digest')),
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.ai_usage_log enable row level security;

create policy "Users can view own usage"
  on public.ai_usage_log for select
  using (auth.uid() = user_id);

create index ai_usage_log_user_created_idx
  on public.ai_usage_log (user_id, created_at);
