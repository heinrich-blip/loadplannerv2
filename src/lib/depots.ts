/**
 * Fixed Depot/Waypoint Coordinates
 * These are the loading and offloading locations used for route tracking.
 * Also imports waypoints from the geofences JSON file as fallback locations.
 */

import { waypoints as waypointsData } from './waypoints';

export interface Depot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: "depot" | "warehouse" | "market" | "border" | "farm" | "customer";
  country: "Zimbabwe" | "South Africa" | "Mozambique" | "Zambia" | "Botswana";
  radius: number; // Geofence radius in meters
}

/**
 * Convert a custom location (from DB) to a Depot shape for use in distance calculations.
 * Accepts any object with the required fields (e.g. from useCustomLocations).
 */
export function customLocationToDepot(loc: {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  country: string;
  radius: number;
}): Depot {
  return {
    id: loc.id,
    name: loc.name,
    latitude: loc.latitude,
    longitude: loc.longitude,
    type: loc.type as Depot['type'],
    country: loc.country as Depot['country'],
    radius: loc.radius,
  };
}

// Fixed depot coordinates - these are the known loading/offloading points
export const DEPOTS: Depot[] = [
  {
    id: "bulawayo-depot",
    name: "Bulawayo Depot",
    latitude: -20.14704034,
    longitude: 28.56972715,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "bv",
    name: "BV",
    latitude: -19.18134742,
    longitude: 32.6994949,
    type: "farm",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "cbc",
    name: "CBC",
    latitude: -20.08999732,
    longitude: 32.62297647,
    type: "farm",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "rezende-depot",
    name: "Rezende Depot",
    latitude: -17.83969405,
    longitude: 31.04586039,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "mutare-depot",
    name: "Mutare Depot",
    latitude: -19.00251415,
    longitude: 32.6388758,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "freshmark-polokwane",
    name: "Freshmark Polokwane",
    latitude: -23.8594826,
    longitude: 29.4747646,
    type: "warehouse",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "freshmark-centurion",
    name: "Freshmark Centurion",
    latitude: -25.9133944,
    longitude: 28.1664809,
    type: "warehouse",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "dapper-market",
    name: "Dapper Market",
    latitude: -26.2320022,
    longitude: 28.0824127,
    type: "market",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "farmers-trust",
    name: "Farmers Trust",
    latitude: -25.7402845,
    longitude: 28.1702523,
    type: "warehouse",
    country: "South Africa",
    radius: 500,
  },
  // === NEW DEPOTS ADDED BELOW ===
  {
    id: "willowton-group-cape",
    name: "Willowtongroup Cape",
    latitude: -33.9260815,
    longitude: 18.4903535,
    type: "warehouse",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "lemba-truck-stop",
    name: "LEMBA TRUCK STOP",
    latitude: -23.4735288,
    longitude: 29.3959199,
    type: "depot",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "two-a-day-storage",
    name: "TWO A DAY STORAGE",
    latitude: -34.1406336,
    longitude: 19.0462276,
    type: "warehouse",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "gateway-truckstop",
    name: "GATEWAY TRUCKSTOP",
    latitude: -22.2309749,
    longitude: 29.9844075,
    type: "depot",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "dacher-transhipment",
    name: "Dacher Transhipment",
    latitude: -25.9363439,
    longitude: 28.0813105,
    type: "depot",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "harare-truck-stop",
    name: "HARARE TRUCK STOP",
    latitude: -17.8826867,
    longitude: 30.9721813,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "doma-summerhill-farm",
    name: "Doma-Summerhill Farm",
    latitude: -17.0642259,
    longitude: 30.1447063,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "natural-air",
    name: "NATURAL AIR",
    latitude: -17.846245,
    longitude: 31.1329378,
    type: "warehouse",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "b-braun-sa",
    name: "B Braun Sa",
    latitude: -25.9363439,
    longitude: 28.0813105,
    type: "warehouse",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "hidden-valley",
    name: "HIDDEN VALLEY",
    latitude: -17.8182737,
    longitude: 31.3723592,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "b-braun-harare",
    name: "B Braun Harare",
    latitude: -17.7438768,
    longitude: 31.0972998,
    type: "warehouse",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "m-r-marketing",
    name: "M & R Marketing (Pty) LTD",
    latitude: -33.928,
    longitude: 18.543,
    type: "warehouse",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "beitbridge-toll-plaza",
    name: "BeitBridge Toll Plaza",
    latitude: -22.1986233,
    longitude: 29.9917535,
    type: "border",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "sa-side-bb-border",
    name: "SA SIDE BB BORDER",
    latitude: -22.217,
    longitude: 29.989,
    type: "border",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "hexkoelkamers",
    name: "Hexkoelkamers",
    latitude: -33.8762589,
    longitude: 18.6470219,
    type: "warehouse",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "medlog-msc-cold-storage",
    name: "Medlog MSC Cold Storage",
    latitude: -29.8538001,
    longitude: 30.939701,
    type: "warehouse",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "powerspeed",
    name: "POWERSPEED",
    latitude: -17.8531185,
    longitude: 31.0508137,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "brands-africa",
    name: "BRANDS AFRICA",
    latitude: -17.8718173,
    longitude: 31.0635854,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "victoria-falls",
    name: "Victoria Falls",
    latitude: -17.9244,
    longitude: 25.8567,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "pre-cool-storage-dbn",
    name: "Pre Cool Storage DBN",
    latitude: -29.733,
    longitude: 30.593,
    type: "warehouse",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "dream-pack",
    name: "Dream pack",
    latitude: -33.187,
    longitude: 19.010,
    type: "warehouse",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "lusaka-cold-store",
    name: "Lusaka Commercial Cold Store",
    latitude: -15.4450468,
    longitude: 28.2722261,
    type: "warehouse",
    country: "Zambia",
    radius: 500,
  },
  {
    id: "african-truck-stop",
    name: "AFRICAN TRUCK STOP",
    latitude: -25.9363439,
    longitude: 28.0813105,
    type: "depot",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "etg",
    name: "ETG",
    latitude: -17.8745219,
    longitude: 30.9893558,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "fx-logistics",
    name: "FX LOGISTICS",
    latitude: -17.8591528,
    longitude: 31.0671906,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "freshmark-louwlardia",
    name: "FRESHMARK",
    latitude: -25.9363439,
    longitude: 28.0813105,
    type: "warehouse",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "feedmix",
    name: "FEEDMIX",
    latitude: -17.8647919,
    longitude: 31.191119,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "etg-depot-chipinge",
    name: "ETG DEPOT CHIPINGE",
    latitude: -20.6177688,
    longitude: 32.3786847,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "sequence-logistics",
    name: "Sequence Logistics",
    latitude: -26.2554894,
    longitude: 27.9703522,
    type: "depot",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "national-foods-aspindale",
    name: "NATIONAL FOODS ASPINDALE",
    latitude: -17.855917,
    longitude: 30.9963873,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "national-foods-stirling-road",
    name: "NATIONAL FOODS STIRLING ROAD",
    latitude: -17.8466883,
    longitude: 31.0279397,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "tm-warehouse-harare",
    name: "TM Warehouse Harare",
    latitude: -17.8477895,
    longitude: 31.133408,
    type: "warehouse",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "farm-wise",
    name: "FARM WISE",
    latitude: -33.8070277,
    longitude: 18.873668,
    type: "depot",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "national-foods-byo",
    name: "NATIONAL FOODS BYO",
    latitude: -20.1597571,
    longitude: 28.562255,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "crystal-candy",
    name: "CRYSTAL CANDY",
    latitude: -17.8481503,
    longitude: 31.0227447,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "haulier-logistics",
    name: "Haulier Logistics",
    latitude: -25.9363439,
    longitude: 28.0813105,
    type: "depot",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "two-oceans-cold-store",
    name: "Two Oceans Commercial Cold Store",
    latitude: -33.90,
    longitude: 18.63,
    type: "warehouse",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "silver-solutions",
    name: "Silver Solutions",
    latitude: -33.928,
    longitude: 18.653,
    type: "warehouse",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "sholiver-farm",
    name: "Sholiver Farm",
    latitude: -17.3431736,
    longitude: 30.4209716,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "minx-shipping",
    name: "Minx Shipping",
    latitude: -25.9363439,
    longitude: 28.0813105,
    type: "depot",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "morgan-cargo",
    name: "MORGAN CARGO",
    latitude: -25.9363439,
    longitude: 28.0813105,
    type: "depot",
    country: "South Africa",
    radius: 500,
  },
];

