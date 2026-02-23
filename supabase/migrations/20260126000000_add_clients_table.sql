-- Create clients table for external clients (third-party customers)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  -- Contact details
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  -- Loading location details (where we pick up cargo)
  loading_place_name TEXT,
  loading_address TEXT,
  -- Offloading location details (where we deliver cargo)
  offloading_place_name TEXT,
  offloading_address TEXT,
  -- Other fields
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow authenticated read access on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated insert access on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated update access on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated delete access on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow service role full access on clients" ON public.clients;

-- Allow all authenticated users to read clients
CREATE POLICY "Allow authenticated read access on clients"
  ON public.clients
  FOR
SELECT
    TO authenticated
USING
(true);

-- Allow all authenticated users to insert clients
CREATE POLICY "Allow authenticated insert access on clients"
  ON public.clients
  FOR
INSERT
  TO authenticated
  WITH CHECK (
true);

-- Allow all authenticated users to update clients
CREATE POLICY "Allow authenticated update access on clients"
  ON public.clients
  FOR
UPDATE
  TO authenticated
  USING (true)
WITH CHECK
(true);

-- Allow all authenticated users to delete clients
CREATE POLICY "Allow authenticated delete access on clients"
  ON public.clients
  FOR
DELETE
  TO authenticated
  USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access on clients"
  ON public.clients
  FOR ALL
  TO service_role
  USING
(true)
  WITH CHECK
(true);

-- Create updated_at trigger
CREATE OR REPLACE TRIGGER update_clients_updated_at
  BEFORE
UPDATE ON public.clients
  FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column
();

-- Add index for searching (with IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_active ON public.clients(active);
