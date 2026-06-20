alter table public.user_integrations
  drop constraint if exists user_integrations_provider_check;

alter table public.user_integrations
  add constraint user_integrations_provider_check
  check (provider in ('vercel', 'github', 'gmail'));

alter table public.user_integrations
  add column if not exists refresh_token text;
