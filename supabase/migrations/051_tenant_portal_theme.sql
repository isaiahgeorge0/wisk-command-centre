alter table public.tenants
  add column if not exists portal_theme text not null default 'light'
    check (portal_theme in ('light', 'dark'));

alter table public.maintenance_tickets
  add column if not exists reported_by_tenant boolean not null default false;

create policy "Portal tenants can update own portal preferences"
  on public.tenants for update
  using (portal_user_id = auth.uid() and portal_enabled = true)
  with check (portal_user_id = auth.uid() and portal_enabled = true);
