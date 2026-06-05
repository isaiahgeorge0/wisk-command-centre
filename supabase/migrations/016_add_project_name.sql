alter table public.projects
add column project_name text;

update public.projects
set project_name = client_name
where project_name is null;

alter table public.projects
alter column project_name set not null;

alter table public.projects
alter column client_name drop not null;
