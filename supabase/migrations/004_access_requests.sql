create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- No RLS: writes go through server action (service role); reads via Supabase dashboard.
