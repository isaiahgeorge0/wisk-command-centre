create table public.property_valuations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  rental_min numeric,
  rental_max numeric,
  sale_min numeric,
  sale_max numeric,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  search_level text not null check (search_level in ('postcode', 'town')),
  reasoning text not null,
  web_sources jsonb,
  manual_comparables jsonb,
  generated_at timestamptz not null default now(),
  next_available_at timestamptz not null
);

create index property_valuations_user_property_idx
  on public.property_valuations (user_id, property_id, generated_at desc);

alter table public.property_valuations enable row level security;

create policy "Users can view own property valuations"
  on public.property_valuations for select using (auth.uid() = user_id);
create policy "Users can insert own property valuations"
  on public.property_valuations for insert with check (auth.uid() = user_id);

create table public.property_comparables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  address text not null,
  comparable_type text not null check (comparable_type in ('rental', 'sale')),
  price numeric not null,
  date date,
  source text,
  bedrooms integer,
  property_type text,
  notes text,
  created_at timestamptz not null default now()
);

create index property_comparables_user_property_idx
  on public.property_comparables (user_id, property_id);

alter table public.property_comparables enable row level security;

create policy "Users can view own property comparables"
  on public.property_comparables for select using (auth.uid() = user_id);
create policy "Users can insert own property comparables"
  on public.property_comparables for insert with check (auth.uid() = user_id);
create policy "Users can update own property comparables"
  on public.property_comparables for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Users can delete own property comparables"
  on public.property_comparables for delete using (auth.uid() = user_id);

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
      'property_valuation'
    )
  );
