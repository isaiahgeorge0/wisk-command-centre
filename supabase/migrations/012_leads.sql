create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  source text not null check (
    source in (
      'TikTok',
      'Instagram',
      'Referral',
      'Website',
      'LinkedIn',
      'Cold outreach',
      'Other'
    )
  ),
  service_interest text not null,
  status text not null default 'new' check (
    status in (
      'new',
      'contacted',
      'qualified',
      'proposal_sent',
      'won',
      'lost'
    )
  ),
  value numeric,
  notes text,
  contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_user_status_idx on public.leads (user_id, status);
create index leads_user_created_idx on public.leads (user_id, created_at desc);

alter table public.leads enable row level security;

create policy "Users can view own leads"
  on public.leads
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own leads"
  on public.leads
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own leads"
  on public.leads
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own leads"
  on public.leads
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_leads_updated_at on public.leads;

create trigger set_leads_updated_at
  before update on public.leads
  for each row
  execute function public.set_leads_updated_at();
