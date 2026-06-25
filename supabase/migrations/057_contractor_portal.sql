-- Contractor portal: address book, job sheets, access requests
create extension if not exists pgcrypto;
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Contractor address book
create table public.contractors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  trade text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contractors enable row level security;

create policy "Users can view own contractors"
  on public.contractors for select using (auth.uid() = user_id);
create policy "Users can insert own contractors"
  on public.contractors for insert with check (auth.uid() = user_id);
create policy "Users can update own contractors"
  on public.contractors for update using (auth.uid() = user_id);
create policy "Users can delete own contractors"
  on public.contractors for delete using (auth.uid() = user_id);

-- Job sheets (one per maintenance ticket assignment)
create table public.job_sheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  property_id uuid references public.properties(id) on delete cascade not null,
  ticket_id uuid references public.maintenance_tickets(id) on delete cascade not null,
  contractor_id uuid references public.contractors(id) on delete set null,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  status text not null default 'sent',
  contractor_notes text,
  planned_visit_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- status: sent | viewed | in_progress | completed | cancelled

alter table public.job_sheets enable row level security;

create policy "Users can view own job sheets"
  on public.job_sheets for select using (auth.uid() = user_id);
create policy "Users can insert own job sheets"
  on public.job_sheets for insert with check (auth.uid() = user_id);
create policy "Users can update own job sheets"
  on public.job_sheets for update using (auth.uid() = user_id);
create policy "Users can delete own job sheets"
  on public.job_sheets for delete using (auth.uid() = user_id);

-- Allow public read by token (for contractor portal)
create policy "Public can view job sheet by token"
  on public.job_sheets for select
  using (token is not null);

-- Job sheet updates (contractor activity log)
create table public.job_sheet_updates (
  id uuid primary key default gen_random_uuid(),
  job_sheet_id uuid references public.job_sheets(id) on delete cascade not null,
  author text not null default 'contractor',
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.job_sheet_updates enable row level security;

create policy "Users can view own job sheet updates"
  on public.job_sheet_updates for select
  using (
    exists (
      select 1 from public.job_sheets
      where job_sheets.id = job_sheet_updates.job_sheet_id
      and job_sheets.user_id = auth.uid()
    )
  );

create policy "Users can insert own job sheet updates"
  on public.job_sheet_updates for insert
  with check (
    exists (
      select 1 from public.job_sheets
      where job_sheets.id = job_sheet_updates.job_sheet_id
      and job_sheets.user_id = auth.uid()
    )
  );

-- Allow public insert by job_sheet_id (contractor submitting updates)
create policy "Public can insert job sheet updates"
  on public.job_sheet_updates for insert
  with check (job_sheet_id is not null);

-- Contractor access requests
create table public.contractor_access_requests (
  id uuid primary key default gen_random_uuid(),
  job_sheet_id uuid references public.job_sheets(id) on delete cascade not null,
  property_id uuid references public.properties(id) on delete cascade not null,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  requested_date date not null,
  requested_time text,
  notes text,
  status text not null default 'pending',
  tenant_response_at timestamptz,
  created_at timestamptz not null default now()
);

-- status: pending | approved | declined

alter table public.contractor_access_requests enable row level security;

create policy "Users can view own access requests"
  on public.contractor_access_requests for select
  using (
    exists (
      select 1 from public.job_sheets
      where job_sheets.id = contractor_access_requests.job_sheet_id
      and job_sheets.user_id = auth.uid()
    )
  );

create policy "Tenants can view own access requests"
  on public.contractor_access_requests for select
  using (
    tenant_id in (
      select id from public.tenants
      where portal_user_id = auth.uid()
        and portal_enabled = true
    )
  );

-- Allow public insert (contractor submitting access request)
create policy "Public can insert access requests"
  on public.contractor_access_requests for insert
  with check (job_sheet_id is not null);

-- Allow tenant to update their own access requests
create policy "Tenants can update own access requests"
  on public.contractor_access_requests for update
  using (
    tenant_id in (
      select id from public.tenants
      where portal_user_id = auth.uid()
        and portal_enabled = true
    )
  );

create policy "Tenants can view job sheets for their access requests"
  on public.job_sheets for select
  using (
    exists (
      select 1
      from public.contractor_access_requests car
      join public.tenants t on t.id = car.tenant_id
      where car.job_sheet_id = job_sheets.id
        and t.portal_user_id = auth.uid()
        and t.portal_enabled = true
    )
  );

create trigger set_contractors_updated_at
  before update on public.contractors
  for each row execute function public.handle_updated_at();

create trigger set_job_sheets_updated_at
  before update on public.job_sheets
  for each row execute function public.handle_updated_at();
