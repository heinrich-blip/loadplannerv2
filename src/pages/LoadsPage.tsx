import { MainLayout } from "@/components/layout/MainLayout";
import { CreateLoadDialog } from "@/components/loads/CreateLoadDialog";
import { DeliveryConfirmationDialog } from "@/components/loads/DeliveryConfirmationDialog";
import { EditLoadDialog } from "@/components/loads/EditLoadDialog";
import { LoadsTable } from "@/components/loads/LoadsTable";
import { QuickFilters } from "@/components/loads/QuickFilters";
import { Button } from "@/components/ui/button";
import { useLoads } from "@/hooks/useLoads";
import type { Load } from "@/hooks/useLoads";
import {
  exportLoadsToExcel,
  exportLoadsToExcelSimplified,
} from "@/lib/exportLoadsToExcel";
import { exportTimeComparisonToExcel } from "@/lib/exportTimeComparisonToExcel";
import { isWithinInterval, parseISO, startOfDay, startOfWeek, endOfWeek, getWeek } from "date-fns";
import { ChevronDown, Clock, FileSpreadsheet, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

export default function LoadsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");
  const [weekFilter, setWeekFilter] = useState<{
    start: Date | null;
    end: Date | null;
  }>(() => {
    const now = new Date();
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    };
  });

  const { data: loads = [], isLoading } = useLoads();

  const filteredLoads = loads.filter((load) => {
    const matchesSearch =
      !searchQuery ||
      load.load_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.driver?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.origin.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || load.status === statusFilter;
    const matchesOrigin =
      originFilter === "all" || load.origin === originFilter;

    // Week filter
    let matchesWeek = true;
    if (weekFilter.start && weekFilter.end) {
      try {
        const loadDate = startOfDay(parseISO(load.loading_date));
        matchesWeek = isWithinInterval(loadDate, {
          start: startOfDay(weekFilter.start),
          end: weekFilter.end,
        });
      } catch {
        matchesWeek = false;
      }
    }

    return matchesSearch && matchesStatus && matchesOrigin && matchesWeek;
  });

  const handleWeekFilter = (weekStart: Date | null, weekEnd: Date | null) => {
    setWeekFilter({ start: weekStart, end: weekEnd });
  };

  const handleEditLoad = (load: Load) => {
    setSelectedLoad(load);
    setEditDialogOpen(true);
  };

  const handleConfirmDelivery = (load: Load) => {
    setSelectedLoad(load);
    setDeliveryDialogOpen(true);
  };

  const handleLoadClick = (load: Load) => {
    // Default click behavior - open edit dialog
    setSelectedLoad(load);
    setEditDialogOpen(true);
  };

  const handleExportExcel = (simplified = false) => {
    const weekOpts = { weekStartsOn: 1 as const };
    const refDate = weekFilter.start ?? new Date();
    const weekNumber = getWeek(refDate, weekOpts);
    const year = refDate.getFullYear();
    const exportOptions = { weekNumber, year };
    if (simplified) {
      exportLoadsToExcelSimplified(filteredLoads, exportOptions);
    } else {
      exportLoadsToExcel(filteredLoads, exportOptions);
    }
  };

  const handleExportTimeComparison = () => {
    const weekOpts = { weekStartsOn: 1 as const };
    const refDate = weekFilter.start ?? new Date();
    const weekNumber = getWeek(refDate, weekOpts);
    const year = refDate.getFullYear();
    exportTimeComparisonToExcel(filteredLoads, { weekNumber, year });
  };

  return (
    <MainLayout title="Load Planning">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">All Loads</h1>
            <p className="text-muted-foreground">
              Manage and track all scheduled loads
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={filteredLoads.length === 0}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export to Excel
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExportExcel(false)}>
                  Full Export (All Columns)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportExcel(true)}>
                  Simplified Export
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportTimeComparison}>
                  <Clock className="h-4 w-4 mr-2" />
                  Time Comparison (Planned vs Actual)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
            >
              <Plus className="h-4 w-4" />
              Create New Load
            </Button>
          </div>
        </div>

        <QuickFilters
          onSearch={setSearchQuery}
          onStatusFilter={setStatusFilter}
          onOriginFilter={setOriginFilter}
          onWeekFilter={handleWeekFilter}
        />

        <LoadsTable
          loads={filteredLoads}
          isLoading={isLoading}
          onLoadClick={handleLoadClick}
          onEditLoad={handleEditLoad}
          onConfirmDelivery={handleConfirmDelivery}
        />
      </div>

      <CreateLoadDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <EditLoadDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        load={selectedLoad}
      />

      <DeliveryConfirmationDialog
        open={deliveryDialogOpen}
        onOpenChange={setDeliveryDialogOpen}
        load={selectedLoad}
      />
    </MainLayout>
  );
}