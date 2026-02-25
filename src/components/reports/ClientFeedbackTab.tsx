import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomTooltip, PieTooltip } from '@/components/reports/ChartTooltips';
import { TabsContent } from '@/components/ui/tabs';
import { useAllFeedback } from '@/hooks/useClientFeedback';
import {
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
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
} from 'recharts';
import { Frown, MessageSquare, Smile, ThumbsDown, TrendingDown } from 'lucide-react';
import { useMemo } from 'react';

interface ClientFeedbackTabProps {
  granularity: 'weekly' | 'monthly';
  timeRange: '3months' | '6months' | '12months';
}

export function ClientFeedbackTab({ granularity, timeRange }: ClientFeedbackTabProps) {
  const { data: allFeedback = [], isLoading } = useAllFeedback();

  const summary = useMemo(() => {
    const total = allFeedback.length;
    const unhappy = allFeedback.filter((f) => f.rating === 'unhappy').length;
    const happy = total - unhappy;

    return {
      total,
      happy,
      unhappy,
      happyPct: total > 0 ? Math.round((happy / total) * 100) : 0,
      unhappyPct: total > 0 ? Math.round((unhappy / total) * 100) : 0,
    };
  }, [allFeedback]);

  const sentimentDistribution = useMemo(() => {
    return [
      { name: 'Happy', value: summary.happy, fill: '#22c55e' },
      { name: 'Unhappy', value: summary.unhappy, fill: '#ef4444' },
    ].filter((d) => d.value > 0);
  }, [summary.happy, summary.unhappy]);

  const periodTrend = useMemo(() => {
    const now = new Date();
    const monthsToSubtract =
      timeRange === '3months' ? 3 : timeRange === '6months' ? 6 : 12;
    const startDate = subMonths(now, monthsToSubtract);

    if (granularity === 'weekly') {
      const weeks = eachWeekOfInterval(
        { start: startDate, end: now },
        { weekStartsOn: 1 }
      ).map((weekStart) => ({
        key: format(weekStart, 'yyyy-MM-dd'),
        label: format(weekStart, 'MMM d'),
        start: startOfWeek(weekStart, { weekStartsOn: 1 }),
        end: endOfWeek(weekStart, { weekStartsOn: 1 }),
        happy: 0,
        unhappy: 0,
      }));

      for (const fb of allFeedback) {
        const created = parseISO(fb.created_at);
        const slot = weeks.find((w) => created >= w.start && created <= w.end);
        if (!slot) continue;
        if (fb.rating === 'unhappy') slot.unhappy += 1;
        else slot.happy += 1;
      }

      return weeks.map(({ label, happy, unhappy }) => ({
        period: label,
        happy,
        unhappy,
        total: happy + unhappy,
      }));
    }

    const months = Array.from({ length: monthsToSubtract }, (_, i) => {
      const month = subMonths(now, monthsToSubtract - 1 - i);
      return {
        key: format(month, 'yyyy-MM'),
        label: format(month, 'MMM yy'),
        start: startOfMonth(month),
        end: endOfMonth(month),
        happy: 0,
        unhappy: 0,
      };
    });

    for (const fb of allFeedback) {
      const created = parseISO(fb.created_at);
      const slot = months.find((m) => created >= m.start && created <= m.end);
      if (!slot) continue;
      if (fb.rating === 'unhappy') slot.unhappy += 1;
      else slot.happy += 1;
    }

    return months.map(({ label, happy, unhappy }) => ({
      period: label,
      happy,
      unhappy,
      total: happy + unhappy,
    }));
  }, [allFeedback, granularity, timeRange]);

  const clientSatisfaction = useMemo(() => {
    const clientMap = new Map<string, { happy: number; unhappy: number; total: number }>();
    for (const fb of allFeedback) {
      const clientName = fb.clients?.name || 'Unknown Client';
      if (!clientMap.has(clientName)) {
        clientMap.set(clientName, { happy: 0, unhappy: 0, total: 0 });
      }
      const entry = clientMap.get(clientName)!;
      entry.total += 1;
      if (fb.rating === 'unhappy') entry.unhappy += 1;
      else entry.happy += 1;
    }

    return Array.from(clientMap.entries())
      .map(([client, v]) => ({
        client,
        happy: v.happy,
        unhappy: v.unhappy,
        total: v.total,
        unhappyRate: v.total > 0 ? Math.round((v.unhappy / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [allFeedback]);

  const averagePeriodResponses = useMemo(() => {
    if (periodTrend.length === 0) return 0;
    const total = periodTrend.reduce((acc, m) => acc + m.total, 0);
    return Math.round(total / periodTrend.length);
  }, [periodTrend]);

  return (
    <TabsContent value="feedback" className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {isLoading ? <Skeleton className="h-9 w-16" /> : summary.total}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Total Feedback</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Smile className="h-5 w-5 text-green-500" />
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {isLoading ? <Skeleton className="h-9 w-16" /> : `${summary.happyPct}%`}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Happy Rate</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ThumbsDown className="h-5 w-5 text-red-500" />
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {isLoading ? <Skeleton className="h-9 w-16" /> : summary.unhappy}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Unhappy Responses</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-amber-500" />
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {isLoading ? <Skeleton className="h-9 w-16" /> : averagePeriodResponses}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Avg {granularity === 'weekly' ? 'Weekly' : 'Monthly'} Responses
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Survey Sentiment Split
            </CardTitle>
            <CardDescription>Happy vs unhappy response distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[320px]" />
            ) : sentimentDistribution.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No survey responses yet</p>
              </div>
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      dataKey="value"
                      paddingAngle={4}
                      stroke="none"
                    >
                      {sentimentDistribution.map((entry, idx) => (
                        <Cell key={`sentiment-${idx}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend verticalAlign="bottom" align="center" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-amber-500" />
              {granularity === 'weekly' ? 'Weekly' : 'Monthly'} Survey Trend
            </CardTitle>
            <CardDescription>
              Last {timeRange === '3months' ? '3 months' : timeRange === '6months' ? '6 months' : '12 months'} of happy/unhappy responses ({granularity})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[320px]" />
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={periodTrend} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.35} vertical={false} />
                    <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} interval="preserveStartEnd" />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="happy" name="Happy" stackId="survey" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="unhappy" name="Unhappy" stackId="survey" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Frown className="h-5 w-5 text-red-500" />
            Client Survey Statistics
          </CardTitle>
          <CardDescription>
            Satisfaction performance by client (top accounts by response volume)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[380px]" />
          ) : clientSatisfaction.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No client survey stats yet</p>
            </div>
          ) : (
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={clientSatisfaction}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 30, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.35} vertical={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis
                    type="category"
                    dataKey="client"
                    width={180}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#374151' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="happy" name="Happy" stackId="client" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="unhappy" name="Unhappy" stackId="client" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
