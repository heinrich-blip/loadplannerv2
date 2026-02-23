import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import
  {
    Dialog,
    DialogContent,
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
import { Switch } from '@/components/ui/switch';
import { useCreateFleetVehicle } from '@/hooks/useFleetVehicles';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, Truck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const vehicleTypes = [
  'Flatbed',
  'Box Truck',
  'Refrigerated',
  'Tanker',
  'Trailer',
  'Van',
  'Pickup',
];

const formSchema = z.object({
  vehicle_id: z.string().min(2, 'Vehicle ID must be at least 2 characters'),
  type: z.string().min(1, 'Vehicle type is required'),
  capacity: z.number().min(0.1, 'Capacity must be greater than 0'),
  available: z.boolean(),
  // Vehicle details
  vin_number: z.string().optional(),
  engine_number: z.string().optional(),
  make_model: z.string().optional(),
  engine_size: z.string().optional(),
  // Expiry dates with active status
  license_expiry: z.date().optional(),
  license_active: z.boolean(),
  cof_expiry: z.date().optional(),
  cof_active: z.boolean(),
  radio_license_expiry: z.date().optional(),
  radio_license_active: z.boolean(),
  insurance_expiry: z.date().optional(),
  insurance_active: z.boolean(),
  svg_expiry: z.date().optional(),
  svg_active: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateFleetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFleetDialog({ open, onOpenChange }: CreateFleetDialogProps) {
  const createFleetVehicle = useCreateFleetVehicle();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicle_id: '',
      type: '',
      capacity: 0,
      available: true,
      vin_number: '',
      engine_number: '',
      make_model: '',
      engine_size: '',
      license_active: true,
      cof_active: true,
      radio_license_active: true,
      insurance_active: true,
      svg_active: true,
    },
  });

  const handleSubmit = (data: FormData) => {
    createFleetVehicle.mutate(
      {
        vehicle_id: data.vehicle_id,
        type: data.type,
        capacity: data.capacity,
        available: data.available,
        vin_number: data.vin_number || null,
        engine_number: data.engine_number || null,
        make_model: data.make_model || null,
        engine_size: data.engine_size || null,
        license_expiry: data.license_expiry ? format(data.license_expiry, 'yyyy-MM-dd') : null,
        license_active: data.license_active,
        cof_expiry: data.cof_expiry ? format(data.cof_expiry, 'yyyy-MM-dd') : null,
        cof_active: data.cof_active,
        radio_license_expiry: data.radio_license_expiry ? format(data.radio_license_expiry, 'yyyy-MM-dd') : null,
        radio_license_active: data.radio_license_active,
        insurance_expiry: data.insurance_expiry ? format(data.insurance_expiry, 'yyyy-MM-dd') : null,
        insurance_active: data.insurance_active,
        svg_expiry: data.svg_expiry ? format(data.svg_expiry, 'yyyy-MM-dd') : null,
        svg_active: data.svg_active,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Truck className="h-4 w-4" />
            </span>
            Add New Vehicle
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Basic Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vehicle_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle ID / Plate Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., TRK-001 or ABC 1234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vehicleTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
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
                  name="make_model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Make & Model</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Scania R450" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity (Tons)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Enter capacity in tons"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Vehicle Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vin_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VIN Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Vehicle Identification Number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="engine_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Engine Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Engine serial number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="engine_size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Engine Size</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 12.7L or 450hp" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Expiry Dates */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Expiry Dates</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="license_expiry"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <div className="flex items-center justify-between">
                        <FormLabel>License Expiry Date</FormLabel>
                        <FormField
                          control={form.control}
                          name="license_active"
                          render={({ field: switchField }) => (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={switchField.value}
                                onCheckedChange={switchField.onChange}
                              />
                              <span className="text-xs text-muted-foreground">
                                {switchField.value ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          )}
                        />
                      </div>
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
                              {field.value ? format(field.value, 'dd/MM/yyyy') : 'Select date'}
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
                  name="cof_expiry"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <div className="flex items-center justify-between">
                        <FormLabel>COF Expiry Date</FormLabel>
                        <FormField
                          control={form.control}
                          name="cof_active"
                          render={({ field: switchField }) => (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={switchField.value}
                                onCheckedChange={switchField.onChange}
                              />
                              <span className="text-xs text-muted-foreground">
                                {switchField.value ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          )}
                        />
                      </div>
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
                              {field.value ? format(field.value, 'dd/MM/yyyy') : 'Select date'}
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
                  name="radio_license_expiry"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <div className="flex items-center justify-between">
                        <FormLabel>Radio License Expiry Date</FormLabel>
                        <FormField
                          control={form.control}
                          name="radio_license_active"
                          render={({ field: switchField }) => (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={switchField.value}
                                onCheckedChange={switchField.onChange}
                              />
                              <span className="text-xs text-muted-foreground">
                                {switchField.value ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          )}
                        />
                      </div>
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
                              {field.value ? format(field.value, 'dd/MM/yyyy') : 'Select date'}
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
                  name="insurance_expiry"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <div className="flex items-center justify-between">
                        <FormLabel>Insurance Expiry Date</FormLabel>
                        <FormField
                          control={form.control}
                          name="insurance_active"
                          render={({ field: switchField }) => (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={switchField.value}
                                onCheckedChange={switchField.onChange}
                              />
                              <span className="text-xs text-muted-foreground">
                                {switchField.value ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          )}
                        />
                      </div>
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
                              {field.value ? format(field.value, 'dd/MM/yyyy') : 'Select date'}
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
                  name="svg_expiry"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <div className="flex items-center justify-between">
                        <FormLabel>SVG Expiry Date</FormLabel>
                        <FormField
                          control={form.control}
                          name="svg_active"
                          render={({ field: switchField }) => (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={switchField.value}
                                onCheckedChange={switchField.onChange}
                              />
                              <span className="text-xs text-muted-foreground">
                                {switchField.value ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          )}
                        />
                      </div>
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
                              {field.value ? format(field.value, 'dd/MM/yyyy') : 'Select date'}
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

            {/* Availability */}
            <FormField
              control={form.control}
              name="available"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Available</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Mark vehicle as available for assignments
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
              <Button type="submit" disabled={createFleetVehicle.isPending}>
                {createFleetVehicle.isPending ? 'Adding...' : 'Add Vehicle'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}