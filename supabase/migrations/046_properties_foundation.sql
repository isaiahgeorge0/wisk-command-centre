create table public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  postcode text not null,
  property_type text not null check (
    property_type in ('flat', 'house', 'hmo', 'commercial', 'other')
  ),
  bedrooms integer,
  bathrooms integer,
  status text not null default 'vacant' check (
    status in ('occupied', 'vacant', 'maintenance', 'listed')
  ),
  purchase_price numeric,
  current_value numeric,
  monthly_rent numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index properties_user_status_idx on public.properties (user_id, status);
create index properties_user_created_idx on public.properties (user_id, created_at desc);

alter table public.properties enable row level security;

create policy "Users can view own properties"
  on public.properties for select using (auth.uid() = user_id);
create policy "Users can insert own properties"
  on public.properties for insert with check (auth.uid() = user_id);
create policy "Users can update own properties"
  on public.properties for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own properties"
  on public.properties for delete using (auth.uid() = user_id);

create or replace function public.set_properties_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_properties_updated_at
  before update on public.properties
  for each row execute function public.set_properties_updated_at();

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  tenancy_start date not null,
  tenancy_end date,
  rent_amount numeric not null,
  rent_frequency text not null default 'monthly' check (
    rent_frequency in ('weekly', 'monthly')
  ),
  deposit_amount numeric,
  deposit_protected boolean not null default false,
  status text not null default 'active' check (
    status in ('active', 'notice', 'ended')
  ),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tenants_user_property_idx on public.tenants (user_id, property_id);

alter table public.tenants enable row level security;

create policy "Users can view own tenants"
  on public.tenants for select using (auth.uid() = user_id);
create policy "Users can insert own tenants"
  on public.tenants for insert with check (auth.uid() = user_id);
create policy "Users can update own tenants"
  on public.tenants for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own tenants"
  on public.tenants for delete using (auth.uid() = user_id);

create or replace function public.set_tenants_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_tenants_updated_at
  before update on public.tenants
  for each row execute function public.set_tenants_updated_at();

create table public.maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete set null,
  title text not null,
  description text,
  status text not null default 'new' check (
    status in ('new', 'in_progress', 'resolved')
  ),
  priority text not null default 'medium' check (
    priority in ('low', 'medium', 'high', 'emergency')
  ),
  category text check (
    category is null
    or category in (
      'plumbing',
      'electrical',
      'heating',
      'structural',
      'appliance',
      'other'
    )
  ),
  assigned_to text,
  estimated_cost numeric,
  actual_cost numeric,
  reported_date date not null default current_date,
  resolved_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index maintenance_tickets_user_property_idx
  on public.maintenance_tickets (user_id, property_id);

alter table public.maintenance_tickets enable row level security;

create policy "Users can view own maintenance tickets"
  on public.maintenance_tickets for select using (auth.uid() = user_id);
create policy "Users can insert own maintenance tickets"
  on public.maintenance_tickets for insert with check (auth.uid() = user_id);
create policy "Users can update own maintenance tickets"
  on public.maintenance_tickets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own maintenance tickets"
  on public.maintenance_tickets for delete using (auth.uid() = user_id);

create or replace function public.set_maintenance_tickets_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_maintenance_tickets_updated_at
  before update on public.maintenance_tickets
  for each row execute function public.set_maintenance_tickets_updated_at();

create table public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  amount numeric not null,
  due_date date not null,
  paid_date date,
  status text not null default 'pending' check (
    status in ('pending', 'paid', 'late', 'partial', 'missed')
  ),
  payment_method text,
  notes text,
  created_at timestamptz not null default now()
);

create index rent_payments_user_due_idx
  on public.rent_payments (user_id, due_date);

alter table public.rent_payments enable row level security;

create policy "Users can view own rent payments"
  on public.rent_payments for select using (auth.uid() = user_id);
create policy "Users can insert own rent payments"
  on public.rent_payments for insert with check (auth.uid() = user_id);
create policy "Users can update own rent payments"
  on public.rent_payments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own rent payments"
  on public.rent_payments for delete using (auth.uid() = user_id);

create table public.property_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  certificate_type text not null check (
    certificate_type in (
      'gas_safety',
      'epc',
      'eicr',
      'fire_alarm',
      'pat_testing',
      'other'
    )
  ),
  issue_date date,
  expiry_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index property_certificates_user_property_idx
  on public.property_certificates (user_id, property_id);

alter table public.property_certificates enable row level security;

create policy "Users can view own property certificates"
  on public.property_certificates for select using (auth.uid() = user_id);
create policy "Users can insert own property certificates"
  on public.property_certificates for insert with check (auth.uid() = user_id);
create policy "Users can update own property certificates"
  on public.property_certificates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own property certificates"
  on public.property_certificates for delete using (auth.uid() = user_id);

create or replace function public.set_property_certificates_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_property_certificates_updated_at
  before update on public.property_certificates
  for each row execute function public.set_property_certificates_updated_at();

create table public.property_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  name text not null,
  file_path text not null,
  file_size integer,
  file_type text,
  document_type text check (
    document_type is null
    or document_type in (
      'lease',
      'certificate',
      'inspection',
      'correspondence',
      'other'
    )
  ),
  created_at timestamptz not null default now()
);

create index property_documents_user_property_idx
  on public.property_documents (user_id, property_id);

alter table public.property_documents enable row level security;

create policy "Users can view own property documents"
  on public.property_documents for select using (auth.uid() = user_id);
create policy "Users can insert own property documents"
  on public.property_documents for insert with check (auth.uid() = user_id);
create policy "Users can update own property documents"
  on public.property_documents for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own property documents"
  on public.property_documents for delete using (auth.uid() = user_id);
