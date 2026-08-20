-- Competitor snapshot (Research Pro): pricing/positioning + recent moves
-- synthesised from daily competitor-check signal history (or a one-time seed search).

alter table public.research_competitors
  add column if not exists competitor_snapshot jsonb,
  add column if not exists competitor_snapshot_at timestamptz;

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
      'research_tech_stack_detection',
      'research_competitor_snapshot'
    )
  );
