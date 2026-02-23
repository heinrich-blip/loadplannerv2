-- Add actual time tracking fields to loads table
-- These fields track when a truck actually arrives/departs from geofences

ALTER TABLE loads ADD COLUMN IF NOT EXISTS actual_loading_arrival TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS actual_loading_departure TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS actual_offloading_arrival TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS actual_offloading_departure TIMESTAMPTZ;

-- Add comments to describe the fields
COMMENT ON COLUMN loads.actual_loading_arrival IS 'Actual time truck entered the loading geofence';
COMMENT ON COLUMN loads.actual_loading_departure IS 'Actual time truck exited the loading geofence - starts in-transit';
COMMENT ON COLUMN loads.actual_offloading_arrival IS 'Actual time truck entered the offloading geofence';
COMMENT ON COLUMN loads.actual_offloading_departure IS 'Actual time truck exited the offloading geofence - delivery complete';

-- Create index for faster queries on loads with actual times
CREATE INDEX IF NOT EXISTS idx_loads_actual_times ON loads (actual_loading_arrival, actual_offloading_arrival) WHERE status IN ('in-transit', 'delivered');
