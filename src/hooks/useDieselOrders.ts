import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Load } from "./useLoads";

export type DieselOrderStatus =
  | "pending"
  | "approved"
  | "fulfilled"
  | "cancelled";

export interface DieselOrderDriver {
  id: string;
  name: string;
  contact: string;
}

export interface DieselOrderFleetVehicle {
  id: string;
  vehicle_id: string;
  type: string;
}

export interface DieselOrder {
  id: string;
  order_number: string;
  load_id: string;
  fuel_station: string;
  quantity_liters: number;
  cost_per_liter: number | null;
  total_cost: number | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  driver_id: string | null;
  fleet_vehicle_id: string | null;
  notes: string | null;
  status: DieselOrderStatus;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  load?: Load | null;
  driver?: DieselOrderDriver | null;
  fleet_vehicle?: DieselOrderFleetVehicle | null;
}

export interface DieselOrderInsert {
  order_number: string;
  load_id: string;
  fuel_station: string;
  quantity_liters: number;
  cost_per_liter?: number | null;
  total_cost?: number | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  driver_id?: string | null;
  fleet_vehicle_id?: string | null;
  notes?: string | null;
  status?: DieselOrderStatus;
}

// Generate unique diesel order number
export function generateDieselOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `DO-${year}${month}${day}-${random}`;
}

// Common fuel stations
export const fuelStations = [
  "Engen - Harare",
  "Engen - Bulawayo",
  "Engen - Mutare",
  "Total - Harare",
  "Total - Bulawayo",
  "Total - Mutare",
  "Zuva - Harare",
  "Zuva - Bulawayo",
  "Zuva - Mutare",
  "Puma - Harare",
  "Puma - Bulawayo",
  "Shell - Harare",
  "Red Range - Bulawayo",
  "Shell - Mutare",
  "Other",
];

export function useDieselOrders() {
  return useQuery({
    queryKey: ["diesel_orders"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("diesel_orders")
        .select(
          `
          *,
          load:loads(
            id,
            load_id,
            origin,
            destination,
            loading_date,
            offloading_date,
            status,
            driver:drivers!loads_driver_id_fkey(id, name, contact),
            fleet_vehicle:fleet_vehicles(id, vehicle_id, type)
          ),
          driver:drivers(id, name, contact),
          fleet_vehicle:fleet_vehicles(id, vehicle_id, type)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DieselOrder[];
    },
  });
}

export function useDieselOrdersByLoad(loadId: string | undefined) {
  return useQuery({
    queryKey: ["diesel_orders", "load", loadId],
    queryFn: async () => {
      if (!loadId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("diesel_orders")
        .select("*")
        .eq("load_id", loadId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DieselOrder[];
    },
    enabled: !!loadId,
  });
}

export function useCreateDieselOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: DieselOrderInsert) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("diesel_orders")
        .insert(order)
        .select()
        .single();

      if (error) throw error;
      return data as DieselOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diesel_orders"] });
      toast({ title: "Diesel order created successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create diesel order",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateDieselOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<DieselOrder> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("diesel_orders")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as DieselOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diesel_orders"] });
      toast({ title: "Diesel order updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update diesel order",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteDieselOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("diesel_orders")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diesel_orders"] });
      toast({ title: "Diesel order deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete diesel order",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useApproveDieselOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("diesel_orders")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as DieselOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diesel_orders"] });
      toast({ title: "Diesel order approved" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve diesel order",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useFulfillDieselOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("diesel_orders")
        .update({
          status: "fulfilled",
          fulfilled_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as DieselOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diesel_orders"] });
      toast({ title: "Diesel order marked as fulfilled" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to fulfill diesel order",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}