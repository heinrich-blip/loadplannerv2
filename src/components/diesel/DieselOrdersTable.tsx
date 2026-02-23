import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type DieselOrder,
  useApproveDieselOrder,
  useDeleteDieselOrder,
  useFulfillDieselOrder,
} from "@/hooks/useDieselOrders";
import {
  exportDieselOrderToPdf,
  shareViaWhatsApp,
} from "@/lib/exportDieselOrderToPdf";
import { safeFormatDate } from "@/lib/utils";
import {
  CheckCircle,
  Download,
  Edit,
  Loader2,
  MoreHorizontal,
  Share2,
  Trash2,
} from "lucide-react";

interface DieselOrdersTableProps {
  orders: DieselOrder[];
  isLoading: boolean;
  onEditOrder: (order: DieselOrder) => void;
}

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  fulfilled: { label: "Fulfilled", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export function DieselOrdersTable({
  orders,
  isLoading,
  onEditOrder,
}: DieselOrdersTableProps) {
  const approveDieselOrder = useApproveDieselOrder();
  const fulfillDieselOrder = useFulfillDieselOrder();
  const deleteDieselOrder = useDeleteDieselOrder();

  const handleExportPdf = (order: DieselOrder) => {
    exportDieselOrderToPdf(order);
  };

  const handleShareWhatsApp = (order: DieselOrder) => {
    // Prefer the order's driver contact, fall back to recipient_phone, then load's driver
    const phoneNumber =
      order.driver?.contact ||
      order.recipient_phone ||
      order.load?.driver?.contact;
    shareViaWhatsApp(order, phoneNumber || undefined);
  };

  const handleApprove = (order: DieselOrder) => {
    approveDieselOrder.mutate(order.id);
  };

  const handleFulfill = (order: DieselOrder) => {
    fulfillDieselOrder.mutate(order.id);
  };

  const handleDelete = (order: DieselOrder) => {
    if (confirm("Are you sure you want to delete this diesel order?")) {
      deleteDieselOrder.mutate(order.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-orange-100 p-4 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-orange-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">No Diesel Orders</h3>
        <p className="text-muted-foreground mt-1">
          Create your first diesel order to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Trip</TableHead>
            <TableHead>Fuel Station</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Fleet Number</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order.id}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell className="font-medium">
                {order.order_number}
              </TableCell>
              <TableCell>
                {order.load ? (
                  <div className="flex flex-col">
                    <span className="font-medium">{order.load.load_id}</span>
                    <span className="text-xs text-muted-foreground">
                      {order.load.origin} → {order.load.destination}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>{order.fuel_station}</TableCell>
              <TableCell className="text-right font-medium">
                {order.quantity_liters.toLocaleString()} L
              </TableCell>
              <TableCell>
                {order.recipient_name ? (
                  <div className="flex flex-col">
                    <span>{order.recipient_name}</span>
                    {order.recipient_phone && (
                      <span className="text-xs text-muted-foreground">
                        {order.recipient_phone}
                      </span>
                    )}
                  </div>
                ) : order.driver ? (
                  <div className="flex flex-col">
                    <span>{order.driver.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {order.driver.contact}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {order.fleet_vehicle ? (
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {order.fleet_vehicle.vehicle_id}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {order.fleet_vehicle.type}
                    </span>
                  </div>
                ) : order.load?.fleet_vehicle ? (
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {order.load.fleet_vehicle.vehicle_id}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {order.load.fleet_vehicle.type}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={statusConfig[order.status]?.variant || "secondary"}
                >
                  {statusConfig[order.status]?.label || order.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {safeFormatDate(order.created_at, "dd MMM yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExportPdf(order)}>
                      <Download className="mr-2 h-4 w-4" />
                      Export PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleShareWhatsApp(order)}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Send via WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEditOrder(order)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Order
                    </DropdownMenuItem>
                    {order.status === "pending" && (
                      <DropdownMenuItem onClick={() => handleApprove(order)}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve Order
                      </DropdownMenuItem>
                    )}
                    {order.status === "approved" && (
                      <DropdownMenuItem onClick={() => handleFulfill(order)}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark Fulfilled
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(order)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Order
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}