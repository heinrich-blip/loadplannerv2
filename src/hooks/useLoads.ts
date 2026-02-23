import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

// ---------------------------------------------------------------------------
// Google Sheets sync helper — fires-and-forgets a POST to the edge function
// so the Time Comparison sheet stays in sync whenever times change.
// ---------------------------------------------------------------------------
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function triggerGoogleSheetsSync() {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/google-sheets-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({}),
    });
  } catch {
    // Swallow errors — sheet sync is best-effort and should never block the UI
  }
}

type LoadStatus = Database['public']['Enums']['load_status'];
type CargoType = Database['public']['Enums']['cargo_type'];
type PriorityLevel = Database['public']['Enums']['priority_level'];

export interface BackloadQuantities {
  bins: number;
  crates: number;
  pallets: number;
}

export interface BackloadInfo {
  enabled: boolean;
  destination: string; // Farm where backload goes (BV, CBC)
  cargoType: 'Packaging' | 'Fertilizer' | 'BV' | 'CBC';
  offloadingDate: string; // Date of backload delivery
  quantities?: BackloadQuantities;
  notes?: string;
}

export interface Load {
  id: string;
  load_id: string;
  priority: PriorityLevel;
  loading_date: string;
  offloading_date: string;
  time_window: Json;
  origin: string;
  destination: string;
  cargo_type: CargoType;
  quantity: number;
  weight: number;
  special_handling: string[];
  client_id: string | null;
  fleet_vehicle_id: string | null;
  driver_id: string | null;
  co_driver_id: string | null;
  notes: string;
  status: LoadStatus;
  created_at: string;
  updated_at: string;
  // Actual geofence-triggered times
  actual_loading_arrival?: string | null;
  actual_loading_arrival_verified?: boolean;
  actual_loading_arrival_source?: 'auto' | 'manual';
  actual_loading_departure?: string | null;
  actual_loading_departure_verified?: boolean;
  actual_loading_departure_source?: 'auto' | 'manual';
  actual_offloading_arrival?: string | null;
  actual_offloading_arrival_verified?: boolean;
  actual_offloading_arrival_source?: 'auto' | 'manual';
  actual_offloading_departure?: string | null;
  actual_offloading_departure_verified?: boolean;
  actual_offloading_departure_source?: 'auto' | 'manual';
  // Joined data
  driver?: { id: string; name: string; contact: string } | null;
  fleet_vehicle?: { id: string; vehicle_id: string; type: string; telematics_asset_id?: string | null } | null;
}

// Helper to parse backload info from time_window (handles both string and JSONB object)
export function parseBackloadInfo(timeWindow: Json | null | undefined): BackloadInfo | null {
  try {
    const data = typeof timeWindow === 'string' ? JSON.parse(timeWindow) : timeWindow;
    if (data?.backload?.enabled) {
      return data.backload as BackloadInfo;
    }
    return null;
  } catch {
    return null;
  }
}

// Helper to parse route info from time_window
export function parseRouteInfo(timeWindow: Json | null | undefined): { 
  distance?: number; 
  duration?: number;
  distanceFormatted?: string;
  durationFormatted?: string;
} | null {
  try {
    const data = typeof timeWindow === 'string' ? JSON.parse(timeWindow) : timeWindow;
    if (data?.route) {
      return data.route;
    }
    return null;
  } catch {
    return null;
  }
}

export interface LoadInsert {
  load_id: string;
  priority: PriorityLevel;
  loading_date: string;
  offloading_date: string;
  time_window: Json;
  origin: string;
  destination: string;
  cargo_type: CargoType;
  quantity?: number;
  weight?: number;
  special_handling?: string[];
  client_id?: string | null;
  fleet_vehicle_id?: string | null;
  driver_id?: string | null;
  co_driver_id?: string | null;
  notes?: string;
  status?: LoadStatus;
}

export function useLoads() {
  return useQuery({
    queryKey: ['loads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loads')
        .select(`
          *,
          driver:drivers!loads_driver_id_fkey(id, name, contact),
          fleet_vehicle:fleet_vehicles(id, vehicle_id, type, telematics_asset_id)
        `)
        .order('loading_date', { ascending: true });
      
      if (error) throw error;
      return data as unknown as Load[];
    },
    // Poll every 10s so status changes from geofence auto-capture
    // are reflected across all pages in near real-time
    refetchInterval: 10_000,
  });
}

