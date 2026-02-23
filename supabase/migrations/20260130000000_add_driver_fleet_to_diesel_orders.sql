-- Add driver_id and fleet_vehicle_id columns to diesel_orders table
-- This allows selecting driver and fleet vehicle from existing lists

ALTER TABLE public.diesel_orders
ADD COLUMN
IF NOT EXISTS driver_id UUID REFERENCES public.drivers
(id) ON
DELETE
SET NULL
,
ADD COLUMN
IF NOT EXISTS fleet_vehicle_id UUID REFERENCES public.fleet_vehicles
(id) ON
DELETE
SET NULL;

-- Create indexes for faster lookups
CREATE INDEX
IF NOT EXISTS idx_diesel_orders_driver_id ON public.diesel_orders
(driver_id);
CREATE INDEX
IF NOT EXISTS idx_diesel_orders_fleet_vehicle_id ON public.diesel_orders
(fleet_vehicle_id);

-- Add comments
COMMENT ON COLUMN public.diesel_orders.driver_id IS 'Reference to the driver receiving the fuel';
COMMENT ON COLUMN public.diesel_orders.fleet_vehicle_id IS 'Reference to the fleet vehicle for the diesel order';
