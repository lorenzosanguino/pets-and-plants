import { safeUUID } from './uuid';
import { LocalDatabase } from '../database/db';
import type { NotificacionProgramada } from '../database/types';

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
          } as NotificationOptions);
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
   * Schedules a notification to be sent at a specific timestamp and persists it in IndexedDB.
   */
  static async scheduleNotification(title: string, body: string, timeStamp: number, id?: string) {
    const delay = timeStamp - Date.now();
    const notifId = id || safeUUID();

    const notif: NotificacionProgramada = {
      id: notifId,
      titulo: title,
      cuerpo: body,
      timestamp: timeStamp
    };

    try {
      await LocalDatabase.saveNotificacionProgramada(notif);
      console.log(`Notificación programada guardada en IndexedDB para: ${new Date(timeStamp).toLocaleString()}`);
    } catch (err) {
      console.error('Error al guardar la notificación programada en IndexedDB:', err);
    }

    if (delay > 0) {
      setTimeout(async () => {
        try {
          const all = await LocalDatabase.getNotificacionesProgramadas();
          const exists = all.some(n => n.id === notifId);
          if (exists) {
            await this.sendNotification(title, body);
            await LocalDatabase.deleteNotificacionProgramada(notifId);
          }
        } catch (err) {
          console.error(err);
        }
      }, delay);
    }
  }

  /**
   * Cancels a scheduled notification by removing it from IndexedDB.
   */
  static async cancelNotification(id: string) {
    try {
      await LocalDatabase.deleteNotificacionProgramada(id);
      console.log(`Notificación cancelada: ${id}`);
    } catch (err) {
      console.error('Error al cancelar la notificación programada:', err);
    }
  }

  /**
   * Scans IndexedDB for any pending notifications.
   * Triggers overdue ones retroactively and sets up memory timers for future ones.
   */
  static async checkAndTriggerPendingNotifications() {
    if (typeof window === 'undefined') return;
    try {
      const list = await LocalDatabase.getNotificacionesProgramadas();
      const now = Date.now();

      for (const notif of list) {
        if (notif.timestamp <= now) {
          // Trigger retroactively and delete
          await this.sendNotification(notif.titulo, notif.cuerpo);
          await LocalDatabase.deleteNotificacionProgramada(notif.id);
          console.log(`Notificación programada pendiente disparada retroactivamente: ${notif.titulo}`);
        } else {
          // Schedule future check
          const delay = notif.timestamp - now;
          setTimeout(async () => {
            try {
              const all = await LocalDatabase.getNotificacionesProgramadas();
              const exists = all.some(n => n.id === notif.id);
              if (exists) {
                await this.sendNotification(notif.titulo, notif.cuerpo);
                await LocalDatabase.deleteNotificacionProgramada(notif.id);
              }
            } catch (err) {
              console.error(err);
            }
          }, delay);
        }
      }
    } catch (err) {
      console.error('Error al evaluar notificaciones programadas en IndexedDB:', err);
    }
  }
}
