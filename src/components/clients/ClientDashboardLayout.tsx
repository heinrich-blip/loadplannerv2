////ClientDashboardLayout.tsx


import { Skeleton } from '@/components/ui/skeleton';
import { useClient } from '@/hooks/useClientLoads';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { NavLink, useParams, useLocation } from 'react-router-dom';

interface ClientDashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { title: 'Overview', path: '' },
  { title: 'Live Map', path: 'live-map' },
  { title: 'Loads', path: 'loads' },
  { title: 'Deliveries', path: 'deliveries' },
  { title: 'Past Deliveries', path: 'past-deliveries' },
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
      <header className="sticky top-0 z-50 border-b border-subtle bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl overflow-hidden bg-white border border-subtle shadow-sm flex-shrink-0">
                <img src="/loadplan-logo.png" alt="LoadPlan" className="h-9 w-9 sm:h-11 sm:w-11 object-contain" />
              </div>
              {isLoading ? (
                <div className="space-y-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ) : (
                <div className="min-w-0 space-y-0.5">
                  <h1 className="font-semibold text-base sm:text-lg leading-tight truncate">{client?.name || 'Client Portal'}</h1>
                  <p className="text-xs text-muted-foreground font-medium">Client Dashboard</p>
                </div>
              )}
            </div>

            {/* Contact info */}
            {client && (
              <div className="hidden lg:flex items-center gap-4 text-sm text-muted-foreground">
                {client.contact_person && (
                  <span>{client.contact_person}</span>
                )}
                {client.contact_email && (
                  <span>{client.contact_email}</span>
                )}
              </div>
            )}
          </div>

          {/* Navigation — horizontally scrollable on mobile */}
          <nav className="flex items-center gap-1.5 mt-4 overflow-x-auto scrollbar-none -mx-2 px-2 sm:-mx-0 sm:px-0 pb-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={`${basePath}/${clientId}${item.path ? `/${item.path}` : ''}`}
                end={item.path === ''}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3.5 sm:px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex-shrink-0 border',
                    'hover:bg-muted/70 hover:text-foreground hover:border-border/70',
                    isActive
                      ? 'bg-background text-foreground border-border shadow-sm'
                      : 'text-muted-foreground border-transparent bg-transparent'
                  )
                }
              >
                <span>{item.title}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-5 sm:py-7">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-subtle bg-card/80">
        <div className="container mx-auto px-4 sm:px-6 py-4 text-center text-xs sm:text-sm text-muted-foreground">
          <p>Powered by LoadPlan Fleet Management</p>
        </div>
      </footer>
    </div>
  );
}