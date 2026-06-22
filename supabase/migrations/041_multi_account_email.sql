alter table public.user_integrations
  drop constraint if exists user_integrations_user_id_provider_key;

alter table public.user_integrations
  add column if not exists email_address text,
  add column if not exists label text,
  add column if not exists display_order integer not null default 0;

update public.user_integrations
set email_address = metadata->>'email'
where provider in ('gmail', 'outlook')
  and email_address is null
  and metadata ? 'email';

create unique index if not exists user_integrations_email_account_idx
  on public.user_integrations (user_id, provider, email_address)
  where provider in ('gmail', 'outlook');

create unique index if not exists user_integrations_singleton_provider_idx
  on public.user_integrations (user_id, provider)
  where provider in ('vercel', 'github');
