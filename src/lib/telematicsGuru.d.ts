/**
 * Type declarations for telematicsGuru.js
 */

export type TelematicsAsset = {
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
};

/**
 * Authenticate with Telematics Guru API via proxy
 */
export function authenticate(username: string, password: string): Promise<boolean>;

/**
 * Get stored auth token
 */
export function getAuthToken(): string | null;

/**
 * Check if authenticated
 */
export function isAuthenticated(): boolean;

/**
 * Clear authentication
 */
export function clearAuth(): void;

/**
 * Organisation from Telematics Guru
 */
export type TelematicsOrganisation = {
  id: number;
  name: string;
  parentId?: number;
  isEnabled?: boolean;
};

/**
 * Get user's organisations
 */
export function getOrganisations(): Promise<TelematicsOrganisation[]>;

/**
 * Get all assets for an organisation via proxy
 */
export function getAssets(organisationId: number): Promise<TelematicsAsset[]>;

/**
 * Get detailed asset information via proxy
 */
export function getAssetDetails(assetId: number): Promise<TelematicsAsset>;

/**
 * Get all assets with their current positions
 */
export function getAssetsWithPositions(organisationId: number): Promise<TelematicsAsset[]>;

/**
 * Format last connected time to relative string
 */
export function formatLastConnected(utcString: string | null | undefined): string;

/**
 * Parse last connected time to Date object, handling timezone issues
 */
export function parseLastConnected(utcString: string | null | undefined): Date | null;

/**
 * Get status color based on asset state
 */
export function getStatusColor(asset: TelematicsAsset): string;

/**
 * Get heading direction as compass point
 */
export function getHeadingDirection(heading: number): string;

/**
 * Geofence from Telematics Guru
 */
export type TelematicsGeofence = {
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
  radius?: number; // For circular geofences
  points?: Array<{ latitude: number; longitude: number }>; // For polygon geofences
  isEnabled?: boolean;
  organisationId?: number;
};

/**
 * ETA calculation result
 */
export type ETAResult = {
  eta: Date | null;
  etaFormatted: string;
  distance: number | null;
  distanceFormatted: string;
  durationMinutes: number;
  durationFormatted: string;
  speed: number;
  isMoving: boolean;
  error?: string;
};

/**
 * Get all geofences for an organisation
 */
export function getGeofences(organisationId: number): Promise<TelematicsGeofence[]>;

/**
 * Get detailed geofence information including coordinates
 */
export function getGeofenceDetails(geofenceId: number): Promise<TelematicsGeofence>;

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;

/**
 * Calculate ETA based on current position, speed, and destination geofence
 */
export function calculateETA(asset: TelematicsAsset, geofence: TelematicsGeofence, averageSpeed?: number): ETAResult;

/**
 * Find the nearest geofence to a vehicle
 */
export function findNearestGeofence(asset: TelematicsAsset, geofences: TelematicsGeofence[]): (TelematicsGeofence & { distance: number }) | null;
