alter table public.user_preferences
  add column if not exists timezone text default 'Europe/London';

create table if not exists public.morning_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  sent_at timestamptz default null,
  briefing_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique(user_id, briefing_date)
);

alter table public.morning_briefings enable row level security;

create policy "Users can read own briefings"
  on public.morning_briefings for select
  using (auth.uid() = user_id);

create policy "Service role full access"
  on public.morning_briefings for all
  to service_role
  using (true)
  with check (true);

alter table public.ai_usage_log
  drop constraint if exists ai_usage_log_feature_check;

alter table public.ai_usage_log
  add constraint ai_usage_log_feature_check
  check (
    feature in (
      'chat',
      'digest',
      'email_draft',
      'property_insights',
      'email_picks_draft',
      'portal_triage',
      'property_valuation',
      'morning_briefing'
    )
  );
