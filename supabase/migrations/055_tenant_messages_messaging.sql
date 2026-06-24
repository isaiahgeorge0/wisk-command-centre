-- Messaging: read receipts and realtime for tenant_messages

create policy "Landlords can update tenant messages"
  on public.tenant_messages for update
  using (landlord_user_id = auth.uid())
  with check (landlord_user_id = auth.uid());

create policy "Tenants can update own messages"
  on public.tenant_messages for update
  using (
    exists (
      select 1
      from public.tenants t
      where t.id = tenant_messages.tenant_id
        and t.portal_user_id = auth.uid()
        and t.portal_enabled = true
    )
  )
  with check (
    exists (
      select 1
      from public.tenants t
      where t.id = tenant_messages.tenant_id
        and t.portal_user_id = auth.uid()
        and t.portal_enabled = true
    )
  );

alter publication supabase_realtime add table public.tenant_messages;
