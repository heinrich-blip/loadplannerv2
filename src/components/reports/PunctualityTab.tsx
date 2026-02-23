import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { DailyPunctualityRow, WeeklyPunctualityRow, DelayBarRow } from "./types";
import { cn } from "@/lib/utils";

interface PunctualityTabProps {
  dailyPunctuality: DailyPunctualityRow[];
  weeklyPunctuality: WeeklyPunctualityRow[];
  _originDelayChartData: DelayBarRow[];
  _destinationDelayChartData: DelayBarRow[];
  delaySummary: {
    topOrigins: [string, number][];
    topDests: [string, number][];
  };
}

export function PunctualityTab({
  dailyPunctuality,
  weeklyPunctuality,
  _originDelayChartData,
  _destinationDelayChartData,
  delaySummary,
}: PunctualityTabProps) {
  const getVarianceBadge = (variance: number | null | undefined) => {
    if (variance === null || variance === undefined) return <Badge variant="outline">No data</Badge>;
    if (variance <= -5) return <Badge className="bg-blue-500">Early</Badge>;
    if (variance <= 15) return <Badge className="bg-green-500">On time</Badge>;
    if (variance <= 30) return <Badge className="bg-yellow-500">Slightly late</Badge>;
    return <Badge className="bg-red-500">Late</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Daily Punctuality Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Punctuality Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Loads</TableHead>
                  <TableHead>Origin Arrival</TableHead>
                  <TableHead>Origin Departure</TableHead>
                  <TableHead>Dest Arrival</TableHead>
                  <TableHead>Dest Departure</TableHead>
                  <TableHead>Origin Delays</TableHead>
                  <TableHead>Dest Delays</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyPunctuality.slice(0, 30).map((row) => (
                  <TableRow key={row.date}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.loads}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{row.originArrivalAvg !== null ? `${row.originArrivalAvg} min` : '-'}</span>
                        {getVarianceBadge(row.originArrivalAvg)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{row.originDepartureAvg !== null ? `${row.originDepartureAvg} min` : '-'}</span>
                        {getVarianceBadge(row.originDepartureAvg)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{row.destArrivalAvg !== null ? `${row.destArrivalAvg} min` : '-'}</span>
                        {getVarianceBadge(row.destArrivalAvg)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{row.destDepartureAvg !== null ? `${row.destDepartureAvg} min` : '-'}</span>
                        {getVarianceBadge(row.destDepartureAvg)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.originDelayCount > 0 ? "destructive" : "secondary"}>
                        {row.originDelayCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.destDelayCount > 0 ? "destructive" : "secondary"}>
                        {row.destDelayCount}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Punctuality Table */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Punctuality Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead>Loads</TableHead>
                  <TableHead>Avg Origin Arrival</TableHead>
                  <TableHead>Avg Origin Departure</TableHead>
                  <TableHead>Avg Dest Arrival</TableHead>
                  <TableHead>Avg Dest Departure</TableHead>
                  <TableHead>Origin Delays</TableHead>
                  <TableHead>Dest Delays</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeklyPunctuality.map((row) => (
                  <TableRow key={row.week}>
                    <TableCell>{row.week}</TableCell>
                    <TableCell>{row.loads}</TableCell>
                    <TableCell className={cn(
                      row.originArrivalAvg && row.originArrivalAvg > 15 ? "text-red-500 font-bold" : ""
                    )}>
                      {row.originArrivalAvg !== null ? `${row.originArrivalAvg} min` : '-'}
                    </TableCell>
                    <TableCell className={cn(
                      row.originDepartureAvg && row.originDepartureAvg > 15 ? "text-red-500 font-bold" : ""
                    )}>
                      {row.originDepartureAvg !== null ? `${row.originDepartureAvg} min` : '-'}
                    </TableCell>
                    <TableCell className={cn(
                      row.destArrivalAvg && row.destArrivalAvg > 15 ? "text-red-500 font-bold" : ""
                    )}>
                      {row.destArrivalAvg !== null ? `${row.destArrivalAvg} min` : '-'}
                    </TableCell>
                    <TableCell className={cn(
                      row.destDepartureAvg && row.destDepartureAvg > 15 ? "text-red-500 font-bold" : ""
                    )}>
                      {row.destDepartureAvg !== null ? `${row.destDepartureAvg} min` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.originDelayCount > 0 ? "destructive" : "secondary"}>
                        {row.originDelayCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.destDelayCount > 0 ? "destructive" : "secondary"}>
                        {row.destDelayCount}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delay Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Origin Delay Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {delaySummary.topOrigins.map(([location, minutes]) => (
                <div key={location} className="flex justify-between items-center">
                  <span className="text-sm">{location}</span>
                  <Badge variant="destructive">{Math.round(minutes)} min</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Destination Delay Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {delaySummary.topDests.map(([location, minutes]) => (
                <div key={location} className="flex justify-between items-center">
                  <span className="text-sm">{location}</span>
                  <Badge variant="destructive">{Math.round(minutes)} min</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}