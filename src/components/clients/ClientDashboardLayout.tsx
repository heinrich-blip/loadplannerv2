////ClientDashboardLayout.tsx


import { Skeleton } from '@/components/ui/skeleton';
import { useClient } from '@/hooks/useClientLoads';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MapPin,
  Package,
  Route,
} from 'lucide-react';
import { ReactNode } from 'react';
import { NavLink, useParams, useLocation } from 'react-router-dom';

interface ClientDashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { title: 'Overview', path: '', icon: LayoutDashboard },
  { title: 'Live Map', path: 'live-map', icon: MapPin },
  { title: 'Loads', path: 'loads', icon: Package },
  { title: 'Deliveries', path: 'deliveries', icon: Route },
];

export function ClientDashboardLayout({ children }: ClientDashboardLayoutProps) {
  const { clientId } = useParams<{ clientId: string }>();
  const location = useLocation();
  const { data: client, isLoading } = useClient(clientId);
  
  // Determine base path - use /portal for public access, /customers for admin access
  const basePath = location.pathname.startsWith('/portal') ? '/portal' : '/customers';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg overflow-hidden bg-white">
                <img src="/loadplan-logo.png" alt="LoadPlan" className="h-14 w-14 object-contain" />
              </div>
              {isLoading ? (
                <div className="space-y-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ) : (
                <div>
                  <h1 className="font-semibold text-lg">{client?.name || 'Client Portal'}</h1>
                  <p className="text-xs text-muted-foreground">Customer Portal</p>
                </div>
              )}
            </div>

            {/* Contact info */}
            {client && (
              <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                {client.contact_person && (
                  <span>{client.contact_person}</span>
                )}
                {client.contact_email && (
                  <span>{client.contact_email}</span>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1 mt-4 -mb-px">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={`${basePath}/${clientId}${item.path ? `/${item.path}` : ''}`}
                end={item.path === ''}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive
                      ? 'bg-background border border-b-0 text-foreground'
                      : 'text-muted-foreground'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by LoadPlan Fleet Management</p>
        </div>
      </footer>
    </div>
  );
}