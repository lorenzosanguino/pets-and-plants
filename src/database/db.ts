import type { Mascota, Planta, EventoCalendario, ChatHistorial, AccionSincronizacion, NotificacionProgramada } from './types';
import { CATALOGO_MASCOTAS, type CatalogoMascota } from './catalogoMascotas';
import { CATALOGO_ASPCA } from './catalogoASPCA';

export { CATALOGO_MASCOTAS, CATALOGO_ASPCA };
export type { CatalogoMascota };

const DB_NAME = 'PetPlantDB';
const DB_VERSION = 4;

let dbPromise: Promise<IDBDatabase> | null = null;
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error("No window context available"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      const migrations: Record<number, (database: IDBDatabase) => void> = {
        1: (db) => {
          if (!db.objectStoreNames.contains('mascotas')) {
            db.createObjectStore('mascotas', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('plantas')) {
            db.createObjectStore('plantas', { keyPath: 'id' });
          }
        },
        2: (db) => {
          if (!db.objectStoreNames.contains('eventos_calendario')) {
            db.createObjectStore('eventos_calendario', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('chats_consultor')) {
            db.createObjectStore('chats_consultor', { keyPath: 'id' });
          }
        },
        3: (db) => {
          if (!db.objectStoreNames.contains('cola_sincronizacion')) {
            db.createObjectStore('cola_sincronizacion', { keyPath: 'id' });
          }
        },
        4: (db) => {
          if (!db.objectStoreNames.contains('notificaciones_programadas')) {
            db.createObjectStore('notificaciones_programadas', { keyPath: 'id' });
          }
        }
      };

      for (let v = oldVersion + 1; v <= DB_VERSION; v++) {
        if (migrations[v]) {
          migrations[v](db);
        }
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
    request.onblocked = () => {
      console.warn("Database connection blocked by another version.");
    };
  });
  return dbPromise;
}

export class LocalDatabase {
  private static _cryptoPin: string | null = null;

  static setCryptoPin(pin: string | null) {
    LocalDatabase._cryptoPin = pin;
  }

  static getCryptoPin(): string | null {
    return LocalDatabase._cryptoPin;
  }

  static isEncryptionEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('petplant_crypto_enabled') === 'true';
  }

  private static async encryptMascota(mascota: Mascota): Promise<Mascota> {
    if (!LocalDatabase.isEncryptionEnabled() || !LocalDatabase._cryptoPin) return mascota;
    const { encryptText } = await import('../utils/crypto');
    const pin = LocalDatabase._cryptoPin;

    const encryptedIncidents = await Promise.all(
      (mascota.historialPasado || []).map(async (h) => {
        if (h.descripcion && !h.descripcion.startsWith('ENC:')) {
          return { ...h, descripcion: 'ENC:' + await encryptText(h.descripcion, pin) };
        }
        return h;
      })
    );

    const encryptedDiario = await Promise.all(
      (mascota.diarioClinico || []).map(async (d) => {
        if (d.nota && !d.nota.startsWith('ENC:')) {
          return { ...d, nota: 'ENC:' + await encryptText(d.nota, pin) };
        }
        return d;
      })
    );

    return {
      ...mascota,
      historialPasado: encryptedIncidents,
      diarioClinico: encryptedDiario
    };
  }

  private static async decryptMascota(mascota: Mascota): Promise<Mascota> {
    if (!LocalDatabase._cryptoPin) return mascota;
    const { decryptText } = await import('../utils/crypto');
    const pin = LocalDatabase._cryptoPin;

    const decryptedIncidents = await Promise.all(
      (mascota.historialPasado || []).map(async (h) => {
        if (h.descripcion && h.descripcion.startsWith('ENC:')) {
          try {
            return { ...h, descripcion: await decryptText(h.descripcion.substring(4), pin) };
          } catch {
            return { ...h, descripcion: '🔒 [Locked - Incorrect Security PIN]' };
          }
        }
        return h;
      })
    );

    const decryptedDiario = await Promise.all(
      (mascota.diarioClinico || []).map(async (d) => {
        if (d.nota && d.nota.startsWith('ENC:')) {
          try {
            return { ...d, nota: await decryptText(d.nota.substring(4), pin) };
          } catch {
            return { ...d, nota: '🔒 [Locked - Incorrect Security PIN]' };
          }
        }
        return d;
      })
    );

    return {
      ...mascota,
      historialPasado: decryptedIncidents,
      diarioClinico: decryptedDiario
    };
  }

  private static async encryptPlanta(planta: Planta): Promise<Planta> {
    if (!LocalDatabase.isEncryptionEnabled() || !LocalDatabase._cryptoPin) return planta;
    const { encryptText } = await import('../utils/crypto');
    const pin = LocalDatabase._cryptoPin;

    const encryptedIncidents = await Promise.all(
      (planta.historialPasado || []).map(async (h) => {
        if (h.descripcion && !h.descripcion.startsWith('ENC:')) {
          return { ...h, descripcion: 'ENC:' + await encryptText(h.descripcion, pin) };
        }
        return h;
      })
    );

    const encryptedDiario = await Promise.all(
      (planta.diarioFoliar || []).map(async (d) => {
        if (d.nota && !d.nota.startsWith('ENC:')) {
          return { ...d, nota: 'ENC:' + await encryptText(d.nota, pin) };
        }
        return d;
      })
    );

    return {
      ...planta,
      historialPasado: encryptedIncidents,
      diarioFoliar: encryptedDiario
    };
  }

  private static async decryptPlanta(planta: Planta): Promise<Planta> {
    if (!LocalDatabase._cryptoPin) return planta;
    const { decryptText } = await import('../utils/crypto');
    const pin = LocalDatabase._cryptoPin;

    const decryptedIncidents = await Promise.all(
      (planta.historialPasado || []).map(async (h) => {
        if (h.descripcion && h.descripcion.startsWith('ENC:')) {
          try {
            return { ...h, descripcion: await decryptText(h.descripcion.substring(4), pin) };
          } catch {
            return { ...h, descripcion: '🔒 [Locked - Incorrect Security PIN]' };
          }
        }
        return h;
      })
    );

    const decryptedDiario = await Promise.all(
      (planta.diarioFoliar || []).map(async (d) => {
        if (d.nota && d.nota.startsWith('ENC:')) {
          try {
            return { ...d, nota: await decryptText(d.nota.substring(4), pin) };
          } catch {
            return { ...d, nota: '🔒 [Locked - Incorrect Security PIN]' };
          }
        }
        return d;
      })
    );

    return {
      ...planta,
      historialPasado: decryptedIncidents,
      diarioFoliar: decryptedDiario
    };
  }

  private static async encryptChat(chat: ChatHistorial): Promise<ChatHistorial> {
    if (!LocalDatabase.isEncryptionEnabled() || !LocalDatabase._cryptoPin) return chat;
    const { encryptText } = await import('../utils/crypto');
    const pin = LocalDatabase._cryptoPin;

    const encryptedMessages = await Promise.all(
      (chat.mensajes || []).map(async (m) => {
        let texto = m.texto;
        if (texto && !texto.startsWith('ENC:')) {
          texto = 'ENC:' + await encryptText(texto, pin);
        }
        return { ...m, texto };
      })
    );

    return { ...chat, mensajes: encryptedMessages };
  }

  private static async decryptChat(chat: ChatHistorial): Promise<ChatHistorial> {
    if (!LocalDatabase._cryptoPin) return chat;
    const { decryptText } = await import('../utils/crypto');
    const pin = LocalDatabase._cryptoPin;

    const decryptedMessages = await Promise.all(
      (chat.mensajes || []).map(async (m) => {
        let texto = m.texto;
        if (texto && texto.startsWith('ENC:')) {
          try {
            texto = await decryptText(texto.substring(4), pin);
          } catch {
            texto = '🔒 [Locked - Incorrect Security PIN]';
          }
        }
        return { ...m, texto };
      })
    );

    return { ...chat, mensajes: decryptedMessages };
  }

  /** Cuando es true, los métodos save* NO añaden acciones a la cola de sincronización.
   * Se activa exclusivamente durante seedInitialData() para evitar propagar datos demo a la nube. */
  private static _isSeedingInProgress = false;
  static async getMascotas(): Promise<Mascota[]> {
    const db = await openDB();
    const rawList = await new Promise<any[]>((resolve, reject) => {
      const tx = db.transaction('mascotas', 'readonly');
      const store = tx.objectStore('mascotas');
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(req.result || []);
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
    return Promise.all(rawList.map(m => LocalDatabase.decryptMascota(m)));
  }

  static async saveMascota(mascota: Mascota): Promise<void> {
    const encrypted = await LocalDatabase.encryptMascota(mascota);
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mascotas', 'readwrite');
      const store = tx.objectStore('mascotas');
      store.put(encrypted);

      tx.oncomplete = () => {
        if (!LocalDatabase._isSeedingInProgress) {
          import('../services/syncQueue').then(({ SyncQueueService }) => {
            SyncQueueService.enqueue('save_mascota', encrypted).catch(err => console.error(err));
          });
        }
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }

  static async getPlantas(): Promise<Planta[]> {
    const db = await openDB();
    const rawList = await new Promise<any[]>((resolve, reject) => {
      const tx = db.transaction('plantas', 'readonly');
      const store = tx.objectStore('plantas');
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(req.result || []);
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
    return Promise.all(rawList.map(p => LocalDatabase.decryptPlanta(p)));
  }

  static async savePlanta(planta: Planta): Promise<void> {
    const encrypted = await LocalDatabase.encryptPlanta(planta);
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('plantas', 'readwrite');
      const store = tx.objectStore('plantas');
      store.put(encrypted);

      tx.oncomplete = () => {
        if (!LocalDatabase._isSeedingInProgress) {
          import('../services/syncQueue').then(({ SyncQueueService }) => {
            SyncQueueService.enqueue('save_planta', encrypted).catch(err => console.error(err));
          });
        }
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }



  static async getEventosCalendario(): Promise<EventoCalendario[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('eventos_calendario', 'readonly');
      const store = tx.objectStore('eventos_calendario');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }

  static async saveEventoCalendario(evento: EventoCalendario): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('eventos_calendario', 'readwrite');
      const store = tx.objectStore('eventos_calendario');
      store.put(evento);
      tx.oncomplete = () => {
        import('../services/syncQueue').then(({ SyncQueueService }) => {
          SyncQueueService.enqueue('save_evento', evento).catch(err => console.error(err));
        });
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }

  static async deleteEventoCalendario(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('eventos_calendario', 'readwrite');
      const store = tx.objectStore('eventos_calendario');
      store.delete(id);
      tx.oncomplete = () => {
        import('../services/syncQueue').then(({ SyncQueueService }) => {
          SyncQueueService.enqueue('delete_evento', id).catch(err => console.error(err));
        });
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }

  static async getChatHistorial(id: string): Promise<ChatHistorial | null> {
    const db = await openDB();
    const rawResult = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction('chats_consultor', 'readonly');
      const store = tx.objectStore('chats_consultor');
      const req = store.get(id);
      req.onsuccess = () => {
        resolve(req.result || null);
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
    if (!rawResult) return null;
    return LocalDatabase.decryptChat(rawResult);
  }

  static async saveChatHistorial(chat: ChatHistorial): Promise<void> {
    const mensajesLimitados = chat.mensajes.slice(-20);
    const chatLimitado = { ...chat, mensajes: mensajesLimitados };
    const encrypted = await LocalDatabase.encryptChat(chatLimitado);

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chats_consultor', 'readwrite');
      const store = tx.objectStore('chats_consultor');
      
      store.put(encrypted);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }

  static async getAccionesSincronizacion(): Promise<AccionSincronizacion[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cola_sincronizacion', 'readonly');
      const store = tx.objectStore('cola_sincronizacion');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }

  static async saveAccionSincronizacion(accion: AccionSincronizacion): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cola_sincronizacion', 'readwrite');
      const store = tx.objectStore('cola_sincronizacion');
      store.put(accion);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }

  static async deleteAccionSincronizacion(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cola_sincronizacion', 'readwrite');
      const store = tx.objectStore('cola_sincronizacion');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }

  static async seedInitialData(): Promise<void> {
    if (typeof window !== 'undefined') {
      const seedDone = localStorage.getItem('petplant_seed_done');
      if (seedDone === 'true') return;
    }

    // Activar el flag para que las escrituras de seed NO se propaguen a la nube
    LocalDatabase._isSeedingInProgress = true;
    try {

    const mascotas = await this.getMascotas();
    if (mascotas.length === 0) {
      await this.saveMascota({
        id: 'mascota-luna-id',
        nombre: "Luna",
        especie: "Felino",
        fechaNacimiento: "2023-04-12",
        numeroChip: "981020003921",
        registroPeso: [
          { fecha: "2026-04-01T12:00:00Z", pesoKg: 3.9 },
          { fecha: "2026-05-01T12:00:00Z", pesoKg: 4.1 },
          { fecha: "2026-06-01T12:00:00Z", pesoKg: 4.2 }
        ],
        historialVacunas: [
          { fecha: "2026-01-10T12:00:00Z", vacuna: 'Trivalente', lote: 'LT-8912', proximaDosis: '2027-01-10T12:00:00Z' },
          { fecha: "2026-02-15T12:00:00Z", vacuna: 'Leucemia', lote: 'LT-2104', proximaDosis: '2027-02-15T12:00:00Z' }
        ],
        actividad: 'Moderada',
        porcionDiariaGramos: 65,
        diarioClinico: [
          { id: '1', fecha: "2026-05-15T10:00:00Z", nota: "Condición corporal ideal. Peso stable de 4.1kg.", categoria: "Nutrición" },
          { id: '2', fecha: "2026-06-01T09:00:00Z", nota: "Control preventivo de peso realizado. Ligero incremento a 4.2kg dentro del margen saludable.", categoria: "Observación general" }
        ],
        vacunasChecklist: ['Trivalente', 'Leucemia'],
        historialPasado: [
          { id: 'h1', fecha: '2025-08-10', tipo: 'Enfermedad', descripcion: 'Conjuntivitis leve, tratada con colirio.' }
        ]
      });
    }

    const plantas = await this.getPlantas();
    if (plantas.length === 0) {
      await this.savePlanta({
        id: 'planta-fern-id',
        nombreComun: "Helecho de Boston",
        nombreCientifico: "Nephrolepis exaltata",
        ubicacionHabitacion: "Dormitorio",
        tipoRiegoEspecifico: "Agua blanda reposada",
        intervaloRiegoDias: 5,
        ultimaFechaRiego: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        proximaFechaRiego: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
        toxicidadFelina: "Segura",
        toxicidadCanina: "Segura",
        grosorHoja: 'Delgada',
        temperaturaZona: 22,
        diarioFoliar: [
          { id: '1', fecha: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), nota: "Poda de mantenimiento realizada para eliminar frondas secas en la base.", estadoGeneral: "Excelente" }
        ],
        historialPasado: [
          { id: 'h2', fecha: '2026-05-20', tipo: 'Poda', descripcion: 'Poda de saneamiento de hojas secas.' }
        ]
      });
    }



      if (typeof window !== 'undefined') {
        localStorage.setItem('petplant_seed_done', 'true');
      }
    } finally {
      // Desactivar el flag una vez terminado el seed
      LocalDatabase._isSeedingInProgress = false;
    }
  }

  static async clear(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('petplant_seed_done');
    }
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['mascotas', 'plantas', 'eventos_calendario', 'chats_consultor'], 'readwrite');
      tx.objectStore('mascotas').clear();
      tx.objectStore('plantas').clear();
      tx.objectStore('eventos_calendario').clear();
      tx.objectStore('chats_consultor').clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }

  static async deleteMascota(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mascotas', 'readwrite');
      const store = tx.objectStore('mascotas');
      store.delete(id);

      tx.oncomplete = () => {
        import('../services/syncQueue').then(({ SyncQueueService }) => {
          SyncQueueService.enqueue('delete_mascota', id).catch(err => console.error(err));
        });
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }

  static async deletePlanta(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('plantas', 'readwrite');
      const store = tx.objectStore('plantas');
      store.delete(id);

      tx.oncomplete = () => {
        import('../services/syncQueue').then(({ SyncQueueService }) => {
          SyncQueueService.enqueue('delete_planta', id).catch(err => console.error(err));
        });
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }



  static async overwriteFullDatabase(
    mascotas: Mascota[],
    plantas: Planta[],
    eventos?: EventoCalendario[],
    chats?: ChatHistorial[]
  ): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const storesToTransaction = ['mascotas', 'plantas'];
      if (eventos !== undefined) storesToTransaction.push('eventos_calendario');
      if (chats !== undefined) storesToTransaction.push('chats_consultor');

      const tx = db.transaction(storesToTransaction, 'readwrite');
      
      const petStore = tx.objectStore('mascotas');
      const plantStore = tx.objectStore('plantas');

      petStore.clear();
      plantStore.clear();

      mascotas.forEach(m => petStore.put(m));
      plantas.forEach(p => plantStore.put(p));

      if (eventos !== undefined) {
        const eventStore = tx.objectStore('eventos_calendario');
        eventStore.clear();
        eventos.forEach(ev => eventStore.put(ev));
      }

      if (chats !== undefined) {
        const chatStore = tx.objectStore('chats_consultor');
        chatStore.clear();
        chats.forEach(ch => chatStore.put(ch));
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }

  static async getNotificacionesProgramadas(): Promise<NotificacionProgramada[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('notificaciones_programadas', 'readonly');
      const store = transaction.objectStore('notificaciones_programadas');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  static async saveNotificacionProgramada(notif: NotificacionProgramada): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('notificaciones_programadas', 'readwrite');
      const store = transaction.objectStore('notificaciones_programadas');
      const request = store.put(notif);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async deleteNotificacionProgramada(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('notificaciones_programadas', 'readwrite');
      const store = transaction.objectStore('notificaciones_programadas');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async resetToDemo(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('petplant_seed_done');
    }
    await this.clear();
    await this.seedInitialData();
  }
}
