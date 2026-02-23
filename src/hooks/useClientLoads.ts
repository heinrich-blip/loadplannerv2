import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { Load } from './useLoads';
import type { Client } from './useClients';

/**
 * Parse time_window (string or JSONB object) to extract the third-party customer ID
 */
function getCustomerIdFromLoad(timeWindow: unknown): string | null {
  try {
    const data = typeof timeWindow === 'string' ? JSON.parse(timeWindow) : timeWindow;
    return data?.thirdParty?.customerId || null;
  } catch {
    return null;
  }
}

/**
 * Hook to fetch a single client by ID
 */
export function useClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      if (!clientId) throw new Error('No client ID provided');
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!clientId,
  });
}

/**
 * Hook to fetch all loads for a specific client.
 * Combines loads linked via client_id column AND the legacy
 * TP- prefix + time_window JSON approach, deduplicating by id.
 */
export function useClientLoads(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-loads', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const allLoads = new Map<string, Load>();

      // 1. Try fetching loads linked via client_id column
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: directLoads } = await (supabase
          .from('loads')
          .select(`
            *,
            driver:drivers!loads_driver_id_fkey(id, name, contact),
            fleet_vehicle:fleet_vehicles(id, vehicle_id, type, telematics_asset_id)
          `) as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .eq('client_id', clientId)
          .order('loading_date', { ascending: false });

        if (directLoads) {
          for (const load of directLoads) {
            allLoads.set(load.id, load);
          }
        }
      } catch {
        // client_id column may not exist yet — ignore
      }

      // 2. Always also check legacy TP- prefix approach
      try {
        const { data, error } = await supabase
          .from('loads')
          .select(`
            *,
            driver:drivers!loads_driver_id_fkey(id, name, contact),
            fleet_vehicle:fleet_vehicles(id, vehicle_id, type, telematics_asset_id)
          `)
          .like('load_id', 'TP-%')
          .order('loading_date', { ascending: false });

        if (!error && data) {
          for (const load of data) {
            const customerId = getCustomerIdFromLoad(load.time_window);
            if (customerId === clientId && !allLoads.has(load.id)) {
              allLoads.set(load.id, load as unknown as Load);
            }
          }
        }
      } catch {
        // ignore
      }

      return Array.from(allLoads.values()) as Load[];
    },
    enabled: !!clientId,
  });
}

/**
 * Hook to get active (in-transit/scheduled) loads for a client - used for live tracking.
 * Combines client_id and legacy TP- prefix approaches.
 */
export function useClientActiveLoads(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-active-loads', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const allLoads = new Map<string, Load>();
      const activeStatuses = ['in-transit', 'scheduled', 'pending'] as const;

      // 1. Try fetching loads linked via client_id column
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: directLoads } = await (supabase
          .from('loads')
          .select(`
            *,
            driver:drivers!loads_driver_id_fkey(id, name, contact),
            fleet_vehicle:fleet_vehicles(id, vehicle_id, type, telematics_asset_id)
          `) as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .eq('client_id', clientId)
          .in('status', activeStatuses)
          .order('loading_date', { ascending: true });

        if (directLoads) {
          for (const load of directLoads) {
            allLoads.set(load.id, load);
          }
        }
      } catch {
        // client_id column may not exist yet
      }

      // 2. Always also check legacy TP- prefix
      try {
        const { data, error } = await supabase
          .from('loads')
          .select(`
            *,
            driver:drivers!loads_driver_id_fkey(id, name, contact),
            fleet_vehicle:fleet_vehicles(id, vehicle_id, type, telematics_asset_id)
          `)
          .like('load_id', 'TP-%')
          .in('status', activeStatuses)
          .order('loading_date', { ascending: true });

        if (!error && data) {
          for (const load of data) {
            const customerId = getCustomerIdFromLoad(load.time_window);
            if (customerId === clientId && !allLoads.has(load.id)) {
              allLoads.set(load.id, load as unknown as Load);
            }
          }
        }
      } catch {
        // ignore
      }

      return Array.from(allLoads.values()) as Load[];
    },
    enabled: !!clientId,
    refetchInterval: 30000,
  });
}