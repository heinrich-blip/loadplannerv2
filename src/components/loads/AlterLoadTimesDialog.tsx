import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateLoadTimes, type Load } from "@/hooks/useLoads";
import type { Json } from "@/integrations/supabase/types";

const schema = z.object({
  actual_loading_arrival: z.string().optional(),
  actual_loading_arrival_verified: z.boolean().optional(),
  actual_loading_departure: z.string().optional(),
  actual_loading_departure_verified: z.boolean().optional(),
  actual_offloading_arrival: z.string().optional(),
  actual_offloading_arrival_verified: z.boolean().optional(),
  actual_offloading_departure: z.string().optional(),
  actual_offloading_departure_verified: z.boolean().optional(),
}).refine((data) => {
  if (data.actual_loading_arrival && data.actual_loading_departure) {
    return new Date(data.actual_loading_departure) >= new Date(data.actual_loading_arrival);
  }
  return true;
}, {
  message: "Loading departure must be after loading arrival",
  path: ["actual_loading_departure"],
}).refine((data) => {
  if (data.actual_offloading_arrival && data.actual_offloading_departure) {
    return new Date(data.actual_offloading_departure) >= new Date(data.actual_offloading_arrival);
  }
  return true;
}, {
  message: "Offloading departure must be after offloading arrival",
  path: ["actual_offloading_departure"],
});

type FormData = z.infer<typeof schema>;

interface TimeWindowLocation {
  actualArrival?: string;
  actualDeparture?: string;
}

interface TimeWindow {
  origin?: TimeWindowLocation;
  destination?: TimeWindowLocation;
}

export function AlterLoadTimesDialog({ open, onOpenChange, load }: { open: boolean; onOpenChange: (open: boolean) => void; load: Load | null }) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      actual_loading_arrival: "",
      actual_loading_arrival_verified: false,
      actual_loading_departure: "",
      actual_loading_departure_verified: false,
      actual_offloading_arrival: "",
      actual_offloading_arrival_verified: false,
      actual_offloading_departure: "",
      actual_offloading_departure_verified: false,
    },
  });

  // Sync form values when the load changes or dialog opens
  useEffect(() => {
    if (load && open) {
      form.reset({
        actual_loading_arrival: load.actual_loading_arrival || "",
        actual_loading_arrival_verified: !!load.actual_loading_arrival_verified,
        actual_loading_departure: load.actual_loading_departure || "",
        actual_loading_departure_verified: !!load.actual_loading_departure_verified,
        actual_offloading_arrival: load.actual_offloading_arrival || "",
        actual_offloading_arrival_verified: !!load.actual_offloading_arrival_verified,
        actual_offloading_departure: load.actual_offloading_departure || "",
        actual_offloading_departure_verified: !!load.actual_offloading_departure_verified,
      });
    }
  }, [load, open, form]);

  const updateTimes = useUpdateLoadTimes();

  const onSubmit = (values: FormData) => {
    if (!load?.id) return;
    
    let timeWindowData: TimeWindow;
    try {
      const raw = load?.time_window;
      timeWindowData = (typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {})) as TimeWindow;
    } catch {
      timeWindowData = {};
    }
    
    const time_window: TimeWindow = {
      ...timeWindowData,
      origin: { ...timeWindowData.origin },
      destination: { ...timeWindowData.destination }
    };

    if (values.actual_loading_arrival) {
      if (!time_window.origin) time_window.origin = {};
      time_window.origin.actualArrival = values.actual_loading_arrival;
    }
    if (values.actual_loading_departure) {
      if (!time_window.origin) time_window.origin = {};
      time_window.origin.actualDeparture = values.actual_loading_departure;
    }
    if (values.actual_offloading_arrival) {
      if (!time_window.destination) time_window.destination = {};
      time_window.destination.actualArrival = values.actual_offloading_arrival;
    }
    if (values.actual_offloading_departure) {
      if (!time_window.destination) time_window.destination = {};
      time_window.destination.actualDeparture = values.actual_offloading_departure;
    }

    updateTimes.mutate({
      id: load.id,
      times: {
        ...values,
        actual_loading_arrival_source: values.actual_loading_arrival ? "manual" : undefined,
        actual_loading_departure_source: values.actual_loading_departure ? "manual" : undefined,
        actual_offloading_arrival_source: values.actual_offloading_arrival ? "manual" : undefined,
        actual_offloading_departure_source: values.actual_offloading_departure ? "manual" : undefined,
        time_window: time_window as Json,
      },
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alter/Verify Actual Times</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Loading Arrival */}
          <div>
            <label className="flex items-center gap-2">
              Loading Arrival
              {load?.actual_loading_arrival_source === 'auto' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">Auto</span>
              )}
            </label>
            <Input type="datetime-local" {...form.register("actual_loading_arrival")} />
            <div className="flex items-center gap-2 mt-1">
              <Controller
                control={form.control}
                name="actual_loading_arrival_verified"
                render={({ field }) => (
                  <Checkbox 
                    id="actual_loading_arrival_verified"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <label htmlFor="actual_loading_arrival_verified" className="text-sm cursor-pointer">Verified</label>
            </div>
          </div>
          
          {/* Loading Departure */}
          <div>
            <label className="flex items-center gap-2">
              Loading Departure
              {load?.actual_loading_departure_source === 'auto' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">Auto</span>
              )}
            </label>
            <Input type="datetime-local" {...form.register("actual_loading_departure")} />
            {form.formState.errors.actual_loading_departure && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.actual_loading_departure.message}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Controller
                control={form.control}
                name="actual_loading_departure_verified"
                render={({ field }) => (
                  <Checkbox 
                    id="actual_loading_departure_verified"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <label htmlFor="actual_loading_departure_verified" className="text-sm cursor-pointer">Verified</label>
            </div>
          </div>
          
          {/* Offloading Arrival */}
          <div>
            <label className="flex items-center gap-2">
              Offloading Arrival
              {load?.actual_offloading_arrival_source === 'auto' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">Auto</span>
              )}
            </label>
            <Input type="datetime-local" {...form.register("actual_offloading_arrival")} />
            <div className="flex items-center gap-2 mt-1">
              <Controller
                control={form.control}
                name="actual_offloading_arrival_verified"
                render={({ field }) => (
                  <Checkbox 
                    id="actual_offloading_arrival_verified"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <label htmlFor="actual_offloading_arrival_verified" className="text-sm cursor-pointer">Verified</label>
            </div>
          </div>
          
          {/* Offloading Departure */}
          <div>
            <label className="flex items-center gap-2">
              Offloading Departure
              {load?.actual_offloading_departure_source === 'auto' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">Auto</span>
              )}
            </label>
            <Input type="datetime-local" {...form.register("actual_offloading_departure")} />
            {form.formState.errors.actual_offloading_departure && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.actual_offloading_departure.message}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Controller
                control={form.control}
                name="actual_offloading_departure_verified"
                render={({ field }) => (
                  <Checkbox 
                    id="actual_offloading_departure_verified"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <label htmlFor="actual_offloading_departure_verified" className="text-sm cursor-pointer">Verified</label>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="submit" disabled={!load?.id || updateTimes.isPending}>
              {updateTimes.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}