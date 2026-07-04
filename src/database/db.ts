import type { Mascota, Planta, CatalogoPlanta, EventoCalendario, ChatHistorial, AccionSincronizacion, NotificacionProgramada } from './types';

const DB_NAME = 'PetPlantDB';
const DB_VERSION = 4;

export interface CatalogoMascota {
  raza: string;
  razaEn?: string;
  especie: 'Felino' | 'Canino';
  pesoAdultoKg: number;
  actividadSugerida: 'Baja' | 'Moderada' | 'Alta';
  actividadSugeridaEn?: string;
}

export const CATALOGO_MASCOTAS: CatalogoMascota[] = [
  { raza: "Siamés", razaEn: "Siamese", especie: "Felino", pesoAdultoKg: 4.0, actividadSugerida: "Moderada", actividadSugeridaEn: "Moderate" },
  { raza: "Persa", razaEn: "Persian", especie: "Felino", pesoAdultoKg: 4.5, actividadSugerida: "Baja", actividadSugeridaEn: "Low" },
  { raza: "Maine Coon", razaEn: "Maine Coon", especie: "Felino", pesoAdultoKg: 8.0, actividadSugerida: "Alta", actividadSugeridaEn: "High" },
  { raza: "Común Europeo", razaEn: "European Shorthair", especie: "Felino", pesoAdultoKg: 4.2, actividadSugerida: "Moderada", actividadSugeridaEn: "Moderate" },
  { raza: "Golden Retriever", razaEn: "Golden Retriever", especie: "Canino", pesoAdultoKg: 30.0, actividadSugerida: "Alta", actividadSugeridaEn: "High" },
  { raza: "Pastor Alemán", razaEn: "German Shepherd", especie: "Canino", pesoAdultoKg: 35.0, actividadSugerida: "Alta", actividadSugeridaEn: "High" },
  { raza: "Labrador", razaEn: "Labrador", especie: "Canino", pesoAdultoKg: 28.0, actividadSugerida: "Alta", actividadSugeridaEn: "High" },
  { raza: "Bulldog Francés", razaEn: "French Bulldog", especie: "Canino", pesoAdultoKg: 12.0, actividadSugerida: "Baja", actividadSugeridaEn: "Low" },
  { raza: "Chihuahua", razaEn: "Chihuahua", especie: "Canino", pesoAdultoKg: 2.5, actividadSugerida: "Moderada", actividadSugeridaEn: "Moderate" },
  { raza: "Caniche", razaEn: "Poodle", especie: "Canino", pesoAdultoKg: 6.5, actividadSugerida: "Moderada", actividadSugeridaEn: "Moderate" }
];

