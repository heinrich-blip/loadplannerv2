import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Driver {
  id: string;
  name: string;
  contact: string;
  available: boolean;
  created_at: string;
  updated_at: string;
  photo_url: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  passport_doc_url: string | null;
  id_number: string | null;
  id_doc_url: string | null;
  drivers_license: string | null;
  drivers_license_expiry: string | null;
  drivers_license_doc_url: string | null;
  retest_certificate_expiry: string | null;
  retest_certificate_doc_url: string | null;
  medical_certificate_expiry: string | null;
  medical_certificate_doc_url: string | null;
  international_driving_permit_expiry: string | null;
  international_driving_permit_doc_url: string | null;
  defensive_driving_permit_expiry: string | null;
  defensive_driving_permit_doc_url: string | null;
}

export type DriverInsert = Omit<Driver, 'id' | 'created_at' | 'updated_at'>;

export function useDrivers() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Driver[];
    },
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (driver: DriverInsert) => {
      const { data, error } = await supabase
        .from('drivers')
        .insert(driver)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({ title: 'Driver added successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to add driver', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Driver> & { id: string }) => {
      const { data, error } = await supabase
        .from('drivers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({ title: 'Driver updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update driver', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({ title: 'Driver deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete driver', description: error.message, variant: 'destructive' });
    },
  });
}