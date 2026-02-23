/**
 * Waypoints/Geofences utility for location matching and ETA calculations
 */

export interface Waypoint {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

// Import waypoints data
import waypointsData from "../../Waypoints,Zones, Geofences.json";

export const waypoints: Waypoint[] = waypointsData;

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
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

/**
 * Find waypoint by name (fuzzy matching)
 */
export function findWaypointByName(name: string): Waypoint | null {
  if (!name) return null;

  const normalizedName = name.toLowerCase().trim();

  // First try exact match
  let waypoint = waypoints.find(
    (w) => w.name.toLowerCase() === normalizedName
  );

  if (waypoint) return waypoint;

  // Try partial match
  waypoint = waypoints.find(
    (w) =>
      w.name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(w.name.toLowerCase())
  );

  if (waypoint) return waypoint;

  // Try matching key words
  const words = normalizedName.split(/[\s,]+/).filter((w) => w.length > 2);
  for (const word of words) {
    waypoint = waypoints.find((w) => w.name.toLowerCase().includes(word));
    if (waypoint) return waypoint;
  }

  return null;
}

/**
 * Find nearest waypoint to coordinates
 */
export function findNearestWaypoint(
  lat: number,
  lon: number
): { waypoint: Waypoint; distance: number } | null {
  if (!lat || !lon) return null;

  let nearest: Waypoint | null = null;
  let minDistance = Infinity;

  for (const waypoint of waypoints) {
    const distance = calculateHaversineDistance(
      lat,
      lon,
      waypoint.latitude,
      waypoint.longitude
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = waypoint;
    }
  }

  return nearest ? { waypoint: nearest, distance: minDistance } : null;
}

/**
 * Calculate progress between origin and destination
 */
export function calculateTripProgress(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
  currentLat: number,
  currentLon: number
): {
  progress: number;
  totalDistance: number;
  distanceTraveled: number;
  distanceRemaining: number;
} {
  const totalDistance = calculateHaversineDistance(
    originLat,
    originLon,
    destLat,
    destLon
  );

  const distanceFromOrigin = calculateHaversineDistance(
    originLat,
    originLon,
    currentLat,
    currentLon
  );

  const distanceToDestination = calculateHaversineDistance(
    currentLat,
    currentLon,
    destLat,
    destLon
  );

  // Calculate progress as a percentage
  // Use the ratio of distance from origin to total distance
  // Clamp between 0 and 100
  let progress = (distanceFromOrigin / totalDistance) * 100;

  // If truck is past destination, set to 100
  if (distanceToDestination < 5) {
    progress = 100;
  }

  // Clamp value
  progress = Math.max(0, Math.min(100, progress));

  return {
    progress,
    totalDistance,
    distanceTraveled: distanceFromOrigin,
    distanceRemaining: distanceToDestination,
  };
}

/**
 * Calculate ETA based on distance and speed
 */
export function calculateETAFromDistance(
  distanceKm: number,
  speedKmH = 60
): {
  eta: Date;
  etaFormatted: string;
  durationMinutes: number;
  durationFormatted: string;
} {
  const speed = speedKmH > 0 ? speedKmH : 60;
  const timeHours = distanceKm / speed;
  const timeMinutes = Math.round(timeHours * 60);

  const eta = new Date();
  eta.setMinutes(eta.getMinutes() + timeMinutes);

  return {
    eta,
    etaFormatted: eta.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    durationMinutes: timeMinutes,
    durationFormatted:
      timeMinutes < 60
        ? `${timeMinutes} mins`
        : `${Math.floor(timeMinutes / 60)}h ${timeMinutes % 60}m`,
  };
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Get all waypoints as a lookup map
 */
export function getWaypointsMap(): Map<string, Waypoint> {
  const map = new Map<string, Waypoint>();
  for (const waypoint of waypoints) {
    map.set(waypoint.name.toLowerCase(), waypoint);
  }
  return map;
}