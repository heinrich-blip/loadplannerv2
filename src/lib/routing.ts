/**
 * Road-based routing utility using OSRM (Open Source Routing Machine)
 * Provides accurate road distance and duration calculations
 */

export interface RouteResult {
  distance: number; // Distance in kilometers
  duration: number; // Duration in minutes
  geometry?: string; // Encoded polyline for route visualization
  waypoints?: {
    name: string;
    location: [number, number]; // [longitude, latitude]
  }[];
  error?: string;
}

export interface RouteWaypoint {
  latitude: number;
  longitude: number;
  name?: string;
}

// OSRM Demo server - for production, consider self-hosting OSRM or using a paid service
const OSRM_BASE_URL = 'https://router.project-osrm.org';

/**
 * Calculate road-based route between two or more waypoints
 * Uses OSRM (Open Source Routing Machine) for actual road network routing
 */
export async function calculateRoute(
  waypoints: RouteWaypoint[]
): Promise<RouteResult> {
  if (waypoints.length < 2) {
    return {
      distance: 0,
      duration: 0,
      error: 'At least 2 waypoints required',
    };
  }

  try {
    // Build coordinates string: lng,lat;lng,lat;...
    const coordinates = waypoints
      .map((wp) => `${wp.longitude},${wp.latitude}`)
      .join(';');

    // Call OSRM API
    const response = await fetch(
      `${OSRM_BASE_URL}/route/v1/driving/${coordinates}?overview=simplified&geometries=polyline`
    );

    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(data.message || 'No route found');
    }

    const route = data.routes[0];

    return {
      distance: route.distance / 1000, // Convert meters to kilometers
      duration: route.duration / 60, // Convert seconds to minutes
      geometry: route.geometry,
      waypoints: data.waypoints?.map((wp: { name: string; location: [number, number] }) => ({
        name: wp.name,
        location: wp.location,
      })),
    };
  } catch (error) {
    console.error('Route calculation failed:', error);
    
    // Fallback to straight-line distance calculation
    const fallbackDistance = calculateStraightLineDistance(waypoints);
    
    return {
      distance: fallbackDistance,
      duration: fallbackDistance / 60 * 60, // Estimate: 60 km/h average
      error: error instanceof Error ? error.message : 'Route calculation failed',
    };
  }
}

/**
 * Calculate road distance between origin and destination depots
 */
export async function calculateRoadDistance(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult> {
  return calculateRoute([
    { latitude: originLat, longitude: originLng },
    { latitude: destLat, longitude: destLng },
  ]);
}

/**
 * Calculate route with intermediate waypoints (for multi-stop trips)
 */
export async function calculateMultiStopRoute(
  stops: RouteWaypoint[]
): Promise<RouteResult & { legs?: { distance: number; duration: number }[] }> {
  if (stops.length < 2) {
    return {
      distance: 0,
      duration: 0,
      error: 'At least 2 stops required',
    };
  }

  try {
    const coordinates = stops
      .map((stop) => `${stop.longitude},${stop.latitude}`)
      .join(';');

    const response = await fetch(
      `${OSRM_BASE_URL}/route/v1/driving/${coordinates}?overview=simplified&geometries=polyline&steps=false`
    );

    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(data.message || 'No route found');
    }

    const route = data.routes[0];

    return {
      distance: route.distance / 1000,
      duration: route.duration / 60,
      geometry: route.geometry,
      legs: route.legs?.map((leg: { distance: number; duration: number }) => ({
        distance: leg.distance / 1000,
        duration: leg.duration / 60,
      })),
      waypoints: data.waypoints?.map((wp: { name: string; location: [number, number] }) => ({
        name: wp.name,
        location: wp.location,
      })),
    };
  } catch (error) {
    console.error('Multi-stop route calculation failed:', error);
    
    const fallbackDistance = calculateStraightLineDistance(stops);
    
    return {
      distance: fallbackDistance,
      duration: fallbackDistance / 60 * 60,
      error: error instanceof Error ? error.message : 'Route calculation failed',
    };
  }
}

/**
 * Fallback: Calculate straight-line distance between waypoints (Haversine formula)
 */
function calculateStraightLineDistance(waypoints: RouteWaypoint[]): number {
  let totalDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const lat1 = waypoints[i].latitude;
    const lon1 = waypoints[i].longitude;
    const lat2 = waypoints[i + 1].latitude;
    const lon2 = waypoints[i + 1].longitude;

    const R = 6371; // Earth's radius in km
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    totalDistance += R * c;
  }

  // Apply road factor (roads are typically ~1.3x longer than straight line)
  return totalDistance * 1.3;
}

/**
 * Format distance for display
 */
export function formatRouteDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${Math.round(distanceKm)} km`;
}

/**
 * Format duration for display
 */
export function formatRouteDuration(durationMinutes: number): string {
  if (durationMinutes < 60) {
    return `${Math.round(durationMinutes)} min`;
  }
  const hours = Math.floor(durationMinutes / 60);
  const minutes = Math.round(durationMinutes % 60);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/**
 * Calculate ETA based on route duration
 */
export function calculateRouteETA(durationMinutes: number): {
  eta: Date;
  etaFormatted: string;
} {
  const eta = new Date();
  eta.setMinutes(eta.getMinutes() + Math.round(durationMinutes));

  return {
    eta,
    etaFormatted: eta.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

/**
 * Decode polyline geometry from OSRM response
 * Useful for displaying the route on a map
 */
export function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push([lat / 1e5, lng / 1e5]);
  }

  return coords;
}