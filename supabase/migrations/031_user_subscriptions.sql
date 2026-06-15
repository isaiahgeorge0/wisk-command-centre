create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id)
    on delete cascade,
  package text not null check (
    package in ('ai', 'ai_pro', 'social',
    'commerce', 'properties', 'max')
  ),
  status text not null check (
    status in ('active', 'trialing',
    'cancelled', 'past_due')
  ),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_subscriptions
  enable row level security;

create policy "Users can view own subscriptions"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

-- Inserts/updates via admin client only (webhook handler)

create index user_subscriptions_user_id_idx
  on public.user_subscriptions (user_id);

create index user_subscriptions_stripe_customer_idx
  on public.user_subscriptions (stripe_customer_id);

create unique index user_subscriptions_stripe_subscription_id_idx
  on public.user_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;
