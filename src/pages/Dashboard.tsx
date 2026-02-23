import { KPICard } from "@/components/dashboard/KPICard";
import { PackagingChart } from "@/components/dashboard/PackagingChart";
import { WeeklyChart } from "@/components/dashboard/WeeklyChart";
import { WeeklySummary } from "@/components/dashboard/WeeklySummary";
import { MainLayout } from "@/components/layout/MainLayout";
import { CreateLoadDialog } from "@/components/loads/CreateLoadDialog";
import { Button } from "@/components/ui/button";
import { useLoads } from "@/hooks/useLoads";
import
  {
    BarChart3,
    CheckCircle2,
    Clock,
    Package,
    Plus,
    Settings,
    Truck,
  } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { data: loads = [] } = useLoads();

  // Calculate KPIs
  const kpis = {
    totalLoads: loads.length,
    scheduled: loads.filter((l) => l.status === "scheduled").length,
    inTransit: loads.filter((l) => l.status === "in-transit").length,
    delivered: loads.filter((l) => l.status === "delivered").length,
  };

  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Loads"
            value={kpis.totalLoads}
            icon={Package}
            variant="total"
          />
          <KPICard
            title="Scheduled"
            value={kpis.scheduled}
            icon={Clock}
            variant="scheduled"
          />
          <KPICard
            title="In Transit"
            value={kpis.inTransit}
            icon={Truck}
            variant="transit"
          />
          <KPICard
            title="Delivered"
            value={kpis.delivered}
            icon={CheckCircle2}
            variant="delivered"
          />
        </div>

        {/* Actions Row */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="flex gap-2">
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
            >
              <Plus className="h-4 w-4" />
              Add New Load
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate("/reports")}
            >
              <BarChart3 className="h-4 w-4" />
              View Reports
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Weekly Chart */}
        <WeeklyChart loads={loads} />

        {/* Packaging Chart - Backload Operations */}
        <PackagingChart loads={loads} />

        {/* Weekly Summary */}
        <WeeklySummary loads={loads} />
      </div>

      <CreateLoadDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </MainLayout>
  );
}