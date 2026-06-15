import { useState, useEffect } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface NetworkNotification {
  message: string;
  type: 'online' | 'offline' | null;
}

export const usePWAManager = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  });
  const [dismissedInstallBanner, setDismissedInstallBanner] = useState<boolean>(false);
  const [networkNotification, setNetworkNotification] = useState<NetworkNotification>({
    message: '',
    type: null,
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const goOnline = () => {
      setIsOffline(false);
      setNetworkNotification({
        message: '¡Conexión recuperada! Sincronizando datos... ✅',
        type: 'online',
      });
      setTimeout(() => {
        setNetworkNotification((prev) =>
          prev.type === 'online' ? { message: '', type: null } : prev
        );
      }, 4000);
    };

    const goOffline = () => {
      setIsOffline(true);
      setNetworkNotification({
        message: 'Navegando sin conexión. Las funciones locales de IndexedDB siguen disponibles. ⚠️',
        type: 'offline',
      });
      setTimeout(() => {
        setNetworkNotification((prev) =>
          prev.type === 'offline' ? { message: '', type: null } : prev
        );
      }, 5000);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA installation outcome: ${outcome}`);
    } catch (err) {
      console.error('Error during PWA installation:', err);
    } finally {
      setDeferredPrompt(null);
      setDismissedInstallBanner(true);
    }
  };

  return {
    deferredPrompt,
    isOffline,
    dismissedInstallBanner,
    setDismissedInstallBanner,
    networkNotification,
    setNetworkNotification,
    handleInstallPWA,
  };
};
