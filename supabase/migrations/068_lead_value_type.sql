-- Distinguish upfront vs monthly lead values so totals and display never blur units.
alter table public.leads
  add column if not exists value_type text not null default 'one_time';

alter table public.leads
  drop constraint if exists leads_value_type_check;

alter table public.leads
  add constraint leads_value_type_check
  check (value_type in ('one_time', 'monthly'));
