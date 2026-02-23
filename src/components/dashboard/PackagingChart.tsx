import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  startOfWeek,
  endOfWeek,
  parseISO,
  isWithinInterval,
  format,
} from "date-fns";
import { Load, parseBackloadInfo } from "@/hooks/useLoads";
import { Package, Boxes, Container } from "lucide-react";

interface PackagingChartProps {
  loads: Load[];
}

interface PackagingByDestination {
  destination: string;
  bins: number;
  crates: number;
  pallets: number;
  total: number;
}

interface PackagingTotal {
  name: string;
  value: number;
  color: string;
  icon: React.ElementType;
}

const COLORS = {
  bins: "#22c55e", // Green
  crates: "#3b82f6", // Blue
  pallets: "#f59e0b", // Amber
};

const CHART_COLORS = ["#22c55e", "#3b82f6", "#f59e0b"];

export function PackagingChart({ loads }: PackagingChartProps) {
  // Get current week date range
  const { weekStart, weekEnd, weekLabel } = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const end = endOfWeek(today, { weekStartsOn: 1 });
    return {
      weekStart: start,
      weekEnd: end,
      weekLabel: `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`,
    };
  }, []);

  // Aggregate packaging data by destination (current week only)
  const { byDestination, totals, grandTotal } = useMemo(() => {
    const destinationMap = new Map<string, PackagingByDestination>();
    let totalBins = 0;
    let totalCrates = 0;
    let totalPallets = 0;

    // Filter loads to current week based on offloading_date (when backload is delivered)
    const weeklyLoads = loads.filter((load) => {
      try {
        const backload = parseBackloadInfo(load.time_window);
        if (!backload?.enabled) return false;

        // Use backload offloading date if available, otherwise use load's offloading date
        const dateToCheck = backload.offloadingDate || load.offloading_date;
        if (!dateToCheck) return false;

        const loadDate = parseISO(dateToCheck);
        return isWithinInterval(loadDate, { start: weekStart, end: weekEnd });
      } catch {
        return false;
      }
    });

    weeklyLoads.forEach((load) => {
      const backload = parseBackloadInfo(load.time_window);
      if (backload?.quantities) {
        const dest = backload.destination || "Unknown";
        const existing = destinationMap.get(dest) || {
          destination: dest,
          bins: 0,
          crates: 0,
          pallets: 0,
          total: 0,
        };

        existing.bins += backload.quantities.bins || 0;
        existing.crates += backload.quantities.crates || 0;
        existing.pallets += backload.quantities.pallets || 0;
        existing.total = existing.bins + existing.crates + existing.pallets;

        totalBins += backload.quantities.bins || 0;
        totalCrates += backload.quantities.crates || 0;
        totalPallets += backload.quantities.pallets || 0;

        destinationMap.set(dest, existing);
      }
    });

    const byDestination = Array.from(destinationMap.values()).sort(
      (a, b) => b.total - a.total,
    );

    const totals: PackagingTotal[] = [
      { name: "Bins", value: totalBins, color: COLORS.bins, icon: Package },
      {
        name: "Crates",
        value: totalCrates,
        color: COLORS.crates,
        icon: Container,
      },
      {
        name: "Pallets",
        value: totalPallets,
        color: COLORS.pallets,
        icon: Boxes,
      },
    ];

    return {
      byDestination,
      totals,
      grandTotal: totalBins + totalCrates + totalPallets,
    };
  }, [loads, weekStart, weekEnd]);

  if (grandTotal === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground">
            Weekly Backload Packaging
          </h3>
          <p className="text-sm text-muted-foreground">{weekLabel}</p>
        </div>
        <div className="flex items-center justify-center h-[200px] text-muted-foreground">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No backload packaging data for this week</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Packaging Totals Card with Donut Chart */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground">
            Weekly Packaging Total
          </h3>
          <p className="text-sm text-muted-foreground">{weekLabel}</p>
        </div>

        <div className="flex items-center gap-6">
          {/* Donut Chart */}
          <div className="w-[160px] h-[160px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={totals}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {totals.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="transition-all duration-300 hover:opacity-80"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value: number, name: string) => [
                    value.toLocaleString(),
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-foreground">
                {grandTotal.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
          </div>

          {/* Legend with Stats */}
          <div className="flex-1 space-y-3">
            {totals.map((item) => {
              const Icon = item.icon;
              const percentage =
                grandTotal > 0
                  ? ((item.value / grandTotal) * 100).toFixed(1)
                  : "0";
              return (
                <div
                  key={item.name}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {item.name}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {item.value.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Packaging by Destination Bar Chart */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground">
            Packaging by Offloading Point
          </h3>
          <p className="text-sm text-muted-foreground">
            Items received this week ({weekLabel})
          </p>
        </div>

        {byDestination.length > 0 ? (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={byDestination}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="destination"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  width={60}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value: number, name: string) => [
                    value.toLocaleString(),
                    name.charAt(0).toUpperCase() + name.slice(1),
                  ]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingTop: "10px" }}
                  formatter={(value) =>
                    value.charAt(0).toUpperCase() + value.slice(1)
                  }
                />
                <Bar
                  dataKey="bins"
                  stackId="a"
                  fill={COLORS.bins}
                  radius={[0, 0, 0, 0]}
                  name="bins"
                />
                <Bar
                  dataKey="crates"
                  stackId="a"
                  fill={COLORS.crates}
                  radius={[0, 0, 0, 0]}
                  name="crates"
                />
                <Bar
                  dataKey="pallets"
                  stackId="a"
                  fill={COLORS.pallets}
                  radius={[4, 4, 4, 4]}
                  name="pallets"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            <p className="text-sm">No destination data available</p>
          </div>
        )}
      </div>
    </div>
  );
}