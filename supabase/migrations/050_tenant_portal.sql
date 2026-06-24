-- Tenant portal: auth linkage, messaging, shared documents

alter table public.tenants
  add column if not exists portal_enabled boolean not null default false,
  add column if not exists portal_user_id uuid references auth.users (id) on delete set null,
  add column if not exists portal_invited_at timestamptz,
  add column if not exists portal_invite_token text;

create unique index if not exists tenants_portal_user_id_idx
  on public.tenants (portal_user_id)
  where portal_user_id is not null;

create unique index if not exists tenants_portal_invite_token_idx
  on public.tenants (portal_invite_token)
  where portal_invite_token is not null;

alter table public.property_documents
  add column if not exists shared_with_tenant boolean not null default false;

create table public.tenant_messages (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  landlord_user_id uuid not null references public.users (id) on delete cascade,
  sender_type text not null check (sender_type in ('landlord', 'tenant')),
  sender_id uuid not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index tenant_messages_tenant_created_idx
  on public.tenant_messages (tenant_id, created_at desc);

create index tenant_messages_landlord_created_idx
  on public.tenant_messages (landlord_user_id, created_at desc);

alter table public.tenant_messages enable row level security;

create policy "Landlords can view tenant messages"
  on public.tenant_messages for select
  using (landlord_user_id = auth.uid());

create policy "Landlords can insert tenant messages"
  on public.tenant_messages for insert
  with check (
    landlord_user_id = auth.uid()
    and sender_type = 'landlord'
    and sender_id = auth.uid()
  );

create policy "Tenants can view own messages"
  on public.tenant_messages for select
  using (
    exists (
      select 1
      from public.tenants t
      where t.id = tenant_messages.tenant_id
        and t.portal_user_id = auth.uid()
        and t.portal_enabled = true
    )
  );

create policy "Tenants can insert own messages"
  on public.tenant_messages for insert
  with check (
    sender_type = 'tenant'
    and sender_id = auth.uid()
    and exists (
      select 1
      from public.tenants t
      where t.id = tenant_messages.tenant_id
        and t.portal_user_id = auth.uid()
        and t.portal_enabled = true
        and t.portal_user_id = sender_id
    )
  );

-- Portal tenant RLS extensions

create policy "Portal tenants can view own tenant row"
  on public.tenants for select
  using (portal_user_id = auth.uid() and portal_enabled = true);

create policy "Portal tenants can view their property"
  on public.properties for select
  using (
    exists (
      select 1
      from public.tenants t
      where t.portal_user_id = auth.uid()
        and t.property_id = properties.id
        and t.portal_enabled = true
    )
  );

create policy "Portal tenants can view own maintenance tickets"
  on public.maintenance_tickets for select
  using (
    exists (
      select 1
      from public.tenants t
      where t.portal_user_id = auth.uid()
        and t.id = maintenance_tickets.tenant_id
        and t.portal_enabled = true
    )
  );

create policy "Portal tenants can insert maintenance tickets"
  on public.maintenance_tickets for insert
  with check (
    exists (
      select 1
      from public.tenants t
      where t.portal_user_id = auth.uid()
        and t.id = maintenance_tickets.tenant_id
        and t.property_id = maintenance_tickets.property_id
        and t.user_id = maintenance_tickets.user_id
        and t.portal_enabled = true
    )
  );

create policy "Portal tenants can view shared documents"
  on public.property_documents for select
  using (
    shared_with_tenant = true
    and exists (
      select 1
      from public.tenants t
      where t.portal_user_id = auth.uid()
        and t.property_id = property_documents.property_id
        and t.portal_enabled = true
    )
  );

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
      'portal_triage'
    )
  );