export const CATALOGO_ASPCA: CatalogoPlanta[] = [
  {
    id: 'cat-1',
    nombreComun: 'Helecho de Boston',
    nombreComunEn: 'Boston Fern',
    nombreCientifico: 'Nephrolepis exaltata',
    toxicidadFelina: 'Segura',
    toxicidadCanina: 'Segura',
    tipoRiego: 'Agua blanda reposada',
    tipoRiegoEn: 'Settled soft water',
    ubicacionSugerida: 'Interior',
    ubicacionSugeridaEn: 'Indoor',
    descripcion: 'Planta de alta evapotranspiración foliar. Totalmente inocua para gatos domésticos.',
    descripcionEn: 'Plant with high leaf evapotranspiration. Totally harmless to domestic cats.'
  },
  {
    id: 'cat-2',
    nombreComun: 'Peperomia',
    nombreComunEn: 'Baby Rubber Plant',
    nombreCientifico: 'Peperomia obtusifolia',
    toxicidadFelina: 'Segura',
    toxicidadCanina: 'Segura',
    tipoRiego: 'Agua del grifo reposada',
    tipoRiegoEn: 'Settled tap water',
    ubicacionSugerida: 'Interior',
    ubicacionSugeridaEn: 'Indoor',
    descripcion: 'Hojas gruesas semisuculentas que retienen agua. Segura para convivencia.',
    descripcionEn: 'Thick semi-succulent leaves that retain water. Safe for pet cohabitation.'
  },
  {
    id: 'cat-3',
    nombreComun: 'Calathea',
    nombreComunEn: 'Calathea',
    nombreCientifico: 'Calathea lancifolia',
    toxicidadFelina: 'Segura',
    toxicidadCanina: 'Segura',
    tipoRiego: 'Agua destilada',
    tipoRiegoEn: 'Distilled water',
    ubicacionSugerida: 'Interior',
    ubicacionSugeridaEn: 'Indoor',
    descripcion: 'Requiere alta humedad ambiental y agua pura libre de cloro y sales.',
    descripcionEn: 'Requires high ambient humidity and pure water free of chlorine and salts.'
  },
  {
    id: 'cat-4',
    nombreComun: 'Costilla de Adán (Monstera)',
    nombreComunEn: 'Swiss Cheese Plant (Monstera)',
    nombreCientifico: 'Monstera deliciosa',
    toxicidadFelina: 'Altamente tóxica (urgencia)',
    toxicidadCanina: 'Altamente tóxica (urgencia)',
    compuestosToxicos: 'Oxalatos de calcio insolubles',
    compuestosToxicosEn: 'Insoluble calcium oxalates',
    tipoRiego: 'Agua blanda reposada',
    tipoRiegoEn: 'Settled soft water',
    ubicacionSugerida: 'Interior',
    ubicacionSugeridaEn: 'Indoor',
    descripcion: 'Contiene cristales en forma de aguja. La ingesta causa sialorrea, dolor oral agudo y emesis.',
    descripcionEn: 'Contains needle-shaped crystals. Ingestion causes sialorrhea, acute oral pain, and emesis.'
  },
  {
    id: 'cat-5',
    nombreComun: 'Poto',
    nombreComunEn: 'Pothos',
    nombreCientifico: 'Epipremnum aureum',
    toxicidadFelina: 'Tóxica leve (irritante)',
    toxicidadCanina: 'Tóxica leve (irritante)',
    compuestosToxicos: 'Oxalatos de calcio',
    compuestosToxicosEn: 'Calcium oxalates',
    tipoRiego: 'Agua del grifo reposada',
    tipoRiegoEn: 'Settled tap water',
    ubicacionSugerida: 'Interior',
    ubicacionSugeridaEn: 'Indoor',
    descripcion: 'Frecuente en interiores. Provoca hinchazón de mucosas y malestar gastrointestinal leve.',
    descripcionEn: 'Common indoors. Causes swelling of mucous membranes and mild gastrointestinal discomfort.'
  },
  {
    id: 'cat-6',
    nombreComun: 'Lirio de la Paz',
    nombreComunEn: 'Peace Lily',
    nombreCientifico: 'Spathiphyllum',
    toxicidadFelina: 'Altamente tóxica (urgencia)',
    toxicidadCanina: 'Altamente tóxica (urgencia)',
    compuestosToxicos: 'Oxalatos insolubles',
    compuestosToxicosEn: 'Insoluble oxalates',
    tipoRiego: 'Agua blanda reposada',
    tipoRiegoEn: 'Settled soft water',
    ubicacionSugerida: 'Interior',
    ubicacionSugeridaEn: 'Indoor',
    descripcion: 'Muy peligrosa. Causa inflamación de las vías respiratorias y malestar sistémico.',
    descripcionEn: 'Very dangerous. Causes inflammation of the airways and systemic discomfort.'
  },
  {
    id: 'cat-7',
    nombreComun: 'Lavanda',
    nombreComunEn: 'Lavender',
    nombreCientifico: 'Lavandula',
    toxicidadFelina: 'Tóxica leve (irritante)',
    toxicidadCanina: 'Tóxica leve (irritante)',
    compuestosToxicos: 'Linalol y acetato de linalilo',
    compuestosToxicosEn: 'Linalool and linalyl acetate',
    tipoRiego: 'Agua del grifo reposada',
    tipoRiegoEn: 'Settled tap water',
    ubicacionSugerida: 'Exterior',
    ubicacionSugeridaEn: 'Outdoor',
    descripcion: 'Planta aromática exterior. La ingesta masiva causa malestar digestivo.',
    descripcionEn: 'Outdoor aromatic plant. Massive ingestion causes digestive discomfort.'
  },
  {
    id: 'cat-8',
    nombreComun: 'Romero',
    nombreComunEn: 'Rosemary',
    nombreCientifico: 'Rosmarinus officinalis',
    toxicidadFelina: 'Segura',
    toxicidadCanina: 'Segura',
    tipoRiego: 'Agua del grifo reposada',
    tipoRiegoEn: 'Settled tap water',
    ubicacionSugerida: 'Exterior',
    ubicacionSugeridaEn: 'Outdoor',
    descripcion: 'Hierba leñosa perenne aromática segura para mascotas.',
    descripcionEn: 'Woody evergreen aromatic herb safe for pets.'
  },
  {
    id: 'cat-9',
    nombreComun: 'Rosal',
    nombreComunEn: 'Rose Bush',
    nombreCientifico: 'Rosa',
    toxicidadFelina: 'Segura',
    toxicidadCanina: 'Segura',
    tipoRiego: 'Agua del grifo reposada',
    tipoRiegoEn: 'Settled tap water',
    ubicacionSugerida: 'Exterior',
    ubicacionSugeridaEn: 'Outdoor',
    descripcion: 'Flores hermosas seguras para mascotas, aunque cuidado con las espinas en las ramas.',
    descripcionEn: 'Beautiful flowers safe for pets, though beware of thorns on the branches.'
  },
  {
    id: 'cat-10',
    nombreComun: 'Aloe Vera',
    nombreComunEn: 'Aloe Vera',
    nombreCientifico: 'Aloe barbadensis',
    toxicidadFelina: 'Tóxica leve (irritante)',
    toxicidadCanina: 'Tóxica leve (irritante)',
    compuestosToxicos: 'Saponinas y antraquinonas',
    compuestosToxicosEn: 'Saponins and anthraquinones',
    tipoRiego: 'Agua del grifo reposada',
    tipoRiegoEn: 'Settled tap water',
    ubicacionSugerida: 'Interior',
    ubicacionSugeridaEn: 'Indoor',
    descripcion: 'Suculenta medicinal. Su ingesta causa diarrea y letargia en mascotas.',
    descripcionEn: 'Medicinal succulent. Ingestion causes diarrhea and lethargy in pets.'
  }
];

