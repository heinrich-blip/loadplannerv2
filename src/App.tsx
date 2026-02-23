import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { GeofenceMonitorProvider } from "@/hooks/useGeofenceMonitor";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ClientsPage from "./pages/ClientsPage";
import DieselOrdersPage from "./pages/DieselOrdersPage";
import DriversPage from "./pages/DriversPage";
import FleetPage from "./pages/FleetPage";
import Index from "./pages/Index";
import LoadsPage from "./pages/LoadsPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import ThirdPartyLoadsPage from "./pages/ThirdPartyLoadsPage";
import ClientDashboardPage from "./pages/client-dashboard/ClientDashboardPage";

// Lazy-loaded heavy pages (maps, charts, calendar)
const CalendarPage = React.lazy(() => import("./pages/CalendarPage"));
const DeliveriesDashboardPage = React.lazy(() => import("./pages/DeliveriesDashboardPage"));
const LiveTrackingPage = React.lazy(() => import("./pages/LiveTrackingPage"));
const ReportsPage = React.lazy(() => import("./pages/ReportsPage"));
const ShareableTrackingPage = React.lazy(() => import("./pages/ShareableTrackingPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // Data stays fresh for 30s (stops refetch-on-focus spam)
      gcTime: 5 * 60_000,       // Unused cache kept for 5 min
      retry: 1,                 // Retry once on failure
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,             // Never auto-retry mutations (creates, updates, deletes)
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <GeofenceMonitorProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary>
          <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/track" element={<ShareableTrackingPage />} />
            {/* Public client portal - no authentication required */}
            <Route path="/portal/:clientId/*" element={<ClientDashboardPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/loads"
              element={
                <ProtectedRoute>
                  <LoadsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <CalendarPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fleet"
              element={
                <ProtectedRoute>
                  <FleetPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/drivers"
              element={
                <ProtectedRoute>
                  <DriversPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <ClientsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers/:clientId/*"
              element={
                <ProtectedRoute>
                  <ClientDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/live-tracking"
              element={
                <ProtectedRoute>
                  <LiveTrackingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/third-party"
              element={
                <ProtectedRoute>
                  <ThirdPartyLoadsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/diesel-orders"
              element={
                <ProtectedRoute>
                  <DieselOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/deliveries"
              element={
                <ProtectedRoute>
                  <DeliveriesDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
      </GeofenceMonitorProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;