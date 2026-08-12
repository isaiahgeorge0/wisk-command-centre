alter table public.projects
  add column source_note_id uuid references public.notes(id) on delete set null;

create index projects_source_note_id_idx
  on public.projects (source_note_id)
  where source_note_id is not null;
