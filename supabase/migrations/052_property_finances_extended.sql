-- Extended property finances: post-expiry certificate alerts, mortgages, insurance

alter table public.certificate_alert_log
  drop constraint if exists certificate_alert_log_alert_type_check;

alter table public.certificate_alert_log
  add constraint certificate_alert_log_alert_type_check check (
    alert_type in (
      '90_days',
      '30_days',
      '7_days',
      'expired',
      '7_days_overdue',
      '30_days_overdue'
    )
  );

create table public.property_mortgages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  lender text not null,
  account_reference text,
  monthly_payment numeric not null,
  interest_rate numeric,
  mortgage_type text not null default 'repayment' check (
    mortgage_type in ('repayment', 'interest_only')
  ),
  fixed_rate_end_date date,
  mortgage_end_date date,
  outstanding_balance numeric,
  notes text,
  alerts_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index property_mortgages_user_property_idx
  on public.property_mortgages (user_id, property_id);

alter table public.property_mortgages enable row level security;

create policy "Users can view own property mortgages"
  on public.property_mortgages for select using (auth.uid() = user_id);
create policy "Users can insert own property mortgages"
  on public.property_mortgages for insert with check (auth.uid() = user_id);
create policy "Users can update own property mortgages"
  on public.property_mortgages for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Users can delete own property mortgages"
  on public.property_mortgages for delete using (auth.uid() = user_id);

create or replace function public.set_property_mortgages_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_property_mortgages_updated_at
  before update on public.property_mortgages
  for each row execute function public.set_property_mortgages_updated_at();

create table public.mortgage_alert_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  mortgage_id uuid not null references public.property_mortgages (id) on delete cascade,
  alert_type text not null check (
    alert_type in ('180_days', '90_days', '30_days', '7_days')
  ),
  sent_at timestamptz not null default now(),
  acknowledged boolean not null default false,
  acknowledged_at timestamptz,
  unique (mortgage_id, alert_type)
);

create index mortgage_alert_log_user_idx
  on public.mortgage_alert_log (user_id, sent_at desc);

alter table public.mortgage_alert_log enable row level security;

create policy "Users can view own mortgage alerts"
  on public.mortgage_alert_log for select using (auth.uid() = user_id);
create policy "Users can update own mortgage alerts"
  on public.mortgage_alert_log for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.property_insurance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  insurer text not null,
  policy_number text,
  insurance_type text not null check (
    insurance_type in (
      'buildings',
      'contents',
      'landlord_liability',
      'combined',
      'other'
    )
  ),
  annual_premium numeric,
  renewal_date date,
  start_date date,
  notes text,
  alerts_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index property_insurance_user_property_idx
  on public.property_insurance (user_id, property_id);

alter table public.property_insurance enable row level security;

create policy "Users can view own property insurance"
  on public.property_insurance for select using (auth.uid() = user_id);
create policy "Users can insert own property insurance"
  on public.property_insurance for insert with check (auth.uid() = user_id);
create policy "Users can update own property insurance"
  on public.property_insurance for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Users can delete own property insurance"
  on public.property_insurance for delete using (auth.uid() = user_id);

create or replace function public.set_property_insurance_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_property_insurance_updated_at
  before update on public.property_insurance
  for each row execute function public.set_property_insurance_updated_at();

create table public.insurance_alert_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  insurance_id uuid not null references public.property_insurance (id) on delete cascade,
  alert_type text not null check (
    alert_type in ('90_days', '30_days', '7_days')
  ),
  sent_at timestamptz not null default now(),
  acknowledged boolean not null default false,
  acknowledged_at timestamptz,
  unique (insurance_id, alert_type)
);

create index insurance_alert_log_user_idx
  on public.insurance_alert_log (user_id, sent_at desc);

alter table public.insurance_alert_log enable row level security;

create policy "Users can view own insurance alerts"
  on public.insurance_alert_log for select using (auth.uid() = user_id);
create policy "Users can update own insurance alerts"
  on public.insurance_alert_log for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
