import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { CustomTooltip } from "@/components/reports/ChartTooltips";
import type {
  DayOfWeekData,
  DelayBarRow,
  LocationVariance,
  TimeVarianceAnalysis,
  TimeVarianceData,
} from "@/components/reports/types";
import type { Load } from "@/hooks/useLoads";
import { exportPunctualityToPdf } from "@/lib/exportReportsToPdf";
import { exportPunctualityToExcel } from "@/lib/exportPunctualityToExcel";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Map known hex fills to Tailwind text color classes to avoid inline styles
const fillToTextClass = (hex?: string) => {
  if (!hex) return "";
  const h = hex.toLowerCase();
  const map: Record<string, string> = {
    "#22c55e": "text-emerald-600",
    "#10b981": "text-emerald-500",
    "#3b82f6": "text-blue-600",
    "#8b5cf6": "text-violet-600",
    "#f59e0b": "text-amber-600",
    "#f97316": "text-orange-600",
    "#ef4444": "text-red-600",
    "#06b6d4": "text-cyan-600",
    "#0ea5e9": "text-sky-500",
  };
  return map[h] || "";
};

interface TimeAnalysisTabProps {
  timeVarianceAnalysis: TimeVarianceAnalysis;
  dayOfWeekDistribution: DayOfWeekData[];
  originDelayChartData: DelayBarRow[];
  destinationDelayChartData: DelayBarRow[];
  periodPunctualityData: Array<{
    week: string;
    loads: number;
    originDelayCount: number;
    destDelayCount: number;
  }>;
  trendLabel?: "Weekly" | "Monthly";
  filteredLoads: Load[];
  timeRange: "3months" | "6months" | "12months"; // Fixed: narrowed type from string to literal union
}

