-- Add ai_access flag to user_preferences.
-- Default false — access is granted explicitly by an admin.

alter table public.user_preferences
  add column if not exists ai_access boolean not null default false;
