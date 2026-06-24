-- Last seen for landlords
alter table public.user_preferences
  add column if not exists last_seen_at timestamptz;

-- Last seen for tenants
alter table public.tenants
  add column if not exists last_seen_at timestamptz;