export function TimeAnalysisTab({
  timeVarianceAnalysis,
  dayOfWeekDistribution,
  originDelayChartData,
  destinationDelayChartData,
  periodPunctualityData,
  trendLabel = "Weekly",
  filteredLoads,
  timeRange,
}: TimeAnalysisTabProps) {
  return (
    <TabsContent value="time" className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200/50 dark:border-emerald-800/30 shadow-sm">
          <CardContent className="pt-6 pb-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70">
                On-Time Rate
              </p>
              <p className="text-4xl font-bold text-emerald-700 dark:text-emerald-300">
                {timeVarianceAnalysis.onTimeRate}%
              </p>
              <p className="text-sm text-muted-foreground">
                {timeVarianceAnalysis.onTimeCount +
                  timeVarianceAnalysis.earlyCount}{" "}
                of {timeVarianceAnalysis.totalAnalyzed} loads
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200/50 dark:border-blue-800/30 shadow-sm">
          <CardContent className="pt-6 pb-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600/70 dark:text-blue-400/70">
                Avg Departure Variance
              </p>
              <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">
                {timeVarianceAnalysis.avgOriginVariance > 0 ? "+" : ""}
                {timeVarianceAnalysis.avgOriginVariance}
              </p>
              <p className="text-sm text-muted-foreground">
                minutes from planned
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200/50 dark:border-violet-800/30 shadow-sm">
          <CardContent className="pt-6 pb-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-600/70 dark:text-violet-400/70">
                Avg Arrival Variance
              </p>
              <p className="text-4xl font-bold text-violet-700 dark:text-violet-300">
                {timeVarianceAnalysis.avgDestVariance > 0 ? "+" : ""}
                {timeVarianceAnalysis.avgDestVariance}
              </p>
              <p className="text-sm text-muted-foreground">
                minutes from planned
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/50 dark:border-amber-800/30 shadow-sm">
          <CardContent className="pt-6 pb-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70">
                Late Deliveries
              </p>
              <p className="text-4xl font-bold text-amber-700 dark:text-amber-300">
                {timeVarianceAnalysis.lateCount}
              </p>
              <p className="text-sm text-muted-foreground">
                loads over 15 mins late
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Punctuality Trend */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            {trendLabel} Punctuality Trend
          </CardTitle>
          <CardDescription>
            Delays and load volume over time ({trendLabel.toLowerCase()})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={periodPunctualityData}
                margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  opacity={0.4}
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="loads"
                  name="Loads"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="originDelayCount"
                  name="Origin Delays"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="destDelayCount"
                  name="Destination Delays"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Performance Distribution */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">
              Delivery Performance
            </CardTitle>
            <CardDescription>
              Planned vs actual arrival time distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            {timeVarianceAnalysis.distribution.length > 0 ? (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={timeVarianceAnalysis.distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="count"
                      stroke="none"
                    >
                      {timeVarianceAnalysis.distribution.map(
                        (entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ),
                      )}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0]
                            .payload as TimeVarianceData;
                          return (
                            <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-3 shadow-xl">
                              <p className={`font-semibold ${fillToTextClass(data.fill)}`}>
                                {data.category}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {data.count} loads ({data.percentage}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ paddingTop: "20px" }}
                      formatter={(value) => {
                        const item =
                          timeVarianceAnalysis.distribution.find(
                            (d) => d.category === value,
                          );
                        return `${value} (${item?.percentage || 0}%)`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[320px] flex items-center justify-center">
                <p className="text-muted-foreground text-center">
                  No delivery time data available.
                  <br />
                  <span className="text-sm">
                    Complete deliveries with actual times to see analysis.
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Day of Week Distribution */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">
              Load Scheduling by Day
            </CardTitle>
            <CardDescription>
              Volume distribution across weekdays
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dayOfWeekDistribution}
                  margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                >
                  <defs>
                    <linearGradient
                      id="dayGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    opacity={0.4}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  />
                  <Bar
                    dataKey="loads"
                    name="Load Count"
                    fill="url(#dayGradient)"
                    radius={[6, 6, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Route Performance */}
      {timeVarianceAnalysis.routePerformance.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">
              Destination Performance
            </CardTitle>
            <CardDescription>
              Average time variance by destination (positive = late,
              negative = early)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeVarianceAnalysis.routePerformance}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                >
                  <defs>
                    <linearGradient
                      id="positiveVariance"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                    <linearGradient
                      id="negativeVariance"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    opacity={0.4}
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    tickFormatter={(value) =>
                      `${value > 0 ? "+" : ""}${value} min`
                    }
                    domain={["dataMin - 10", "dataMax + 10"]}
                  />
                  <YAxis
                    dataKey="location"
                    type="category"
                    width={120}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#374151", fontSize: 11 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0]
                          .payload as LocationVariance;
                        return (
                          <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-3 shadow-xl">
                            <p className="font-semibold text-foreground mb-2">
                              {data.location}
                            </p>
                            <div className="space-y-1 text-sm">
                              <p>
                                Avg Variance:{" "}
                                <span
                                  className={
                                    data.avgVariance > 0
                                      ? "text-red-500"
                                      : "text-green-500"
                                  }
                                >
                                  {data.avgVariance > 0 ? "+" : ""}
                                  {data.avgVariance} min
                                </span>
                              </p>
                              <p className="text-green-600">
                                On Time: {data.onTimeCount}
                              </p>
                              <p className="text-blue-600">
                                Early: {data.earlyCount}
                              </p>
                              <p className="text-red-600">
                                Late: {data.lateCount}
                              </p>
                              <p className="text-muted-foreground">
                                Total: {data.totalLoads} loads
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  />
                  <Bar
                    dataKey="avgVariance"
                    name="Avg Variance (min)"
                    radius={[0, 6, 6, 0]}
                    barSize={24}
                  >
                    {timeVarianceAnalysis.routePerformance.map(
                      (entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.avgVariance >= 0 ? "#ef4444" : "#22c55e"
                          }
                        />
                      ),
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visual Delays by Location + Export */}
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={() => exportPunctualityToExcel(filteredLoads, timeRange)}>
          Export Excel (Punctuality)
        </Button>
        <Button size="sm" variant="outline" onClick={() => exportPunctualityToPdf(filteredLoads, timeRange)}>
          Export PDF (Punctuality)
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Origin Delays (by name)</CardTitle>
            <CardDescription>Late arrivals and departures (over 15 min)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={originDelayChartData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} horizontal vertical={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <YAxis dataKey="location" type="category" width={150} axisLine={false} tickLine={false} tick={{ fill: "#374151", fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  <Legend />
                  <Bar dataKey="arrLate" name="Late Arrivals" stackId="a" fill="#f59e0b" barSize={20} radius={[0, 6, 6, 0]} />
                  <Bar dataKey="depLate" name="Late Departures" stackId="a" fill="#ef4444" barSize={20} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Destination Delays (by name)</CardTitle>
            <CardDescription>Late arrivals and departures (over 15 min)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={destinationDelayChartData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} horizontal vertical={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <YAxis dataKey="location" type="category" width={150} axisLine={false} tickLine={false} tick={{ fill: "#374151", fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  <Legend />
                  <Bar dataKey="arrLate" name="Late Arrivals" stackId="a" fill="#3b82f6" barSize={20} radius={[0, 6, 6, 0]} />
                  <Bar dataKey="depLate" name="Late Departures" stackId="a" fill="#8b5cf6" barSize={20} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Legend */}
      <Card className="bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/30">
        <CardContent className="pt-6 pb-5">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
              <span className="text-sm">
                <span className="font-medium">On Time:</span> Within 15
                min of planned
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-sm">
                <span className="font-medium">Early:</span> More than 5
                min before
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500"></div>
              <span className="text-sm">
                <span className="font-medium">Slightly Late:</span> 15-30
                min after planned
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-sm">
                <span className="font-medium">Late:</span> Over 30 min
                after planned
              </span>
            </div>
          </div>
          {timeVarianceAnalysis.noDataCount > 0 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              {timeVarianceAnalysis.noDataCount} delivered loads have
              incomplete time data
            </p>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}