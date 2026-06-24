-- Rent due day tracking and landlord reminder emails

alter table public.tenants
  add column rent_due_day integer check (
    rent_due_day is null or (rent_due_day >= 1 and rent_due_day <= 28)
  ),
  add column rent_reminder_days integer not null default 0 check (
    rent_reminder_days >= 0 and rent_reminder_days <= 7
  ),
  add column rent_reminder_enabled boolean not null default true;

create table public.rent_reminder_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  month date not null,
  sent_at timestamptz not null default now(),
  unique (tenant_id, month)
);

create index rent_reminder_log_user_idx
  on public.rent_reminder_log (user_id, sent_at desc);

alter table public.rent_reminder_log enable row level security;

create policy "Users can view own rent reminders"
  on public.rent_reminder_log for select using (auth.uid() = user_id);
