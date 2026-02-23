import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface CustomLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: 'depot' | 'warehouse' | 'market' | 'border' | 'farm' | 'customer';
  country: 'Zimbabwe' | 'South Africa' | 'Mozambique' | 'Zambia' | 'Botswana';
  radius: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CustomLocationInsert {
  name: string;
  latitude: number;
  longitude: number;
  type?: CustomLocation['type'];
  country?: CustomLocation['country'];
  radius?: number;
  notes?: string;
}

// Fetch all custom locations
export function useCustomLocations() {
  return useQuery({
    queryKey: ['custom-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_locations')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as CustomLocation[];
    },
  });
}

// Create a new custom location
export function useCreateCustomLocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (location: CustomLocationInsert) => {
      const { data, error } = await supabase
        .from('custom_locations')
        .insert({
          name: location.name,
          latitude: location.latitude,
          longitude: location.longitude,
          type: location.type || 'depot',
          country: location.country || 'Zimbabwe',
          radius: location.radius || 500,
          notes: location.notes,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-locations'] });
      toast({ title: 'Location added successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to add location', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

// Update a custom location
export function useUpdateCustomLocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomLocation> & { id: string }) => {
      const { data, error } = await supabase
        .from('custom_locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-locations'] });
      toast({ title: 'Location updated successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to update location', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

// Delete a custom location (soft delete)
export function useDeleteCustomLocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_locations')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-locations'] });
      toast({ title: 'Location removed successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to remove location', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

// Hard delete a custom location
export function useHardDeleteCustomLocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_locations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-locations'] });
      toast({ title: 'Location permanently deleted' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to delete location', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}