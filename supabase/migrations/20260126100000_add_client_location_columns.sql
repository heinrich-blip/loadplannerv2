-- Add location columns to existing clients table
-- This migration adds loading and offloading location fields

-- Add loading location columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'loading_place_name'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN loading_place_name TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'loading_address'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN loading_address TEXT;
  END IF;
END $$;

-- Add offloading location columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'offloading_place_name'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN offloading_place_name TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'offloading_address'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN offloading_address TEXT;
  END IF;
END $$;

-- Migrate data from old address column to loading_address if address exists and loading_address is empty
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'address'
  ) THEN
    UPDATE public.clients 
    SET loading_address = address 
    WHERE loading_address IS NULL AND address IS NOT NULL;
  END IF;
END $$;
