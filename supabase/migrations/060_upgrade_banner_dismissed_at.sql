alter table public.user_preferences
  add column if not exists upgrade_banner_dismissed_at timestamptz default null;
