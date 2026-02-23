import { CreateDieselOrderDialog } from "@/components/diesel/CreateDieselOrderDialog";
import { DieselOrderFilters } from "@/components/diesel/DieselOrderFilters";
import { DieselOrdersTable } from "@/components/diesel/DieselOrdersTable";
import { EditDieselOrderDialog } from "@/components/diesel/EditDieselOrderDialog";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDieselOrders } from "@/hooks/useDieselOrders";
import type { DieselOrder } from "@/hooks/useDieselOrders";
import { Fuel, Plus, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

export default function DieselOrdersPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DieselOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: orders = [], isLoading } = useDieselOrders();

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        !searchQuery ||
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.fuel_station.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.load?.load_id
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        order.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    const totalLiters = orders.reduce((sum, o) => sum + o.quantity_liters, 0);
    const fulfilledLiters = orders
      .filter((o) => o.status === "fulfilled")
      .reduce((sum, o) => sum + o.quantity_liters, 0);

    return {
      totalOrders,
      pendingOrders,
      totalLiters,
      fulfilledLiters,
    };
  }, [orders]);

  const handleEditOrder = (order: DieselOrder) => {
    setSelectedOrder(order);
    setEditDialogOpen(true);
  };

  return (
    <MainLayout title="Diesel Orders">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Diesel Orders
            </h1>
            <p className="text-muted-foreground">
              Manage diesel orders for your fleet trips
            </p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Order
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Orders
              </CardTitle>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Ordered
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalLiters.toLocaleString()} L
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fulfilled</CardTitle>
              <div className="h-2 w-2 rounded-full bg-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.fulfilledLiters.toLocaleString()} L
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <DieselOrderFilters
          onSearch={setSearchQuery}
          onStatusFilter={setStatusFilter}
        />

        {/* Orders Table */}
        <DieselOrdersTable
          orders={filteredOrders}
          isLoading={isLoading}
          onEditOrder={handleEditOrder}
        />
      </div>

      {/* Dialogs */}
      <CreateDieselOrderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <EditDieselOrderDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        order={selectedOrder}
      />
    </MainLayout>
  );
}