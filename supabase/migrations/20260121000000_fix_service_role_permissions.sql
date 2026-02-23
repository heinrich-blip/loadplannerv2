-- Fix service role permissions for Edge Functions
-- The service_role should bypass RLS, but we need to ensure proper schema access

-- Grant usage on public schema to service_role
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant all privileges on tracking_share_links to service_role
GRANT ALL PRIVILEGES ON public.tracking_share_links TO service_role;

-- Grant select on related tables for joins
GRANT SELECT ON public.loads TO service_role;
GRANT SELECT ON public.fleet_vehicles TO service_role;
GRANT SELECT ON public.drivers TO service_role;

-- Create a policy that explicitly allows service_role full access
-- (service_role should bypass RLS but this ensures it works)
CREATE POLICY "Service role has full access to share links"
  ON public.tracking_share_links
  FOR ALL
  TO service_role
  USING
(true)
  WITH CHECK
(true);
