/**
 * Telematics Guru API Client
 * Integrates with the tracking platform for live vehicle locations.
 * Uses Supabase Edge Function as proxy to avoid CORS issues.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TelematicsAsset {
  id: number;
  assetId?: number;
  name?: string;
  code?: string;
  displayName?: string;
  registrationNumber?: string;
  isEnabled: boolean;
  inTrip: boolean;
  speedKmH: number;
  heading?: number;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastConnectedUtc?: string;
  lastPositionUtc?: string;
  odometer?: number;
  engineHours?: number;
}

export interface TelematicsOrganisation {
  id: number;
  name: string;
  parentId?: number;
  isEnabled?: boolean;
}

export interface TelematicsGeofence {
  id: number;
  name: string;
  description?: string;
  type?: string; // 'Circle' | 'Polygon'
  latitude?: number;
  longitude?: number;
  centerLatitude?: number;
  centerLongitude?: number;
  lat?: number;
  lng?: number;
  lon?: number;
  radius?: number;
  points?: { latitude: number; longitude: number }[];
  isEnabled?: boolean;
  organisationId?: number;
}

export interface ETAResult {
  eta: Date | null;
  etaFormatted: string;
  distance: number | null;
  distanceFormatted: string;
  durationMinutes: number;
  durationFormatted: string;
  speed: number;
  isMoving: boolean;
  error?: string;
}

export interface TelematicsTrip {
  id?: number;
  assetId?: number;
  assetName?: string;
  driverName?: string;
  startTimeUtc?: string;
  endTimeUtc?: string;
  startLatitude?: number;
  startLongitude?: number;
  endLatitude?: number;
  endLongitude?: number;
  startAddress?: string;
  endAddress?: string;
  distanceKm?: number;
  distance?: number;
  maxSpeed?: number;
  maxSpeedKmH?: number;
  averageSpeed?: number;
  averageSpeedKmH?: number;
  durationMinutes?: number;
  duration?: number;
  idleDurationMinutes?: number;
  idleDuration?: number;
  fuelUsed?: number;
  startOdometer?: number;
  endOdometer?: number;
  // Some APIs use different field names
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PROXY_URL = `${SUPABASE_URL}/functions/v1/telematics-proxy`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// In-memory auth state
let authToken: string | null = null;
let tokenExpiry: number | null = null;

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function proxyHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: "Bearer " + SUPABASE_ANON_KEY,
  };
}

function handleAuthError(status: number): never {
  if (status === 401 || status === 403) {
    clearAuth();
    throw new Error("Authentication expired - please re-login");
  }
  throw new Error("API error: " + status);
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export async function authenticate(
  username: string,
  password: string,
): Promise<boolean> {
  try {
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: proxyHeaders(),
      body: JSON.stringify({ action: "authenticate", username, password }),
    });

    const text = await response.text();

    if (!response.ok) {
      console.error("Telematics auth failed:", response.status, text);
      return false;
    }

    const data = JSON.parse(text) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!data.access_token) {
      console.error("Telematics auth: No access token in response", data);
      return false;
    }

    authToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;

    localStorage.setItem("telematics_token", authToken);
    localStorage.setItem("telematics_expiry", tokenExpiry.toString());

    return true;
  } catch (error) {
    console.error("Telematics auth error:", error);
    return false;
  }
}

export function getAuthToken(): string | null {
  if (authToken && tokenExpiry && Date.now() < tokenExpiry) {
    return authToken;
  }

  const storedToken = localStorage.getItem("telematics_token");
  const storedExpiry = localStorage.getItem("telematics_expiry");

  if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry, 10)) {
    authToken = storedToken;
    tokenExpiry = parseInt(storedExpiry, 10);
    return authToken;
  }

  return null;
}

export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

export function clearAuth(): void {
  authToken = null;
  tokenExpiry = null;
  localStorage.removeItem("telematics_token");
  localStorage.removeItem("telematics_expiry");
}

// ---------------------------------------------------------------------------
// Organisations
// ---------------------------------------------------------------------------

export async function getOrganisations(): Promise<TelematicsOrganisation[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated with Telematics Guru");

  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: proxyHeaders(),
    body: JSON.stringify({ action: "getOrganisations", token }),
  });

  if (!response.ok) handleAuthError(response.status);

  return (await response.json()) as TelematicsOrganisation[];
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export async function getAssets(
  organisationId: number,
): Promise<TelematicsAsset[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated with Telematics Guru");

  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: proxyHeaders(),
    body: JSON.stringify({ action: "getAssets", token, organisationId }),
  });

  if (!response.ok) handleAuthError(response.status);

  return (await response.json()) as TelematicsAsset[];
}

export async function getAssetDetails(
  assetId: number,
): Promise<TelematicsAsset> {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated with Telematics Guru");

  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: proxyHeaders(),
    body: JSON.stringify({ action: "getAssetDetails", token, assetId }),
  });

  if (!response.ok) handleAuthError(response.status);

  return (await response.json()) as TelematicsAsset;
}

export async function getAssetsWithPositions(
  organisationId: number,
): Promise<TelematicsAsset[]> {
  const assets = await getAssets(organisationId);
  return assets.filter(
    (a) =>
      a.lastLatitude !== null && a.lastLongitude !== null && a.isEnabled,
  );
}

/**
 * Get assets using system credentials via edge function proxy.
 * Used by public portal pages that don't have user-level telematics auth.
 */
