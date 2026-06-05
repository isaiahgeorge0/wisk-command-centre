alter table public.projects
  add column updated_at timestamptz not null default now();

update public.projects
set updated_at = created_at
where updated_at is distinct from created_at;

create or replace function public.set_projects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;

create trigger set_projects_updated_at
  before update on public.projects
  for each row
  execute function public.set_projects_updated_at();
