-- Announcements (admin-managed, visible to all authenticated users)
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid not null references public.users (id) on delete cascade
);

create index announcements_expires_at_idx on public.announcements (expires_at);

alter table public.announcements enable row level security;

create policy "Authenticated users can view announcements"
  on public.announcements
  for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies for authenticated role.
-- Admin mutations use service role in server actions.

-- Per-user dismissals
create table public.announcement_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  unique (user_id, announcement_id)
);

create index announcement_dismissals_user_id_idx
  on public.announcement_dismissals (user_id);

alter table public.announcement_dismissals enable row level security;

create policy "Users can view own dismissals"
  on public.announcement_dismissals
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own dismissals"
  on public.announcement_dismissals
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own dismissals"
  on public.announcement_dismissals
  for delete
  using (auth.uid() = user_id);
