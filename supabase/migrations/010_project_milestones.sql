create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  date date not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index project_milestones_project_date_idx
  on public.project_milestones (project_id, date);

create index project_milestones_user_idx
  on public.project_milestones (user_id);

alter table public.project_milestones enable row level security;

create policy "Users can view own milestones"
  on public.project_milestones
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own milestones"
  on public.project_milestones
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own milestones"
  on public.project_milestones
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own milestones"
  on public.project_milestones
  for delete
  using (auth.uid() = user_id);
