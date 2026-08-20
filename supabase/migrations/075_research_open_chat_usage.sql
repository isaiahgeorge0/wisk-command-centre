-- Open research chat usage feature (Research Pro).
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
      'research_open_chat'
    )
  );
