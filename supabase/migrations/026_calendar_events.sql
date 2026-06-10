create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  date date not null,
  end_date date,
  event_type text not null check (
    event_type in ('lifestyle', 'other')
  ),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index calendar_events_user_date_idx
  on public.calendar_events (user_id, date);

alter table public.calendar_events enable row level security;

create policy "Users can view own calendar events"
  on public.calendar_events
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own calendar events"
  on public.calendar_events
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own calendar events"
  on public.calendar_events
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own calendar events"
  on public.calendar_events
  for delete
  using (auth.uid() = user_id);
