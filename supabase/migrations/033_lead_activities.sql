-- Activity log table
create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id)
    on delete cascade,
  user_id uuid not null references public.users(id)
    on delete cascade,
  activity_type text not null check (
    activity_type in (
      'note',
      'call',
      'email',
      'meeting',
      'stage_change',
      'follow_up_set',
      'ai_notes'
    )
  ),
  title text not null,
  content text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.lead_activities
  enable row level security;

create policy "Users can view own lead activities"
  on public.lead_activities for select
  using (auth.uid() = user_id);

create policy "Users can insert own lead activities"
  on public.lead_activities for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own lead activities"
  on public.lead_activities for delete
  using (auth.uid() = user_id);

create index lead_activities_lead_id_idx
  on public.lead_activities (lead_id, created_at desc);

-- Add follow_up_date to leads table
alter table public.leads
add column if not exists follow_up_date date;

-- Auto-log stage changes via trigger
create or replace function
  public.log_lead_stage_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into public.lead_activities (
      lead_id, user_id, activity_type,
      title, metadata
    ) values (
      new.id,
      new.user_id,
      'stage_change',
      'Stage changed to ' || new.status,
      jsonb_build_object(
        'from', old.status,
        'to', new.status
      )
    );
  end if;
  return new;
end;
$$ language plpgsql;

create trigger lead_stage_change_log
after update on public.leads
for each row
execute function public.log_lead_stage_change();
