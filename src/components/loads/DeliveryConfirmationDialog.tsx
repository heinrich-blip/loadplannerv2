import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as timeWindowLib from '@/lib/timeWindow';
import
  {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog';
import
  {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import
  {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { type Load, useCreateLoad, useUpdateLoad } from '@/hooks/useLoads';
import { getLocationDisplayName, safeFormatDate } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { addDays, format, formatISO, parseISO } from 'date-fns';
import { AlertTriangle, ArrowRight, CheckCircle, CheckCircle2, Clock, MapPin, RotateCcw, Truck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Variance helpers — compare actual vs planned, return label + isLate flag
// ---------------------------------------------------------------------------

function timeToMinutes(time: string | undefined | null): number | null {
  if (!time) return null;
  const hm = time.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);
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
  if (pMin === null || aMin === null) return { label: '', diffMin: null, isLate: false };
  const diff = aMin - pMin;
  if (diff === 0) return { label: 'On time', diffMin: 0, isLate: false };
  const abs = Math.abs(diff);
  const hrs = Math.floor(abs / 60);
  const mins = abs % 60;
  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  const tag = diff > 0 ? 'late' : 'early';
  return { label: `${parts.join(' ')} ${tag}`, diffMin: diff, isLate: diff > 0 };
}

/** Inline variance note shown under each time input — includes note input when late */
function VarianceNote({ planned, actual, noteValue, onNoteChange }: { planned?: string; actual?: string; noteValue?: string; onNoteChange?: (v: string) => void }) {
  const v = computeVariance(planned, actual);
  if (v.diffMin === null) return null;
  if (v.isLate) {
    return (
      <div className="mt-1 space-y-1.5">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
          <span className="text-xs text-red-700 dark:text-red-300 font-medium">
            {v.label} — planned time not met
          </span>
        </div>
        {onNoteChange && (
          <input
            type="text"
            value={noteValue || ''}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Reason for late..."
            className="w-full text-xs px-2 py-1.5 rounded border border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20 text-red-800 dark:text-red-200 placeholder:text-red-400 dark:placeholder:text-red-600 focus:outline-none focus:ring-1 focus:ring-red-400"
          />
        )}
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

const formSchema = z.object({
  originActualArrival: z.string().optional(),
  originActualDeparture: z.string().optional(),
  destActualArrival: z.string().optional(),
  destActualDeparture: z.string().optional(),
  deliveryNotes: z.string().optional(),
  originArrivalNote: z.string().optional(),
  originDepartureNote: z.string().optional(),
  destArrivalNote: z.string().optional(),
  destDepartureNote: z.string().optional(),
  // Backload fields
  createBackload: z.boolean(),
  backloadDestination: z.enum(['BV', 'CBC']).optional(),
  backloadCargoType: z.enum(['Packaging', 'Fertilizer']).optional(),
  // Container quantities
  binsQuantity: z.number().optional(),
  cratesQuantity: z.number().optional(),
  palletsQuantity: z.number().optional(),
  backloadNotes: z.string().optional(),
}).refine((data) => {
  if (data.originActualArrival && data.originActualDeparture) {
    return data.originActualDeparture >= data.originActualArrival;
  }
  return true;
}, {
  message: "Loading departure must be after loading arrival",
  path: ["originActualDeparture"],
}).refine((data) => {
  if (data.destActualArrival && data.destActualDeparture) {
    return data.destActualDeparture >= data.destActualArrival;
  }
  return true;
}, {
  message: "Offloading departure must be after offloading arrival",
  path: ["destActualDeparture"],
});

type FormData = z.infer<typeof formSchema>;

interface DeliveryConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  load: Load | null;
  verificationOnly?: boolean;
}

export function DeliveryConfirmationDialog({ open, onOpenChange, load, verificationOnly = false }: DeliveryConfirmationDialogProps) {
  const updateLoad = useUpdateLoad();
  const createLoad = useCreateLoad();
  const [showMissingTimesWarning, setShowMissingTimesWarning] = useState(false);
  const formInitRef = useRef(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      originActualArrival: '',
      originActualDeparture: '',
      destActualArrival: '',
      destActualDeparture: '',
      deliveryNotes: '',
      originArrivalNote: '',
      originDepartureNote: '',
      destArrivalNote: '',
      destDepartureNote: '',
      createBackload: false,
      backloadDestination: undefined,
      backloadCargoType: undefined,
      binsQuantity: 0,
      cratesQuantity: 0,
      palletsQuantity: 0,
      backloadNotes: '',
    },
  });

  const createBackload = form.watch('createBackload');

  // Only reset form once when the dialog first opens (not on every query refetch)
  useEffect(() => {
    if (!open) {
      formInitRef.current = false;
      return;
    }
    if (load && open && !formInitRef.current) {
      formInitRef.current = true;
      setShowMissingTimesWarning(false);
      const times = timeWindowLib.parseTimeWindow(load.time_window);
      // Extract existing per-field notes from time_window
      const tw = (load.time_window && typeof load.time_window === 'object' && !Array.isArray(load.time_window))
        ? (load.time_window as Record<string, unknown>)
        : {};
      const originTw = (tw.origin && typeof tw.origin === 'object') ? (tw.origin as Record<string, unknown>) : {};
      const destTw = (tw.destination && typeof tw.destination === 'object') ? (tw.destination as Record<string, unknown>) : {};
      form.reset({
        originActualArrival: times.origin.actualArrival,
        originActualDeparture: times.origin.actualDeparture,
        destActualArrival: times.destination.actualArrival,
        destActualDeparture: times.destination.actualDeparture,
        deliveryNotes: '',
        originArrivalNote: (typeof originTw.arrivalNote === 'string') ? originTw.arrivalNote : '',
        originDepartureNote: (typeof originTw.departureNote === 'string') ? originTw.departureNote : '',
        destArrivalNote: (typeof destTw.arrivalNote === 'string') ? destTw.arrivalNote : '',
        destDepartureNote: (typeof destTw.departureNote === 'string') ? destTw.departureNote : '',
        createBackload: false,
        backloadDestination: undefined,
        backloadCargoType: undefined,
        binsQuantity: 0,
        cratesQuantity: 0,
        palletsQuantity: 0,
        backloadNotes: '',
      });
    }
  }, [load, open, form]);

  // Generate a unique load ID for backload
  const generateBackloadId = (originalLoadId: string) => {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `BL-${originalLoadId.replace(/^LD-/, '')}-${timestamp}`;
  };

  // Combine date and time to create ISO timestamp
  const combineDateTime = (dateStr: string, timeStr: string) => {
    const date = parseISO(dateStr);
    const [hours, minutes] = timeStr.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    return formatISO(date);
  };

  const handleSubmit = async (data: FormData) => {
    if (!load) return;

    const currentTimes = timeWindowLib.parseTimeWindow(load.time_window);

    // Update time_window with actual times while preserving backload
    const timeData = {
      origin: {
        plannedArrival: currentTimes.origin.plannedArrival,
        plannedDeparture: currentTimes.origin.plannedDeparture,
        actualArrival: data.originActualArrival || currentTimes.origin.actualArrival,
        actualDeparture: data.originActualDeparture || currentTimes.origin.actualDeparture,
        arrivalNote: data.originArrivalNote || '',
        departureNote: data.originDepartureNote || '',
      },
      destination: {
        plannedArrival: currentTimes.destination.plannedArrival,
        plannedDeparture: currentTimes.destination.plannedDeparture,
        actualArrival: data.destActualArrival || currentTimes.destination.actualArrival,
        actualDeparture: data.destActualDeparture || currentTimes.destination.actualDeparture,
        arrivalNote: data.destArrivalNote || '',
        departureNote: data.destDepartureNote || '',
      },
      backload: currentTimes.backload, // Preserve existing backload data
      // Build combined varianceReason for backward compat with Google Sheets
      varianceReason: [data.originArrivalNote, data.originDepartureNote, data.destArrivalNote, data.destDepartureNote].filter(Boolean).join(' | '),
    };

    // Prepare main fields for actual times (ISO string if date provided)
    // Use Partial<Load> so Supabase accepts all fields with correct types
    const mainFields: Partial<Load> = {};
    if (data.originActualArrival) mainFields.actual_loading_arrival = combineDateTime(load.loading_date, data.originActualArrival);
    if (data.originActualDeparture) mainFields.actual_loading_departure = combineDateTime(load.loading_date, data.originActualDeparture);
    if (data.destActualArrival) mainFields.actual_offloading_arrival = combineDateTime(load.offloading_date, data.destActualArrival);
    if (data.destActualDeparture) mainFields.actual_offloading_departure = combineDateTime(load.offloading_date, data.destActualDeparture);
    // Mark as verified if provided
    if (data.originActualArrival) mainFields.actual_loading_arrival_verified = true;
    if (data.originActualDeparture) mainFields.actual_loading_departure_verified = true;
    if (data.destActualArrival) mainFields.actual_offloading_arrival_verified = true;
    if (data.destActualDeparture) mainFields.actual_offloading_departure_verified = true;
    // Set source as manual
    if (data.originActualArrival) mainFields.actual_loading_arrival_source = 'manual';
    if (data.originActualDeparture) mainFields.actual_loading_departure_source = 'manual';
    if (data.destActualArrival) mainFields.actual_offloading_arrival_source = 'manual';
    if (data.destActualDeparture) mainFields.actual_offloading_departure_source = 'manual';

    // Update notes with delivery notes if provided
    const updatedNotes = data.deliveryNotes 
      ? `${load.notes || ''}\n\n[Delivery Notes - ${format(new Date(), 'dd MMM yyyy HH:mm')}]\n${data.deliveryNotes}`.trim()
      : load.notes;

    console.log('[DeliveryConfirmation] Saving load update:', {
      loadId: load.id,
      actualFieldsCount: Object.keys(mainFields).length,
      mainFields,
    });

    // First, update the original load as delivered
    updateLoad.mutate({
      id: load.id,
      time_window: timeData as Load['time_window'],
      status: 'delivered',
      notes: updatedNotes,
      ...mainFields,
    }, {
      onSuccess: async () => {
        // If backload is requested, create it
        if (data.createBackload && data.backloadDestination && data.backloadCargoType) {
          const backloadTimeWindow = {
            origin: {
              plannedArrival: data.destActualDeparture || currentTimes.destination.plannedDeparture || '08:00',
              plannedDeparture: '',
              actualArrival: '',
              actualDeparture: '',
            },
            destination: {
              plannedArrival: '',
              plannedDeparture: '',
              actualArrival: '',
              actualDeparture: '',
            },
          };

          // Create backload - origin is the delivery destination, destination is BV or CBC
          const offloadingDate = parseISO(load.offloading_date);
          const backloadLoadingDate = format(offloadingDate, 'yyyy-MM-dd');
          const backloadOffloadingDate = format(addDays(offloadingDate, 1), 'yyyy-MM-dd');

          // Build container info for notes
          const containerInfo: string[] = [];
          if (data.binsQuantity && data.binsQuantity > 0) {
            containerInfo.push(`Bins: ${data.binsQuantity}`);
          }
          if (data.cratesQuantity && data.cratesQuantity > 0) {
            containerInfo.push(`Crates: ${data.cratesQuantity}`);
          }
          if (data.palletsQuantity && data.palletsQuantity > 0) {
            containerInfo.push(`Pallets: ${data.palletsQuantity}`);
          }
          
          const totalQuantity = (data.binsQuantity || 0) + (data.cratesQuantity || 0) + (data.palletsQuantity || 0);
          const containerNotes = containerInfo.length > 0 ? `\nContainers: ${containerInfo.join(', ')}` : '';

          createLoad.mutate({
            load_id: generateBackloadId(load.load_id),
            priority: 'medium',
            loading_date: backloadLoadingDate,
            offloading_date: backloadOffloadingDate,
            time_window: backloadTimeWindow,
            origin: load.destination, // Backload starts from where original load was delivered
            destination: data.backloadDestination, // BV or CBC
            cargo_type: data.backloadCargoType as 'Packaging' | 'Fertilizer',
            quantity: totalQuantity,
            weight: 0, // Weight not used for backloads
            special_handling: [],
            fleet_vehicle_id: load.fleet_vehicle_id,
            driver_id: load.driver_id,
            co_driver_id: load.co_driver_id,
            notes: `[Backload from ${load.load_id}]${containerNotes}${data.backloadNotes ? '\n' + data.backloadNotes : ''}`,
            status: 'scheduled',
          });
        }
        onOpenChange(false);
      },
    });
  };

  const handleSaveOnly = () => {
    if (!load) return;

    const currentTimes = timeWindowLib.parseTimeWindow(load.time_window);
    const data = form.getValues();

    // Update time_window with actual times while preserving backload
    const timeData = {
      origin: {
        plannedArrival: currentTimes.origin.plannedArrival,
        plannedDeparture: currentTimes.origin.plannedDeparture,
        actualArrival: data.originActualArrival || currentTimes.origin.actualArrival,
        actualDeparture: data.originActualDeparture || currentTimes.origin.actualDeparture,
        arrivalNote: data.originArrivalNote || '',
        departureNote: data.originDepartureNote || '',
      },
      destination: {
        plannedArrival: currentTimes.destination.plannedArrival,
        plannedDeparture: currentTimes.destination.plannedDeparture,
        actualArrival: data.destActualArrival || currentTimes.destination.actualArrival,
        actualDeparture: data.destActualDeparture || currentTimes.destination.actualDeparture,
        arrivalNote: data.destArrivalNote || '',
        departureNote: data.destDepartureNote || '',
      },
      backload: currentTimes.backload, // Preserve existing backload data
      varianceReason: [data.originArrivalNote, data.originDepartureNote, data.destArrivalNote, data.destDepartureNote].filter(Boolean).join(' | '),
    };

    // Prepare main fields for actual times (ISO string if date provided)
    // Use Partial<Load> so Supabase accepts all fields with correct types
    const mainFields: Partial<Load> = {};
    if (data.originActualArrival) mainFields.actual_loading_arrival = combineDateTime(load.loading_date, data.originActualArrival);
    if (data.originActualDeparture) mainFields.actual_loading_departure = combineDateTime(load.loading_date, data.originActualDeparture);
    if (data.destActualArrival) mainFields.actual_offloading_arrival = combineDateTime(load.offloading_date, data.destActualArrival);
    if (data.destActualDeparture) mainFields.actual_offloading_departure = combineDateTime(load.offloading_date, data.destActualDeparture);
    // Mark as verified if provided
    if (data.originActualArrival) mainFields.actual_loading_arrival_verified = true;
    if (data.originActualDeparture) mainFields.actual_loading_departure_verified = true;
    if (data.destActualArrival) mainFields.actual_offloading_arrival_verified = true;
    if (data.destActualDeparture) mainFields.actual_offloading_departure_verified = true;
    // Set source as manual
    if (data.originActualArrival) mainFields.actual_loading_arrival_source = 'manual';
    if (data.originActualDeparture) mainFields.actual_loading_departure_source = 'manual';
    if (data.destActualArrival) mainFields.actual_offloading_arrival_source = 'manual';
    if (data.destActualDeparture) mainFields.actual_offloading_departure_source = 'manual';

    console.log('[DeliveryConfirmation] Saving times update:', {
      loadId: load.id,
      actualFieldsCount: Object.keys(mainFields).length,
      mainFields,
    });

    updateLoad.mutate({
      id: load.id,
      time_window: timeData as Load['time_window'],
      ...mainFields,
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  if (!load) return null;

  const times = timeWindowLib.parseTimeWindow(load.time_window);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-white">
              <CheckCircle className="h-4 w-4" />
            </span>
            {verificationOnly ? `Verify Times - ${load.load_id}` : `Confirm Delivery - ${load.load_id}`}
          </DialogTitle>
          <DialogDescription>
            {verificationOnly ? 'Verify actual arrival and departure times' : 'Enter actual arrival and departure times to confirm delivery'}
          </DialogDescription>
        </DialogHeader>

        {/* Load Summary */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-green-600" />
              <span className="font-medium">{getLocationDisplayName(load.origin)}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{getLocationDisplayName(load.destination)}</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>Loading: {safeFormatDate(load.loading_date, 'dd MMM yyyy')}</span>
              <span>Offloading: {safeFormatDate(load.offloading_date, 'dd MMM yyyy')}</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {load.driver?.name || 'No driver'}
          </Badge>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Origin Times */}
            <Card className="border-2 border-green-200 bg-green-50/30 dark:bg-green-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-green-600" />
                  Origin - {getLocationDisplayName(load.origin)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Planned Times Display */}
                <div className="grid grid-cols-2 gap-4 p-3 rounded-md bg-green-100/50 dark:bg-green-900/20">
                  <div>
                    <p className="text-xs text-muted-foreground">Planned Arrival</p>
                    <p className="font-semibold text-green-700 dark:text-green-400">
                      {times.origin.plannedArrival || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Planned Departure</p>
                    <p className="font-semibold text-green-700 dark:text-green-400">
                      {times.origin.plannedDeparture || '-'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Actual Times Input */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="originActualArrival"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-green-700 dark:text-green-400">
                          <Clock className="h-3 w-3" />
                          Actual Arrival
                          {load?.actual_loading_arrival_source === 'auto' && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">Auto</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input type="time" className="border-green-300" {...field} />
                        </FormControl>
                        <VarianceNote planned={times.origin.plannedArrival} actual={field.value} noteValue={form.watch('originArrivalNote')} onNoteChange={(v) => form.setValue('originArrivalNote', v)} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="originActualDeparture"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-green-700 dark:text-green-400">
                          <Clock className="h-3 w-3" />
                          Actual Departure
                          {load?.actual_loading_departure_source === 'auto' && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">Auto</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input type="time" className="border-green-300" {...field} />
                        </FormControl>
                        <VarianceNote planned={times.origin.plannedDeparture} actual={field.value} noteValue={form.watch('originDepartureNote')} onNoteChange={(v) => form.setValue('originDepartureNote', v)} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Destination Times */}
            <Card className="border-2 border-blue-200 bg-blue-50/30 dark:bg-blue-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Destination - {getLocationDisplayName(load.destination)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Planned Times Display */}
                <div className="grid grid-cols-2 gap-4 p-3 rounded-md bg-blue-100/50 dark:bg-blue-900/20">
                  <div>
                    <p className="text-xs text-muted-foreground">Planned Arrival</p>
                    <p className="font-semibold text-blue-700 dark:text-blue-400">
                      {times.destination.plannedArrival || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Planned Departure</p>
                    <p className="font-semibold text-blue-700 dark:text-blue-400">
                      {times.destination.plannedDeparture || '-'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Actual Times Input */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="destActualArrival"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                          <Clock className="h-3 w-3" />
                          Actual Arrival
                          {load?.actual_offloading_arrival_source === 'auto' && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">Auto</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input type="time" className="border-blue-300" {...field} />
                        </FormControl>
                        <VarianceNote planned={times.destination.plannedArrival} actual={field.value} noteValue={form.watch('destArrivalNote')} onNoteChange={(v) => form.setValue('destArrivalNote', v)} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="destActualDeparture"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                          <Clock className="h-3 w-3" />
                          Actual Departure
                          {load?.actual_offloading_departure_source === 'auto' && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">Auto</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input type="time" className="border-blue-300" {...field} />
                        </FormControl>
                        <VarianceNote planned={times.destination.plannedDeparture} actual={field.value} noteValue={form.watch('destDepartureNote')} onNoteChange={(v) => form.setValue('destDepartureNote', v)} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Delivery Notes */}
            {!verificationOnly && (
              <FormField
                control={form.control}
                name="deliveryNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any notes about the delivery (delays, issues, etc.)..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Backload Section */}
            {!verificationOnly && (
              <>
                {times.backload?.enabled ? (
                  /* Show existing backload info as read-only */
                  <Card className="border-2 border-orange-200 bg-orange-50/30 dark:bg-orange-950/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <RotateCcw className="h-4 w-4 text-orange-600" />
                        Scheduled Backload
                        <Badge variant="outline" className="ml-auto text-xs border-orange-300 text-orange-700">
                          Already Scheduled
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 p-3 rounded-md bg-orange-100/50 dark:bg-orange-900/20 text-sm">
                        <Truck className="h-4 w-4 text-orange-600" />
                        <span>
                          {times.backload.isThirdParty ? 'Third Party Return' : 'Return Load'} from{' '}
                          <strong>{getLocationDisplayName(load.destination)}</strong>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Destination</p>
                          <p className="font-medium">{getLocationDisplayName(times.backload.destination)}</p>
                        </div>
                        {times.backload.cargoType && (
                          <div>
                            <p className="text-xs text-muted-foreground">Cargo Type</p>
                            <p className="font-medium">{times.backload.cargoType}</p>
                          </div>
                        )}
                      </div>
                      {times.backload.quantities &&
                        (times.backload.quantities.bins > 0 ||
                          times.backload.quantities.crates > 0 ||
                          times.backload.quantities.pallets > 0) && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Container Quantities</p>
                          <div className="flex gap-3 text-sm">
                            {times.backload.quantities.bins > 0 && (
                              <span>Bins: <strong>{times.backload.quantities.bins}</strong></span>
                            )}
                            {times.backload.quantities.crates > 0 && (
                              <span>Crates: <strong>{times.backload.quantities.crates}</strong></span>
                            )}
                            {times.backload.quantities.pallets > 0 && (
                              <span>Pallets: <strong>{times.backload.quantities.pallets}</strong></span>
                            )}
                          </div>
                        </div>
                      )}
                      {times.backload.isThirdParty && times.backload.thirdParty?.cargoDescription && (
                        <div>
                          <p className="text-xs text-muted-foreground">Cargo Description</p>
                          <p className="text-sm">{times.backload.thirdParty.cargoDescription}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  /* Show create backload form */
                  <Card className="border-2 border-orange-200 bg-orange-50/30 dark:bg-orange-950/10">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <RotateCcw className="h-4 w-4 text-orange-600" />
                          Create Backload
                        </CardTitle>
                        <FormField
                          control={form.control}
                          name="createBackload"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormLabel className="text-sm text-muted-foreground">Enable</FormLabel>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardHeader>
                    {createBackload && (
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 p-3 rounded-md bg-orange-100/50 dark:bg-orange-900/20 text-sm">
                          <Truck className="h-4 w-4 text-orange-600" />
                          <span>
                            Backload from <strong>{getLocationDisplayName(load.destination)}</strong> (current delivery destination)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="backloadDestination"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-orange-700 dark:text-orange-400">
                                  Backload Destination
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="border-orange-300">
                                      <SelectValue placeholder="Select destination" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="BV">BV</SelectItem>
                                    <SelectItem value="CBC">CBC</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="backloadCargoType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-orange-700 dark:text-orange-400">
                                  Cargo Type
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="border-orange-300">
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Packaging">Packaging</SelectItem>
                                    <SelectItem value="Fertilizer">Fertilizer</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Container Quantities */}
                        <div className="space-y-3">
                          <label className="text-sm font-medium text-orange-700 dark:text-orange-400">
                            Container Quantities
                          </label>
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="binsQuantity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs text-muted-foreground">Bins</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="0"
                                      placeholder="0"
                                      className="border-orange-300"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="cratesQuantity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs text-muted-foreground">Crates</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="0"
                                      placeholder="0"
                                      className="border-orange-300"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="palletsQuantity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs text-muted-foreground">Pallets</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="0"
                                      placeholder="0"
                                      className="border-orange-300"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Enter quantities for each container type. You can use multiple types.
                          </p>
                        </div>

                        <FormField
                          control={form.control}
                          name="backloadNotes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-orange-700 dark:text-orange-400">
                                Backload Notes (Optional)
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Notes for the backload..."
                                  className="resize-none border-orange-300"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    )}
                  </Card>
                )}
              </>
            )}

            <MissingTimesAlert 
              form={form} 
              load={load} 
              showWarning={showMissingTimesWarning}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => { onOpenChange(false); setShowMissingTimesWarning(false); }}>
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="secondary"
                onClick={handleSaveOnly}
                disabled={updateLoad.isPending || createLoad.isPending}
              >
                {verificationOnly ? 'Save Verification' : 'Save Times Only'}
              </Button>
              {!verificationOnly && !showMissingTimesWarning && (
                <Button 
                  type="button"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={updateLoad.isPending || createLoad.isPending}
                  onClick={() => {
                    // Check if any actual times are missing before allowing delivery
                    const values = form.getValues();
                    const hasOriginArrival = !!values.originActualArrival || !!load?.actual_loading_arrival;
                    const hasOriginDeparture = !!values.originActualDeparture || !!load?.actual_loading_departure;
                    const hasDestArrival = !!values.destActualArrival || !!load?.actual_offloading_arrival;
                    const hasDestDeparture = !!values.destActualDeparture || !!load?.actual_offloading_departure;
                    
                    if (!hasOriginArrival || !hasOriginDeparture || !hasDestArrival || !hasDestDeparture) {
                      setShowMissingTimesWarning(true);
                    } else {
                      form.handleSubmit(handleSubmit)();
                    }
                  }}
                >
                  {updateLoad.isPending || createLoad.isPending 
                    ? 'Processing...' 
                    : createBackload 
                      ? 'Deliver & Create Backload' 
                      : 'Mark as Delivered'}
                </Button>
              )}
              {!verificationOnly && showMissingTimesWarning && (
                <Button 
                  type="button" 
                  className="bg-amber-600 hover:bg-amber-700"
                  disabled={updateLoad.isPending || createLoad.isPending}
                  onClick={() => {
                    setShowMissingTimesWarning(false);
                    form.handleSubmit(handleSubmit)();
                  }}
                >
                  {updateLoad.isPending || createLoad.isPending 
                    ? 'Processing...' 
                    : 'Deliver Anyway (Verify Later)'}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: amber warning alert when actual times are missing
// ---------------------------------------------------------------------------

function MissingTimesAlert({ form, load, showWarning }: { form: ReturnType<typeof useForm<FormData>>; load: Load; showWarning: boolean }) {
  const values = useWatch({ control: form.control });

  // Combine form values with already-saved values on the load
  const missingFields: string[] = [];
  if (!values.originActualArrival && !load.actual_loading_arrival) missingFields.push('Origin Arrival');
  if (!values.originActualDeparture && !load.actual_loading_departure) missingFields.push('Origin Departure');
  if (!values.destActualArrival && !load.actual_offloading_arrival) missingFields.push('Destination Arrival');
  if (!values.destActualDeparture && !load.actual_offloading_departure) missingFields.push('Destination Departure');

  if (missingFields.length === 0) return null;

  return (
    <>
      {/* Always show a subtle info line about missing fields */}
      {!showWarning && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Missing: {missingFields.join(', ')}</span>
        </div>
      )}

      {/* Full warning when confirming without times */}
      {showWarning && (
        <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 [&>svg]:text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-semibold">Actual times not entered</AlertTitle>
          <AlertDescription className="text-sm">
            <p className="mb-1">
              The following times are still missing:
            </p>
            <ul className="list-disc list-inside mb-2 font-medium">
              {missingFields.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <p>
              You can still deliver now and verify times later — the load will be flagged as <span className="font-semibold text-red-600 dark:text-red-400">"Needs Verification"</span>.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}