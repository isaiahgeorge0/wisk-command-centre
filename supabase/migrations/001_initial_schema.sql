-- Users profile table (linked to Supabase Auth)
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can view own profile"
  on public.users
  for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users
  for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete own profile"
  on public.users
  for delete
  using (auth.uid() = id);

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  client_name text not null,
  service_type text,
  status text,
  next_action text,
  deadline date,
  value numeric,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users can view own projects"
  on public.projects
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.projects
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects
  for delete
  using (auth.uid() = user_id);

-- Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  due_date date,
  priority text,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "Users can view own tasks"
  on public.tasks
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.tasks
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks
  for delete
  using (auth.uid() = user_id);

-- Goals
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  category text,
  target numeric,
  current numeric not null default 0,
  unit text,
  deadline date,
  status text,
  created_at timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "Users can view own goals"
  on public.goals
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own goals"
  on public.goals
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own goals"
  on public.goals
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own goals"
  on public.goals
  for delete
  using (auth.uid() = user_id);

-- Ideas
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  category text,
  status text,
  created_at timestamptz not null default now()
);

alter table public.ideas enable row level security;

create policy "Users can view own ideas"
  on public.ideas
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own ideas"
  on public.ideas
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own ideas"
  on public.ideas
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own ideas"
  on public.ideas
  for delete
  using (auth.uid() = user_id);

-- AI reports
create table public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  report_type text not null,
  content text not null,
  generated_at timestamptz not null default now()
);

alter table public.ai_reports enable row level security;

create policy "Users can view own ai_reports"
  on public.ai_reports
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own ai_reports"
  on public.ai_reports
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own ai_reports"
  on public.ai_reports
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own ai_reports"
  on public.ai_reports
  for delete
  using (auth.uid() = user_id);
