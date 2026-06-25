-- Drop overly permissive public policies on contractor portal tables.
-- All contractor portal access goes through server actions using the admin client.

drop policy if exists "Public can view job sheet by token"
  on public.job_sheets;
drop policy if exists "Public can insert job sheet updates"
  on public.job_sheet_updates;
drop policy if exists "Public can insert access requests"
  on public.contractor_access_requests;

-- Landlord access is covered by existing user_id policies.
-- Tenant access to access requests is covered by portal_user_id policies.
