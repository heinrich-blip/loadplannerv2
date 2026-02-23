-- Add new columns to fleet_vehicles table for vehicle details and expiry dates

-- Vehicle details
ALTER TABLE public.fleet_vehicles ADD COLUMN
IF NOT EXISTS vin_number TEXT;
ALTER TABLE public.fleet_vehicles ADD COLUMN
IF NOT EXISTS engine_number TEXT;
ALTER TABLE public.fleet_vehicles ADD COLUMN
IF NOT EXISTS make_model TEXT;
ALTER TABLE public.fleet_vehicles ADD COLUMN
IF NOT EXISTS engine_size TEXT;

-- Expiry dates
ALTER TABLE public.fleet_vehicles ADD COLUMN
IF NOT EXISTS license_expiry DATE;
ALTER TABLE public.fleet_vehicles ADD COLUMN
IF NOT EXISTS cof_expiry DATE;
ALTER TABLE public.fleet_vehicles ADD COLUMN
IF NOT EXISTS radio_license_expiry DATE;
ALTER TABLE public.fleet_vehicles ADD COLUMN
IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE public.fleet_vehicles ADD COLUMN
IF NOT EXISTS svg_expiry DATE;
