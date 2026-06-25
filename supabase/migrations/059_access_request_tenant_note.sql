alter table public.contractor_access_requests
  add column if not exists tenant_note text;
