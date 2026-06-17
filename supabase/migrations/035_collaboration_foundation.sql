-- User connections (friend/colleague graph)
create table public.user_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null
    references public.users(id) on delete cascade,
  recipient_id uuid not null
    references public.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, recipient_id),
  check (requester_id != recipient_id)
);

alter table public.user_connections
  enable row level security;

create policy "Users can view own connections"
  on public.user_connections for select
  using (
    auth.uid() = requester_id or
    auth.uid() = recipient_id
  );

create policy "Users can insert connection requests"
  on public.user_connections for insert
  with check (auth.uid() = requester_id);

create policy "Users can update received requests"
  on public.user_connections for update
  using (auth.uid() = recipient_id);

create policy "Users can delete own connections"
  on public.user_connections for delete
  using (
    auth.uid() = requester_id or
    auth.uid() = recipient_id
  );

create index user_connections_requester_idx
  on public.user_connections (requester_id, status);

create index user_connections_recipient_idx
  on public.user_connections (recipient_id, status);

-- Item shares (Phase B — RLS updates on item tables come later)
create table public.item_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null
    references public.users(id) on delete cascade,
  recipient_id uuid not null
    references public.users(id) on delete cascade,
  item_type text not null check (
    item_type in (
      'project', 'task', 'goal',
      'idea', 'lead', 'content',
      'calendar_event'
    )
  ),
  item_id uuid not null,
  permission text not null default 'view'
    check (permission in ('view', 'edit')),
  created_at timestamptz not null default now(),
  unique (owner_id, recipient_id, item_type, item_id),
  check (owner_id != recipient_id)
);

alter table public.item_shares
  enable row level security;

create policy "Owners can view own shares"
  on public.item_shares for select
  using (
    auth.uid() = owner_id or
    auth.uid() = recipient_id
  );

create policy "Owners can create shares"
  on public.item_shares for insert
  with check (auth.uid() = owner_id);

create policy "Owners can delete shares"
  on public.item_shares for delete
  using (auth.uid() = owner_id);

create index item_shares_owner_idx
  on public.item_shares (owner_id);

create index item_shares_recipient_idx
  on public.item_shares (recipient_id);

create index item_shares_item_idx
  on public.item_shares (item_type, item_id);

-- Auto-update updated_at on connections
create or replace function public.set_connection_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger connection_updated_at
before update on public.user_connections
for each row
execute function public.set_connection_updated_at();
