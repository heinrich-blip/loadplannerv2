import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Client {
  id: string;
  name: string;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientInsert {
  name: string;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  notes?: string | null;
  active?: boolean;
}

export interface ClientUpdate extends Partial<ClientInsert> {
  id: string;
}

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: ClientInsert) => {
      const { data, error } = await supabase
        .from('clients')
        .insert(client)
        .select()
        .single();
      
      if (error) throw error;
      return data as Client;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Client Created',
        description: `${data.name} has been added successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create client: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...update }: ClientUpdate) => {
      const { data, error } = await supabase
        .from('clients')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Client;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Client Updated',
        description: `${data.name} has been updated successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update client: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting active to false
      const { error } = await supabase
        .from('clients')
        .update({ active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Client Deleted',
        description: 'Client has been removed successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete client: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}