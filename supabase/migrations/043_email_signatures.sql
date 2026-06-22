alter table public.user_integrations
  add column if not exists signature text,
  add column if not exists signature_plain text;
