import { useCallback, useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function useClientPWA() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed as PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS (Safari doesn't support beforeinstallprompt)
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOSDevice) {
      setIsIOS(true);
      setCanInstall(true);
      return;
    }

    // Listen for the browser's install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPrompt.current = null;
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt.current) return;

    try {
      await deferredPrompt.current.prompt();
      const choice = await deferredPrompt.current.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
      }
    } catch {
      // User dismissed or error
    }

    deferredPrompt.current = null;
  }, [isIOS]);

  const dismissIOSInstructions = useCallback(() => {
    setShowIOSInstructions(false);
  }, []);

  return {
    canInstall,
    isInstalled,
    isIOS,
    showIOSInstructions,
    installApp,
    dismissIOSInstructions,
  };
}
