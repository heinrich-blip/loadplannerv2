import { useClientPWA } from '@/hooks/useClientPWA';
import { Download } from 'lucide-react';

/** Small install button shown in the client dashboard header */
export function PWAInstallButton() {
  const { canInstall, isInstalled, installApp } = useClientPWA();

  if (isInstalled || !canInstall) return null;

  return (
    <button
      onClick={installApp}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg transition-colors"
      title="Install this app on your device"
    >
      <Download className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Install App</span>
    </button>
  );
}
