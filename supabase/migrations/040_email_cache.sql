create table public.user_email_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  show_gmail boolean not null default true,
  show_outlook boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.user_email_preferences enable row level security;

create policy "Users can view own email preferences"
  on public.user_email_preferences
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own email preferences"
  on public.user_email_preferences
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own email preferences"
  on public.user_email_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own email preferences"
  on public.user_email_preferences
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_user_email_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_email_preferences_updated_at
  on public.user_email_preferences;

create trigger set_user_email_preferences_updated_at
  before update on public.user_email_preferences
  for each row
  execute function public.set_user_email_preferences_updated_at();
