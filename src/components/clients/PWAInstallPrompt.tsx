import { useClientPWA } from '@/hooks/useClientPWA';
import { Download, Share, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function PWAInstallPrompt() {
  const { canInstall, isInstalled, isIOS, showIOSInstructions, installApp, dismissIOSInstructions } =
    useClientPWA();
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Don't show if already installed, dismissed, or can't install
    if (isInstalled || !canInstall) return;

    // Check if user previously dismissed (respect for 7 days)
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }

    // Show after a short delay so it doesn't feel intrusive
    const timer = setTimeout(() => setShowBanner(true), 3000);
    return () => clearTimeout(timer);
  }, [canInstall, isInstalled]);

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  const handleInstall = () => {
    installApp();
    if (!isIOS) {
      setShowBanner(false);
    }
  };

  if (isInstalled || dismissed || !showBanner) return null;

  return (
    <>
      {/* Install Banner */}
      <div className="fixed bottom-0 inset-x-0 z-[60] p-4 sm:p-6 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                {/* App icon */}
                <div className="flex-shrink-0 h-12 w-12 rounded-xl overflow-hidden bg-white border border-border shadow-sm flex items-center justify-center">
                  <img src="/loadplan-logo.png" alt="LoadPlan" className="h-10 w-10 object-contain" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Install LoadPlan</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Get quick access to your delivery dashboard
                      </p>
                    </div>
                    <button
                      onClick={handleDismiss}
                      className="flex-shrink-0 p-1 rounded-md hover:bg-muted/80 text-muted-foreground transition-colors"
                      aria-label="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={handleInstall}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Install App
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Not now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-base text-foreground">Install on iOS</h3>
                <button
                  onClick={() => {
                    dismissIOSInstructions();
                    handleDismiss();
                  }}
                  className="p-1 rounded-md hover:bg-muted/80 text-muted-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="text-sm text-foreground font-medium">Tap the Share button</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      Look for the <Share className="h-3 w-3 inline" /> icon in your browser toolbar
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="text-sm text-foreground font-medium">Scroll down and tap</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      "Add to Home Screen"
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="text-sm text-foreground font-medium">Tap "Add"</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      The app will appear on your home screen
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  dismissIOSInstructions();
                  handleDismiss();
                }}
                className="w-full mt-5 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
