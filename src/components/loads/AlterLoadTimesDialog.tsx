import { useEffect, useMemo } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateLoadTimes, type Load } from "@/hooks/useLoads";
import { parseTimeWindow } from "@/lib/timeWindow";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
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
  variance_reason: z.string().optional(),
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
  plannedArrival?: string;
  plannedDeparture?: string;
  actualArrival?: string;
  actualDeparture?: string;
}

interface TimeWindow {
  origin?: TimeWindowLocation;
  destination?: TimeWindowLocation;
  varianceReason?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Variance helpers — compare actual vs planned, return label + isLate flag
// ---------------------------------------------------------------------------

function timeToMinutes(time: string | undefined | null): number | null {
  if (!time) return null;
  // HH:mm format
  const hm = time.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);
  // ISO datetime
  const iso = time.match(/T(\d{2}):(\d{2})/);
  if (iso) return parseInt(iso[1], 10) * 60 + parseInt(iso[2], 10);
  return null;
}

function computeVariance(
  planned: string | undefined | null,
  actual: string | undefined | null,
): { label: string; diffMin: number | null; isLate: boolean } {
  const pMin = timeToMinutes(planned);
  const aMin = timeToMinutes(actual);
  if (pMin === null || aMin === null) return { label: "", diffMin: null, isLate: false };
  const diff = aMin - pMin;
  if (diff === 0) return { label: "On time", diffMin: 0, isLate: false };
  const abs = Math.abs(diff);
  const hrs = Math.floor(abs / 60);
  const mins = abs % 60;
  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  const tag = diff > 0 ? "late" : "early";
  return { label: `${parts.join(" ")} ${tag}`, diffMin: diff, isLate: diff > 0 };
}

