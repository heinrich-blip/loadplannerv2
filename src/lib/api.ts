import { supabase } from '@/integrations/supabase/client';

export interface ActiveLoadForTracking {
  id: string;
  load_id: string;
  origin: string;
  destination: string;
  status: string;
  vehicle?: {
    id: string;
    registration: string;
    telematicsAssetId?: string;
  } | null;
  driver?: {
    id: string;
    name: string;
  } | null;
}

export interface ActiveLoadsResponse {
  data: {
    activeLoads: ActiveLoadForTracking[];
  };
}

/**
 * Get active loads that are in transit for live tracking
 */
export async function getActiveLoadsForTracking(): Promise<ActiveLoadsResponse> {
  const { data, error } = await supabase
    .from('loads')
    .select(`
      id,
      load_id,
      origin,
      destination,
      status,
      driver:drivers!loads_driver_id_fkey(id, name),
      fleet_vehicle:fleet_vehicles(id, vehicle_id, type)
    `)
    .in('status', ['in-transit', 'scheduled', 'pending']);

  if (error) {
    console.error('Error fetching active loads:', error);
    return { data: { activeLoads: [] } };
  }

  const activeLoads: ActiveLoadForTracking[] = (data || []).map((load) => ({
    id: load.id,
    load_id: load.load_id,
    origin: load.origin,
    destination: load.destination,
    status: load.status,
    vehicle: load.fleet_vehicle ? {
      id: load.fleet_vehicle.id,
      registration: load.fleet_vehicle.vehicle_id,
      telematicsAssetId: undefined, // Would need to be added to fleet_vehicles table
    } : null,
    driver: load.driver ? {
      id: load.driver.id,
      name: load.driver.name,
    } : null,
  }));

  return { data: { activeLoads } };
}