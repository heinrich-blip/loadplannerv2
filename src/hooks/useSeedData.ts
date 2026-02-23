import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const seedDrivers = [
  { name: 'Peter Farai', contact: '+263-77-1234567', available: true },
  { name: 'Francis Liambo', contact: '+263-77-2345678', available: true },
  { name: 'Muchibo', contact: '+263-77-3456789', available: true },
  { name: 'Enock', contact: '+263-77-4567890', available: true },
  { name: 'Canaan', contact: '+263-77-5678901', available: false },
  { name: 'Decide', contact: '+263-77-6789012', available: true },
];

const seedFleetVehicles = [
  { vehicle_id: '28H', type: 'Heavy Truck', capacity: 25, available: true },
  { vehicle_id: '24H', type: 'Heavy Truck', capacity: 20, available: true },
  { vehicle_id: '22H', type: 'Medium Truck', capacity: 15, available: true },
  { vehicle_id: '31H', type: 'Heavy Truck', capacity: 25, available: true },
  { vehicle_id: '33H', type: 'Heavy Truck', capacity: 30, available: false },
  { vehicle_id: '6H', type: 'Light Truck', capacity: 8, available: true },
];

export function useSeedData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Check if data already exists
      const { data: existingDrivers } = await supabase.from('drivers').select('id').limit(1);
      const { data: existingVehicles } = await supabase.from('fleet_vehicles').select('id').limit(1);

      const results = { drivers: 0, vehicles: 0 };

      // Seed drivers if none exist
      if (!existingDrivers?.length) {
        const { data, error } = await supabase.from('drivers').insert(seedDrivers).select();
        if (error) throw error;
        results.drivers = data?.length || 0;
      }

      // Seed fleet vehicles if none exist
      if (!existingVehicles?.length) {
        const { data, error } = await supabase.from('fleet_vehicles').insert(seedFleetVehicles).select();
        if (error) throw error;
        results.vehicles = data?.length || 0;
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['fleet_vehicles'] });
      
      // Only show toast when data was actually added
      if (results.drivers > 0 || results.vehicles > 0) {
        toast({
          title: 'Sample data added',
          description: `Added ${results.drivers} drivers and ${results.vehicles} vehicles`,
        });
      }
      // Silently skip if data already exists - no need to notify user
    },
    onError: (error) => {
      toast({
        title: 'Failed to seed data',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}