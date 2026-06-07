-- Baseline the blog_posts table (created manually in Supabase dashboard).
-- CREATE TABLE IF NOT EXISTS is a no-op when the table already exists,
-- so this is safe to run against the live database.

create table if not exists public.blog_posts (
  id               uuid        primary key default gen_random_uuid(),
  title            text        not null,
  slug             text        not null unique,
  excerpt          text        not null,
  content          text        not null,
  cover_image_url  text        null,
  tags             text[]      null,
  author_name      text        not null,
  published        boolean     not null default false,
  published_at     timestamptz null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Add scheduled_for column for future publish scheduling.
-- ADD COLUMN IF NOT EXISTS is a no-op when the column already exists.
alter table public.blog_posts
  add column if not exists scheduled_for timestamptz null;

-- Index for the scheduled-publish cron query:
-- efficiently finds unpublished posts with a scheduled_for date.
create index if not exists idx_blog_posts_scheduled
  on public.blog_posts (published, scheduled_for)
  where published = false and scheduled_for is not null;

-- Prevent a post from being both published and still scheduled.
-- A published post must have scheduled_for = NULL (the schedule has fired
-- or was never set). This constraint may already be satisfied by all
-- existing rows since scheduled_for is a new column.
do $$
begin
  if not exists (
    select 1
    from   information_schema.table_constraints
    where  table_schema    = 'public'
    and    table_name      = 'blog_posts'
    and    constraint_name = 'blog_posts_status_check'
  ) then
    alter table public.blog_posts
      add constraint blog_posts_status_check
      check (not (published = true and scheduled_for is not null));
  end if;
end;
$$;
