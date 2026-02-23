import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { parseTimeWindow } from '@/lib/timeWindow';
import type { Json } from '@/integrations/supabase/types';
import
  {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import
  {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useClients } from '@/hooks/useClients';
import { generateLoadId, type Load, useCreateLoad, useUpdateLoad } from '@/hooks/useLoads';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Check, ChevronsUpDown, Clock, Loader2, MapPin, RotateCcw, Truck, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { CreateClientDialog } from './CreateClientDialog';
import { DEPOTS } from '@/lib/depots';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

const formSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  loadingPlaceName: z.string().min(1, 'Pickup depot is required'),
  loadingAddress: z.string().optional(),
  offloadingPlaceName: z.string().min(1, 'Destination depot is required'),
  offloadingAddress: z.string().optional(),
  loadingDate: z.date({ required_error: 'Loading date is required' }),
  offloadingDate: z.date({ required_error: 'Offloading date is required' }),
  loadingPlannedArrival: z.string().min(1, 'Planned arrival time is required'),
  loadingPlannedDeparture: z.string().min(1, 'Planned departure time is required'),
  offloadingPlannedArrival: z.string().min(1, 'Planned arrival time is required'),
  offloadingPlannedDeparture: z.string().min(1, 'Planned departure time is required'),
  cargoDescription: z.string().min(1, 'Cargo description is required'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddThirdPartyBackloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  load: Load | null;
}

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
            : 'Select a depot...'}
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
                            'mr-2 h-4 w-4',
                            value === depot.name ? 'opacity-100' : 'opacity-0'
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

