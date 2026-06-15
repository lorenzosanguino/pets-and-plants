import { LocalDatabase } from '../database/db';
import { MicrosoftSyncService } from './microsoftSync';
import { safeUUID } from '../utils/uuid';
import type { AccionSincronizacion } from '../database/types';

export class SyncQueueService {
  private static isProcessing = false;

  /**
   * Registra una acción mutadora en la cola local para asegurar que se sincronice al estar online.
   */
  static async enqueue(tipoAccion: AccionSincronizacion['tipoAccion'], payload: any): Promise<void> {
    const accion: AccionSincronizacion = {
      id: safeUUID(),
      timestamp: Date.now(),
      tipoAccion,
      payload,
    };
    try {
      await LocalDatabase.saveAccionSincronizacion(accion);
      console.log(`Acción encolada con éxito: ${tipoAccion}`);
      
      // Intentar procesar inmediatamente si hay red
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        this.processQueue().catch((err) =>
          console.error('Error al procesar la cola tras encolar:', err)
        );
      }
    } catch (err) {
      console.error('No se pudo guardar la acción de sincronización en IndexedDB:', err);
    }
  }

  /**
   * Procesa la cola de sincronización enviando los datos locales actualizados a la nube.
   */
  static async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('Dispositivo offline, posponiendo sincronización de cola.');
      return;
    }

    const acciones = await LocalDatabase.getAccionesSincronizacion();
    if (acciones.length === 0) return;

    this.isProcessing = true;
    console.log(`Procesando cola de sincronización: ${acciones.length} acciones pendientes.`);

    try {
      const provider = localStorage.getItem('petplant_login_provider');
      const hogarId = localStorage.getItem('petplant_hogar_id');
      const hogarNombre = localStorage.getItem('petplant_hogar_nombre') || 'Mi Hogar';
      const uiTheme = (localStorage.getItem('petplant_game_theme') || 'nature') as any;

      if (!hogarId) {
        console.warn('No hay hogar activo para sincronizar. Vaciando cola obsoleta.');
        await this.clearQueue(acciones);
        this.isProcessing = false;
        return;
      }

      // Obtener el estado local consolidado más reciente para subir a la nube
      const mascotas = await LocalDatabase.getMascotas();
      const plantas = await LocalDatabase.getPlantas();
      const exoticos = await LocalDatabase.getExoticos();

      if (provider === 'google') {
        const { FirebaseSyncService } = await import('../database/firebaseSync');
        if (FirebaseSyncService.isCloudEnabled()) {
          console.log('Sincronizando cola de mutaciones con Firebase Firestore...');
          await FirebaseSyncService.uploadChanges(
            hogarId,
            hogarNombre,
            mascotas,
            plantas,
            exoticos,
            uiTheme
          );
        }
      } else if (provider === 'microsoft') {
        console.log('Sincronizando cola de mutaciones con Microsoft OneDrive...');
        const eventos = await LocalDatabase.getEventosCalendario();
        await MicrosoftSyncService.uploadBackup({
          mascotas,
          plantas,
          exoticos,
          eventos,
          updatedAt: Date.now()
        });
      }

      // Eliminar las acciones procesadas con éxito
      await this.clearQueue(acciones);
      console.log('Cola de sincronización procesada y limpiada correctamente.');
    } catch (err) {
      console.error('Error al procesar la cola de sincronización:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  private static async clearQueue(acciones: AccionSincronizacion[]): Promise<void> {
    for (const accion of acciones) {
      await LocalDatabase.deleteAccionSincronizacion(accion.id);
    }
  }
}

// Iniciar escuchas de eventos de conexión en el navegador
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Conexión detectada online. Procesando cola de sincronización...');
    SyncQueueService.processQueue().catch((err) =>
      console.error('Error al procesar la cola tras volver a estar online:', err)
    );
  });
}
