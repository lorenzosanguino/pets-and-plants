export class NotificationManager {
  static async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones de escritorio');
      return false;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  static async sendNotification(title: string, body: string, icon = '/favicon.svg') {
    const permission = await this.requestPermission();
    if (!permission) return;

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg) {
          reg.showNotification(title, {
            body,
            icon,
            vibrate: [200, 100, 200],
            badge: icon
          } as any);
          return;
        }
      } catch (err) {
        console.warn("Service worker not ready for notifications, falling back", err);
      }
    }

    // Fallback if Service Worker is not registered/ready
    new Notification(title, { body, icon });
  }

  /**
   * Schedules a notification to be sent at a specific timestamp.
   */
  static scheduleNotification(title: string, body: string, timeStamp: number) {
    const delay = timeStamp - Date.now();
    if (delay <= 0) return;

    setTimeout(() => {
      this.sendNotification(title, body);
    }, delay);
  }
}