export function AddThirdPartyBackloadDialog({ open, onOpenChange, load }: AddThirdPartyBackloadDialogProps) {
  const [createClientDialogOpen, setCreateClientDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const updateLoad = useUpdateLoad();
  const createLoad = useCreateLoad();
  const { data: clients = [] } = useClients();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: '',
      loadingPlaceName: '',
      loadingAddress: '',
      offloadingPlaceName: '',
      offloadingAddress: '',
      loadingPlannedArrival: '14:00',
      loadingPlannedDeparture: '16:00',
      offloadingPlannedArrival: '18:00',
      offloadingPlannedDeparture: '20:00',
      cargoDescription: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (load && open) {
      const times = parseTimeWindow(load.time_window);
      
      if (times.backload?.enabled && times.backload?.isThirdParty) {
        const backload = times.backload;
        setIsEditMode(true);
        
        form.reset({
          customerId: backload.thirdParty?.customerId || '',
          loadingPlaceName: backload.origin?.placeName || '',
          loadingAddress: backload.origin?.address || '',
          offloadingPlaceName: backload.destination || '',
          offloadingAddress: '',
          loadingDate: backload.loadingDate ? parseISO(backload.loadingDate) : parseISO(load.offloading_date || load.loading_date),
          offloadingDate: backload.offloadingDate ? parseISO(backload.offloadingDate) : parseISO(load.offloading_date || load.loading_date),
          loadingPlannedArrival: backload.origin?.plannedArrival || '14:00',
          loadingPlannedDeparture: backload.origin?.plannedDeparture || '16:00',
          offloadingPlannedArrival: '18:00',
          offloadingPlannedDeparture: '20:00',
          cargoDescription: backload.thirdParty?.cargoDescription || '',
          notes: backload.notes || '',
        });
      } else {
        setIsEditMode(false);
        const defaultDate = load.offloading_date ? parseISO(load.offloading_date) : parseISO(load.loading_date);
        form.reset({
          customerId: '',
          loadingPlaceName: load.destination,
          loadingAddress: '',
          offloadingPlaceName: '',
          offloadingAddress: '',
          loadingDate: defaultDate,
          offloadingDate: defaultDate,
          loadingPlannedArrival: '14:00',
          loadingPlannedDeparture: '16:00',
          offloadingPlannedArrival: '18:00',
          offloadingPlannedDeparture: '20:00',
          cargoDescription: '',
          notes: '',
        });
      }
    }
  }, [load, open, form]);

  const handleSubmit = (data: FormData) => {
    if (!load) return;

    const customer = clients.find(c => c.id === data.customerId);
    if (!customer) {
      toast.error('Customer not found');
      return;
    }

    const existingTimeData = parseTimeWindow(load.time_window);

    // Create new load with proper structure
    const newLoadTimeWindow = {
      origin: {
        placeName: data.loadingPlaceName,
        address: data.loadingAddress || '',
        plannedArrival: data.loadingPlannedArrival,
        plannedDeparture: data.loadingPlannedDeparture,
        actualArrival: '',
        actualDeparture: '',
      },
      destination: {
        placeName: data.offloadingPlaceName,
        address: data.offloadingAddress || '',
        plannedArrival: data.offloadingPlannedArrival,
        plannedDeparture: data.offloadingPlannedDeparture,
        actualArrival: '',
        actualDeparture: '',
      },
      thirdParty: {
        customerId: customer.id,
        customerName: customer.name,
        cargoDescription: data.cargoDescription,
        linkedLoadId: load.id,
        linkedLoadNumber: load.load_id,
      },
    };

    createLoad.mutate(
      {
        load_id: generateLoadId('TP'),
        priority: 'medium',
        loading_date: format(data.loadingDate, 'yyyy-MM-dd'),
        offloading_date: format(data.offloadingDate, 'yyyy-MM-dd'),
        time_window: newLoadTimeWindow,
        origin: data.loadingPlaceName,
        destination: data.offloadingPlaceName,
        cargo_type: 'Retail',
        quantity: 0,
        weight: 0,
        special_handling: [],
        fleet_vehicle_id: load.fleet_vehicle_id,
        driver_id: load.driver_id,
        co_driver_id: load.co_driver_id,
        notes: `[Third-Party Backload from ${load.load_id}]\nCustomer: ${customer.name}\nCargo: ${data.cargoDescription}${data.notes ? '\n' + data.notes : ''}`,
        status: 'scheduled',
      },
      {
        onSuccess: (newLoad) => {
          // Update parent load with backload info
          const updatedTimeData = {
            ...existingTimeData,
            backload: {
              enabled: true,
              isThirdParty: true,
              destination: data.offloadingPlaceName,
              cargoType: 'Retail',
              offloadingDate: format(data.offloadingDate, 'yyyy-MM-dd'),
              loadingDate: format(data.loadingDate, 'yyyy-MM-dd'),
              origin: {
                placeName: data.loadingPlaceName,
                address: data.loadingAddress || '',
                plannedArrival: data.loadingPlannedArrival,
                plannedDeparture: data.loadingPlannedDeparture,
              },
              thirdParty: {
                customerId: customer.id,
                customerName: customer.name,
                cargoDescription: data.cargoDescription,
                linkedLoadNumber: newLoad.load_id,
              },
              notes: data.notes || '',
            },
          };

          updateLoad.mutate(
            {
              id: load.id,
              time_window: updatedTimeData as unknown as Json,
            },
            {
              onSuccess: () => {
                toast.success(isEditMode ? 'Third-party backload updated successfully' : 'Third-party backload created successfully');
                onOpenChange(false);
                form.reset();
              },
              onError: () => {
                toast.success('Third-party load created, but failed to link to parent load');
                onOpenChange(false);
                form.reset();
              },
            }
          );
        },
        onError: () => {
          toast.error('Failed to create third-party backload');
        },
      }
    );
  };

  if (!load) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-600" />
              {isEditMode ? 'Edit Third-Party Backload' : 'Add Third-Party Backload'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? <>Update the third-party backload details for load <span className="font-semibold text-orange-600">{load.load_id}</span>.</>
                : <>Add a third-party backload for load <span className="font-semibold">{load.load_id}</span>. Configure the return journey with customer and location details.</>
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Customer Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Backload Customer</h4>
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
                      <FormLabel htmlFor="customerId">Customer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger id="customerId">
                            <SelectValue placeholder="Select a customer for the backload" />
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
                      <FormLabel htmlFor="loadingDate">Backload Loading Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              id="loadingDate"
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? format(field.value, 'PPP') : 'Pick a date'}
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
                      <FormLabel htmlFor="offloadingDate">Backload Offloading Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              id="offloadingDate"
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? format(field.value, 'PPP') : 'Pick a date'}
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

              {/* Backload Pickup Depot */}
              <div className="space-y-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                <h4 className="font-medium flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <Truck className="h-4 w-4" />
                  Backload Pickup Depot
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="loadingPlaceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="loadingPlaceName">Depot</FormLabel>
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
                        <FormLabel htmlFor="loadingAddress">Address (Optional)</FormLabel>
                        <FormControl>
                          <Input id="loadingAddress" placeholder="Full address (overrides depot)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="loadingPlannedArrival"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="loadingPlannedArrival" className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          Arrival Time
                        </FormLabel>
                        <FormControl>
                          <Input id="loadingPlannedArrival" type="time" {...field} />
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
                        <FormLabel htmlFor="loadingPlannedDeparture" className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          Departure Time
                        </FormLabel>
                        <FormControl>
                          <Input id="loadingPlannedDeparture" type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Backload Destination Depot */}
              <div className="space-y-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                <h4 className="font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <MapPin className="h-4 w-4" />
                  Backload Destination Depot
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="offloadingPlaceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="offloadingPlaceName">Depot</FormLabel>
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
                        <FormLabel htmlFor="offloadingAddress">Address (Optional)</FormLabel>
                        <FormControl>
                          <Input id="offloadingAddress" placeholder="Full address (overrides depot)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="offloadingPlannedArrival"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="offloadingPlannedArrival" className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          Arrival Time
                        </FormLabel>
                        <FormControl>
                          <Input id="offloadingPlannedArrival" type="time" {...field} />
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
                        <FormLabel htmlFor="offloadingPlannedDeparture" className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          Departure Time
                        </FormLabel>
                        <FormControl>
                          <Input id="offloadingPlannedDeparture" type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Cargo Description */}
              <FormField
                control={form.control}
                name="cargoDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="cargoDescription">Cargo Description</FormLabel>
                    <FormControl>
                      <Input id="cargoDescription" placeholder="What cargo is being returned?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="notes">Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        id="notes"
                        placeholder="Any additional notes for this backload..."
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
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createLoad.isPending || updateLoad.isPending || !form.watch('customerId')}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {(createLoad.isPending || updateLoad.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? 'Update Backload' : 'Add Backload'}
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