import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEMATICS_API_BASE = 'https://api-emea04.telematics.guru';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const TELEMATICS_SYSTEM_USER = Deno.env.get('TELEMATICS_SYSTEM_USER');
const TELEMATICS_SYSTEM_PASS = Deno.env.get('TELEMATICS_SYSTEM_PASS');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telematics-token',
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

async function makeTelematicsRequest(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  
  if (response.status === 401 && token === systemToken) {
    console.log('System token expired, refreshing...');
    systemToken = null;
    systemTokenExpiry = null;
    const newToken = await getSystemToken();
    if (newToken) {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`,
          'Accept': 'application/json',
        },
      });
    }
  }
  
  return response;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Handle geofence webhook events from Telematics Guru
    if (body.action === 'geofenceEvent' || body.eventType) {
      // Handle both formats: our action format and direct webhook format
      const eventType = body.eventType || body.action?.replace('geofenceEvent', '');
      const assetId = body.assetId || body.asset_id;
      const geofenceId = body.geofenceId || body.geofence_id;
      const timestamp = body.timestamp || new Date().toISOString();
      const eventData = body.data || body;
      
      console.log(`Geofence event received: ${eventType} for asset ${assetId} at geofence ${geofenceId}`);
      
      // Create Supabase client
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      
      // Find the load associated with this asset
      const { data: loadData, error: loadError } = await supabase
        .from('loads')
        .select(`
          *,
          fleet_vehicle:fleet_vehicles!inner(*)
        `)
        .eq('fleet_vehicle.telematics_asset_id', assetId?.toString())
        .in('status', ['in-transit', 'scheduled', 'pending', 'loading', 'offloading'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (loadError) {
        console.error('Error finding load:', loadError);
      }

      if (!loadData) {
        console.log(`No active load found for asset ${assetId}`);
        return new Response(
          JSON.stringify({ message: 'No active load found', event: eventType }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get geofence details from Telematics Guru
      const sysToken = await getSystemToken();
      let geofenceName = `Geofence-${geofenceId}`;
      
      if (sysToken && geofenceId) {
        try {
          const geofenceResponse = await makeTelematicsRequest(
            `${TELEMATICS_API_BASE}/v1/geofence/${geofenceId}`,
            sysToken
          );

          if (geofenceResponse.ok) {
            const geofenceData = await geofenceResponse.json();
            geofenceName = geofenceData.Name || geofenceData.name || geofenceName;
          }
        } catch (e) {
          console.error('Error fetching geofence details:', e);
        }
      }

      // Process the geofence event based on type
      const eventTypeLower = (eventType || '').toLowerCase();
      
      if (eventTypeLower.includes('entry')) {
        // Check if this is the origin geofence
        const originMatch = loadData.origin?.toLowerCase().includes(geofenceName.toLowerCase()) ||
                           geofenceName.toLowerCase().includes(loadData.origin?.toLowerCase() || '');
        
        if (originMatch) {
          // At origin - update load status to loading
          await supabase
            .from('loads')
            .update({ 
              status: 'loading',
              updated_at: new Date().toISOString()
            })
            .eq('id', loadData.id);
          
          console.log(`Load ${loadData.load_id} arrived at origin: ${geofenceName}`);
        }
        
        // Check if this is the destination geofence
        const destMatch = loadData.destination?.toLowerCase().includes(geofenceName.toLowerCase()) ||
                         geofenceName.toLowerCase().includes(loadData.destination?.toLowerCase() || '');
        
        if (destMatch) {
          // At destination - update load status to offloading
          await supabase
            .from('loads')
            .update({ 
              status: 'offloading',
              updated_at: new Date().toISOString()
            })
            .eq('id', loadData.id);
          
          console.log(`Load ${loadData.load_id} arrived at destination: ${geofenceName}`);
        }
      } else if (eventTypeLower.includes('exit')) {
        // Special handling for BV as origin - exit after loading means in-transit
        if (geofenceName.includes('BV') && loadData.origin?.includes('BV') && loadData.status === 'loading') {
          await supabase
            .from('loads')
            .update({ 
              status: 'in-transit',
              updated_at: new Date().toISOString()
            })
            .eq('id', loadData.id);
          
          console.log(`Load ${loadData.load_id} departed from BV origin, now in-transit`);
        }
      }

      // Record the geofence event in database for history
      await supabase
        .from('geofence_events')
        .insert({
          load_id: loadData.id,
          asset_id: assetId,
          geofence_id: geofenceId,
          geofence_name: geofenceName,
          event_type: eventTypeLower.includes('entry') ? 'entry' : 'exit',
          timestamp: timestamp,
          metadata: eventData || {}
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Processed ${eventType} event for load ${loadData.load_id}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle other actions
    if (body.action === 'authenticate') {
      if (!body.username || !body.password) {
        return new Response(
          JSON.stringify({ error: 'Username and password required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const formData = new URLSearchParams();
      formData.append('Username', body.username);
      formData.append('Password', body.password);

      const response = await fetch(`${TELEMATICS_API_BASE}/v1/user/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Authentication failed' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'getOrganisations') {
      const token = body.token || await getSystemToken();
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await makeTelematicsRequest(
        `${TELEMATICS_API_BASE}/v1/user/organisation`,
        token
      );

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch organisations' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'getAssets') {
      const token = body.token || await getSystemToken();
      if (!token || !body.organisationId) {
        return new Response(
          JSON.stringify({ error: 'Token and organisationId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await makeTelematicsRequest(
        `${TELEMATICS_API_BASE}/v1/organisation/${body.organisationId}/asset`,
        token
      );

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch assets' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'getAssetDetails') {
      const token = body.token || await getSystemToken();
      if (!token || !body.assetId) {
        return new Response(
          JSON.stringify({ error: 'Token and assetId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await makeTelematicsRequest(
        `${TELEMATICS_API_BASE}/v1/asset/${body.assetId}`,
        token
      );

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch asset details' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'getAssetByShareToken') {
      if (!body.shareToken) {
        return new Response(
          JSON.stringify({ error: 'Share token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      
      const { data: shareLink, error: linkError } = await supabase
        .from('tracking_share_links')
        .select(`
          *,
          load:loads(
            load_id,
            origin,
            destination,
            loading_date,
            offloading_date,
            cargo_type,
            status,
            driver:drivers!loads_driver_id_fkey(name, contact),
            fleet_vehicle:fleet_vehicles(vehicle_id, type, telematics_asset_id)
          )
        `)
        .eq('token', body.shareToken)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (linkError || !shareLink) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired share token' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const assetIdToFetch = body.assetId 
        ? String(body.assetId) 
        : (shareLink.load?.fleet_vehicle?.telematics_asset_id || shareLink.telematics_asset_id);
      
      if (!assetIdToFetch) {
        return new Response(
          JSON.stringify({ error: 'No telematics asset ID available' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const assetIdNum = parseInt(assetIdToFetch);
      if (isNaN(assetIdNum)) {
        return new Response(
          JSON.stringify({ error: 'Invalid asset ID format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const sysToken = await getSystemToken();
      if (!sysToken) {
        return new Response(
          JSON.stringify({ error: 'Tracking service unavailable' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await makeTelematicsRequest(
        `${TELEMATICS_API_BASE}/v1/asset/${assetIdNum}`,
        sysToken
      );

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch vehicle position' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const rawData = await response.json();
      const assetData = rawData.Assets?.[0] || rawData;
      
      const normalizedAsset = {
        id: assetData.Id ?? assetData.id ?? assetIdNum,
        name: assetData.Name || assetData.name || shareLink.load?.fleet_vehicle?.vehicle_id || 'Vehicle',
        code: assetData.Code || assetData.code || `ASSET-${assetIdNum}`,
        lastLatitude: assetData.LastLatitude ?? assetData.lastLatitude ?? null,
        lastLongitude: assetData.LastLongitude ?? assetData.lastLongitude ?? null,
        heading: assetData.Heading ?? assetData.heading ?? 0,
        speedKmH: assetData.SpeedKmH ?? assetData.speedKmH ?? 0,
        inTrip: assetData.InTrip ?? assetData.inTrip ?? false,
        isEnabled: assetData.IsEnabled ?? assetData.isEnabled ?? true,
        lastConnectedUtc: assetData.LastConnectedUtc || assetData.lastConnectedUtc || new Date().toISOString(),
      };
      
      return new Response(
        JSON.stringify(normalizedAsset),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'getGeofences') {
      const token = body.token || await getSystemToken();
      if (!token || !body.organisationId) {
        return new Response(
          JSON.stringify({ error: 'Token and organisationId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await makeTelematicsRequest(
        `${TELEMATICS_API_BASE}/v1/organisation/${body.organisationId}/geofence`,
        token
      );

      if (!response.ok) {
        if (response.status === 404) {
          return new Response(
            JSON.stringify([]),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: 'Failed to fetch geofences' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'getGeofenceDetails') {
      const token = body.token || await getSystemToken();
      if (!token || !body.geofenceId) {
        return new Response(
          JSON.stringify({ error: 'Token and geofenceId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await makeTelematicsRequest(
        `${TELEMATICS_API_BASE}/v1/geofence/${body.geofenceId}`,
        token
      );

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch geofence details' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});