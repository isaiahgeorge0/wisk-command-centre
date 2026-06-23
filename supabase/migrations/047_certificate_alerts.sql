-- Certificate alerts, property insights, document storage policies

alter table public.properties
  add column if not exists alerts_enabled boolean not null default true;

create table if not exists public.certificate_alert_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  certificate_id uuid not null references public.property_certificates (id) on delete cascade,
  alert_type text not null check (
    alert_type in ('90_days', '30_days', '7_days', 'expired')
  ),
  sent_at timestamptz not null default now(),
  acknowledged boolean not null default false,
  acknowledged_at timestamptz,
  unique (certificate_id, alert_type)
);

create index certificate_alert_log_user_idx
  on public.certificate_alert_log (user_id, sent_at desc);

alter table public.certificate_alert_log enable row level security;

create policy "Users can view own certificate alerts"
  on public.certificate_alert_log for select using (auth.uid() = user_id);
create policy "Users can update own certificate alerts"
  on public.certificate_alert_log for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.property_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  insight_type text not null check (
    insight_type in ('weekly_digest', 'monthly_digest', 'inline')
  ),
  content jsonb not null,
  generated_at timestamptz not null default now(),
  period_start date,
  period_end date
);

create index property_insights_user_generated_idx
  on public.property_insights (user_id, generated_at desc);

alter table public.property_insights enable row level security;

create policy "Users can view own property insights"
  on public.property_insights for select using (auth.uid() = user_id);
create policy "Users can insert own property insights"
  on public.property_insights for insert with check (auth.uid() = user_id);

-- Storage policies for property-documents bucket (private)
create policy "Users can upload own property documents"
  on storage.objects for insert
  with check (
    bucket_id = 'property-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read own property documents"
  on storage.objects for select
  using (
    bucket_id = 'property-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own property documents"
  on storage.objects for delete
  using (
    bucket_id = 'property-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow property_insights in ai_usage_log
alter table public.ai_usage_log
  drop constraint if exists ai_usage_log_feature_check;

alter table public.ai_usage_log
  add constraint ai_usage_log_feature_check
  check (feature in ('chat', 'digest', 'email_draft', 'property_insights'));
