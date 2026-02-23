-- Add telematics asset ID to fleet_vehicles table for live tracking integration
ALTER TABLE public.fleet_vehicles ADD COLUMN
IF NOT EXISTS telematics_asset_id TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.fleet_vehicles.telematics_asset_id IS 'Telematics Guru asset ID for live tracking integration';
