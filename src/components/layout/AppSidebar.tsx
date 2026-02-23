import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
    BarChart3,
    Building2,
    Calendar,
    Fuel,
    LayoutDashboard,
    MapPin,
    Package,
    Route,
    Settings,
    Truck,
    Users,
} from "lucide-react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Load Planning", url: "/loads", icon: Package },
  { title: "Third-Party Loads", url: "/third-party", icon: Building2 },
  { title: "Diesel Orders", url: "/diesel-orders", icon: Fuel },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Live Tracking", url: "/live-tracking", icon: MapPin },
  { title: "Deliveries", url: "/deliveries", icon: Route },
];

const managementItems = [
  { title: "Fleet", url: "/fleet", icon: Truck },
  { title: "Drivers", url: "/drivers", icon: Users },
  { title: "Customers", url: "/customers", icon: Building2 },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const NavItem = ({ item }: { item: (typeof mainNavItems)[0] }) => {
    const isActive = location.pathname === item.url;

    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <RouterNavLink
            to={item.url}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive &&
                "bg-sidebar-primary text-sidebar-primary-foreground font-medium",
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </RouterNavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      className={cn(
        "border-r-0 transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
      collapsible="icon"
    >
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary">
            <Package className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-lg font-bold text-sidebar-foreground">
                LoadPlan
              </h1>
              <p className="text-xs text-sidebar-foreground/60">
                Fleet Management
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-2">
              Main
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainNavItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-2">
              Management
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {managementItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <RouterNavLink
                to="/settings"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  location.pathname === "/settings" && "bg-sidebar-accent",
                )}
              >
                <Settings className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Settings</span>}
              </RouterNavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}