alter table public.users
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists postcode text,
  add column if not exists phone text;
