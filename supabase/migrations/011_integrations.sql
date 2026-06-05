create table public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  provider text not null check (provider in ('vercel', 'github')),
  access_token text not null,
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  unique (user_id, provider)
);

create index user_integrations_user_provider_idx
  on public.user_integrations (user_id, provider);

alter table public.user_integrations enable row level security;

create policy "Users can view own integrations"
  on public.user_integrations
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own integrations"
  on public.user_integrations
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own integrations"
  on public.user_integrations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own integrations"
  on public.user_integrations
  for delete
  using (auth.uid() = user_id);

alter table public.projects
  add column github_repo text,
  add column vercel_project_id text;

create index projects_vercel_project_id_idx
  on public.projects (user_id, vercel_project_id)
  where vercel_project_id is not null;
