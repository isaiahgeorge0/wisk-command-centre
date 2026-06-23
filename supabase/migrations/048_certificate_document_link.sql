alter table public.property_documents
  add column if not exists certificate_id uuid references public.property_certificates (id) on delete set null;

create index if not exists property_documents_certificate_id_idx
  on public.property_documents (certificate_id);
