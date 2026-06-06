-- Recurring content support: recurrence rule on posts + occurrences table

alter table public.content_posts
  add column recurrence_rule text null,
  add column recurrence_end_date date null,
  add constraint content_posts_recurrence_rule_check
    check (recurrence_rule in ('daily', 'weekly', 'monthly'));

create table public.content_post_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  post_id uuid not null references public.content_posts (id) on delete cascade,
  occurrence_date date not null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, occurrence_date)
);

alter table public.content_post_occurrences enable row level security;

create policy "Users can view own occurrences"
  on public.content_post_occurrences
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own occurrences"
  on public.content_post_occurrences
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own occurrences"
  on public.content_post_occurrences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own occurrences"
  on public.content_post_occurrences
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_content_post_occurrences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_content_post_occurrences_updated_at on public.content_post_occurrences;

create trigger set_content_post_occurrences_updated_at
  before update on public.content_post_occurrences
  for each row
  execute function public.set_content_post_occurrences_updated_at();
