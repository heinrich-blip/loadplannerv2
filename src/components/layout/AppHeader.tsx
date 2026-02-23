import { Search, Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title = 'Dashboard' }: AppHeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground">
          <Menu className="h-5 w-5" />
        </SidebarTrigger>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">
            Week of {format(weekStart, 'd')}-{format(weekEnd, 'd MMMM yyyy')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search loads, drivers..."
            className="w-64 pl-9 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-accent"
          />
        </div>
        <NotificationBell />
        <div className="flex items-center gap-3 pl-3 border-l">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 w-9 rounded-full p-0 bg-primary hover:bg-primary/90">
                <span className="text-sm font-medium text-primary-foreground">{userInitials}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">Account</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}