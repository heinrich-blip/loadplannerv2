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
  CargoDistribution,
  StatusDistribution,
  RouteData,
  WeeklyTrend,
} from "@/components/reports/types";
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

interface DistributionTabProps {
  cargoDistribution: CargoDistribution[];
  statusDistribution: StatusDistribution[];
  topRoutes: RouteData[];
  weeklyTrend: WeeklyTrend[];
}

export function DistributionTab({
  cargoDistribution,
  statusDistribution,
  topRoutes,
  weeklyTrend,
}: DistributionTabProps) {
  return (
    <TabsContent value="distribution" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cargo Type Distribution */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">
              Cargo Type Distribution
            </CardTitle>
            <CardDescription>
              Breakdown of loads by cargo category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cargoDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {cargoDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
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

        {/* Status Distribution */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">
              Status Distribution
            </CardTitle>
            <CardDescription>
              Current load status overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
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

      {/* Top Routes */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            Top Routes by Load Volume
          </CardTitle>
          <CardDescription>
            Most frequently used delivery routes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topRoutes}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <defs>
                  <linearGradient
                    id="routeGradient"
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
                  width={180}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#374151", fontSize: 11 }}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                />
                <Bar
                  dataKey="loads"
                  fill="url(#routeGradient)"
                  radius={[0, 6, 6, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Trend */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            Weekly Load Trends
          </CardTitle>
          <CardDescription>
            Load volumes and status breakdown over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={weeklyTrend}
                margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
              >
                <defs>
                  <linearGradient
                    id="scheduledGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#3b82f6"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="#3b82f6"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="transitGradient"
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
                  <linearGradient
                    id="deliveredGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#22c55e"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="#22c55e"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="pendingGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#ef4444"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="#ef4444"
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
                  dataKey="scheduled"
                  name="Scheduled"
                  stroke="#3b82f6"
                  fill="url(#scheduledGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="inTransit"
                  name="In Transit"
                  stroke="#f59e0b"
                  fill="url(#transitGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="delivered"
                  name="Delivered"
                  stroke="#22c55e"
                  fill="url(#deliveredGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="pending"
                  name="Pending"
                  stroke="#ef4444"
                  fill="url(#pendingGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}