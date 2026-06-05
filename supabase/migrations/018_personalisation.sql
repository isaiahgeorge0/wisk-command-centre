alter table public.user_preferences
  add column personalisation_completed boolean not null default false,
  add column display_name text,
  add column theme_preference text not null default 'dark';

-- Existing users should skip welcome
update public.user_preferences
set personalisation_completed = true;
