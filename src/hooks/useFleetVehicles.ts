import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface FleetVehicle {
  id: string;
  vehicle_id: string;
  type: string;
  capacity: number;
  available: boolean;
  // Vehicle details
  vin_number?: string | null;
  engine_number?: string | null;
  make_model?: string | null;
  engine_size?: string | null;
  // Telematics integration
  telematics_asset_id?: string | null;
  // Expiry dates
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
  created_at: string;
  updated_at: string;
}

export type FleetVehicleInsert = Omit<FleetVehicle, 'id' | 'created_at' | 'updated_at'>;

export function useFleetVehicles() {
  return useQuery({
    queryKey: ['fleet_vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fleet_vehicles')
        .select('*')
        .order('vehicle_id');
      
      if (error) throw error;
      return data as FleetVehicle[];
    },
  });
}

export function useCreateFleetVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (vehicle: FleetVehicleInsert) => {
      const { data, error } = await supabase
        .from('fleet_vehicles')
        .insert(vehicle)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet_vehicles'] });
      toast({ title: 'Vehicle added successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to add vehicle', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateFleetVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FleetVehicle> & { id: string }) => {
      const { data, error } = await supabase
        .from('fleet_vehicles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet_vehicles'] });
      toast({ title: 'Vehicle updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update vehicle', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFleetVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fleet_vehicles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet_vehicles'] });
      toast({ title: 'Vehicle deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete vehicle', description: error.message, variant: 'destructive' });
    },
  });
}