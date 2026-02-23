export type LoadStatus = 'scheduled' | 'in-transit' | 'pending' | 'delivered';
export type CargoType = 'VanSalesRetail' | 'Retail' | 'Vendor' | 'RetailVendor' | 'Fertilizer' | 'BV' | 'CBC' | 'Packaging';
export type Priority = 'high' | 'medium' | 'low';
export type TimeSource = 'auto' | 'manual';

export interface BackloadQuantities {
  bins: number;
  crates: number;
  pallets: number;
}

export interface BackloadInfo {
  enabled: boolean;
  destination: string;
  cargoType: 'Packaging' | 'Fertilizer' | 'BV' | 'CBC' | string;
  offloadingDate: string;
  quantities?: BackloadQuantities;
  notes?: string;
  // Third-party backload fields
  isThirdParty?: boolean;
  thirdParty?: {
    customerId?: string;
    cargoDescription?: string;
    linkedLoadNumber?: string;
    referenceNumber?: string;
  };
  origin?: {
    placeName?: string;
    address?: string;
    plannedArrival?: string;
    plannedDeparture?: string;
  };
  loadingDate?: string;
}

export interface TimeWindowSection {
  plannedArrival?: string;
  plannedDeparture?: string;
  actualArrival?: string;
  actualDeparture?: string;
  // Third-party loads store location info here
  placeName?: string;
  address?: string;
}

export interface TimeWindowData {
  origin: TimeWindowSection;
  destination: TimeWindowSection;
  backload?: BackloadInfo | null;
}

export interface Load {
  id: string;
  load_id: string;  // Keep as load_id to match database
  priority: Priority;
  loading_date: string;  // ISO date string
  offloading_date: string;  // ISO date string
  time_window: string;  // JSON string of TimeWindowData
  origin: string;
  destination: string;
  cargo_type: CargoType;
  quantity: number;
  weight: number;
  special_handling: string[];
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
  actual_loading_arrival_source?: TimeSource;
  actual_loading_departure?: string | null;
  actual_loading_departure_verified?: boolean;
  actual_loading_departure_source?: TimeSource;
  actual_offloading_arrival?: string | null;
  actual_offloading_arrival_verified?: boolean;
  actual_offloading_arrival_source?: TimeSource;
  actual_offloading_departure?: string | null;
  actual_offloading_departure_verified?: boolean;
  actual_offloading_departure_source?: TimeSource;
  
  // Joined data
  driver?: { id: string; name: string; contact: string } | null;
  fleet_vehicle?: { id: string; vehicle_id: string; type: string; telematics_asset_id?: string | null } | null;
}

// Helper type for creating new loads
export interface LoadInsert {
  load_id: string;
  priority: Priority;
  loading_date: string;
  offloading_date: string;
  time_window: string;
  origin: string;
  destination: string;
  cargo_type: CargoType;
  quantity?: number;
  weight?: number;
  special_handling?: string[];
  fleet_vehicle_id?: string | null;
  driver_id?: string | null;
  co_driver_id?: string | null;
  notes?: string;
  status?: LoadStatus;
}

export interface Driver {
  id: string;
  name: string;
  contact: string;
  available: boolean;
}

export interface Fleet {
  id: string;
  vehicle_id: string;
  type: string;
  capacity: number;
  available: boolean;
  telematics_asset_id?: string | null;
}

export interface KPIData {
  totalLoads: number;
  scheduled: number;
  inTransit: number;
  delivered: number;
  pending: number;
}

// Geofence event types
export type GeofenceEventType = 
  | 'loading_arrival'
  | 'loading_departure'
  | 'offloading_arrival'
  | 'offloading_departure';