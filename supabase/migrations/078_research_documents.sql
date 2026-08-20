-- Research document analysis (base Research): upload, extract, summarise, ask.
-- Storage bucket: research-documents (user-scoped path {userId}/...)

create table if not exists public.research_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  file_path text not null,
  file_size integer not null,
  file_type text not null,
  extracted_text text,
  summary text,
  status text not null default 'ready'
    check (status in ('processing', 'ready', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_documents_user_created_idx
  on public.research_documents (user_id, created_at desc);

alter table public.research_documents enable row level security;

create policy "Users can view own research documents"
  on public.research_documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own research documents"
  on public.research_documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own research documents"
  on public.research_documents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own research documents"
  on public.research_documents for delete
  using (auth.uid() = user_id);

create or replace function public.set_research_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_research_documents_updated_at on public.research_documents;
create trigger set_research_documents_updated_at
  before update on public.research_documents
  for each row execute function public.set_research_documents_updated_at();

insert into storage.buckets (id, name, public)
values ('research-documents', 'research-documents', false)
on conflict (id) do nothing;

create policy "Users can upload own research documents"
  on storage.objects for insert
  with check (
    bucket_id = 'research-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read own research documents"
  on storage.objects for select
  using (
    bucket_id = 'research-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own research documents"
  on storage.objects for delete
  using (
    bucket_id = 'research-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

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
      'research_document_analysis'
    )
  );
