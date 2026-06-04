-- Dev helper: profile row for TEST_USER_ID in .env.local (default below).
-- Create a matching user in Supabase Auth first, then run this migration.
-- TODO(auth): Remove this seed once real sign-up creates public.users rows.

insert into public.users (id, email, name)
values (
  '00000000-0000-0000-0000-000000000001',
  'dev@wisk.local',
  'Dev User'
)
on conflict (id) do nothing;
