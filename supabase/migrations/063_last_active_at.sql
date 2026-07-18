alter table public.user_preferences
  add column if not exists last_active_at timestamptz default null;
