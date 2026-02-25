// components/ui/dashboard-tabs.tsx
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  BarChart3,
  LayoutDashboard, 
  Map, 
  Package, 
  Truck,
} from 'lucide-react';

const iconMap = {
  BarChart3,
  LayoutDashboard,
  Map,
  Package,
  Truck,
};

interface Tab {
  value: string;
  label: string;
  icon: keyof typeof iconMap;
}

interface DashboardTabsProps {
  tabs: Tab[];
  basePath: string;
}

export function DashboardTabs({ tabs, basePath }: DashboardTabsProps) {
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop() || 'overview';

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = iconMap[tab.icon];
          const href = tab.value === 'overview' ? basePath : `${basePath}/${tab.value}`;
          const isActive = 
            (tab.value === 'overview' && currentPath === basePath.split('/').pop()) ||
            currentPath === tab.value;

          return (
            <Link
              key={tab.value}
              to={href}
              className={cn(
                'group inline-flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors',
                isActive
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              <Icon className={cn(
                'h-5 w-5',
                isActive ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-500'
              )} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}