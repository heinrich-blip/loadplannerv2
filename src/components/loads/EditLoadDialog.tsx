import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as timeWindowLib from "@/lib/timeWindow";
import { Checkbox } from "@/components/ui/checkbox";
import
  {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
import
  {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import
  {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover";
import
  {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClients } from "@/hooks/useClients";
import { useDrivers } from "@/hooks/useDrivers";
import { useFleetVehicles } from "@/hooks/useFleetVehicles";
import { type Load, useUpdateLoad } from "@/hooks/useLoads";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { AlertTriangle, CalendarIcon, CheckCircle2, Clock, MapPin, Package, Pencil } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import loadFormConfig from "@/constants/loadFormConfig";

/** Extract HH:mm in LOCAL time from an ISO timestamp, or return as-is if already HH:mm.
 *  Previously used regex on the ISO string which returned UTC hours —
 *  for SAST (UTC+2) that shifted times back by 2 hours. */
function formatActualTime(ts: string | null | undefined): string {
  if (!ts) return '';
  // Already a bare HH:mm value — return as-is
  if (/^\d{1,2}:\d{2}$/.test(ts)) return ts.padStart(5, '0');
  // ISO string or other date format — parse to Date and extract LOCAL hours
  const date = new Date(ts);
  if (isNaN(date.getTime())) return ts;
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

const formSchema = z.object({
  clientId: z.string().optional(),
  loadingDate: z.date({ required_error: "Loading date is required" }),
  offloadingDate: z.date({ required_error: "Offloading date is required" }),
  origin: z.string().min(1, "Origin is required"),
  originPlannedArrival: z.string().min(1, "Planned arrival time is required"),
  originPlannedDeparture: z
    .string()
    .min(1, "Planned departure time is required"),
  destination: z.string().min(1, "Destination is required"),
  destPlannedArrival: z.string().min(1, "Planned arrival time is required"),
  destPlannedDeparture: z.string().min(1, "Planned departure time is required"),
  cargoType: z.enum([
    "VanSalesRetail",
    "Retail",
    "Vendor",
    "RetailVendor",
    "Fertilizer",
    "Export",
    "BV",
    "CBC",
    "Packaging",
  ]),
  fleetVehicleId: z.string().optional(),
  driverId: z.string().optional(),
  notes: z.string(),
  status: z.enum(["pending", "scheduled", "in-transit", "delivered"]),
  // Actual time fields (editable)
  originActualArrival: z.string().optional(),
  originActualDeparture: z.string().optional(),
  destActualArrival: z.string().optional(),
  destActualDeparture: z.string().optional(),
  // Backload fields
  hasBackload: z.boolean().default(false),
  backloadDestination: z.string().optional(),
  backloadCargoType: z
    .enum(["Packaging", "Fertilizer", "BV", "CBC"])
    .optional(),
  backloadOffloadingDate: z.date().optional(),
  backloadBins: z.number().min(0).default(0),
  backloadCrates: z.number().min(0).default(0),
  backloadPallets: z.number().min(0).default(0),
  backloadNotes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditLoadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  load: Load | null;
}

export function EditLoadDialog({
  open,
  onOpenChange,
  load,
}: EditLoadDialogProps) {
  const { data: clients = [] } = useClients();
  const { data: drivers = [] } = useDrivers();
  const { data: fleetVehicles = [] } = useFleetVehicles();
  const updateLoad = useUpdateLoad();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: "",
      origin: "",
      originPlannedArrival: "15:00",
      originPlannedDeparture: "17:00",
      destination: "",
      destPlannedArrival: "08:00",
      destPlannedDeparture: "11:00",
      notes: "",
      status: "pending",
      originActualArrival: "",
      originActualDeparture: "",
      destActualArrival: "",
      destActualDeparture: "",
      hasBackload: false,
      backloadDestination: "",
      backloadCargoType: undefined,
      backloadOffloadingDate: undefined,
      backloadBins: 0,
      backloadCrates: 0,
      backloadPallets: 0,
      backloadNotes: "",
    },
  });

  const hasBackload = form.watch("hasBackload");
  const selectedCargoType = form.watch("cargoType");

  // Get available destinations based on cargo type
  const availableDestinations =
    selectedCargoType === "Export" ? loadFormConfig.exportDestinations : loadFormConfig.destinations;

  // Track whether the form has been initialized for the current dialog session.
  // This prevents the 10-second query poll from resetting the form while the
  // user is editing (each refetch creates a new `load` reference).
  const formInitRef = useRef(false);

  useEffect(() => {
    // When the dialog closes, mark as un-initialized for next open
    if (!open) {
      formInitRef.current = false;
      return;
    }
    // Only reset the form once when the dialog first opens
    if (load && open && !formInitRef.current) {
      formInitRef.current = true;
      console.log('[EditLoadDialog] Initializing form with load data:', {
        loadId: load.id,
        actual_loading_arrival: load.actual_loading_arrival,
        actual_loading_departure: load.actual_loading_departure,
        actual_offloading_arrival: load.actual_offloading_arrival,
        actual_offloading_departure: load.actual_offloading_departure,
        actual_loading_arrival_source: load.actual_loading_arrival_source,
        actual_loading_departure_source: load.actual_loading_departure_source,
      });
      const times = timeWindowLib.parseTimeWindowForForm(load.time_window);
      form.reset({
        clientId: load.client_id || "",
        loadingDate: parseISO(load.loading_date),
        offloadingDate: parseISO(load.offloading_date),
        origin: load.origin,
        originPlannedArrival: times.originPlannedArrival,
        originPlannedDeparture: times.originPlannedDeparture,
        destination: load.destination,
        destPlannedArrival: times.destPlannedArrival,
        destPlannedDeparture: times.destPlannedDeparture,
        cargoType: load.cargo_type,
        fleetVehicleId: load.fleet_vehicle_id || undefined,
        driverId: load.driver_id || undefined,
        notes: load.notes || "",
        status: load.status,
        originActualArrival: formatActualTime(load.actual_loading_arrival) || "",
        originActualDeparture: formatActualTime(load.actual_loading_departure) || "",
        destActualArrival: formatActualTime(load.actual_offloading_arrival) || "",
        destActualDeparture: formatActualTime(load.actual_offloading_departure) || "",
        hasBackload: times.backload?.enabled || false,
        backloadDestination: times.backload?.destination || "",
        backloadCargoType: times.backload?.cargoType as
          | "Packaging"
          | "Fertilizer"
          | "BV"
          | "CBC"
          | undefined,
        backloadOffloadingDate: times.backload?.offloadingDate
          ? parseISO(times.backload.offloadingDate)
          : undefined,
        backloadBins: times.backload?.quantities?.bins || 0,
        backloadCrates: times.backload?.quantities?.crates || 0,
        backloadPallets: times.backload?.quantities?.pallets || 0,
        backloadNotes: times.backload?.notes || "",
      });
    }
  }, [load, open, form]);

  const handleSubmit = (data: FormData) => {
    if (!load) return;

    // Parse existing time_window to preserve actual times & notes
    const currentTimes = timeWindowLib.parseTimeWindow(load.time_window);
    // Access raw JSON for notes (not in the typed interface)
    const rawTw = (load.time_window && typeof load.time_window === 'object' && !Array.isArray(load.time_window))
      ? (load.time_window as Record<string, unknown>)
      : {};
    const rawOrigin = (rawTw.origin && typeof rawTw.origin === 'object') ? (rawTw.origin as Record<string, unknown>) : {};
    const rawDest = (rawTw.destination && typeof rawTw.destination === 'object') ? (rawTw.destination as Record<string, unknown>) : {};

    // Store planned + actual times and backload info in time_window as JSON
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const timeData: Record<string, any> = {
      origin: {
        plannedArrival: data.originPlannedArrival,
        plannedDeparture: data.originPlannedDeparture,
        actualArrival: data.originActualArrival || currentTimes.origin.actualArrival || '',
        actualDeparture: data.originActualDeparture || currentTimes.origin.actualDeparture || '',
        arrivalNote: (typeof rawOrigin.arrivalNote === 'string') ? rawOrigin.arrivalNote : '',
        departureNote: (typeof rawOrigin.departureNote === 'string') ? rawOrigin.departureNote : '',
      },
      destination: {
        plannedArrival: data.destPlannedArrival,
        plannedDeparture: data.destPlannedDeparture,
        actualArrival: data.destActualArrival || currentTimes.destination.actualArrival || '',
        actualDeparture: data.destActualDeparture || currentTimes.destination.actualDeparture || '',
        arrivalNote: (typeof rawDest.arrivalNote === 'string') ? rawDest.arrivalNote : '',
        departureNote: (typeof rawDest.departureNote === 'string') ? rawDest.departureNote : '',
      },
    };

    // Preserve backload data if present
    if (currentTimes.backload) {
      timeData.backload = currentTimes.backload;
    }

    // Add backload info if enabled
    if (
      data.hasBackload &&
      data.backloadDestination &&
      data.backloadCargoType &&
      data.backloadOffloadingDate
    ) {
      timeData.backload = {
        enabled: true,
        destination: data.backloadDestination,
        cargoType: data.backloadCargoType,
        offloadingDate: format(data.backloadOffloadingDate, "yyyy-MM-dd"),
        quantities: {
          bins: data.backloadBins || 0,
          crates: data.backloadCrates || 0,
          pallets: data.backloadPallets || 0,
        },
        notes: data.backloadNotes || "",
      };
    }

    // Determine status: if both fleet and driver are provided and current status is pending, auto-upgrade to scheduled
    const newFleetId = data.fleetVehicleId || null;
    const newDriverId = data.driverId || null;
    const hasFleetAndDriver = newFleetId && newDriverId;
    const currentStatus = load.status;
    const newStatus = hasFleetAndDriver && currentStatus === 'pending' ? 'scheduled' : data.status;

    // Helper: combine date + time to create ISO timestamp
    const combineDateTime = (dateStr: string, timeStr: string) => {
      const date = parseISO(dateStr);
      const [hours, minutes] = timeStr.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
      return date.toISOString();
    };

    // Build actual-time column updates when user has entered/changed a value
    // Use explicit Partial<Load> type so Supabase accepts all fields correctly
    const actualFields: Partial<Load> = {};
    if (data.originActualArrival) {
      actualFields.actual_loading_arrival = combineDateTime(format(data.loadingDate, 'yyyy-MM-dd'), data.originActualArrival);
      actualFields.actual_loading_arrival_verified = true;
      actualFields.actual_loading_arrival_source = 'manual';
    }
    if (data.originActualDeparture) {
      actualFields.actual_loading_departure = combineDateTime(format(data.loadingDate, 'yyyy-MM-dd'), data.originActualDeparture);
      actualFields.actual_loading_departure_verified = true;
      actualFields.actual_loading_departure_source = 'manual';
    }
    if (data.destActualArrival) {
      actualFields.actual_offloading_arrival = combineDateTime(format(data.offloadingDate, 'yyyy-MM-dd'), data.destActualArrival);
      actualFields.actual_offloading_arrival_verified = true;
      actualFields.actual_offloading_arrival_source = 'manual';
    }
    if (data.destActualDeparture) {
      actualFields.actual_offloading_departure = combineDateTime(format(data.offloadingDate, 'yyyy-MM-dd'), data.destActualDeparture);
      actualFields.actual_offloading_departure_verified = true;
      actualFields.actual_offloading_departure_source = 'manual';
    }

    const payload = {
      id: load.id,
      client_id: data.clientId || null,
      loading_date: format(data.loadingDate, "yyyy-MM-dd"),
      offloading_date: format(data.offloadingDate, "yyyy-MM-dd"),
      time_window: timeData as Load['time_window'],
      origin: data.origin,
      destination: data.destination,
      cargo_type: data.cargoType,
      fleet_vehicle_id: newFleetId,
      driver_id: newDriverId,
      notes: data.notes,
      status: newStatus,
      ...actualFields,
    };

    console.log('[EditLoadDialog] Saving load update:', {
      loadId: load.id,
      actualFieldsCount: Object.keys(actualFields).length,
      actualFields,
    });

    updateLoad.mutate(
      payload,
      {
        onSuccess: (returnedData) => {
          const rd = returnedData as Record<string, unknown> | null;
          console.log('[EditLoadDialog] Load update succeeded. DB returned:', {
            actual_loading_arrival: rd?.actual_loading_arrival,
            actual_loading_departure: rd?.actual_loading_departure,
            actual_offloading_arrival: rd?.actual_offloading_arrival,
            actual_offloading_departure: rd?.actual_offloading_departure,
          });
          onOpenChange(false);
        },
        onError: (error) => {
          console.error('[EditLoadDialog] Load update FAILED:', error);
        },
      },
    );
  };

  const availableDrivers = drivers;
  const availableVehicles = fleetVehicles;

  if (!load) return null;

  // Check if this delivered load needs time verification
  const isDelivered = load.status === 'delivered';
  const missingTimes: string[] = [];
  if (isDelivered) {
    if (!load.actual_loading_arrival || !load.actual_loading_arrival_verified) missingTimes.push('Loading Arrival');
    if (!load.actual_loading_departure || !load.actual_loading_departure_verified) missingTimes.push('Loading Departure');
    if (!load.actual_offloading_arrival || !load.actual_offloading_arrival_verified) missingTimes.push('Offloading Arrival');
    if (!load.actual_offloading_departure || !load.actual_offloading_departure_verified) missingTimes.push('Offloading Departure');
  }
  const needsVerification = isDelivered && missingTimes.length > 0;

  // Actual times are now always shown as editable form fields

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Pencil className="h-4 w-4" />
            </span>
            Edit Load - {load.load_id}
          </DialogTitle>
          <DialogDescription>
            Update load details and assignment
          </DialogDescription>
        </DialogHeader>

        {/* Alert banner for delivered loads missing actual times */}
        {needsVerification && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-600">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {missingTimes.length === 4 ? 'No actual times recorded' : `${missingTimes.length} time${missingTimes.length !== 1 ? 's' : ''} missing or unverified`}
              </span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
              This load is marked as delivered but has missing actual times. Please use the "Verify Times" button on the Loads table to add them.
            </p>
            <div className="flex flex-wrap gap-1">
              {missingTimes.map((m) => (
                <span key={m} className="text-[10px] px-1.5 py-0.5 rounded border border-amber-400 text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Load Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Load Information
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Load ID</p>
                  <p className="font-mono font-semibold text-foreground">
                    {load.load_id}
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cargoType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Load Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select load type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="VanSalesRetail">
                            Van Sales/Retail
                          </SelectItem>
                          <SelectItem value="Retail">Retail</SelectItem>
                          <SelectItem value="Vendor">Vendor</SelectItem>
                          <SelectItem value="RetailVendor">
                            Retail Vendor
                          </SelectItem>
                          <SelectItem value="Fertilizer">Fertilizer</SelectItem>
                          <SelectItem value="Export">Export</SelectItem>
                          <SelectItem value="BV">BV</SelectItem>
                          <SelectItem value="CBC">CBC</SelectItem>
                          <SelectItem value="Packaging">Packaging</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="in-transit">In Transit</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Schedule
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="loadingDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Loading Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value
                                ? format(field.value, "dd MMM yyyy")
                                : "Pick date"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="offloadingDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Offloading Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value
                                ? format(field.value, "dd MMM yyyy")
                                : "Pick date"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Origin - Farm */}
            <Card className="border-2 border-green-200 bg-green-50/30 dark:bg-green-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-green-600" />
                  Origin (Farm)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="origin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Farm</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select origin farm" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadFormConfig.origins.map((origin) => (
                            <SelectItem key={origin} value={origin}>
                              {origin} Farm
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="originPlannedArrival"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1 text-green-700 dark:text-green-400">
                          <Clock className="h-3 w-3" />
                          Planned Arrival
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            className="border-green-200"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="originPlannedDeparture"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1 text-green-700 dark:text-green-400">
                          <Clock className="h-3 w-3" />
                          Planned Departure
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            className="border-green-200"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Actual Times (editable) */}
                <>
                  <div className="border-t border-green-200 dark:border-green-800 pt-3 mt-3">
                    <Label className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">Actual Times</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="originActualArrival"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                            <Clock className="h-3 w-3" />
                            Actual Arrival
                            {load.actual_loading_arrival_verified && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              className="border-green-200"
                              placeholder="Not recorded"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="originActualDeparture"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                            <Clock className="h-3 w-3" />
                            Actual Departure
                            {load.actual_loading_departure_verified && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              className="border-green-200"
                              placeholder="Not recorded"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              </CardContent>
            </Card>

            {/* Destination - Depot or Client */}
            <Card className="border-2 border-blue-200 bg-blue-50/30 dark:bg-blue-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Destination (Depot)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {selectedCargoType === "Export"
                          ? "Select Export Destination"
                          : "Select Depot"}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                selectedCargoType === "Export"
                                  ? "Select export destination"
                                  : "Select destination depot"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableDestinations.map((dest) => (
                            <SelectItem key={dest} value={dest}>
                              {dest}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="destPlannedArrival"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1 text-blue-700 dark:text-blue-400">
                          <Clock className="h-3 w-3" />
                          Planned Arrival
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            className="border-blue-200"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="destPlannedDeparture"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1 text-blue-700 dark:text-blue-400">
                          <Clock className="h-3 w-3" />
                          Planned Departure
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            className="border-blue-200"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Actual Times (editable) */}
                <>
                  <div className="border-t border-blue-200 dark:border-blue-800 pt-3 mt-3">
                    <Label className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Actual Times</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="destActualArrival"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400">
                            <Clock className="h-3 w-3" />
                            Actual Arrival
                            {load.actual_offloading_arrival_verified && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              className="border-blue-200"
                              placeholder="Not recorded"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="destActualDeparture"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400">
                            <Clock className="h-3 w-3" />
                            Actual Departure
                            {load.actual_offloading_departure_verified && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              className="border-blue-200"
                              placeholder="Not recorded"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              </CardContent>
            </Card>

            {/* Assignment */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Assignment
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fleetVehicleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-muted-foreground">No vehicle</span>
                          </SelectItem>
                          {availableVehicles.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.vehicle_id} - {vehicle.type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="driverId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select driver" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-muted-foreground">No driver</span>
                          </SelectItem>
                          {availableDrivers.map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Backload Section */}
            <Card className="border-2 border-orange-200 bg-orange-50/30 dark:bg-orange-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-orange-600" />
                    Backload (Return Trip)
                  </div>
                  <FormField
                    control={form.control}
                    name="hasBackload"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              id="hasBackload"
                            />
                          </FormControl>
                          <Label 
                            htmlFor="hasBackload"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Include backload
                          </Label>
                        </div>
                      </FormItem>
                    )}
                  />
                </CardTitle>
              </CardHeader>
              {hasBackload && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="backloadDestination"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Backload Destination (Farm)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select farm" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {loadFormConfig.backloadDestinations.map((dest) => (
                                <SelectItem key={dest} value={dest}>
                                  {dest} Farm
                                </SelectItem>
                              ))}
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
                          <FormLabel>Cargo Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select cargo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {loadFormConfig.backloadCargoTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="backloadOffloadingDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Backload Offloading Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value
                                  ? format(field.value, "dd MMM yyyy")
                                  : "Pick date"}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Quantity Fields - FIXED: Removed standalone FormLabel */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium">Backload Quantities</h5>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="backloadBins"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded bg-blue-500" />
                              Bins
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                className="border-orange-200"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="backloadCrates"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded bg-green-500" />
                              Crates
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                className="border-orange-200"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="backloadPallets"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded bg-amber-500" />
                              Pallets
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                className="border-orange-200"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="backloadNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Backload Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any backload specific information..."
                            className="resize-none"
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

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateLoad.isPending}>
                {updateLoad.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}