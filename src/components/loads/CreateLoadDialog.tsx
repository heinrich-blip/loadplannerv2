import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useDrivers } from "@/hooks/useDrivers";
import { useFleetVehicles } from "@/hooks/useFleetVehicles";
import { generateLoadId, useCreateLoad } from "@/hooks/useLoads";
import { useClients } from "@/hooks/useClients";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, MapPin, Package, Truck } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import loadFormConfig from "@/constants/loadFormConfig";

const formSchema = z.object({
  clientId: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]),
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
  ]),
  fleetVehicleId: z.string().optional(),
  driverId: z.string().optional(),
  notes: z.string(),
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

interface CreateLoadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLoadDialog({
  open,
  onOpenChange,
}: CreateLoadDialogProps) {
  const { data: drivers = [] } = useDrivers();
  const { data: fleetVehicles = [] } = useFleetVehicles();
  const { data: clients = [] } = useClients();
  const createLoad = useCreateLoad();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: "",
      priority: "medium",
      origin: "",
      originPlannedArrival: "15:00",
      originPlannedDeparture: "17:00",
      destination: "",
      destPlannedArrival: "08:00",
      destPlannedDeparture: "11:00",
      notes: "",
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

  const selectedOrigin = form.watch("origin");
  const selectedDestination = form.watch("destination");
  const selectedCargoType = form.watch("cargoType");
  const hasBackload = form.watch("hasBackload");

  // Get available destinations based on cargo type
  const availableDestinations =
    selectedCargoType === "Export" ? loadFormConfig.exportDestinations : loadFormConfig.destinations;

  // Auto-update times when origin changes
  useEffect(() => {
    if (selectedOrigin && loadFormConfig.originDefaults[selectedOrigin]) {
      form.setValue(
        "originPlannedArrival",
        loadFormConfig.originDefaults[selectedOrigin].arrival,
      );
      form.setValue(
        "originPlannedDeparture",
        loadFormConfig.originDefaults[selectedOrigin].departure,
      );
    }
  }, [selectedOrigin, form]);

  // Auto-update times when destination changes
  useEffect(() => {
    if (selectedDestination && loadFormConfig.destinationDefaults[selectedDestination]) {
      form.setValue(
        "destPlannedArrival",
        loadFormConfig.destinationDefaults[selectedDestination].arrival,
      );
      form.setValue(
        "destPlannedDeparture",
        loadFormConfig.destinationDefaults[selectedDestination].departure,
      );
    }
  }, [selectedDestination, form]);

  const handleSubmit = (data: FormData) => {
    // Store planned times and backload info in time_window as JSON
    const timeData: {
      origin: { plannedArrival: string; plannedDeparture: string };
      destination: { plannedArrival: string; plannedDeparture: string };
      backload?: {
        enabled: boolean;
        destination: string;
        cargoType: string;
        offloadingDate: string;
        plannedArrival?: string;
        plannedDeparture?: string;
        quantities?: {
          bins: number;
          crates: number;
          pallets: number;
        };
        notes?: string;
      };
    } = {
      origin: {
        plannedArrival: data.originPlannedArrival,
        plannedDeparture: data.originPlannedDeparture,
      },
      destination: {
        plannedArrival: data.destPlannedArrival,
        plannedDeparture: data.destPlannedDeparture,
      },
    };

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

    // Determine initial status based on fleet and driver allocation
    const initialStatus = data.fleetVehicleId && data.driverId ? "scheduled" : "pending";

    createLoad.mutate(
      {
        load_id: generateLoadId(),
        priority: data.priority,
        loading_date: format(data.loadingDate, "yyyy-MM-dd"),
        offloading_date: format(data.offloadingDate, "yyyy-MM-dd"),
        time_window: timeData,
        origin: data.origin,
        destination: data.destination,
        cargo_type: data.cargoType,
        fleet_vehicle_id: data.fleetVehicleId || null,
        driver_id: data.driverId || null,
        client_id: data.clientId || null,
        notes: data.notes,
        status: initialStatus,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      },
    );
  };

  const availableDrivers = drivers.filter((d) => d.available);
  const availableVehicles = fleetVehicles.filter((v) => v.available);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Truck className="h-4 w-4" />
            </span>
            Create New Load
          </DialogTitle>
          <DialogDescription>
            Plan a new load with origin and destination times
          </DialogDescription>
        </DialogHeader>

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
                    {generateLoadId()}
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
                        defaultValue={field.value}
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
              </CardContent>
            </Card>

            {/* Destination - Depot or Client */}
            <Card className="border-2 border-blue-200 bg-blue-50/30 dark:bg-blue-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Destination (Depot / Client)
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
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select driver" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          Include backload
                        </FormLabel>
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
                  {/* Quantity Fields */}
                  <div className="space-y-2">
                    <FormLabel className="text-sm font-medium">
                      Backload Quantities
                    </FormLabel>
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
              <Button type="submit" disabled={createLoad.isPending}>
                {createLoad.isPending ? "Creating..." : "Create Load"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}