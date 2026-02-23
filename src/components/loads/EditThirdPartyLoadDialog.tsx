import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { parseTimeWindow } from "@/lib/timeWindow";
import type { Json } from "@/integrations/supabase/types";
import
  {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { useClients } from "@/hooks/useClients";
import { useDrivers } from "@/hooks/useDrivers";
import { useFleetVehicles } from "@/hooks/useFleetVehicles";
import { type Load, useUpdateLoad } from "@/hooks/useLoads";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import
  {
    CalendarIcon,
    Check,
    ChevronsUpDown,
    Clock,
    Link2,
    Loader2,
    MapPin,
    Pencil,
    Truck,
    UserPlus,
  } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CreateClientDialog } from "./CreateClientDialog";

// === NEW IMPORTS FOR DEPOT COMBOBOX ===
import { DEPOTS } from "@/lib/depots";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const formSchema = z.object({
  priority: z.enum(["high", "medium", "low"]),
  loadingDate: z.date({ required_error: "Loading date is required" }),
  offloadingDate: z.date({ required_error: "Offloading date is required" }),
  customerId: z.string().min(1, "Customer is required"),
  loadingPlaceName: z.string().min(1, "Loading depot is required"),
  loadingAddress: z.string().optional(),
  offloadingPlaceName: z.string().min(1, "Offloading depot is required"),
  offloadingAddress: z.string().optional(),
  loadingPlannedArrival: z.string().min(1, "Planned arrival time is required"),
  loadingPlannedDeparture: z
    .string()
    .min(1, "Planned departure time is required"),
  offloadingPlannedArrival: z
    .string()
    .min(1, "Planned arrival time is required"),
  offloadingPlannedDeparture: z
    .string()
    .min(1, "Planned departure time is required"),
  cargoDescription: z.string().min(1, "Cargo description is required"),
  fleetVehicleId: z.string().min(1, "Vehicle is required"),
  driverId: z.string().optional(),
  notes: z.string(),
  status: z.enum(["pending", "scheduled", "in-transit", "delivered"]),
});

type FormData = z.infer<typeof formSchema>;

interface EditThirdPartyLoadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  load: Load | null;
}

