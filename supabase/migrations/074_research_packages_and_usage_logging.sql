alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_package_check;

alter table public.user_subscriptions
  add constraint user_subscriptions_package_check
  check (
    package in (
      'ai',
      'ai_pro',
      'research',
      'research_pro',
      'social',
      'commerce',
      'properties',
      'properties_pro',
      'max'
    )
  );

alter table public.ai_usage_log
  add column if not exists provider text not null default 'anthropic'
    check (provider in ('anthropic', 'tavily', 'exa', 'google_places'));

alter table public.ai_usage_log
  add column if not exists external_call_count integer not null default 0;

alter table public.ai_usage_log
  add column if not exists external_cost_usd numeric(12, 6) not null default 0;

alter table public.ai_usage_log
  add column if not exists external_metadata jsonb not null default '{}'::jsonb;

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
      'pipeline_health',
      'portal_triage',
      'property_valuation',
      'morning_briefing',
      'lead_research_brief',
      'research_competitor_check',
      'research_place_lookup'
    )
  );

create table if not exists public.research_competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  url text,
  google_place_id text,
  google_place_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.research_competitors enable row level security;

create policy "Users can view own research competitors"
  on public.research_competitors for select
  using (auth.uid() = user_id);

create policy "Users can insert own research competitors"
  on public.research_competitors for insert
  with check (auth.uid() = user_id);

create policy "Users can update own research competitors"
  on public.research_competitors for update
  using (auth.uid() = user_id);

create policy "Users can delete own research competitors"
  on public.research_competitors for delete
  using (auth.uid() = user_id);

create index if not exists research_competitors_user_id_idx
  on public.research_competitors (user_id, created_at desc);

create table if not exists public.research_competitor_checks (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.research_competitors(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  source text not null check (source in ('tavily', 'google_places')),
  snapshot jsonb not null default '{}'::jsonb,
  has_meaningful_change boolean not null default false,
  change_summary text,
  urgency text check (urgency in ('high', 'medium', 'low')),
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.research_competitor_checks enable row level security;

create policy "Users can view own research competitor checks"
  on public.research_competitor_checks for select
  using (auth.uid() = user_id);

create index if not exists research_competitor_checks_competitor_idx
  on public.research_competitor_checks (competitor_id, checked_at desc);

create index if not exists research_competitor_checks_user_idx
  on public.research_competitor_checks (user_id, checked_at desc);
