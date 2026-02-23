import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import
  {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { type FleetVehicle, useUpdateFleetVehicle } from '@/hooks/useFleetVehicles';
import { cn } from '@/lib/utils';
import { addDays, format, isBefore, isPast, parseISO } from 'date-fns';
import
  {
    AlertTriangle,
    Calendar,
    Car,
    FileText,
    Gauge,
    Package,
    Pencil,
    Shield,
    Truck,
    XCircle,
  } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { EditFleetDialog } from './EditFleetDialog';

interface ViewFleetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: FleetVehicle | null;
  onEdit?: (vehicle: FleetVehicle) => void;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Not set';
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy');
  } catch {
    return 'Invalid date';
  }
}

function getExpiryStatus(dateString: string | null | undefined): 'expired' | 'warning' | 'ok' | null {
  if (!dateString) return null;
  try {
    const date = parseISO(dateString);
    const today = new Date();
    if (isPast(date)) return 'expired';
    if (isBefore(date, addDays(today, 30))) return 'warning';
    return 'ok';
  } catch {
    return null;
  }
}

function ExpiryDateItem({
  label,
  date,
  icon: Icon,
  active,
}: {
  label: string;
  date: string | null | undefined;
  icon: React.ElementType;
  active?: boolean;
}) {
  const status = getExpiryStatus(date);

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {active === false && (
          <Badge variant="outline" className="text-xs bg-muted">
            Inactive
          </Badge>
        )}
        {status === 'expired' && (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        )}
        {status === 'warning' && (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        )}
        <span
          className={cn(
            'text-sm font-medium',
            status === 'expired' && 'text-destructive',
            status === 'warning' && 'text-amber-500',
            status === 'ok' && 'text-foreground',
            !status && 'text-muted-foreground'
          )}
        >
          {formatDate(date)}
        </span>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number | null | undefined;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground">
        {value || 'Not set'}
      </span>
    </div>
  );
}

export function ViewFleetDialog({
  open,
  onOpenChange,
  vehicle,
}: ViewFleetDialogProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const updateVehicle = useUpdateFleetVehicle();

  const handleToggleActive = async () => {
    if (!vehicle) return;
    
    try {
      await updateVehicle.mutateAsync({
        id: vehicle.id,
        available: !vehicle.available,
      });
      toast.success(vehicle.available ? 'Vehicle deactivated' : 'Vehicle activated');
    } catch {
      toast.error('Failed to update vehicle');
    }
  };

  if (!vehicle) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {vehicle.vehicle_id}
            </DialogTitle>
            <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant={vehicle.available ? "destructive" : "default"}
                  size="sm"
                  onClick={handleToggleActive}
                  disabled={updateVehicle.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {vehicle.available ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
          </DialogHeader>

          {/* Header with vehicle info */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <Badge
                variant="outline"
                className={cn(
                  'mt-1',
                  vehicle.available
                    ? 'bg-status-scheduled-bg text-status-scheduled border-status-scheduled/20'
                    : 'bg-status-pending-bg text-status-pending border-status-pending/20'
                )}
              >
                {vehicle.available ? 'Available' : 'Inactive'}
              </Badge>
            </div>
          </div>

          <div className="space-y-6 pt-4">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Basic Information
            </h3>
            <div className="rounded-lg border bg-muted/30 p-3">
              <DetailItem label="Vehicle Type" value={vehicle.type} icon={Package} />
              <Separator className="my-1" />
              <DetailItem
                label="Capacity"
                value={vehicle.capacity ? `${vehicle.capacity} Tons` : null}
                icon={Gauge}
              />
            </div>
          </div>

          {/* Vehicle Details */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Vehicle Details
            </h3>
            <div className="rounded-lg border bg-muted/30 p-3">
              <DetailItem label="VIN Number" value={vehicle.vin_number} icon={FileText} />
              <Separator className="my-1" />
              <DetailItem label="Engine Number" value={vehicle.engine_number} icon={Car} />
              <Separator className="my-1" />
              <DetailItem label="Make & Model" value={vehicle.make_model} icon={Truck} />
              <Separator className="my-1" />
              <DetailItem label="Engine Size" value={vehicle.engine_size} icon={Gauge} />
            </div>
          </div>

          {/* Expiry Dates */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Document Expiry Dates
            </h3>
            <div className="rounded-lg border bg-muted/30 p-3">
              <ExpiryDateItem
                label="License Expiry"
                date={vehicle.license_expiry}
                icon={Calendar}
                active={vehicle.license_active}
              />
              <Separator className="my-1" />
              <ExpiryDateItem
                label="COF Expiry"
                date={vehicle.cof_expiry}
                icon={Shield}
                active={vehicle.cof_active}
              />
              <Separator className="my-1" />
              <ExpiryDateItem
                label="Radio License Expiry"
                date={vehicle.radio_license_expiry}
                icon={Calendar}
                active={vehicle.radio_license_active}
              />
              <Separator className="my-1" />
              <ExpiryDateItem
                label="Insurance Expiry"
                date={vehicle.insurance_expiry}
                icon={Shield}
                active={vehicle.insurance_active}
              />
              <Separator className="my-1" />
              <ExpiryDateItem
                label="SVG Expiry"
                date={vehicle.svg_expiry}
                icon={Calendar}
                active={vehicle.svg_active}
              />
            </div>
          </div>

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Created: {formatDate(vehicle.created_at)}</div>
            <div>Last Updated: {formatDate(vehicle.updated_at)}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <EditFleetDialog
      open={editDialogOpen}
      onOpenChange={setEditDialogOpen}
      vehicle={vehicle}
    />
    </>
  );
}