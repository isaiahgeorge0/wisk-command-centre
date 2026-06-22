create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null default 'Untitled',
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_updated_idx
  on public.notes (user_id, updated_at desc);

alter table public.notes enable row level security;

create policy "Users can view own notes"
  on public.notes
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own notes"
  on public.notes
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notes"
  on public.notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own notes"
  on public.notes
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_notes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_notes_updated_at on public.notes;

create trigger set_notes_updated_at
  before update on public.notes
  for each row
  execute function public.set_notes_updated_at();
