alter table public.user_preferences
  add column if not exists gender text
    check (gender in ('male', 'female', 'unspecified'))
    default 'unspecified',
  add column if not exists greeting_term text;

comment on column public.user_preferences.gender is
  'Optional personalisation only — how Winston should address the user (male/female/unspecified).';

comment on column public.user_preferences.greeting_term is
  'Optional free-text greeting override. When set, used verbatim instead of the gender-derived term.';
