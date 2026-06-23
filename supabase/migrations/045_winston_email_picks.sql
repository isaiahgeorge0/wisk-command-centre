create table public.winston_email_picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  "window" text not null check ("window" in ('morning', 'afternoon')),
  date date not null,
  picks jsonb not null,
  generated_at timestamptz not null default now(),
  unique (user_id, date, "window")
);

create index winston_email_picks_user_date_idx
  on public.winston_email_picks (user_id, date desc);

alter table public.winston_email_picks enable row level security;

create policy "Users can view own winston email picks"
  on public.winston_email_picks
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own winston email picks"
  on public.winston_email_picks
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own winston email picks"
  on public.winston_email_picks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own winston email picks"
  on public.winston_email_picks
  for delete
  using (auth.uid() = user_id);
