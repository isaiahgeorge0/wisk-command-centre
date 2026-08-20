-- Competitor tech-stack detection (Research base): on-demand search inference.
-- Stored on research_competitors; not part of the daily checks cron.

alter table public.research_competitors
  add column if not exists tech_stack jsonb,
  add column if not exists tech_stack_checked_at timestamptz;

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
      'lead_auto_enrichment',
      'research_document_analysis',
      'research_tech_stack_detection'
    )
  );
