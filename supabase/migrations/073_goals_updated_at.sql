alter table public.goals
  add column if not exists updated_at timestamptz not null default now();

update public.goals
set updated_at = created_at
where updated_at is distinct from created_at;

create or replace function public.set_goals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_goals_updated_at on public.goals;

create trigger set_goals_updated_at
  before update on public.goals
  for each row
  execute function public.set_goals_updated_at();
