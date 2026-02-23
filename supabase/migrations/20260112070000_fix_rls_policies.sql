-- This migration ensures proper RLS policies for authenticated users
-- Run this in your Supabase SQL Editor if you're getting 403 errors

-- First, let's check if policies exist and create them if not
-- For drivers table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'drivers' AND policyname = 'Authenticated users can view drivers') THEN
        CREATE POLICY "Authenticated users can view drivers" ON public.drivers FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'drivers' AND policyname = 'Authenticated users can insert drivers') THEN
        CREATE POLICY "Authenticated users can insert drivers" ON public.drivers FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'drivers' AND policyname = 'Authenticated users can update drivers') THEN
        CREATE POLICY "Authenticated users can update drivers" ON public.drivers FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'drivers' AND policyname = 'Authenticated users can delete drivers') THEN
        CREATE POLICY "Authenticated users can delete drivers" ON public.drivers FOR DELETE TO authenticated USING (true);
    END IF;
END $$;

-- For fleet_vehicles table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fleet_vehicles' AND policyname = 'Authenticated users can view fleet vehicles') THEN
        CREATE POLICY "Authenticated users can view fleet vehicles" ON public.fleet_vehicles FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fleet_vehicles' AND policyname = 'Authenticated users can insert fleet vehicles') THEN
        CREATE POLICY "Authenticated users can insert fleet vehicles" ON public.fleet_vehicles FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fleet_vehicles' AND policyname = 'Authenticated users can update fleet vehicles') THEN
        CREATE POLICY "Authenticated users can update fleet vehicles" ON public.fleet_vehicles FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fleet_vehicles' AND policyname = 'Authenticated users can delete fleet vehicles') THEN
        CREATE POLICY "Authenticated users can delete fleet vehicles" ON public.fleet_vehicles FOR DELETE TO authenticated USING (true);
    END IF;
END $$;

-- For loads table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loads' AND policyname = 'Authenticated users can view loads') THEN
        CREATE POLICY "Authenticated users can view loads" ON public.loads FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loads' AND policyname = 'Authenticated users can insert loads') THEN
        CREATE POLICY "Authenticated users can insert loads" ON public.loads FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loads' AND policyname = 'Authenticated users can update loads') THEN
        CREATE POLICY "Authenticated users can update loads" ON public.loads FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loads' AND policyname = 'Authenticated users can delete loads') THEN
        CREATE POLICY "Authenticated users can delete loads" ON public.loads FOR DELETE TO authenticated USING (true);
    END IF;
END $$;
