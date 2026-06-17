-- Add username to public.users
alter table public.users
  add column if not exists username text unique;

-- Case-insensitive unique index
create unique index if not exists users_username_lower_idx
  on public.users (lower(username));

-- Add username_set flag to user_preferences
alter table public.user_preferences
  add column if not exists username_set boolean not null default false;