let dbPromise: Promise<IDBDatabase> | null = null;
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error("No window context available"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('mascotas')) {
        db.createObjectStore('mascotas', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('plantas')) {
        db.createObjectStore('plantas', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('eventos_calendario')) {
        db.createObjectStore('eventos_calendario', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('chats_consultor')) {
        db.createObjectStore('chats_consultor', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cola_sincronizacion')) {
        db.createObjectStore('cola_sincronizacion', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('notificaciones_programadas')) {
        db.createObjectStore('notificaciones_programadas', { keyPath: 'id' });
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
  /** Cuando es true, los métodos save* NO añaden acciones a la cola de sincronización.
   * Se activa exclusivamente durante seedInitialData() para evitar propagar datos demo a la nube. */
  private static _isSeedingInProgress = false;
  static async getMascotas(): Promise<Mascota[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mascotas', 'readonly');
      const store = tx.objectStore('mascotas');
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }

  static async saveMascota(mascota: Mascota): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mascotas', 'readwrite');
      const store = tx.objectStore('mascotas');
      store.put(mascota);

      tx.oncomplete = () => {
        if (!LocalDatabase._isSeedingInProgress) {
          import('../services/syncQueue').then(({ SyncQueueService }) => {
            SyncQueueService.enqueue('save_mascota', mascota).catch(err => console.error(err));
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
    return new Promise((resolve, reject) => {
      const tx = db.transaction('plantas', 'readonly');
      const store = tx.objectStore('plantas');
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }

  static async savePlanta(planta: Planta): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('plantas', 'readwrite');
      const store = tx.objectStore('plantas');
      store.put(planta);

      tx.oncomplete = () => {
        if (!LocalDatabase._isSeedingInProgress) {
          import('../services/syncQueue').then(({ SyncQueueService }) => {
            SyncQueueService.enqueue('save_planta', planta).catch(err => console.error(err));
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
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chats_consultor', 'readonly');
      const store = tx.objectStore('chats_consultor');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }

  static async saveChatHistorial(chat: ChatHistorial): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chats_consultor', 'readwrite');
      const store = tx.objectStore('chats_consultor');
      
      // Limitar el array de mensajes a los últimos 20 para optimizar almacenamiento local
      const mensajesLimitados = chat.mensajes.slice(-20);
      const chatLimitado = { ...chat, mensajes: mensajesLimitados };

      store.put(chatLimitado);
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

  static async overwriteDatabase(mascotas: Mascota[], plantas: Planta[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['mascotas', 'plantas'], 'readwrite');
      const petStore = tx.objectStore('mascotas');
      const plantStore = tx.objectStore('plantas');

      petStore.clear();
      plantStore.clear();

      mascotas.forEach(m => petStore.put(m));
      plantas.forEach(p => plantStore.put(p));

      tx.oncomplete = () => resolve();
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
