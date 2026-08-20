-- Lead intelligence brief index stamps (Research hub).
-- Full brief content remains generated on-demand in Leads; these fields
-- power /research/leads summary without a second generator.

alter table public.leads
  add column if not exists research_brief_generated_at timestamptz,
  add column if not exists research_brief_summary text;

create index if not exists leads_user_research_brief_idx
  on public.leads (user_id, research_brief_generated_at desc)
  where research_brief_generated_at is not null;
