import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface ClientFeedback {
  id: string;
  load_id: string;
  client_id: string;
  rating: 'happy' | 'unhappy';
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientFeedbackWithDetails extends ClientFeedback {
  loads?: {
    load_id: string;
    origin: string;
    destination: string;
    offloading_date: string;
    status: string;
  } | null;
  clients?: {
    name: string;
    contact_person: string | null;
    contact_email: string | null;
  } | null;
}

export interface SubmitFeedbackInput {
  load_id: string;
  client_id: string;
  rating: 'happy' | 'unhappy';
  comment?: string | null;
}

/**
 * Fetch all feedback for a specific client (used in client portal)
 */
export function useClientFeedback(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-feedback', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('client_feedback')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ClientFeedback[];
    },
    enabled: !!clientId,
  });
}

/**
 * Fetch all feedback across all clients with load and client details (used in admin reports)
 */
export function useAllFeedback() {
  return useQuery({
    queryKey: ['all-client-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_feedback')
        .select(`
          *,
          loads (load_id, origin, destination, offloading_date, status),
          clients (name, contact_person, contact_email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ClientFeedbackWithDetails[];
    },
  });
}

/**
 * Submit or update feedback for a load (upsert on load_id + client_id)
 */
export function useSubmitFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitFeedbackInput) => {
      // Use upsert with the unique constraint on (load_id, client_id)
      const { data, error } = await supabase
        .from('client_feedback')
        .upsert(
          {
            load_id: input.load_id,
            client_id: input.client_id,
            rating: input.rating,
            comment: input.comment || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'load_id,client_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as ClientFeedback;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-feedback', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['all-client-feedback'] });
      toast({
        title: 'Feedback Submitted',
        description: data.rating === 'happy'
          ? 'Thank you for your positive feedback!'
          : 'Thank you for your feedback. We will work to improve.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to submit feedback: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}