// ============================================================================
// UTILITY FUNCTIONS FOR DEPOT OPERATIONS
// ============================================================================

/**
 * Calculate distance between two coordinates in kilometers (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in kilometers
}

// ---------------------------------------------------------------------------
// Waypoint → Depot conversion (fallback locations from geofences JSON)
// ---------------------------------------------------------------------------

const DEFAULT_WAYPOINT_RADIUS = 500; // metres

/**
 * Convert the raw waypoints JSON into Depot objects so they can be used
 * as geofence locations alongside the hardcoded DEPOTS and DB custom locations.
 */
export const WAYPOINT_DEPOTS: Depot[] = (waypointsData as { name: string; address?: string; latitude: number; longitude: number }[]).map((wp) => {
  // Infer country from address string
  let country: Depot['country'] = 'Zimbabwe';
  const addr = (wp.address || '').toLowerCase();
  if (addr.includes('south africa')) country = 'South Africa';
  else if (addr.includes('zambia')) country = 'Zambia';
  else if (addr.includes('mozambique')) country = 'Mozambique';
  else if (addr.includes('botswana')) country = 'Botswana';

  return {
    id: `wp-${wp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`,
    name: wp.name,
    latitude: wp.latitude,
    longitude: wp.longitude,
    type: 'customer' as const,
    country,
    radius: DEFAULT_WAYPOINT_RADIUS,
  };
});

