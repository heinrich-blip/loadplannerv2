export interface FleetVehicle {
  id: number;
  vehicle_id: string;
  type: string;
  capacity: number;
  available: boolean;
  created_at?: string;
  updated_at?: string;
  vin_number?: string | null;
  engine_number?: string | null;
  make_model?: string | null;
  engine_size?: string | null;
  telematics_asset_id?: string | null;
  license_expiry?: string | null;
  license_active?: boolean;
  cof_expiry?: string | null;
  cof_active?: boolean;
  radio_license_expiry?: string | null;
  radio_license_active?: boolean;
  insurance_expiry?: string | null;
  insurance_active?: boolean;
  svg_expiry?: string | null;
  svg_active?: boolean;
}