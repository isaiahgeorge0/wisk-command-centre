-- Drop the existing package check constraint
alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_package_check;

-- Re-add it with properties_pro included
alter table public.user_subscriptions
  add constraint user_subscriptions_package_check
  check (package in ('ai', 'ai_pro', 'social', 'commerce', 'properties', 'properties_pro', 'max'));