/** Inline variance note component */
function VarianceNote({ planned, actual }: { planned?: string; actual?: string }) {
  const v = computeVariance(planned, actual);
  if (v.diffMin === null) return null;
  if (v.isLate) {
    return (
      <div className="flex items-center gap-1.5 mt-1 px-2 py-1 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
        <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
        <span className="text-xs text-red-700 dark:text-red-300 font-medium">
          {v.label} — planned time not met
        </span>
      </div>
    );
  }
  if (v.diffMin === 0) {
    return (
      <div className="flex items-center gap-1.5 mt-1 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
        <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">On time</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 mt-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
      <Clock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
      <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">{v.label}</span>
    </div>
  );
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
      variance_reason: "",
    },
  });

  // Sync form values when the load changes or dialog opens
  useEffect(() => {
    if (load && open) {
      // Read existing variance reason from time_window JSON
      let existingReason = '';
      try {
        const raw = load.time_window;
        const twData = (typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {})) as TimeWindow;
        existingReason = twData.varianceReason || '';
      } catch { /* ignore */ }

      form.reset({
        actual_loading_arrival: load.actual_loading_arrival || "",
        actual_loading_arrival_verified: !!load.actual_loading_arrival_verified,
        actual_loading_departure: load.actual_loading_departure || "",
        actual_loading_departure_verified: !!load.actual_loading_departure_verified,
        actual_offloading_arrival: load.actual_offloading_arrival || "",
        actual_offloading_arrival_verified: !!load.actual_offloading_arrival_verified,
        actual_offloading_departure: load.actual_offloading_departure || "",
        actual_offloading_departure_verified: !!load.actual_offloading_departure_verified,
        variance_reason: existingReason,
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
      destination: { ...timeWindowData.destination },
      varianceReason: values.variance_reason || timeWindowData.varianceReason || '',
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

  // Parse planned times from the time_window JSON
  const tw = useMemo(() => {
    if (!load) return null;
    return parseTimeWindow(load.time_window);
  }, [load]);

  // Watch all actual time fields so variance notes update live as the user types
  const watchedValues = useWatch({ control: form.control });

  // Compute live variances for each time pair
  const variances = useMemo(() => {
    if (!tw) return null;
    return {
      loadingArrival: computeVariance(tw.origin.plannedArrival, watchedValues.actual_loading_arrival),
      loadingDeparture: computeVariance(tw.origin.plannedDeparture, watchedValues.actual_loading_departure),
      offloadingArrival: computeVariance(tw.destination.plannedArrival, watchedValues.actual_offloading_arrival),
      offloadingDeparture: computeVariance(tw.destination.plannedDeparture, watchedValues.actual_offloading_departure),
    };
  }, [tw, watchedValues.actual_loading_arrival, watchedValues.actual_loading_departure, watchedValues.actual_offloading_arrival, watchedValues.actual_offloading_departure]);

  const lateCount = variances
    ? [variances.loadingArrival, variances.loadingDeparture, variances.offloadingArrival, variances.offloadingDeparture].filter((v) => v.isLate).length
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alter/Verify Actual Times</DialogTitle>
          {load && (
            <p className="text-sm text-muted-foreground mt-1">
              {load.load_id} — {load.origin} → {load.destination}
            </p>
          )}
        </DialogHeader>

        {/* Summary note for late times */}
        {lateCount > 0 && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                {lateCount} {lateCount === 1 ? "time" : "times"} not met
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
                The actual {lateCount === 1 ? "time is" : "times are"} later than the planned schedule.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Loading Arrival */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium">
              Loading Arrival
              {tw?.origin.plannedArrival && (
                <span className="text-xs text-muted-foreground font-normal">(Planned: {tw.origin.plannedArrival})</span>
              )}
              {load?.actual_loading_arrival_source === 'auto' && (
                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-1.5 py-0.5 rounded">Auto</span>
              )}
            </label>
            <Input type="datetime-local" {...form.register("actual_loading_arrival")} />
            <VarianceNote planned={tw?.origin.plannedArrival} actual={watchedValues.actual_loading_arrival} />
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
            <label className="flex items-center gap-2 text-sm font-medium">
              Loading Departure
              {tw?.origin.plannedDeparture && (
                <span className="text-xs text-muted-foreground font-normal">(Planned: {tw.origin.plannedDeparture})</span>
              )}
              {load?.actual_loading_departure_source === 'auto' && (
                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-1.5 py-0.5 rounded">Auto</span>
              )}
            </label>
            <Input type="datetime-local" {...form.register("actual_loading_departure")} />
            {form.formState.errors.actual_loading_departure && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.actual_loading_departure.message}</p>
            )}
            <VarianceNote planned={tw?.origin.plannedDeparture} actual={watchedValues.actual_loading_departure} />
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
            <label className="flex items-center gap-2 text-sm font-medium">
              Offloading Arrival
              {tw?.destination.plannedArrival && (
                <span className="text-xs text-muted-foreground font-normal">(Planned: {tw.destination.plannedArrival})</span>
              )}
              {load?.actual_offloading_arrival_source === 'auto' && (
                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-1.5 py-0.5 rounded">Auto</span>
              )}
            </label>
            <Input type="datetime-local" {...form.register("actual_offloading_arrival")} />
            <VarianceNote planned={tw?.destination.plannedArrival} actual={watchedValues.actual_offloading_arrival} />
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
            <label className="flex items-center gap-2 text-sm font-medium">
              Offloading Departure
              {tw?.destination.plannedDeparture && (
                <span className="text-xs text-muted-foreground font-normal">(Planned: {tw.destination.plannedDeparture})</span>
              )}
              {load?.actual_offloading_departure_source === 'auto' && (
                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-1.5 py-0.5 rounded">Auto</span>
              )}
            </label>
            <Input type="datetime-local" {...form.register("actual_offloading_departure")} />
            {form.formState.errors.actual_offloading_departure && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.actual_offloading_departure.message}</p>
            )}
            <VarianceNote planned={tw?.destination.plannedDeparture} actual={watchedValues.actual_offloading_departure} />
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

          {/* Variance Reason — shown when any time is late */}
          {lateCount > 0 && (
            <div className="space-y-2 p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50">
              <label className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                Reason for Late {lateCount === 1 ? 'Time' : 'Times'}
              </label>
              <Textarea
                placeholder="e.g. Truck breakdown, long queue at loading point, border delays..."
                className="resize-none border-red-300 dark:border-red-700 text-sm min-h-[60px]"
                {...form.register('variance_reason')}
              />
              <p className="text-xs text-muted-foreground">This reason will appear on reports and the Google Sheet.</p>
            </div>
          )}
          
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