/**
 * Subscribes to Supabase realtime changes on the loads table.
 * Call this once (e.g. in a top-level provider) to get instant cache
 * invalidation whenever any load row is inserted, updated, or deleted.
 */
export function useLoadsRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('loads-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'loads' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['loads'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Paginated variant of useLoads for table views.
 * Returns a page of loads plus total count for pagination controls.
 */
export function usePaginatedLoads(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['loads', 'paginated', page, pageSize],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('loads')
        .select(
          `*,
          driver:drivers!loads_driver_id_fkey(id, name, contact),
          fleet_vehicle:fleet_vehicles(id, vehicle_id, type, telematics_asset_id)`,
          { count: 'exact' },
        )
        .order('loading_date', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { loads: data as unknown as Load[], totalCount: count ?? 0 };
    },
    placeholderData: (prev) => prev, // Keep previous page visible while loading next
  });
}

export function useCreateLoad() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (load: LoadInsert) => {
      const { data, error } = await supabase
        .from('loads')
        .insert(load)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast({ title: 'Load created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create load', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLoad() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Load> & { id: string }) => {
      const { data, error } = await supabase
        .from('loads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast({ title: 'Load updated successfully' });

      // Trigger Google Sheets sync when time-related fields changed
      const timeKeys = [
        'actual_loading_arrival', 'actual_loading_departure',
        'actual_offloading_arrival', 'actual_offloading_departure',
        'time_window', 'status',
      ];
      const hasTimeChange = Object.keys(variables).some(k => timeKeys.includes(k));
      if (hasTimeChange) triggerGoogleSheetsSync();
    },
    onError: (error) => {
      toast({ title: 'Failed to update load', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteLoad() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('loads')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast({ title: 'Load deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete load', description: error.message, variant: 'destructive' });
    },
  });
}

// Manual/verified time update mutation
export function useUpdateLoadTimes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      times
    }: {
      id: string;
      times: Partial<{
        actual_loading_arrival: string;
        actual_loading_arrival_verified: boolean;
        actual_loading_arrival_source: 'auto' | 'manual';
        actual_loading_departure: string;
        actual_loading_departure_verified: boolean;
        actual_loading_departure_source: 'auto' | 'manual';
        actual_offloading_arrival: string;
        actual_offloading_arrival_verified: boolean;
        actual_offloading_arrival_source: 'auto' | 'manual';
        actual_offloading_departure: string;
        actual_offloading_departure_verified: boolean;
        actual_offloading_departure_source: 'auto' | 'manual';
        time_window?: Json;
      }>;
    }) => {
      const { data, error } = await supabase
        .from('loads')
        .update(times)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast({ title: 'Load times updated successfully' });
      // Always sync to Google Sheets when times are explicitly updated
      triggerGoogleSheetsSync();
    },
    onError: (error) => {
      toast({ title: 'Failed to update load times', description: error.message, variant: 'destructive' });
    },
  });
}

// Geofence event types
export type GeofenceEventType = 
  | 'loading_arrival'    // Truck entered loading geofence
  | 'loading_departure'  // Truck exited loading geofence - starts in-transit
  | 'offloading_arrival' // Truck entered offloading geofence
  | 'offloading_departure'; // Truck exited offloading geofence - delivery complete

