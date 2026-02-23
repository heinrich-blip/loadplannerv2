-- Add verified & source metadata columns for actual time tracking on loads.
-- These columns allow distinguishing manually-entered times from geofence
-- auto-captured times, and prevent automated entries from overwriting manual ones.
--
-- The enum type `load_time_source` should already exist; create it only if missing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'load_time_source') THEN
    CREATE TYPE public.load_time_source AS ENUM ('auto', 'manual');
  END IF;
END $$;

-- Verified flags — true when the time has been confirmed (auto or manual)
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS actual_loading_arrival_verified BOOLEAN DEFAULT false;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS actual_loading_departure_verified BOOLEAN DEFAULT false;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS actual_offloading_arrival_verified BOOLEAN DEFAULT false;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS actual_offloading_departure_verified BOOLEAN DEFAULT false;

-- Source flags — 'auto' for geofence-captured, 'manual' for user-entered
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS actual_loading_arrival_source public.load_time_source DEFAULT 'auto';
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS actual_loading_departure_source public.load_time_source DEFAULT 'auto';
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS actual_offloading_arrival_source public.load_time_source DEFAULT 'auto';
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS actual_offloading_departure_source public.load_time_source DEFAULT 'auto';

-- Back-fill: mark any existing non-null actual times as verified + auto
UPDATE public.loads SET actual_loading_arrival_verified = true WHERE actual_loading_arrival IS NOT NULL AND actual_loading_arrival_verified IS NOT true;
UPDATE public.loads SET actual_loading_departure_verified = true WHERE actual_loading_departure IS NOT NULL AND actual_loading_departure_verified IS NOT true;
UPDATE public.loads SET actual_offloading_arrival_verified = true WHERE actual_offloading_arrival IS NOT NULL AND actual_offloading_arrival_verified IS NOT true;
UPDATE public.loads SET actual_offloading_departure_verified = true WHERE actual_offloading_departure IS NOT NULL AND actual_offloading_departure_verified IS NOT true;

COMMENT ON COLUMN public.loads.actual_loading_arrival_verified IS 'Whether the loading arrival time has been confirmed';
COMMENT ON COLUMN public.loads.actual_loading_arrival_source IS 'How the time was recorded: auto (geofence) or manual (user entry)';
COMMENT ON COLUMN public.loads.actual_loading_departure_verified IS 'Whether the loading departure time has been confirmed';
COMMENT ON COLUMN public.loads.actual_loading_departure_source IS 'How the time was recorded: auto (geofence) or manual (user entry)';
COMMENT ON COLUMN public.loads.actual_offloading_arrival_verified IS 'Whether the offloading arrival time has been confirmed';
COMMENT ON COLUMN public.loads.actual_offloading_arrival_source IS 'How the time was recorded: auto (geofence) or manual (user entry)';
COMMENT ON COLUMN public.loads.actual_offloading_departure_verified IS 'Whether the offloading departure time has been confirmed';
COMMENT ON COLUMN public.loads.actual_offloading_departure_source IS 'How the time was recorded: auto (geofence) or manual (user entry)';
