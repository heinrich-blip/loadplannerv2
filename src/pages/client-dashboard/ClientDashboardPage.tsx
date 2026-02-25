import { ClientDashboardLayout } from '@/components/clients/ClientDashboardLayout';
import { useParams, Route, Routes, Navigate } from 'react-router-dom';
import ClientOverviewPage from './ClientOverviewPage';
import ClientLiveMapPage from './ClientLiveMapPage';
import ClientLoadsPage from './ClientLoadsPage';
import ClientDeliveriesPage from './ClientDeliveriesPage';
import ClientServiceHistoryPage from './ClientServiceHistoryPage';

export default function ClientDashboardPage() {
  const { clientId } = useParams<{ clientId: string }>();

  if (!clientId) {
    return <Navigate to="/customers" replace />;
  }

  return (
    <ClientDashboardLayout>
      <Routes>
        <Route index element={<ClientOverviewPage key={clientId} />} />
        <Route path="live-map" element={<ClientLiveMapPage key={clientId} />} />
        <Route path="loads" element={<ClientLoadsPage key={clientId} />} />
        <Route path="deliveries" element={<ClientDeliveriesPage key={clientId} />} />
        <Route path="past-deliveries" element={<ClientServiceHistoryPage key={clientId} />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </ClientDashboardLayout>
  );
}