create table public.custom_inboxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  colour text not null default '#7c3aed',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index custom_inboxes_user_order_idx
  on public.custom_inboxes (user_id, display_order asc);

alter table public.custom_inboxes enable row level security;

create policy "Users can view own custom inboxes"
  on public.custom_inboxes
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own custom inboxes"
  on public.custom_inboxes
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own custom inboxes"
  on public.custom_inboxes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own custom inboxes"
  on public.custom_inboxes
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_custom_inboxes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_custom_inboxes_updated_at on public.custom_inboxes;

create trigger set_custom_inboxes_updated_at
  before update on public.custom_inboxes
  for each row
  execute function public.set_custom_inboxes_updated_at();

create table public.email_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  rule_type text not null check (rule_type in ('sender', 'domain')),
  value text not null,
  target_type text not null check (target_type in ('custom_inbox', 'default_category')),
  target_id text not null,
  apply_type text not null check (apply_type in ('always', 'once')),
  created_at timestamptz not null default now()
);

create index email_rules_user_idx on public.email_rules (user_id);

alter table public.email_rules enable row level security;

create policy "Users can view own email rules"
  on public.email_rules
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own email rules"
  on public.email_rules
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own email rules"
  on public.email_rules
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own email rules"
  on public.email_rules
  for delete
  using (auth.uid() = user_id);
