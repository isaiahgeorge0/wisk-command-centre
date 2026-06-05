create table public.changelog_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  type text not null check (type in ('feature', 'improvement', 'fix')),
  published_at timestamptz not null,
  created_by uuid not null references public.users (id) on delete cascade
);

create index changelog_entries_published_at_idx
  on public.changelog_entries (published_at desc);

alter table public.changelog_entries enable row level security;

create policy "Authenticated users can view published changelog entries"
  on public.changelog_entries
  for select
  to authenticated
  using (published_at <= now());

-- Admin mutations use service role in server actions.

alter table public.user_preferences
  add column last_seen_changelog timestamptz;
