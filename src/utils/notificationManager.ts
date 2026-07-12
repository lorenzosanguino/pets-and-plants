import { safeUUID } from './uuid';
import { LocalDatabase } from '../database/db';
import type { NotificacionProgramada } from '../database/types';
import { LocalNotifications } from '@capacitor/local-notifications';

const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;

// Helper to convert UUID string into a unique 32-bit integer for native notifications
function stringToIntId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash & 0x7fffffff);
}

let _permissionGrantedCache: boolean | null = null;

export class NotificationManager {
  static async requestPermission(): Promise<boolean> {
    if (_permissionGrantedCache !== null) return _permissionGrantedCache;

    if (isCapacitor) {
      try {
        const status = await LocalNotifications.requestPermissions();
        const granted = status.display === 'granted';
        _permissionGrantedCache = granted;
        return granted;
      } catch (err) {
        console.error('Error requesting native notification permissions:', err);
        return false;
      }
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones de escritorio');
      return false;
    }
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    _permissionGrantedCache = granted;
    return granted;
  }

  static async sendNotification(title: string, body: string, icon = '/favicon.svg') {
    const permission = await this.requestPermission();
    if (!permission) return;

    if (isCapacitor) {
      try {
        const notifId = stringToIntId(title + body + Date.now().toString());
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: notifId,
              schedule: { at: new Date(Date.now() + 500) },
              sound: 'default'
            }
          ]
        });
        return;
      } catch (err) {
        console.error('Failed to schedule native notification:', err);
      }
    }

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
   * @param entityId Optional ID of the pet or plant this notification belongs to (for deep-link navigation).
   * @param entityType Optional 'mascota' | 'planta' so the app knows which section to navigate to.
   */
  static async scheduleNotification(
    title: string,
    body: string,
    timeStamp: number,
    id?: string,
    entityId?: string,
    entityType?: 'mascota' | 'planta'
  ) {
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

    if (isCapacitor) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: stringToIntId(notifId),
              schedule: { at: new Date(timeStamp) },
              sound: 'default',
              extra: entityId ? { entityId, entityType: entityType || '' } : undefined
            }
          ]
        });
        return;
      } catch (err) {
        console.error('Failed to schedule native local notification:', err);
      }
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

    if (isCapacitor) {
      try {
        await LocalNotifications.cancel({
          notifications: [{ id: stringToIntId(id) }]
        });
      } catch (err) {
        console.error('Error cancelling native local notification:', err);
      }
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

  static async checkDewormingReminders() {
    if (typeof window === 'undefined') return;

    const locale = localStorage.getItem('petplant_locale') || 'es';
    const isEn = locale === 'en';
    const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 horas

    try {
      const mascotas = await LocalDatabase.getMascotas();
      const hoy = new Date();
      const tipos = ['Desparasitación Interna', 'Desparasitación Externa'] as const;
      const intervalos: Record<string, number> = {
        'Desparasitación Interna': 3,
        'Desparasitación Externa': 1
      };

      for (const mascota of mascotas) {
        if (mascota.especie !== 'Felino' && mascota.especie !== 'Canino') continue;
        
        const cooldownKey = `petplant_last_deworming_notif_${mascota.id}`;
        const lastNotif = Number(localStorage.getItem(cooldownKey) || 0);
        if (Date.now() - lastNotif < COOLDOWN_MS) continue;

        const checklist = mascota.vacunasChecklist || [];

        for (const tipo of tipos) {
          const tipoLabel = isEn
            ? (tipo === 'Desparasitación Interna' ? 'Internal Deworming' : 'External Deworming')
            : tipo;

          const prefix = `${tipo}_`;
          const dates = checklist
            .filter(item => item.startsWith(prefix))
            .map(item => item.slice(prefix.length))
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

          if (dates.length === 0) continue;

          const lastDate = new Date(dates[0]);
          const nextDate = new Date(lastDate);
          nextDate.setMonth(nextDate.getMonth() + intervalos[tipo]);

          const diasRestantes = Math.ceil((nextDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

          if (diasRestantes < 0) {
            const absDias = Math.abs(diasRestantes);
            await this.sendNotification(
              isEn
                ? `💊 ${tipoLabel} overdue — ${mascota.nombre}`
                : `💊 ${tipoLabel} pendiente — ${mascota.nombre}`,
              isEn
                ? `${mascota.nombre}'s ${tipoLabel.toLowerCase()} was due ${absDias} day${absDias === 1 ? '' : 's'} ago. Time to get it up to date!`
                : `Hace ${absDias} día${absDias === 1 ? '' : 's'} que ${mascota.nombre} necesita ${tipoLabel.toLowerCase()}. ¡Es momento de ponerse al día!`
            );
            localStorage.setItem(cooldownKey, Date.now().toString());
            return;
          } else if (diasRestantes <= 7) {
            await this.sendNotification(
              isEn
                ? `💊 ${tipoLabel} upcoming — ${mascota.nombre}`
                : `💊 ${tipoLabel} próximamente — ${mascota.nombre}`,
              isEn
                ? `${mascota.nombre}'s ${tipoLabel.toLowerCase()} is due in ${diasRestantes} day${diasRestantes === 1 ? '' : 's'}. Remember to administer it on time!`
                : `Quedan ${diasRestantes} día${diasRestantes === 1 ? '' : 's'} para la ${tipoLabel.toLowerCase()} de ${mascota.nombre}. ¡Recúérdalo!`
            );
            localStorage.setItem(cooldownKey, Date.now().toString());
            return;
          }
        }
      }
    } catch (err) {
      console.error('Error al comprobar recordatorios de deparasitación:', err);
    }
  }

  /**
   * Sets up a listener so that tapping a native local notification navigates
   * the app to the corresponding pet or plant card.
   * Must be called once on app startup (after Capacitor is ready).
   */
  static setupNotificationClickListener(
    navigateFn: (entityType: 'mascota' | 'planta', entityId: string) => void
  ): void {
    if (!isCapacitor) return;
    try {
      LocalNotifications.addListener('localNotificationActionPerformed', (notifAction) => {
        const extra = (notifAction.notification as any).extra;
        if (extra && extra.entityId && extra.entityType) {
          navigateFn(extra.entityType as 'mascota' | 'planta', extra.entityId as string);
        }
      });
    } catch (err) {
      console.error('Error setting up notification click listener:', err);
    }
  }

  static async subscribeUserToPush(hogarId: string): Promise<boolean> {
    const permission = await this.requestPermission();
    if (!permission) return false;
    
    if (!('serviceWorker' in navigator)) return false;
    
    try {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.pushManager) {
        console.warn("Push notifications not supported in this browser's service worker");
        return false;
      }
      
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.warn("VITE_VAPID_PUBLIC_KEY not set");
        return false;
      }
      
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
      
      console.log("Subscribed successfully to Web Push", subscription);
      
      const { FirebaseSyncService } = await import('../database/firebaseSync');
      if (FirebaseSyncService.isCloudEnabled()) {
        await FirebaseSyncService.savePushSubscription(hogarId, subscription);
        console.log("Subscription saved to Firestore cloud successfully.");
      } else {
        localStorage.setItem(`mock_push_subscription_${hogarId}`, JSON.stringify(subscription));
        console.log("Mock subscription saved to LocalStorage.");
      }
      
      return true;
    } catch (err) {
      console.error("Failed to subscribe to Web Push:", err);
      return false;
    }
  }

  static async triggerCloudPushNotification(hogarId: string, title: string, body: string) {
    const { FirebaseSyncService, auth } = await import('../database/firebaseSync');
    if (!FirebaseSyncService.isCloudEnabled() || !auth?.currentUser) {
      console.log("Mock push broadcast (offline):", title, body);
      return;
    }
    
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ hogarId, title, body })
      });
      
      if (!response.ok) {
        console.error("Failed to trigger cloud push:", await response.text());
      } else {
        console.log("Cloud push triggered successfully.");
      }
    } catch (err) {
      console.error("Error triggering cloud push:", err);
    }
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const globalScope = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : null);
  if (!globalScope) {
    throw new Error("No global decoder scope found");
  }
  const rawData = globalScope.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

