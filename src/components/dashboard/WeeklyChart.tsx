import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { startOfWeek, addDays, format, parseISO, isSameDay } from 'date-fns';
import { Load } from '@/hooks/useLoads';

interface WeeklyChartProps {
  loads: Load[];
}

export function WeeklyChart({ loads }: WeeklyChartProps) {
  const weeklyDistribution = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i);
      const dayLoads = loads.filter(load => {
        try {
          const loadDate = parseISO(load.loading_date);
          return isSameDay(loadDate, day);
        } catch {
          return false;
        }
      });
      
      return {
        day: format(day, 'EEE'),
        loads: dayLoads.length,
      };
    });
  }, [loads]);

  const maxLoads = Math.max(...weeklyDistribution.map(d => d.loads), 1);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-foreground">Weekly Load Distribution</h3>
        <p className="text-sm text-muted-foreground">Loads scheduled per day this week</p>
      </div>
      
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyDistribution} barSize={40}>
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Bar dataKey="loads" radius={[6, 6, 0, 0]}>
              {weeklyDistribution.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.loads === maxLoads && entry.loads > 0
                    ? 'hsl(var(--accent))' 
                    : entry.loads === 0 
                      ? 'hsl(var(--muted))' 
                      : 'hsl(var(--primary) / 0.7)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}