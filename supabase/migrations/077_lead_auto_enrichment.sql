-- Lead auto-enrichment (Research base): quiet public-signal pass on create.
-- Distinct from on-demand lead intelligence briefs.

alter table public.leads
  add column if not exists auto_enrichment jsonb,
  add column if not exists auto_enrichment_generated_at timestamptz;

create index if not exists leads_user_auto_enrichment_idx
  on public.leads (user_id, auto_enrichment_generated_at desc)
  where auto_enrichment_generated_at is not null;

alter table public.ai_usage_log
  drop constraint if exists ai_usage_log_feature_check;

alter table public.ai_usage_log
  add constraint ai_usage_log_feature_check
  check (
    feature in (
      'chat',
      'digest',
      'email_draft',
      'property_insights',
      'email_picks_draft',
      'pipeline_health',
      'portal_triage',
      'property_valuation',
      'morning_briefing',
      'lead_research_brief',
      'research_competitor_check',
      'research_place_lookup',
      'research_open_chat',
      'lead_auto_enrichment'
    )
  );
