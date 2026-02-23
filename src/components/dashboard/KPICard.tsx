import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant: 'scheduled' | 'transit' | 'pending' | 'delivered' | 'total';
  trend?: { value: number; isPositive: boolean };
}

const variantStyles = {
  total: {
    card: '',
    icon: 'bg-primary/10 text-primary',
    accent: 'from-primary/20 to-transparent',
  },
  scheduled: {
    card: 'kpi-card-scheduled',
    icon: 'bg-status-scheduled/10 text-status-scheduled',
    accent: 'from-status-scheduled/20 to-transparent',
  },
  transit: {
    card: 'kpi-card-transit',
    icon: 'bg-status-transit/10 text-status-transit',
    accent: 'from-status-transit/20 to-transparent',
  },
  pending: {
    card: 'kpi-card-pending',
    icon: 'bg-status-pending/10 text-status-pending',
    accent: 'from-status-pending/20 to-transparent',
  },
  delivered: {
    card: 'kpi-card-delivered',
    icon: 'bg-status-delivered/10 text-status-delivered',
    accent: 'from-status-delivered/20 to-transparent',
  },
};

export function KPICard({ title, value, icon: Icon, variant, trend }: KPICardProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn('kpi-card group', styles.card)}>
      <div className={cn('absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl opacity-50 rounded-bl-full', styles.accent)} />
      
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className={cn(
              'mt-1 text-xs font-medium',
              trend.isPositive ? 'text-status-scheduled' : 'text-destructive'
            )}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}% from last week
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl transition-transform duration-300 group-hover:scale-110', styles.icon)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}