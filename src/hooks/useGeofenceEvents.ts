import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

export interface GeofenceEvent {
  id: string;
  load_id: string | null;
  load_number: string | null;
  vehicle_registration: string | null;
  telematics_asset_id: string | null;
  event_type: string;
  geofence_name: string | null;
  latitude: number | null;
  longitude: number | null;
  event_time: string;
  source: string | null;
  created_at: string;
}

export type GeofenceEventType = 'entry' | 'exit' | 'dwell' | 'speeding' | string;

export interface GeofenceEventsResponse {
  events: GeofenceEvent[];
  totalCount: number | null;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}

export interface GeofenceEventFilters {
  vehicleRegistration?: string | null;
  telematicsAssetId?: string | null;
  loadId?: string | null;
  eventTypes?: GeofenceEventType[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  page?: number;
  enableRealtime?: boolean;
}

const DEFAULT_LIMIT = 50;
const DEFAULT_PAGE = 0;

// Helper: cast supabase to any so chained methods (.select, .eq, etc.)
// don't cause "Type instantiation is excessively deep" errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getGeofenceEventsTable = () => (supabase as any).from('geofence_events');

/**
 * Fetch geofence events for a specific vehicle (by registration or telematics asset ID).
 */
export function useGeofenceEvents(
  vehicleRegistration?: string | null,
  telematicsAssetId?: string | null,
  limit = DEFAULT_LIMIT,
  page = DEFAULT_PAGE,
  startDate?: Date,
  endDate?: Date,
  eventTypes?: GeofenceEventType[],
  enableRealtime = false,
) {
  const queryClient = useQueryClient();
  
  const queryKey = useMemo(() => 
    ['geofence_events', vehicleRegistration, telematicsAssetId, limit, page, startDate, endDate, eventTypes],
    [vehicleRegistration, telematicsAssetId, limit, page, startDate, endDate, eventTypes]
  );

  const from = page * limit;
  const to = from + limit - 1;

  const query = useQuery({
    queryKey,
    enabled: !!(vehicleRegistration || telematicsAssetId),
    queryFn: async () => {
      let queryBuilder = getGeofenceEventsTable()
        .select('*', { count: 'exact' })
        .order('event_time', { ascending: false })
        .range(from, to);

      if (telematicsAssetId) {
        queryBuilder = queryBuilder.eq('telematics_asset_id', telematicsAssetId);
      } else if (vehicleRegistration) {
        queryBuilder = queryBuilder.eq('vehicle_registration', vehicleRegistration);
      }

      if (startDate) {
        queryBuilder = queryBuilder.gte('event_time', startDate.toISOString());
      }
      
      if (endDate) {
        queryBuilder = queryBuilder.lte('event_time', endDate.toISOString());
      }

      if (eventTypes && eventTypes.length > 0) {
        queryBuilder = queryBuilder.in('event_type', eventTypes);
      }

      const { data, error, count } = await queryBuilder;
      if (error) throw error;
      
      const totalCount = count || 0;
      return {
        events: (data || []) as unknown as GeofenceEvent[],
        totalCount,
        hasMore: from + limit < totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      } as GeofenceEventsResponse;
    },
  });

  useEffect(() => {
    if (!enableRealtime || !(vehicleRegistration || telematicsAssetId)) return;

    const filter = telematicsAssetId 
      ? `telematics_asset_id=eq.${telematicsAssetId}`
      : `vehicle_registration=eq.${vehicleRegistration}`;

    const channel = supabase
      .channel(`vf-${filter}`)
      .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'geofence_events',
          filter: filter,
      }, (payload) => {
        queryClient.setQueryData<GeofenceEventsResponse>(queryKey, (oldData) => {
          if (!oldData || page !== 0) return oldData;
          const newEvent = payload.new as unknown as GeofenceEvent;
          return {
            ...oldData,
            events: [newEvent, ...oldData.events.slice(0, -1)],
            totalCount: (oldData.totalCount || 0) + 1,
          };
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [enableRealtime, vehicleRegistration, telematicsAssetId, page, queryClient, queryKey]);

  return query;
}

/**
 * Fetch geofence events for a specific load.
 */
export function useLoadGeofenceEvents(
  loadId?: string | null,
  limit = DEFAULT_LIMIT,
  page = DEFAULT_PAGE,
  startDate?: Date,
  endDate?: Date,
  eventTypes?: GeofenceEventType[],
  enableRealtime = false,
) {
  const queryClient = useQueryClient();
  
  const queryKey = useMemo(() => 
    ['geofence_events', 'load', loadId, limit, page, startDate, endDate, eventTypes],
    [loadId, limit, page, startDate, endDate, eventTypes]
  );

  const from = page * limit;
  const to = from + limit - 1;

  const query = useQuery({
    queryKey,
    enabled: !!loadId,
    queryFn: async () => {
      let queryBuilder = getGeofenceEventsTable()
        .select('*', { count: 'exact' })
        .eq('load_id', loadId!)
        .order('event_time', { ascending: false })
        .range(from, to);

      if (startDate) queryBuilder = queryBuilder.gte('event_time', startDate.toISOString());
      if (endDate) queryBuilder = queryBuilder.lte('event_time', endDate.toISOString());
      if (eventTypes && eventTypes.length > 0) queryBuilder = queryBuilder.in('event_type', eventTypes);

      const { data, error, count } = await queryBuilder;
      if (error) throw error;
      
      const totalCount = count || 0;
      return {
        events: (data || []) as unknown as GeofenceEvent[],
        totalCount,
        hasMore: from + limit < totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      } as GeofenceEventsResponse;
    },
  });

  useEffect(() => {
    if (!enableRealtime || !loadId) return;

    const channel = supabase
      .channel(`load-${loadId}`)
      .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'geofence_events',
          filter: `load_id=eq.${loadId}`,
      }, (payload) => {
        queryClient.setQueryData<GeofenceEventsResponse>(queryKey, (oldData) => {
          if (!oldData || page !== 0) return oldData;
          const newEvent = payload.new as unknown as GeofenceEvent;
          return {
            ...oldData,
            events: [newEvent, ...oldData.events.slice(0, -1)],
            totalCount: (oldData.totalCount || 0) + 1,
          };
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [enableRealtime, loadId, page, queryClient, queryKey]);

  return query;
}

/**
 * REFACTORED: Now follows "Rules of Hooks" by internalizing logic
 */
export function useFilteredGeofenceEvents(filters: GeofenceEventFilters) {
  const {
    vehicleRegistration,
    telematicsAssetId,
    loadId,
    eventTypes,
    startDate,
    endDate,
    limit = DEFAULT_LIMIT,
    page = DEFAULT_PAGE,
    enableRealtime = false,
  } = filters;

  const vehicleEvents = useGeofenceEvents(
    vehicleRegistration,
    telematicsAssetId,
    limit,
    page,
    startDate,
    endDate,
    eventTypes,
    enableRealtime && !loadId
  );

  const loadEvents = useLoadGeofenceEvents(
    loadId,
    limit,
    page,
    startDate,
    endDate,
    eventTypes,
    enableRealtime && !!loadId
  );

  return loadId ? loadEvents : vehicleEvents;
}

export function useGeofenceEvent(eventId?: string | null) {
  return useQuery({
    queryKey: ['geofence_event', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await getGeofenceEventsTable()
        .select('*')
        .eq('id', eventId!)
        .single();
      if (error) throw error;
      return data as unknown as GeofenceEvent;
    },
  });
}

export function useGeofenceNames() {
  return useQuery({
    queryKey: ['geofence_names'],
    queryFn: async () => {
      const { data, error } = await getGeofenceEventsTable()
        .select('geofence_name')
        .not('geofence_name', 'is', null)
        .order('geofence_name');

      if (error) throw error;
      const names = (data as { geofence_name: string }[]).map(item => item.geofence_name);
      return [...new Set(names)];
    },
  });
}

export interface GeofenceStats {
  totalEvents: number;
  entryCount: number;
  exitCount: number;
  dwellCount: number;
  speedingCount: number;
  uniqueGeofences: number;
  firstEventTime: string | null;
  lastEventTime: string | null;
}

export function useGeofenceStats(
  vehicleRegistration?: string | null,
  telematicsAssetId?: string | null,
  loadId?: string | null,
  days?: number,
) {
  return useQuery({
    queryKey: ['geofence_stats', vehicleRegistration, telematicsAssetId, loadId, days],
    enabled: !!(vehicleRegistration || telematicsAssetId || loadId),
    queryFn: async () => {
      let query = getGeofenceEventsTable().select('*', { count: 'exact' });

      if (loadId) query = query.eq('load_id', loadId);
      else if (telematicsAssetId) query = query.eq('telematics_asset_id', telematicsAssetId);
      else if (vehicleRegistration) query = query.eq('vehicle_registration', vehicleRegistration);

      if (days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        query = query.gte('event_time', cutoffDate.toISOString());
      }

      const { data, error, count } = await query;
      if (error) throw error;
      
      const events = (data || []) as unknown as GeofenceEvent[];
      
      return {
        totalEvents: count || 0,
        entryCount: events.filter(e => e.event_type === 'entry').length,
        exitCount: events.filter(e => e.event_type === 'exit').length,
        dwellCount: events.filter(e => e.event_type === 'dwell').length,
        speedingCount: events.filter(e => e.event_type === 'speeding').length,
        uniqueGeofences: new Set(events.map(e => e.geofence_name).filter(Boolean)).size,
        firstEventTime: events.length > 0 ? events.reduce((earliest, cur) => 
          new Date(cur.event_time) < new Date(earliest.event_time) ? cur : earliest).event_time : null,
        lastEventTime: events.length > 0 ? events.reduce((latest, cur) => 
          new Date(cur.event_time) > new Date(latest.event_time) ? cur : latest).event_time : null,
      } as GeofenceStats;
    },
  });
}