// === DEPOT COMBOBOX COMPONENT (reused from Add dialog) ===
const DepotCombobox: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);

  const depotsByCountry = useMemo(() => {
    const map: Record<string, typeof DEPOTS> = {};
    DEPOTS.forEach((depot) => {
      const key = depot.country;
      if (!map[key]) map[key] = [];
      map[key].push(depot);
    });
    return map;
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value
            ? DEPOTS.find((depot) => depot.name === value)?.name ?? value
            : "Select a depot..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 max-w-[--radix-popover-trigger-width]">
        <Command>
          <CommandInput placeholder="Search depots..." />
          <CommandList>
            <CommandEmpty>No depot found.</CommandEmpty>
            {Object.keys(depotsByCountry)
              .sort()
              .map((country) => (
                <CommandGroup key={country} heading={country}>
                  {depotsByCountry[country]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((depot) => (
                      <CommandItem
                        key={depot.id}
                        value={depot.name}
                        onSelect={() => {
                          onChange(depot.name);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === depot.name ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {depot.name}
                        <span className="ml-auto text-sm text-muted-foreground">
                          {depot.type}
                        </span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export function EditThirdPartyLoadDialog({
  open,
  onOpenChange,
  load,
}: EditThirdPartyLoadDialogProps) {
  const [createClientDialogOpen, setCreateClientDialogOpen] = useState(false);
  const updateLoad = useUpdateLoad();
  const { data: clients = [] } = useClients();
  const { data: fleetVehicles = [] } = useFleetVehicles();
  const { data: drivers = [] } = useDrivers();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      priority: "medium",
      customerId: "",
      loadingPlaceName: "",
      loadingAddress: "",
      offloadingPlaceName: "",
      offloadingAddress: "",
      loadingPlannedArrival: "08:00",
      loadingPlannedDeparture: "10:00",
      offloadingPlannedArrival: "14:00",
      offloadingPlannedDeparture: "16:00",
      cargoDescription: "",
      fleetVehicleId: "",
      driverId: "none",
      notes: "",
      status: "scheduled",
    },
  });

  useEffect(() => {
    if (load && open) {
      const times = parseTimeWindow(load.time_window);

      form.reset({
        priority: load.priority as "high" | "medium" | "low",
        loadingDate: parseISO(load.loading_date),
        offloadingDate: parseISO(load.offloading_date),
        customerId: times.thirdParty?.customerId || "",
        loadingPlaceName: times.origin?.placeName || load.origin,
        loadingAddress: times.origin?.address || "",
        offloadingPlaceName: times.destination?.placeName || load.destination,
        offloadingAddress: times.destination?.address || "",
        loadingPlannedArrival: times.origin?.plannedArrival || "08:00",
        loadingPlannedDeparture: times.origin?.plannedDeparture || "10:00",
        offloadingPlannedArrival: times.destination?.plannedArrival || "14:00",
        offloadingPlannedDeparture:
          times.destination?.plannedDeparture || "16:00",
        cargoDescription: times.thirdParty?.cargoDescription || "",
        fleetVehicleId: load.fleet_vehicle_id || "",
        driverId: load.driver_id || "none",
        notes: load.notes || "",
        status: load.status as FormData["status"],
      });
    }
  }, [load, open, form]);

  const handleSubmit = (data: FormData) => {
    if (!load) return;

    const customer = clients.find((c) => c.id === data.customerId);
    if (!customer) {
      toast.error("Customer not found");
      return;
    }

    const existingTimeData = parseTimeWindow(load.time_window);

    const timeData = {
      origin: {
        plannedArrival: data.loadingPlannedArrival,
        plannedDeparture: data.loadingPlannedDeparture,
        placeName: data.loadingPlaceName,
        address: data.loadingAddress,
      },
      destination: {
        plannedArrival: data.offloadingPlannedArrival,
        plannedDeparture: data.offloadingPlannedDeparture,
        placeName: data.offloadingPlaceName,
        address: data.offloadingAddress,
      },
      thirdParty: {
        customerId: customer.id,
        customerName: customer.name,
        cargoDescription: data.cargoDescription,
        linkedLoadNumber: existingTimeData.thirdParty?.linkedLoadNumber || null,
        referenceNumber: existingTimeData.thirdParty?.referenceNumber || null,
      },
      backload: existingTimeData.backload,
    };

    // Determine status: if both fleet and driver are provided and current status is pending, auto-upgrade to scheduled
    const newFleetId = data.fleetVehicleId || null;
    const newDriverId = data.driverId === "none" ? null : data.driverId || null;
    const hasFleetAndDriver = newFleetId && newDriverId;
    const currentStatus = load.status;
    const newStatus = hasFleetAndDriver && currentStatus === 'pending' ? 'scheduled' : data.status;

    updateLoad.mutate(
      {
        id: load.id,
        loading_date: format(data.loadingDate, "yyyy-MM-dd"),
        offloading_date: format(data.offloadingDate, "yyyy-MM-dd"),
        origin: data.loadingPlaceName,
        destination: data.offloadingPlaceName,
        priority: data.priority,
        status: newStatus,
        fleet_vehicle_id: newFleetId,
        driver_id: newDriverId,
        time_window: timeData as unknown as Json,
        notes: data.notes,
      },
      {
        onSuccess: () => {
          toast.success("Third-party load updated successfully");
          onOpenChange(false);
        },
        onError: () => {
          toast.error("Failed to update load");
        },
      },
    );
  };

  if (!load) return null;

  const timeWindowData = parseTimeWindow(load.time_window);
  const linkedLoadNumber = timeWindowData.thirdParty?.linkedLoadNumber;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-purple-600" />
              Edit Third-Party Load
            </DialogTitle>
            <DialogDescription>
              Update details for load{" "}
              <span className="font-semibold text-purple-600">
                {load.load_id}
              </span>
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              {/* Linked Load Info */}
              {linkedLoadNumber && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                    <Link2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Linked to Load:</span>
                    <span className="text-sm font-semibold">
                      {linkedLoadNumber}
                    </span>
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-purple-700 dark:text-purple-400 flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Load Status
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-gray-900">
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

              {/* Customer Selection */}
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-purple-600" />
                    Customer
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateClientDialogOpen(true)}
                    className="gap-1.5"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    New Customer
                  </Button>
                </div>
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a customer" />
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
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="loadingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loading Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick a date"}
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
                    <FormItem>
                      <FormLabel>Offloading Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick a date"}
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
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Loading Location Section */}
              <div className="space-y-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <h4 className="font-medium flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                  <MapPin className="h-4 w-4" />
                  Loading Depot
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="loadingPlaceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Depot</FormLabel>
                        <FormControl>
                          <DepotCombobox value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="loadingAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Full address (overrides depot)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="loadingPlannedArrival"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Planned Arrival
                        </FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="loadingPlannedDeparture"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Planned Departure
                        </FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Offloading Location Section */}
              <div className="space-y-4 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                <h4 className="font-medium flex items-center gap-2 text-teal-700 dark:text-teal-400">
                  <MapPin className="h-4 w-4" />
                  Offloading Depot
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="offloadingPlaceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Depot</FormLabel>
                        <FormControl>
                          <DepotCombobox value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="offloadingAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Full address (overrides depot)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="offloadingPlannedArrival"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Planned Arrival
                        </FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="offloadingPlannedDeparture"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Planned Departure
                        </FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Cargo & Assignment */}
              <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <h4 className="font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Truck className="h-4 w-4" />
                  Cargo & Assignment
                </h4>
                <FormField
                  control={form.control}
                  name="cargoDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the cargo being transported..."
                          className="resize-none bg-white dark:bg-gray-900"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                            <SelectTrigger className="bg-white dark:bg-gray-900">
                              <SelectValue placeholder="Select vehicle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {fleetVehicles.map((vehicle) => (
                              <SelectItem key={vehicle.id} value={vehicle.id}>
                                {vehicle.vehicle_id} -{" "}
                                {vehicle.type ?? "Unknown Type"}
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
                        <FormLabel>Driver (Optional)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white dark:bg-gray-900">
                              <SelectValue placeholder="Select driver" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">
                              No driver assigned
                            </SelectItem>
                            {drivers.map((driver) => (
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

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateLoad.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {updateLoad.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <CreateClientDialog
        open={createClientDialogOpen}
        onOpenChange={setCreateClientDialogOpen}
      />
    </>
  );
}