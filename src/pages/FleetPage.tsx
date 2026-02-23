import { CreateFleetDialog } from '@/components/fleet/CreateFleetDialog';
import { EditFleetDialog } from '@/components/fleet/EditFleetDialog';
import { ViewFleetDialog } from '@/components/fleet/ViewFleetDialog';
import { MainLayout } from '@/components/layout/MainLayout';
import
  {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteFleetVehicle, useFleetVehicles } from '@/hooks/useFleetVehicles';
import type { FleetVehicle } from '@/hooks/useFleetVehicles';
import { cn } from '@/lib/utils';
import { Eye, Gauge, Package, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import { useState } from 'react';

export default function FleetPage() {
  const { data: fleetVehicles = [], isLoading } = useFleetVehicles();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<FleetVehicle | null>(null);
  const deleteFleetVehicle = useDeleteFleetVehicle();

  const handleViewClick = (vehicle: FleetVehicle) => {
    setSelectedVehicle(vehicle);
    setViewDialogOpen(true);
  };

  const handleEditClick = (vehicle: FleetVehicle) => {
    setSelectedVehicle(vehicle);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (vehicle: FleetVehicle) => {
    setVehicleToDelete(vehicle);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (vehicleToDelete) {
      deleteFleetVehicle.mutate(vehicleToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setVehicleToDelete(null);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Fleet Management">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fleet Vehicles</h1>
            <p className="text-muted-foreground">Manage and monitor your fleet vehicles</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-10 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Fleet Management">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fleet Vehicles</h1>
            <p className="text-muted-foreground">Manage and monitor your fleet vehicles</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </div>

        {fleetVehicles.length === 0 ? (
          <div className="rounded-xl border bg-card shadow-sm p-12 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No vehicles found</h3>
            <p className="text-muted-foreground mb-4">Add fleet vehicles to get started</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Vehicle
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fleetVehicles.map((vehicle) => (
              <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-xl font-bold">{vehicle.vehicle_id}</span>
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        vehicle.available
                          ? 'bg-status-scheduled-bg text-status-scheduled border-status-scheduled/20'
                          : 'bg-status-pending-bg text-status-pending border-status-pending/20'
                      )}
                    >
                      {vehicle.available ? 'Available' : 'In Use'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>{vehicle.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Gauge className="h-4 w-4" />
                      <span>Capacity: {vehicle.capacity} Tons</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => handleViewClick(vehicle)}
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => handleEditClick(vehicle)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteClick(vehicle)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateFleetDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <ViewFleetDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        vehicle={selectedVehicle}
      />

      <EditFleetDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        vehicle={selectedVehicle}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete vehicle <span className="font-semibold">{vehicleToDelete?.vehicle_id}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFleetVehicle.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}