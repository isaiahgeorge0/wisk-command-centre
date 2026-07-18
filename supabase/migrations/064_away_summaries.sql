create table public.away_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  last_synced_at timestamptz not null default now(),
  new_emails jsonb not null default '[]'::jsonb,
  new_leads jsonb not null default '[]'::jsonb,
  overdue_tasks jsonb not null default '[]'::jsonb,
  new_messages jsonb not null default '[]'::jsonb,
  has_updates boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.away_summaries enable row level security;

create policy "Users can read own away summary"
  on public.away_summaries for select
  using (auth.uid() = user_id);

create policy "Service role full access"
  on public.away_summaries for all
  to service_role
  using (true)
  with check (true);
