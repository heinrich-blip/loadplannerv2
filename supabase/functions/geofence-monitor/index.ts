import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const TELEMATICS_API_BASE = 'https://api-emea04.telematics.guru';
const TELEMATICS_SYSTEM_USER = Deno.env.get('TELEMATICS_SYSTEM_USER');
const TELEMATICS_SYSTEM_PASS = Deno.env.get('TELEMATICS_SYSTEM_PASS');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Cache for system token
let systemToken: string | null = null;
let systemTokenExpiry: number | null = null;

async function getSystemToken(): Promise<string | null> {
  if (systemToken && systemTokenExpiry && Date.now() < systemTokenExpiry) {
    return systemToken;
  }

  if (!TELEMATICS_SYSTEM_USER || !TELEMATICS_SYSTEM_PASS) {
    console.error('System telematics credentials not configured');
    return null;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('Username', TELEMATICS_SYSTEM_USER);
    formData.append('Password', TELEMATICS_SYSTEM_PASS);

    const response = await fetch(`${TELEMATICS_API_BASE}/v1/user/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (!response.ok) {
      console.error('System auth failed:', response.status);
      return null;
    }

    const data = await response.json();
    
    systemToken = data.access_token;
    systemTokenExpiry = Date.now() + ((data.expires_in || 3600) * 1000) - 60000;
    
    return systemToken;
  } catch (error) {
    console.error('System auth error:', error);
    return null;
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function checkAssetGeofenceStatus(
  assetId: number,
  geofences: any[],
  supabase: any
): Promise<Array<{ geofenceId: number; geofenceName: string; event: 'entry' | 'exit' }>> {
  const token = await getSystemToken();
  if (!token) return [];

  const events: Array<{ geofenceId: number; geofenceName: string; event: 'entry' | 'exit' }> = [];

  try {
    // Get current asset position
    const response = await fetch(`${TELEMATICS_API_BASE}/v1/asset/${assetId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const asset = data.Assets?.[0] || data;
    
    const currentLat = asset.LastLatitude ?? asset.lastLatitude;
    const currentLng = asset.LastLongitude ?? asset.lastLongitude;
    
    if (!currentLat || !currentLng) return [];

    // Get last known position from database
    const { data: lastPosData } = await supabase
      .from('asset_positions')
      .select('*')
      .eq('asset_id', assetId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Store current position
    await supabase
      .from('asset_positions')
      .insert({
        asset_id: assetId,
        latitude: currentLat,
        longitude: currentLng,
        timestamp: new Date().toISOString()
      });

    if (!lastPosData) return []; // No previous position to compare

    // Check each geofence for entry/exit
    for (const geofence of geofences) {
      const geofenceId = geofence.Id ?? geofence.id;
      const geofenceName = geofence.Name ?? geofence.name ?? `Geofence-${geofenceId}`;
      const geofenceLat = geofence.Latitude ?? geofence.latitude ?? geofence.centerLatitude;
      const geofenceLng = geofence.Longitude ?? geofence.longitude ?? geofence.centerLongitude;
      const radius = geofence.Radius ?? geofence.radius ?? 500; // Default 500m
      
      if (!geofenceLat || !geofenceLng) continue;

      // Calculate current distance
      const currentDistance = calculateDistance(
        currentLat, currentLng,
        geofenceLat, geofenceLng
      ) * 1000; // Convert to meters

      const isInside = currentDistance <= radius;

      // Calculate previous distance
      const previousDistance = calculateDistance(
        lastPosData.latitude, lastPosData.longitude,
        geofenceLat, geofenceLng
      ) * 1000;

      const wasInside = previousDistance <= radius;

      // Detect transitions
      if (!wasInside && isInside) {
        events.push({ geofenceId, geofenceName, event: 'entry' });
      } else if (wasInside && !isInside) {
        events.push({ geofenceId, geofenceName, event: 'exit' });
      }
    }

    return events;
  } catch (error) {
    console.error(`Error checking geofence for asset ${assetId}:`, error);
    return [];
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Get all active loads with vehicles that have telematics asset IDs
    const { data: loads, error: loadsError } = await supabase
      .from('loads')
      .select(`
        id,
        load_id,
        origin,
        destination,
        status,
        fleet_vehicle:fleet_vehicles!inner(
          id,
          vehicle_id,
          telematics_asset_id
        )
      `)
      .in('status', ['in-transit', 'scheduled', 'pending', 'loading', 'offloading'])
      .not('fleet_vehicle.telematics_asset_id', 'is', null);

    if (loadsError) {
      console.error('Error fetching loads:', loadsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch loads' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!loads || loads.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active loads with telematics' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get system token for Telematics API
    const token = await getSystemToken();
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Telematics' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organisation ID from first load's vehicle (assuming all under same org)
    // You may need to adjust this based on your setup
    const orgId = 0; // Replace with your actual organisation ID or fetch dynamically

    // Get all geofences from Telematics
    const geofencesResponse = await fetch(
      `${TELEMATICS_API_BASE}/v1/organisation/${orgId}/geofence`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    let geofences: any[] = [];
    if (geofencesResponse.ok) {
      geofences = await geofencesResponse.json();
    }

    // Check each asset for geofence events
    const allEvents: Array<{
      loadId: string;
      assetId: number;
      geofenceId: number;
      geofenceName: string;
      event: 'entry' | 'exit';
    }> = [];

    for (const load of loads) {
      const assetId = parseInt(load.fleet_vehicle.telematics_asset_id);
      if (isNaN(assetId)) continue;

      const assetEvents = await checkAssetGeofenceStatus(assetId, geofences, supabase);
      
      for (const event of assetEvents) {
        allEvents.push({
          loadId: load.id,
          assetId,
          geofenceId: event.geofenceId,
          geofenceName: event.geofenceName,
          event: event.event
        });
      }
    }

    // Process detected events
    for (const event of allEvents) {
      const load = loads.find(l => l.id === event.loadId);
      if (!load) continue;

      console.log(`Detected ${event.event} for asset ${event.assetId} at ${event.geofenceName}`);

      // Process based on event type and geofence
      if (event.event === 'entry') {
        // Check if this is origin or destination
        const isOrigin = load.origin?.toLowerCase().includes(event.geofenceName.toLowerCase()) ||
                        event.geofenceName.toLowerCase().includes(load.origin?.toLowerCase() || '');
        const isDestination = load.destination?.toLowerCase().includes(event.geofenceName.toLowerCase()) ||
                             event.geofenceName.toLowerCase().includes(load.destination?.toLowerCase() || '');

        if (isOrigin && load.status !== 'loading') {
          await supabase
            .from('loads')
            .update({ 
              status: 'loading',
              updated_at: new Date().toISOString()
            })
            .eq('id', load.id);
          
          console.log(`Load ${load.load_id} arrived at origin: ${event.geofenceName}`);
        } else if (isDestination && load.status !== 'offloading') {
          await supabase
            .from('loads')
            .update({ 
              status: 'offloading',
              updated_at: new Date().toISOString()
            })
            .eq('id', load.id);
          
          console.log(`Load ${load.load_id} arrived at destination: ${event.geofenceName}`);
        }
      } else if (event.event === 'exit') {
        // Special handling for BV origin
        if (event.geofenceName.includes('BV') && 
            load.origin?.includes('BV') && 
            load.status === 'loading') {
          await supabase
            .from('loads')
            .update({ 
              status: 'in-transit',
              updated_at: new Date().toISOString()
            })
            .eq('id', load.id);
          
          console.log(`Load ${load.load_id} departed from BV origin, now in-transit`);
        }
      }

      // Record the event
      await supabase
        .from('geofence_events')
        .insert({
          load_id: load.id,
          asset_id: event.assetId,
          geofence_id: event.geofenceId,
          geofence_name: event.geofenceName,
          event_type: event.event,
          timestamp: new Date().toISOString(),
          metadata: { detected_by: 'monitor' }
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        loads_checked: loads.length,
        events_detected: allEvents.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Geofence monitor error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});