export async function getAssetsForPortal(): Promise<TelematicsAsset[] | null> {
  try {
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: proxyHeaders(),
      body: JSON.stringify({ action: "getAssetsForPortal" }),
    });

    if (!response.ok) {
      console.error(
        "[TelematicsGuru] Portal assets fetch failed:",
        response.status,
      );
      return null;
    }

    const data = (await response.json()) as { assets?: TelematicsAsset[] };
    const assets = data.assets ?? [];
    return assets.filter(
      (a) =>
        a.lastLatitude !== null && a.lastLongitude !== null && a.isEnabled,
    );
  } catch (error) {
    console.error("[TelematicsGuru] Portal assets error:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatLastConnected(
  utcString: string | Date | null | undefined,
): string {
  if (!utcString) return "Never";

  try {
    let dateStr =
      typeof utcString === "string" ? utcString : utcString.toISOString();

    // Ensure UTC timezone
    if (
      !dateStr.endsWith("Z") &&
      !dateStr.includes("+") &&
      !dateStr.includes("-", 10)
    ) {
      dateStr += "Z";
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Unknown";

    const now = new Date();
    let diffMs = now.getTime() - date.getTime();

    // Handle future timestamps (server time mismatch / year skew)
    if (diffMs < -60_000) {
      const yearDiff = date.getFullYear() - now.getFullYear();
      if (yearDiff > 0) {
        const adjusted = new Date(date);
        adjusted.setFullYear(now.getFullYear());
        diffMs = now.getTime() - adjusted.getTime();
        if (diffMs < 0) return "Just now";
      } else {
        return "Just now";
      }
    }

    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch (error) {
    console.error("[TelematicsGuru] Error formatting date:", error, utcString);
    return "Unknown";
  }
}

export function parseLastConnected(
  utcString: string | null | undefined,
): Date | null {
  if (!utcString) return null;

  try {
    let dateStr = utcString;
    if (
      !dateStr.endsWith("Z") &&
      !dateStr.includes("+") &&
      !dateStr.includes("-", 10)
    ) {
      dateStr += "Z";
    }

    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export function getStatusColor(asset: TelematicsAsset): string {
  if (!asset.isEnabled) return "#9CA3AF";
  if (asset.inTrip) return "#22C55E";
  if (asset.speedKmH > 0) return "#22C55E";
  return "#3B82F6";
}

export function getHeadingDirection(heading: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
}

// ---------------------------------------------------------------------------
// Geofences
// ---------------------------------------------------------------------------

export async function getGeofences(
  organisationId: number,
): Promise<TelematicsGeofence[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: proxyHeaders(),
    body: JSON.stringify({ action: "getGeofences", token, organisationId }),
  });

  if (!response.ok) {
    if (response.status === 404) return [];
    handleAuthError(response.status);
  }

  return (await response.json()) as TelematicsGeofence[];
}

export async function getGeofenceDetails(
  geofenceId: number,
): Promise<TelematicsGeofence> {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: proxyHeaders(),
    body: JSON.stringify({ action: "getGeofenceDetails", token, geofenceId }),
  });

  if (!response.ok) handleAuthError(response.status);

  return (await response.json()) as TelematicsGeofence;
}

// ---------------------------------------------------------------------------
// Distance & ETA
// ---------------------------------------------------------------------------

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateETA(
  asset: TelematicsAsset,
  geofence: TelematicsGeofence,
  averageSpeed = 60,
): ETAResult {
  if (!asset.lastLatitude || !asset.lastLongitude) {
    return {
      eta: null,
      etaFormatted: "",
      distance: null,
      distanceFormatted: "",
      durationMinutes: 0,
      durationFormatted: "",
      speed: 0,
      isMoving: false,
      error: "No vehicle position",
    };
  }

  const destLat =
    geofence.latitude ?? geofence.centerLatitude ?? geofence.lat;
  const destLon =
    geofence.longitude ?? geofence.centerLongitude ?? geofence.lng ?? geofence.lon;

  if (!destLat || !destLon) {
    return {
      eta: null,
      etaFormatted: "",
      distance: null,
      distanceFormatted: "",
      durationMinutes: 0,
      durationFormatted: "",
      speed: 0,
      isMoving: false,
      error: "No geofence coordinates",
    };
  }

  const distance = calculateDistance(
    asset.lastLatitude,
    asset.lastLongitude,
    destLat,
    destLon,
  );

  const speed = asset.speedKmH > 10 ? asset.speedKmH : averageSpeed;
  const timeMinutes = Math.round((distance / speed) * 60);

  const eta = new Date();
  eta.setMinutes(eta.getMinutes() + timeMinutes);

  return {
    eta,
    etaFormatted: eta.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    distance: Math.round(distance * 10) / 10,
    distanceFormatted:
      distance < 1
        ? `${Math.round(distance * 1000)}m`
        : `${Math.round(distance)}km`,
    durationMinutes: timeMinutes,
    durationFormatted:
      timeMinutes < 60
        ? `${timeMinutes} mins`
        : `${Math.floor(timeMinutes / 60)}h ${timeMinutes % 60}m`,
    speed,
    isMoving: asset.speedKmH > 5,
  };
}

export function findNearestGeofence(
  asset: TelematicsAsset,
  geofences: TelematicsGeofence[],
): (TelematicsGeofence & { distance: number }) | null {
  if (!asset.lastLatitude || !asset.lastLongitude || !geofences.length) {
    return null;
  }

  let nearest: (TelematicsGeofence & { distance: number }) | null = null;
  let minDistance = Infinity;

  for (const geofence of geofences) {
    const lat =
      geofence.latitude ?? geofence.centerLatitude ?? geofence.lat;
    const lon =
      geofence.longitude ?? geofence.centerLongitude ?? geofence.lng ?? geofence.lon;

    if (!lat || !lon) continue;

    const distance = calculateDistance(
      asset.lastLatitude,
      asset.lastLongitude,
      lat,
      lon,
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = { ...geofence, distance };
    }
  }

  return nearest;
}

// ---------------------------------------------------------------------------
// Trip History
// ---------------------------------------------------------------------------

export interface GetTripsOptions {
  organisationId: number;
  from?: string;
  to?: string;
  assetId?: number;
  take?: number;
  skip?: number;
}

export async function getTrips(
  options: GetTripsOptions,
): Promise<TelematicsTrip[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: proxyHeaders(),
    body: JSON.stringify({ action: "getTrips", token, ...options }),
  });

  if (!response.ok) {
    if (response.status === 404) return [];
    handleAuthError(response.status);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function getAssetTrips(
  assetId: number,
  from?: string,
  to?: string,
  take = 50,
): Promise<TelematicsTrip[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: proxyHeaders(),
    body: JSON.stringify({
      action: "getAssetTrips",
      token,
      assetId,
      from: from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      to: to || new Date().toISOString(),
      take,
    }),
  });

  if (!response.ok) {
    if (response.status === 404) return [];
    handleAuthError(response.status);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

// ============================================================================
// GEOFENCE EVENT TYPES AND FUNCTIONS (SINGLE VERSION)
// ============================================================================

export interface GeofenceEvent {
  id: string;
  loadNumber: string | null;
  assetId: number | null;
  geofenceName: string | null;
  eventType: 'entry' | 'exit';
  eventTime: string;
  latitude: number | null;
  longitude: number | null;
  source?: string | null;
  vehicleRegistration?: string | null;
}

export interface AssetPosition {
  id: string;
  asset_id: number;
  latitude: number;
  longitude: number;
  timestamp: string;
}

/**
 * Register a webhook URL with Telematics Guru for geofence events
 * Note: This requires Telematics Guru to support webhook configuration
 */
export async function registerGeofenceWebhook(webhookUrl: string): Promise<boolean> {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  try {
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: proxyHeaders(),
      body: JSON.stringify({ 
        action: "registerWebhook",
        token,
        webhookUrl,
        events: ['geofence_entry', 'geofence_exit']
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to register webhook:", error);
    return false;
  }
}

/**
 * Get geofence events for a specific load by load number
 */
export async function getGeofenceEvents(loadNumber: string): Promise<GeofenceEvent[]> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');

    const { data, error } = await supabase
      .from('geofence_events')
      .select('*')
      .eq('load_number', loadNumber)
      .order('event_time', { ascending: false });

    if (error) {
      console.error("Error fetching geofence events:", error);
      return [];
    }

    return (data || []).map(event => ({
      id: event.id,
      loadNumber: event.load_number,
      assetId: event.telematics_asset_id ? parseInt(event.telematics_asset_id) : null,
      geofenceName: event.geofence_name,
      eventType: event.event_type as 'entry' | 'exit',
      eventTime: event.event_time,
      latitude: event.latitude,
      longitude: event.longitude,
      source: event.source,
      vehicleRegistration: event.vehicle_registration
    }));
  } catch (error) {
    console.error("Error in getGeofenceEvents:", error);
    return [];
  }
}

/**
 * Get the current geofence status for an asset
 */
export async function getAssetGeofenceStatus(assetId: number): Promise<{
  insideGeofences: Array<{ id: number; name: string; distance: number }>;
  lastEvent?: GeofenceEvent;
}> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { DEPOTS } = await import('./depots');

    // Get last known position from telematics_positions
    const { data: positions, error: posError } = await supabase
      .from('telematics_positions')
      .select('*')
      .eq('asset_id', assetId)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (posError) {
      console.error("Error fetching asset positions:", posError);
    }

    // Get last event from geofence_events
    const { data: events, error: eventError } = await supabase
      .from('geofence_events')
      .select('*')
      .eq('telematics_asset_id', assetId.toString())
      .order('event_time', { ascending: false })
      .limit(1);

    if (eventError) {
      console.error("Error fetching geofence events:", eventError);
    }

    const lastEvent = events && events.length > 0 ? {
      id: events[0].id,
      loadNumber: events[0].load_number,
      assetId: events[0].telematics_asset_id ? parseInt(events[0].telematics_asset_id) : null,
      geofenceName: events[0].geofence_name,
      eventType: events[0].event_type as 'entry' | 'exit',
      eventTime: events[0].event_time,
      latitude: events[0].latitude,
      longitude: events[0].longitude,
      source: events[0].source,
      vehicleRegistration: events[0].vehicle_registration
    } : undefined;
    
    const insideGeofences: Array<{ id: number; name: string; distance: number }> = [];
    
    if (positions && positions.length > 0) {
      const pos = positions[0];
      
      // Skip if position has no coordinates
      if (pos.latitude === null || pos.longitude === null) {
        return {
          insideGeofences: [],
          lastEvent
        };
      }
      
      // Check each depot
      for (const depot of DEPOTS) {
        const distance = calculateDistance(
          pos.latitude, pos.longitude,
          depot.latitude, depot.longitude
        ) * 1000; // Convert to meters
        
        if (distance <= (depot.radius || 500)) {
          insideGeofences.push({
            id: parseInt(depot.id.replace(/\D/g, '')) || 0,
            name: depot.name,
            distance: Math.round(distance)
          });
        }
      }
    }

    return {
      insideGeofences,
      lastEvent
    };
  } catch (error) {
    console.error("Error in getAssetGeofenceStatus:", error);
    return {
      insideGeofences: [],
      lastEvent: undefined
    };
  }
}