/**
 * Combined list of all known locations: hardcoded depots + waypoints.
 * Depots take priority (listed first) so exact matches against DEPOTS win.
 */
export const ALL_LOCATIONS: Depot[] = [...DEPOTS, ...WAYPOINT_DEPOTS];

/**
 * Find a depot by its name (case-insensitive, partial matching).
 * Searches in order: DEPOTS → extraLocations (custom DB) → WAYPOINT_DEPOTS.
 */
export function findDepotByName(name: string, extraLocations?: Depot[]): Depot | undefined {
  if (!name) return undefined;
  
  // Build combined search list: depots first, then custom, then waypoints
  const allLocations = extraLocations
    ? [...DEPOTS, ...extraLocations, ...WAYPOINT_DEPOTS]
    : [...DEPOTS, ...WAYPOINT_DEPOTS];
  const normalizedName = name.toLowerCase().trim();
  
  // Try exact match first
  let depot = allLocations.find(d => d.name.toLowerCase() === normalizedName);
  if (depot) return depot;
  
  // Try includes match
  depot = allLocations.find(d => 
    d.name.toLowerCase().includes(normalizedName) ||
    normalizedName.includes(d.name.toLowerCase())
  );
  if (depot) return depot;
  
  // Try matching by id
  depot = allLocations.find(d => d.id.toLowerCase() === normalizedName);
  if (depot) return depot;
  
  // Handle common variations
  if (normalizedName.includes("freshmark") && !depot) {
    return allLocations.find(d => d.name.toLowerCase().includes("freshmark"));
  }
  
  if (normalizedName.includes("beitbridge") || normalizedName.includes("beit bridge")) {
    return allLocations.find(d => d.id === "beitbridge-toll-plaza");
  }
  
  return undefined;
}

/**
 * Check if a point (lat/lng) is within a depot's geofence
 */
export function isWithinDepot(
  lat: number,
  lng: number,
  depot: Depot
): boolean {
  if (!depot || !depot.latitude || !depot.longitude) return false;
  
  // Calculate distance in kilometers, convert to meters
  const distanceKm = calculateDistance(
    lat, lng,
    depot.latitude, depot.longitude
  );
  const distanceMeters = distanceKm * 1000;
  
  return distanceMeters <= depot.radius;
}

/**
 * Calculate trip progress between two depots
 */
export function calculateDepotTripProgress(
  origin: Depot,
  destination: Depot,
  currentLat: number,
  currentLng: number
): {
  progress: number;
  totalDistance: number;
  distanceTraveled: number;
  distanceRemaining: number;
  isAtOrigin: boolean;
  isAtDestination: boolean;
  nearestDepot: Depot | null;
} {
  // Calculate total route distance from origin to destination
  const totalDistance = calculateDistance(
    origin.latitude, origin.longitude,
    destination.latitude, destination.longitude
  );
  
  // Calculate distance traveled from origin to current position
  const distanceTraveled = calculateDistance(
    origin.latitude, origin.longitude,
    currentLat, currentLng
  );
  
  // Calculate remaining distance from current position to destination
  const distanceRemaining = calculateDistance(
    currentLat, currentLng,
    destination.latitude, destination.longitude
  );
  
  // Calculate progress percentage (cap at 100%)
  let progress = (distanceTraveled / totalDistance) * 100;
  progress = Math.min(Math.max(progress, 0), 100);
  
  // Check if at origin or destination (within geofence)
  const isAtOrigin = isWithinDepot(currentLat, currentLng, origin);
  const isAtDestination = isWithinDepot(currentLat, currentLng, destination);
  
  // Find the nearest depot for location display
  const nearestDepot = findNearestDepot(currentLat, currentLng);
  
  return {
    progress,
    totalDistance,
    distanceTraveled,
    distanceRemaining,
    isAtOrigin,
    isAtDestination,
    nearestDepot,
  };
}

