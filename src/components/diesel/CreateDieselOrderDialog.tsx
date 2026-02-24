import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  fuelStations,
  generateDieselOrderNumber,
  useCreateDieselOrder,
} from "@/hooks/useDieselOrders";
import { useDrivers } from "@/hooks/useDrivers";
import { useFleetVehicles } from "@/hooks/useFleetVehicles";
import { type Load, useLoads } from "@/hooks/useLoads";
import { zodResolver } from "@hookform/resolvers/zod";
import { safeFormatDate } from "@/lib/utils";
import { Fuel, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  load_id: z.string().min(1, "Please select a trip"),
  fuel_station: z.string().min(1, "Fuel station is required"),
  custom_fuel_station: z.string().optional(),
  quantity_liters: z.coerce
    .number()
    .min(1, "Quantity must be at least 1 liter"),
  cost_per_liter: z.coerce.number().min(0).optional(),
  driver_id: z.string().min(1, "Please select a driver"),
  fleet_vehicle_id: z.string().min(1, "Please select a fleet vehicle"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateDieselOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedLoadId?: string;
}

export function CreateDieselOrderDialog({
  open,
  onOpenChange,
  preselectedLoadId,
}: CreateDieselOrderDialogProps) {
  const { data: loads = [], isLoading: loadsLoading } = useLoads();
  const { data: drivers = [], isLoading: driversLoading } = useDrivers();
  const { data: fleetVehicles = [], isLoading: vehiclesLoading } =
    useFleetVehicles();
  const createDieselOrder = useCreateDieselOrder();
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      load_id: preselectedLoadId || "",
      fuel_station: "",
      custom_fuel_station: "",
      quantity_liters: 0,
      cost_per_liter: undefined,
      driver_id: "",
      fleet_vehicle_id: "",
      notes: "",
    },
  });

  const watchedFuelStation = form.watch("fuel_station");
  const watchedLoadId = form.watch("load_id");
  const _watchedDriverId = form.watch("driver_id");

  // Update selected load when load_id changes
  useEffect(() => {
    if (watchedLoadId) {
      const load = loads.find((l) => l.id === watchedLoadId);
      setSelectedLoad(load || null);

      // Auto-fill driver and fleet vehicle from the load if available
      if (load?.driver?.id) {
        form.setValue("driver_id", load.driver.id);
      }
      if (load?.fleet_vehicle?.id) {
        form.setValue("fleet_vehicle_id", load.fleet_vehicle.id);
      }
    } else {
      setSelectedLoad(null);
    }
  }, [watchedLoadId, loads, form]);

  // Set preselected load when dialog opens
  useEffect(() => {
    if (open && preselectedLoadId) {
      form.setValue("load_id", preselectedLoadId);
    }
  }, [open, preselectedLoadId, form]);

  // Filter to show only active loads (scheduled or in-transit)
  // Also include the preselected load even if it's not active (e.g. delivered)
  const activeLoads = loads.filter(
    (load) =>
      load.status === "scheduled" ||
      load.status === "in-transit" ||
      (preselectedLoadId && load.id === preselectedLoadId),
  );

  const handleSubmit = (data: FormData) => {
    const fuelStation =
      data.fuel_station === "Other" && data.custom_fuel_station
        ? data.custom_fuel_station
        : data.fuel_station;

    const totalCost = data.cost_per_liter
      ? data.quantity_liters * data.cost_per_liter
      : null;

    // Get driver details for denormalized storage
    const selectedDriver = drivers.find((d) => d.id === data.driver_id);

    createDieselOrder.mutate(
      {
        order_number: generateDieselOrderNumber(),
        load_id: data.load_id,
        fuel_station: fuelStation,
        quantity_liters: data.quantity_liters,
        cost_per_liter: data.cost_per_liter || null,
        total_cost: totalCost,
        driver_id: data.driver_id,
        fleet_vehicle_id: data.fleet_vehicle_id,
        recipient_name: selectedDriver?.name || null,
        recipient_phone: selectedDriver?.contact || null,
        notes: data.notes || null,
        status: "pending",
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-orange-500" />
            Create Diesel Order
          </DialogTitle>
          <DialogDescription>
            Create a new diesel order and associate it with an existing trip.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Trip Selection */}
            <FormField
              control={form.control}
              name="load_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Trip *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a trip" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadsLoading ? (
                        <div className="p-2 text-center text-muted-foreground">
                          Loading trips...
                        </div>
                      ) : activeLoads.length === 0 ? (
                        <div className="p-2 text-center text-muted-foreground">
                          No active trips available
                        </div>
                      ) : (
                        activeLoads.map((load) => (
                          <SelectItem key={load.id} value={load.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {load.load_id}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {load.origin} → {load.destination} |{" "}
                                {safeFormatDate(load.loading_date, "dd MMM")}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Selected Trip Details */}
            {selectedLoad && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <h4 className="font-medium text-sm">Trip Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Route:</span>
                    <span className="ml-2">
                      {selectedLoad.origin} → {selectedLoad.destination}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <span className="ml-2">
                      {safeFormatDate(
                        selectedLoad.loading_date,
                        "dd MMM yyyy",
                      )}
                    </span>
                  </div>
                  {selectedLoad.driver && (
                    <div>
                      <span className="text-muted-foreground">Driver:</span>
                      <span className="ml-2">{selectedLoad.driver.name}</span>
                    </div>
                  )}
                  {selectedLoad.fleet_vehicle && (
                    <div>
                      <span className="text-muted-foreground">Vehicle:</span>
                      <span className="ml-2">
                        {selectedLoad.fleet_vehicle.vehicle_id}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fuel Station */}
            <FormField
              control={form.control}
              name="fuel_station"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fuel Station *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fuel station" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fuelStations.map((station) => (
                        <SelectItem key={station} value={station}>
                          {station}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Fuel Station */}
            {watchedFuelStation === "Other" && (
              <FormField
                control={form.control}
                name="custom_fuel_station"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Fuel Station Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter fuel station name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Quantity and Cost */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity_liters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity (Liters) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Enter quantity"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost_per_liter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost per Liter (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="Enter cost"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Recipient Details - Driver and Fleet Vehicle Selection */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="driver_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient (Driver) *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {driversLoading ? (
                          <div className="p-2 text-center text-muted-foreground">
                            Loading drivers...
                          </div>
                        ) : drivers.length === 0 ? (
                          <div className="p-2 text-center text-muted-foreground">
                            No drivers available
                          </div>
                        ) : (
                          drivers.map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {driver.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {driver.contact}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fleet_vehicle_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fleet Number *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehiclesLoading ? (
                          <div className="p-2 text-center text-muted-foreground">
                            Loading vehicles...
                          </div>
                        ) : fleetVehicles.length === 0 ? (
                          <div className="p-2 text-center text-muted-foreground">
                            No vehicles available
                          </div>
                        ) : (
                          fleetVehicles.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {vehicle.vehicle_id}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {vehicle.type} - {vehicle.make_model || "N/A"}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      placeholder="Additional instructions or notes..."
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
                disabled={createDieselOrder.isPending}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {createDieselOrder.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Order
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}