// Hook for handling geofence-triggered load updates
export function useGeofenceLoadUpdate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      loadId, 
      eventType, 
      timestamp,
      vehicleRegistration,
      telematicsAssetId,
      geofenceName,
      latitude,
      longitude,
      loadNumber,
      onDeliveryComplete: _onDeliveryComplete,
    }: { 
      loadId: string; 
      eventType: GeofenceEventType; 
      timestamp: Date;
      vehicleRegistration?: string;
      telematicsAssetId?: string;
      geofenceName?: string;
      latitude?: number;
      longitude?: number;
      loadNumber?: string;
      onDeliveryComplete?: () => void;
    }) => {
      // Fetch current load to merge time_window JSON updates
      const { data: currentLoad, error: fetchError } = await supabase
        .from('loads')
        .select('id, time_window')
        .eq('id', loadId)
        .single();
      if (fetchError) throw fetchError;

      const updates: Record<string, unknown> = {};
      const isoTimestamp = timestamp.toISOString();
      // Prepare merged time_window JSON
      interface TimeWindowSection {
        plannedArrival?: string;
        plannedDeparture?: string;
        actualArrival?: string;
        actualDeparture?: string;
      }
      interface TimeWindowData {
        origin?: TimeWindowSection;
        destination?: TimeWindowSection;
        backload?: unknown;
      }
      let timeWindowData: TimeWindowData = {};
      try {
        const raw = currentLoad?.time_window;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed && typeof parsed === 'object') {
          timeWindowData = parsed as TimeWindowData;
        }
      } catch {
        timeWindowData = {};
      }
      if (!timeWindowData.origin) timeWindowData.origin = {};
      if (!timeWindowData.destination) timeWindowData.destination = {};
      
      switch (eventType) {
        case 'loading_arrival': {
          updates.actual_loading_arrival = isoTimestamp;
          updates.actual_loading_arrival_verified = true;
          updates.actual_loading_arrival_source = 'auto';
          timeWindowData.origin.actualArrival = isoTimestamp;
          // For pending loads, auto-upgrade to scheduled when truck arrives at origin
          // This handles the case where fleet/driver were assigned but status wasn't updated
          const { data: loadForStatusCheck } = await supabase
            .from('loads')
            .select('status')
            .eq('id', loadId)
            .single();
          if (loadForStatusCheck?.status === 'pending') {
            updates.status = 'scheduled';
          }
          break;
        }
        case 'loading_departure':
          updates.actual_loading_departure = isoTimestamp;
          updates.actual_loading_departure_verified = true;
          updates.actual_loading_departure_source = 'auto';
          timeWindowData.origin.actualDeparture = isoTimestamp;
          updates.status = 'in-transit';
          break;
        case 'offloading_arrival':
          updates.actual_offloading_arrival = isoTimestamp;
          updates.actual_offloading_arrival_verified = true;
          updates.actual_offloading_arrival_source = 'auto';
          timeWindowData.destination.actualArrival = isoTimestamp;
          // Status still in-transit until departure
          break;
        case 'offloading_departure':
          updates.actual_offloading_departure = isoTimestamp;
          updates.actual_offloading_departure_verified = true;
          updates.actual_offloading_departure_source = 'auto';
          timeWindowData.destination.actualDeparture = isoTimestamp;
          updates.status = 'delivered';
          break;
      }

      updates.time_window = timeWindowData;
      
      const { data, error } = await supabase
        .from('loads')
        .update(updates)
        .eq('id', loadId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log geofence event to geofence_events table
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('geofence_events').insert({
          load_id: loadId,
          load_number: loadNumber || data?.load_id || null,
          vehicle_registration: vehicleRegistration || null,
          telematics_asset_id: telematicsAssetId || null,
          event_type: eventType,
          geofence_name: geofenceName || null,
          latitude: latitude || null,
          longitude: longitude || null,
          event_time: timestamp.toISOString(),
          source: 'auto',
        });
      } catch {
        // Don't fail the main update if event logging fails
      }

      return { data, eventType };
    },
    onSuccess: ({ eventType }, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      
      // Show appropriate toast based on event
      const messages: Record<GeofenceEventType, string> = {
        loading_arrival: '🚛 Truck arrived at loading point',
        loading_departure: '🚀 Load departed - now in transit',
        offloading_arrival: '📦 Truck arrived at destination',
        offloading_departure: '✅ Delivery completed - please verify times',
      };
      
      toast({ 
        title: messages[eventType],
        description: eventType === 'offloading_departure' 
          ? 'Click to verify delivery times' 
          : `Time recorded: ${new Date().toLocaleTimeString()}`,
      });
      
      // Call delivery complete callback if provided
      if (eventType === 'offloading_departure' && variables.onDeliveryComplete) {
        variables.onDeliveryComplete();
      }
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to update load status', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

// Generate unique load ID with optional prefix for different load types
export function generateLoadId(prefix = 'LOAD'): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${prefix}-${year}-${random}`;
}