/**
 * Calculate ETA based on remaining distance and average speed
 */
export function calculateDepotETA(
  distanceKm: number,
  speedKmH = 60 // Default average speed 60 km/h
): {
  etaFormatted: string;
  durationFormatted: string;
  hours: number;
  minutes: number;
} {
  // Handle invalid inputs
  if (distanceKm <= 0 || speedKmH <= 0) {
    return {
      etaFormatted: "--:--",
      durationFormatted: "0h 0m",
      hours: 0,
      minutes: 0,
    };
  }
  
  // Calculate travel time
  const hours = distanceKm / speedKmH;
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  
  // Format ETA (current time + travel time)
  const eta = new Date();
  eta.setMinutes(eta.getMinutes() + totalMinutes);
  
  const etaFormatted = eta.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  // Format duration
  let durationFormatted = '';
  if (h > 0) {
    durationFormatted = `${h}h `;
  }
  durationFormatted += `${m}m`;
  
  return {
    etaFormatted,
    durationFormatted,
    hours: h,
    minutes: m,
  };
}

/**
 * Find the nearest depot to a given coordinate
 */
export function findNearestDepot(
  lat: number,
  lng: number
): Depot | null {
  if (DEPOTS.length === 0) return null;
  
  let nearestDepot = DEPOTS[0];
  let minDistance = calculateDistance(
    lat, lng,
    nearestDepot.latitude, nearestDepot.longitude
  );
  
  for (let i = 1; i < DEPOTS.length; i++) {
    const distance = calculateDistance(
      lat, lng,
      DEPOTS[i].latitude, DEPOTS[i].longitude
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestDepot = DEPOTS[i];
    }
  }
  
  return nearestDepot;
}

/**
 * Get depot by ID
 */
export function getDepotById(id: string): Depot | undefined {
  return DEPOTS.find(depot => depot.id === id);
}

/**
 * Get all depots in a specific country
 */
export function getDepotsByCountry(country: Depot['country']): Depot[] {
  return DEPOTS.filter(depot => depot.country === country);
}

/**
 * Get all depots of a specific type
 */
export function getDepotsByType(type: Depot['type']): Depot[] {
  return DEPOTS.filter(depot => depot.type === type);
}

/**
 * Search depots by name or location
 */
export function searchDepots(query: string): Depot[] {
  if (!query) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return DEPOTS.filter(depot =>
    depot.name.toLowerCase().includes(normalizedQuery) ||
    depot.id.toLowerCase().includes(normalizedQuery) ||
    depot.country.toLowerCase().includes(normalizedQuery) ||
    depot.type.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Calculate estimated travel time between two depots
 */
export function calculateTravelTime(
  origin: Depot,
  destination: Depot,
  averageSpeedKmH = 60
): {
  hours: number;
  minutes: number;
  formatted: string;
} {
  const distance = calculateDistance(
    origin.latitude, origin.longitude,
    destination.latitude, destination.longitude
  );
  
  const hours = distance / averageSpeedKmH;
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  
  let formatted = '';
  if (h > 0) {
    formatted = `${h} hour${h !== 1 ? 's' : ''}`;
  }
  if (m > 0) {
    if (formatted) formatted += ' ';
    formatted += `${m} minute${m !== 1 ? 's' : ''}`;
  }
  
  return {
    hours: h,
    minutes: m,
    formatted: formatted || '0 minutes',
  };
}

/**
 * Validate if a location string matches any known depot
 */
export function isValidDepot(location: string, extraLocations?: Depot[]): boolean {
  return !!findDepotByName(location, extraLocations);
}

/**
 * Get all depot names for autocomplete/dropdown
 */
export function getAllDepotNames(extraLocations?: Depot[]): string[] {
  const all = extraLocations ? [...DEPOTS, ...extraLocations] : DEPOTS;
  return all.map(depot => depot.name).sort();
}

/**
 * Get depots grouped by country
 */
export function getDepotsGroupedByCountry(): Record<string, Depot[]> {
  return DEPOTS.reduce((acc, depot) => {
    if (!acc[depot.country]) {
      acc[depot.country] = [];
    }
    acc[depot.country].push(depot);
    return acc;
  }, {} as Record<string, Depot[]>);
}

/**
 * Calculate bearing (direction) between two points
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const λ1 = lon1 * Math.PI / 180;
  const λ2 = lon2 * Math.PI / 180;

  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
          Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  
  let θ = Math.atan2(y, x);
  θ = θ * 180 / Math.PI;
  return (θ + 360) % 360;
}

/**
 * Get cardinal direction from bearing
 */
export function getCardinalDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}