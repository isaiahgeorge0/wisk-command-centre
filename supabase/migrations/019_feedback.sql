create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('bug_report', 'feature_request', 'general')),
  message text not null,
  status text not null default 'new' check (status in ('new', 'reviewed', 'actioned')),
  created_at timestamptz not null default now(),
  admin_notes text
);

create index feedback_user_id_idx on public.feedback (user_id);
create index feedback_status_idx on public.feedback (status);
create index feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

create policy "Users can view own feedback"
  on public.feedback
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own feedback"
  on public.feedback
  for insert
  with check (auth.uid() = user_id);

-- No UPDATE/DELETE policies for authenticated role.
-- Admin mutations use service role in server actions.

alter table public.user_preferences
  add column feedback_welcome_shown boolean not null default false;

update public.user_preferences
set feedback_welcome_shown = true;