/**
 * Check if an asset is within a specific geofence/depot
 */
export async function isAssetInGeofence(assetId: number, geofenceName: string): Promise<boolean> {
  try {
    const status = await getAssetGeofenceStatus(assetId);
    return status.insideGeofences.some(g => 
      g.name.toLowerCase().includes(geofenceName.toLowerCase()) ||
      geofenceName.toLowerCase().includes(g.name.toLowerCase())
    );
  } catch (error) {
    console.error("Error in isAssetInGeofence:", error);
    return false;
  }
}

/**
 * Get the last known geofence event for a load by load number
 */
export async function getLastGeofenceEvent(loadNumber: string): Promise<GeofenceEvent | null> {
  try {
    const events = await getGeofenceEvents(loadNumber);
    return events.length > 0 ? events[0] : null;
  } catch (error) {
    console.error("Error in getLastGeofenceEvent:", error);
    return null;
  }
}

/**
 * Get geofence timeline for a load by load number
 */
export async function getGeofenceTimeline(loadNumber: string): Promise<{
  entries: GeofenceEvent[];
  exits: GeofenceEvent[];
  timeline: Array<GeofenceEvent & { displayText: string }>;
}> {
  try {
    const events = await getGeofenceEvents(loadNumber);
    
    const entries = events.filter(e => e.eventType === 'entry');
    const exits = events.filter(e => e.eventType === 'exit');
    
    const timeline = events.map(e => ({
      ...e,
      displayText: e.eventType === 'entry' ? '🚚 Arrived at' : '🚚 Departed from'
    }));
    
    return { entries, exits, timeline };
  } catch (error) {
    console.error("Error in getGeofenceTimeline:", error);
    return { entries: [], exits: [], timeline: [] };
  }
}

