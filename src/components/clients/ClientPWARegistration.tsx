import { useEffect } from 'react';

/**
 * Registers the client portal service worker and injects PWA manifest + meta tags.
 * Should only be rendered on /portal/* routes so the main admin app is unaffected.
 */
export function ClientPWARegistration() {
  useEffect(() => {
    // --- Inject manifest link ---
    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = '/client-manifest.json';

    // --- Inject PWA meta tags ---
    const metaTags: Record<string, string> = {
      'theme-color': '#1e40af',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'apple-mobile-web-app-title': 'LoadPlan',
      'mobile-web-app-capable': 'yes',
    };

    const addedMeta: HTMLMetaElement[] = [];
    for (const [name, content] of Object.entries(metaTags)) {
      let existing = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!existing) {
        existing = document.createElement('meta');
        existing.name = name;
        document.head.appendChild(existing);
        addedMeta.push(existing);
      }
      existing.content = content;
    }

    // --- Inject Apple touch icon ---
    let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = '/pwa-icons/icon-192x192.png';

    // --- Register service worker ---
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/client-sw.js', { scope: '/portal/' })
        .then((reg) => {
          console.log('[Client PWA] Service worker registered, scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[Client PWA] Service worker registration failed:', err);
        });
    }

    // Cleanup: remove injected tags when leaving portal
    return () => {
      manifestLink?.remove();
      appleIcon?.remove();
      addedMeta.forEach((el) => el.remove());
    };
  }, []);

  return null;
}
