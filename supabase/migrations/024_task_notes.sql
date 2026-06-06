alter table public.tasks
  add column if not exists raw_content text null;