/**
 * Get all geofence events for an asset
 */
export async function getAssetGeofenceEvents(assetId: number): Promise<GeofenceEvent[]> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');

    const { data, error } = await supabase
      .from('geofence_events')
      .select('*')
      .eq('telematics_asset_id', assetId.toString())
      .order('event_time', { ascending: false });

    if (error) {
      console.error("Error fetching asset geofence events:", error);
      return [];
    }

    return (data || []).map(event => ({
      id: event.id,
      loadNumber: event.load_number,
      assetId: event.telematics_asset_id ? parseInt(event.telematics_asset_id) : null,
      geofenceName: event.geofence_name,
      eventType: event.event_type as 'entry' | 'exit',
      eventTime: event.event_time,
      latitude: event.latitude,
      longitude: event.longitude,
      source: event.source,
      vehicleRegistration: event.vehicle_registration
    }));
  } catch (error) {
    console.error("Error in getAssetGeofenceEvents:", error);
    return [];
  }
}

/**
 * Get the current position of an asset from telematics_positions
 */
export async function getAssetCurrentPosition(assetId: number): Promise<{
  latitude: number;
  longitude: number;
  timestamp: string;
} | null> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');

    const { data, error } = await supabase
      .from('telematics_positions')
      .select('*')
      .eq('asset_id', assetId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data || data.latitude === null || data.longitude === null || data.timestamp === null) {
      return null;
    }

    return {
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error("Error in getAssetCurrentPosition:", error);
    return null;
  }
}