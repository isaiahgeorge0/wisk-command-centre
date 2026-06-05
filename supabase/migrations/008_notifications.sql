create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (
    type in (
      'overdue_task',
      'deadline_approaching',
      'stalled_project',
      'goal_no_progress'
    )
  ),
  reference_id uuid not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  link_to text not null,
  created_at timestamptz not null default now(),
  unique (user_id, type, reference_id)
);

create index notifications_user_recent_idx
  on public.notifications (user_id, created_at desc);

create index notifications_user_unread_idx
  on public.notifications (user_id, read)
  where read = false;

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own notifications"
  on public.notifications
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own notifications"
  on public.notifications
  for delete
  using (auth.uid() = user_id);
