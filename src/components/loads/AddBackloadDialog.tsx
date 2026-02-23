import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseTimeWindow } from '@/lib/timeWindow';
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
import { type Load, useUpdateLoad } from '@/hooks/useLoads';
import { cn, getLocationDisplayName } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, MapPin, Package, RotateCcw, Truck } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { backloadDestinations, backloadCargoTypes } from '@/constants/loadFormConfig';

const formSchema = z.object({
  backloadDestination: z.string().min(1, 'Backload destination is required'),
  backloadCargoType: z.enum(['Packaging', 'Fertilizer', 'BV', 'CBC'], {
    required_error: 'Cargo type is required',
  }),
  backloadOffloadingDate: z.date({
    required_error: 'Offloading date is required',
  }),
  // Quantity fields for bins, crates, and pallets
  bins: z.number().min(0, 'Bins cannot be negative').default(0),
  crates: z.number().min(0, 'Crates cannot be negative').default(0),
  pallets: z.number().min(0, 'Pallets cannot be negative').default(0),
  backloadNotes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddBackloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  load: Load | null;
}

export function AddBackloadDialog({ open, onOpenChange, load }: AddBackloadDialogProps) {
  const updateLoad = useUpdateLoad();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      backloadDestination: '',
      backloadCargoType: undefined,
      backloadOffloadingDate: undefined,
      bins: 0,
      crates: 0,
      pallets: 0,
      backloadNotes: '',
    },
  });

  // Reset form when load changes
  useEffect(() => {
    if (load && open) {
      const times = parseTimeWindow(load.time_window);
      
      // Pre-fill with existing backload data if available
      if (times.backload?.enabled) {
        form.reset({
          backloadDestination: times.backload.destination || '',
          backloadCargoType: times.backload.cargoType as 'Packaging' | 'Fertilizer' | 'BV' | 'CBC' | undefined,
          backloadOffloadingDate: times.backload.offloadingDate ? parseISO(times.backload.offloadingDate) : undefined,
          bins: times.backload.quantities?.bins || 0,
          crates: times.backload.quantities?.crates || 0,
          pallets: times.backload.quantities?.pallets || 0,
          backloadNotes: times.backload.notes || '',
        });
      } else {
        // Default to same day as offloading date for backload delivery
        form.reset({
          backloadDestination: '',
          backloadCargoType: undefined,
          backloadOffloadingDate: load.offloading_date ? parseISO(load.offloading_date) : undefined,
          bins: 0,
          crates: 0,
          pallets: 0,
          backloadNotes: '',
        });
      }
    }
  }, [load, open, form]);

  const handleSubmit = (data: FormData) => {
    if (!load) return;

    // Parse existing time window data to preserve actual times
    const existingTimeData = parseTimeWindow(load.time_window);

    // Build updated time_window with backload info while preserving actual times
    const timeData = {
      origin: {
        plannedArrival: existingTimeData.origin.plannedArrival,
        plannedDeparture: existingTimeData.origin.plannedDeparture,
        actualArrival: existingTimeData.origin.actualArrival,
        actualDeparture: existingTimeData.origin.actualDeparture,
      },
      destination: {
        plannedArrival: existingTimeData.destination.plannedArrival,
        plannedDeparture: existingTimeData.destination.plannedDeparture,
        actualArrival: existingTimeData.destination.actualArrival,
        actualDeparture: existingTimeData.destination.actualDeparture,
      },
      backload: {
        enabled: true,
        destination: data.backloadDestination,
        cargoType: data.backloadCargoType,
        offloadingDate: format(data.backloadOffloadingDate, 'yyyy-MM-dd'),
        quantities: {
          bins: data.bins,
          crates: data.crates,
          pallets: data.pallets,
        },
        notes: data.backloadNotes || '',
      },
    };

    updateLoad.mutate({
      id: load.id,
      time_window: timeData,
    }, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      },
    });
  };

  // Calculate total items
  const bins = form.watch('bins') || 0;
  const crates = form.watch('crates') || 0;
  const pallets = form.watch('pallets') || 0;
  const totalItems = bins + crates + pallets;

  if (!load) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white">
              <RotateCcw className="h-4 w-4" />
            </span>
            Add Backload
          </DialogTitle>
          <DialogDescription>
            Add a return trip backload for load <span className="font-semibold">{load.load_id}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Current Load Summary */}
        <Card className="bg-muted/50 border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Load Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Vehicle</p>
                <p className="font-medium">{load.fleet_vehicle?.vehicle_id || 'Unassigned'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Route</p>
                <p className="font-medium">{getLocationDisplayName(load.origin)} → {getLocationDisplayName(load.destination)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Offloading Date</p>
                <p className="font-medium">{format(parseISO(load.offloading_date), 'dd MMM yyyy')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Backload Destination */}
            <Card className="border-2 border-orange-200 bg-orange-50/30 dark:bg-orange-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  Backload Destination
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="backloadDestination"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destination Farm</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select farm" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {backloadDestinations.map((dest) => (
                              <SelectItem key={dest} value={dest}>{dest} Farm</SelectItem>
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select cargo type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {backloadCargoTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
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
                                'pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? format(field.value, 'dd MMM yyyy') : 'Pick date'}
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
              </CardContent>
            </Card>

            {/* Quantity Fields */}
            <Card className="border-2 border-purple-200 bg-purple-50/30 dark:bg-purple-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-purple-600" />
                    Backload Quantities
                  </div>
                  <span className="text-sm font-normal text-purple-600 dark:text-purple-400">
                    Total: {totalItems} items
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="bins"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-blue-500" />
                          Bins
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            className="border-purple-200"
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
                    name="crates"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-green-500" />
                          Crates
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            className="border-purple-200"
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
                    name="pallets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-amber-500" />
                          Pallets
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            className="border-purple-200"
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
                  Enter the quantity of bins, crates, and pallets to be transported in the backload.
                </p>
              </CardContent>
            </Card>

            {/* Notes */}
            <FormField
              control={form.control}
              name="backloadNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Backload Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about the backload..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateLoad.isPending}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {updateLoad.isPending ? 'Adding Backload...' : 'Add Backload'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}