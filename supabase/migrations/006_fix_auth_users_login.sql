-- Fix GoTrue "Database error querying schema" on sign-in.
-- Caused when auth.users token columns are NULL (common after manual SQL inserts
-- or incomplete user creation). GoTrue cannot scan NULL into string fields.
-- See: https://github.com/supabase/auth/issues/1940

-- 1. Repair existing rows
update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  reauthentication_token = coalesce(reauthentication_token, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, '')
where
  confirmation_token is null
  or recovery_token is null
  or email_change_token_new is null
  or email_change is null
  or email_change_token_current is null
  or reauthentication_token is null
  or phone_change is null
  or phone_change_token is null;

-- 2. Prevent NULL on future inserts
alter table auth.users alter column confirmation_token set default '';
alter table auth.users alter column recovery_token set default '';
alter table auth.users alter column email_change_token_new set default '';
alter table auth.users alter column email_change set default '';
alter table auth.users alter column email_change_token_current set default '';
alter table auth.users alter column reauthentication_token set default '';
alter table auth.users alter column phone_change set default '';
alter table auth.users alter column phone_change_token set default '';

-- 3. Email/password sign-in requires an auth.identities row (missing after manual auth.users inserts)
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  u.id,
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', (u.email_confirmed_at is not null),
    'phone_verified', false
  ),
  'email',
  u.id::text,
  u.last_sign_in_at,
  coalesce(u.created_at, now()),
  coalesce(u.updated_at, now())
from auth.users u
where u.deleted_at is null
  and u.email is not null
  and not exists (
    select 1
    from auth.identities i
    where i.user_id = u.id
      and i.provider = 'email'
  );
