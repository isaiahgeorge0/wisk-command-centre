create table public.content_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  platform text not null check (
    platform in (
      'TikTok',
      'Instagram',
      'YouTube',
      'LinkedIn',
      'Twitter/X',
      'Facebook',
      'Other'
    )
  ),
  content_type text not null check (
    content_type in (
      'Video',
      'Reel',
      'Short',
      'Post',
      'Story',
      'Article',
      'Thread',
      'Other'
    )
  ),
  status text not null default 'idea' check (
    status in (
      'idea',
      'planned',
      'in_progress',
      'scheduled',
      'published'
    )
  ),
  scheduled_date date,
  published_date date,
  hook text,
  description text,
  tags text[],
  goal_id uuid references public.goals (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index content_posts_user_status_idx on public.content_posts (user_id, status);
create index content_posts_user_scheduled_idx on public.content_posts (user_id, scheduled_date);
create index content_posts_user_published_idx on public.content_posts (user_id, published_date);
create index content_posts_goal_id_idx on public.content_posts (goal_id);

alter table public.content_posts enable row level security;

create policy "Users can view own content posts"
  on public.content_posts
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own content posts"
  on public.content_posts
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own content posts"
  on public.content_posts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own content posts"
  on public.content_posts
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_content_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_content_posts_updated_at on public.content_posts;

create trigger set_content_posts_updated_at
  before update on public.content_posts
  for each row
  execute function public.set_content_posts_updated_at();
