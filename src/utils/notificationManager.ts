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

  /**
   * Comprueba si alguna mascota tiene deparasitación próxima (≤ 7 días) o vencida
   * y envía una notificación. Cooldown de 24 horas para no repetir.
   */
  static async checkDewormingReminders() {
    if (typeof window === 'undefined') return;

    const COOLDOWN_KEY = 'petplant_last_deworming_notif';
    const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 horas
    const lastNotif = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
    if (Date.now() - lastNotif < COOLDOWN_MS) return;

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
        const checklist = mascota.vacunasChecklist || [];

        for (const tipo of tipos) {
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
            await this.sendNotification(
              `💊 ${tipo} vencida — ${mascota.nombre}`,
              `La ${tipo.toLowerCase()} de ${mascota.nombre} venció hace ${Math.abs(diasRestantes)} días. ¡Es hora de ponerla al día!`
            );
            localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
            return; // Una notificación por sesión es suficiente
          } else if (diasRestantes <= 7) {
            await this.sendNotification(
              `💊 ${tipo} próxima — ${mascota.nombre}`,
              `La ${tipo.toLowerCase()} de ${mascota.nombre} vence en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}. ¡Recuerda administrarla a tiempo!`
            );
            localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
            return;
          }
        }
      }
    } catch (err) {
      console.error('Error al comprobar recordatorios de deparasitación:', err);
    }
  }
}
