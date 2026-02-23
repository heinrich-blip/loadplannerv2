// @ts-nocheck - This is a Deno edge function, not part of the main TypeScript project

const TELEMATICS_API_BASE = 'https://api-emea04.telematics.guru';

// System credentials for portal access (should be set as Supabase secrets)
const TELEMATICS_PORTAL_ORG_ID = parseInt(Deno.env.get('TELEMATICS_PORTAL_ORG_ID') || '0');
const TELEMATICS_PORTAL_USERNAME = Deno.env.get('TELEMATICS_PORTAL_USERNAME') || '';
const TELEMATICS_PORTAL_PASSWORD = Deno.env.get('TELEMATICS_PORTAL_PASSWORD') || '';

// Cache for portal token
let portalToken: string | null = null;
let portalTokenExpiry: number | null = null;

async function getPortalToken(): Promise<string | null> {
  // Return cached token if still valid
  if (portalToken && portalTokenExpiry && Date.now() < portalTokenExpiry) {
    return portalToken;
  }
  
  // Authenticate to get new token
  if (!TELEMATICS_PORTAL_USERNAME || !TELEMATICS_PORTAL_PASSWORD) {
    console.error('Portal credentials not configured');
    return null;
  }
  
  const formData = new URLSearchParams();
  formData.append('Username', TELEMATICS_PORTAL_USERNAME);
  formData.append('Password', TELEMATICS_PORTAL_PASSWORD);

  const response = await fetch(`${TELEMATICS_API_BASE}/v1/user/authenticate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    console.error('Failed to authenticate for portal:', response.status);
    return null;
  }

  const data = await response.json();
  portalToken = data.access_token;
  // Set expiry to 1 hour before actual expiry to be safe
  portalTokenExpiry = Date.now() + ((data.expires_in || 3600) - 60) * 1000;
  
  return portalToken;
}

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { action, username, password, token, organisationId, assetId } = body;

    if (action === 'authenticate') {
      if (!username || !password) {
        return new Response(
          JSON.stringify({ error: 'Username and password required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const formData = new URLSearchParams();
      formData.append('Username', username);
      formData.append('Password', password);

      const response = await fetch(`${TELEMATICS_API_BASE}/v1/user/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Authentication failed', status: response.status }),
          { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'getAssets') {
      if (!token || !organisationId) {
        return new Response(
          JSON.stringify({ error: 'Token and organisationId required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(
        `${TELEMATICS_API_BASE}/v1/organisation/${organisationId}/asset`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch assets', status: response.status }),
          { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'getAssetDetails') {
      if (!token || !assetId) {
        return new Response(
          JSON.stringify({ error: 'Token and assetId required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(`${TELEMATICS_API_BASE}/v1/asset/${assetId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch asset details', status: response.status }),
          { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get assets for portal (public access with system credentials)
    if (action === 'getAssetsForPortal') {
      // Check if portal is configured
      if (!TELEMATICS_PORTAL_ORG_ID || !TELEMATICS_PORTAL_USERNAME || !TELEMATICS_PORTAL_PASSWORD) {
        return new Response(
          JSON.stringify({ error: 'Portal not configured' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Get or refresh token
      const token = await getPortalToken();
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Failed to authenticate with telematics' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(
        `${TELEMATICS_API_BASE}/v1/organisation/${TELEMATICS_PORTAL_ORG_ID}/asset`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch assets', status: response.status }),
          { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify({ assets: data }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get organisations
    if (action === 'getOrganisations') {
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Token required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Fix: The endpoint might be different
      const response = await fetch(`${TELEMATICS_API_BASE}/v1/user/organisation`, {  // Removed 's' at the end
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch organisations', status: response.status }),
          { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get geofences
    if (action === 'getGeofences') {
      if (!token || !organisationId) {
        return new Response(
          JSON.stringify({ error: 'Token and organisationId required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(
        `${TELEMATICS_API_BASE}/v1/organisation/${organisationId}/geofence`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch geofences', status: response.status }),
          { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get geofence details
    if (action === 'getGeofenceDetails') {
      if (!token || !organisationId) {
        return new Response(
          JSON.stringify({ error: 'Token and organisationId required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const geofenceId = body.geofenceId;
      if (!geofenceId) {
        return new Response(
          JSON.stringify({ error: 'GeofenceId required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Fix: The endpoint format might be different
      const response = await fetch(
        `${TELEMATICS_API_BASE}/v1/geofence/${geofenceId}`,  // Changed from organisation/.../geofence/id
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch geofence details', status: response.status }),
          { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}