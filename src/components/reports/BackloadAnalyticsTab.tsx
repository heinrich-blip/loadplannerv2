import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { CustomTooltip, PieTooltip } from "@/components/reports/ChartTooltips";
import type {
  BackloadCargoTypeData,
  BackloadDestinationData,
  BackloadDistribution,
  BackloadMovement,
  BackloadRouteAnalysisItem,
  BackloadSummaryStats,
  BackloadWeeklyTrend,
} from "@/components/reports/types";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Map as MapIcon,
  Package,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
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

interface BackloadAnalyticsTabProps {
  backloadSummaryStats: BackloadSummaryStats;
  backloadMovements: BackloadMovement[];
  backloadPackagingDistribution: BackloadDistribution[];
  backloadStatusDistribution: BackloadDistribution[];
  backloadDestinationDistribution: BackloadDestinationData[];
  backloadWeeklyTrend: BackloadWeeklyTrend[];
  backloadRouteAnalysis: BackloadRouteAnalysisItem[];
  backloadCargoTypeDistribution: BackloadCargoTypeData[];
}

export function BackloadAnalyticsTab({
  backloadSummaryStats,
  backloadMovements,
  backloadPackagingDistribution,
  backloadStatusDistribution,
  backloadDestinationDistribution,
  backloadWeeklyTrend,
  backloadRouteAnalysis,
  backloadCargoTypeDistribution,
}: BackloadAnalyticsTabProps) {
  return (
    <TabsContent value="backload" className="space-y-6">
      {/* Backload Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200/50 dark:border-violet-800/30 shadow-sm">
          <CardContent className="pt-6 pb-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-violet-500" />
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-600/70 dark:text-violet-400/70">
                  Total Movements
                </p>
              </div>
              <p className="text-4xl font-bold text-violet-700 dark:text-violet-300">
                {backloadSummaryStats.totalMovements}
              </p>
              <p className="text-sm text-muted-foreground">
                backload operations
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border-cyan-200/50 dark:border-cyan-800/30 shadow-sm">
          <CardContent className="pt-6 pb-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-cyan-500" />
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-600/70 dark:text-cyan-400/70">
                  Total Packaging
                </p>
              </div>
              <p className="text-4xl font-bold text-cyan-700 dark:text-cyan-300">
                {backloadSummaryStats.totalPackaging.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                bins, crates & pallets
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200/50 dark:border-emerald-800/30 shadow-sm">
          <CardContent className="pt-6 pb-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70">
                  Delivery Rate
                </p>
              </div>
              <p className="text-4xl font-bold text-emerald-700 dark:text-emerald-300">
                {backloadSummaryStats.deliveryRate}%
              </p>
              <p className="text-sm text-muted-foreground">
                {backloadSummaryStats.deliveredCount} delivered
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/50 dark:border-amber-800/30 shadow-sm">
          <CardContent className="pt-6 pb-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapIcon className="h-4 w-4 text-amber-500" />
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70">
                  Destinations
                </p>
              </div>
              <p className="text-4xl font-bold text-amber-700 dark:text-amber-300">
                {backloadSummaryStats.uniqueDestinations}
              </p>
              <p className="text-sm text-muted-foreground">
                unique farms/locations
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Packaging Breakdown Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-100/50 to-violet-100/50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200/50 dark:border-purple-800/30">
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {backloadSummaryStats.totalBins.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Bins</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-100/50 to-blue-100/50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-200/50 dark:border-cyan-800/30">
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {backloadSummaryStats.totalCrates.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Crates</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-100/50 to-yellow-100/50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200/50 dark:border-amber-800/30">
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {backloadSummaryStats.totalPallets.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Pallets</p>
          </CardContent>
        </Card>
      </div>

      {backloadMovements.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Packaging Type Distribution */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-purple-500" />
                  Packaging Type Distribution
                </CardTitle>
                <CardDescription>
                  Breakdown of backload packaging by type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={backloadPackagingDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {backloadPackagingDistribution.map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.fill}
                            />
                          ),
                        )}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{ paddingTop: "20px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Backload Status Distribution */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Movement Status
                </CardTitle>
                <CardDescription>
                  Current status of backload movements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={backloadStatusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {backloadStatusDistribution.map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.fill}
                            />
                          ),
                        )}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{ paddingTop: "20px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Backload by Destination */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-orange-500" />
                Packaging by Destination
              </CardTitle>
              <CardDescription>
                Backload packaging distribution across destination farms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={backloadDestinationDistribution}
                    margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient
                        id="binsGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="#a855f7"
                          stopOpacity={0.7}
                        />
                      </linearGradient>
                      <linearGradient
                        id="cratesGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#06b6d4"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="#0891b2"
                          stopOpacity={0.7}
                        />
                      </linearGradient>
                      <linearGradient
                        id="palletsGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#f59e0b"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="#d97706"
                          stopOpacity={0.7}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e7eb"
                      opacity={0.4}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="destination"
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
                    <Legend wrapperStyle={{ paddingTop: "10px" }} />
                    <Bar
                      dataKey="bins"
                      name="Bins"
                      fill="url(#binsGradient)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="crates"
                      name="Crates"
                      fill="url(#cratesGradient)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="pallets"
                      name="Pallets"
                      fill="url(#palletsGradient)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Backload Weekly Trend */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Weekly Packaging Movement Trends
              </CardTitle>
              <CardDescription>
                Backload packaging quantities over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={backloadWeeklyTrend}
                    margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient
                        id="binsAreaGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8b5cf6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="cratesAreaGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#06b6d4"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#06b6d4"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="palletsAreaGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#f59e0b"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f59e0b"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
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
                    <Legend wrapperStyle={{ paddingTop: "10px" }} />
                    <Area
                      type="monotone"
                      dataKey="bins"
                      name="Bins"
                      stroke="#8b5cf6"
                      fill="url(#binsAreaGradient)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="crates"
                      name="Crates"
                      stroke="#06b6d4"
                      fill="url(#cratesAreaGradient)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="pallets"
                      name="Pallets"
                      stroke="#f59e0b"
                      fill="url(#palletsAreaGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Backload Route Analysis */}
          {backloadRouteAnalysis.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <MapIcon className="h-5 w-5 text-indigo-500" />
                  Backload Route Analysis
                </CardTitle>
                <CardDescription>
                  Top routes for backload packaging movements (delivery
                  destination → backload farm)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={backloadRouteAnalysis}
                      layout="vertical"
                      margin={{
                        top: 10,
                        right: 30,
                        left: 20,
                        bottom: 10,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="routeBackloadGradient"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#8b5cf6" />
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
                      />
                      <YAxis
                        dataKey="route"
                        type="category"
                        width={200}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#374151", fontSize: 11 }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-3 shadow-xl">
                                <p className="font-semibold text-foreground mb-2">
                                  {data.route}
                                </p>
                                <div className="space-y-1 text-sm">
                                  <p>
                                    Movements:{" "}
                                    <span className="font-medium">
                                      {data.count}
                                    </span>
                                  </p>
                                  <p className="text-purple-600">
                                    Bins: {data.bins}
                                  </p>
                                  <p className="text-cyan-600">
                                    Crates: {data.crates}
                                  </p>
                                  <p className="text-amber-600">
                                    Pallets: {data.pallets}
                                  </p>
                                  <p className="text-muted-foreground">
                                    Total: {data.totalPackaging} items
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
                        dataKey="count"
                        name="Movements"
                        fill="url(#routeBackloadGradient)"
                        radius={[0, 6, 6, 0]}
                        barSize={24}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Backload Cargo Type Distribution */}
          {backloadCargoTypeDistribution.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5 text-teal-500" />
                  Backload Cargo Types
                </CardTitle>
                <CardDescription>
                  Distribution of backload movements by cargo type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={backloadCargoTypeDistribution}
                      margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e5e7eb"
                        opacity={0.4}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="cargoType"
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
                        dataKey="count"
                        name="Count"
                        radius={[6, 6, 0, 0]}
                        barSize={60}
                      >
                        {backloadCargoTypeDistribution.map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.fill}
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

          {/* Info Card */}
          <Card className="bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/30">
            <CardContent className="pt-6 pb-5">
              <div className="flex flex-wrap items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                  <span className="text-sm">
                    <span className="font-medium">Bins:</span> Standard
                    packaging bins
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-cyan-500"></div>
                  <span className="text-sm">
                    <span className="font-medium">Crates:</span> Reusable
                    crates
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                  <span className="text-sm">
                    <span className="font-medium">Pallets:</span> Shipping
                    pallets
                  </span>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Backload operations return empty packaging from delivery
                destinations to farm locations
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/30">
          <CardContent className="pt-12 pb-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  No Backload Data Available
                </h3>
                <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                  There are no backload packaging movements recorded in
                  the selected time range. Backload data is captured when
                  loads include return packaging information.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}