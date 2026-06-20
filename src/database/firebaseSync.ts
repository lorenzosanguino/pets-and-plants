import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, doc, setDoc, getDoc, onSnapshot, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import type { Mascota, Planta, AnimalExotico, EventoCalendario, ChatHistorial } from './types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "plants-and-pets-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "plants-and-pets-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "plants-and-pets-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1044210464501",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1044210464501:web:c9bf8245db3c596977f7bc"
};

// Check if we have valid Firebase keys
let isFirebaseEnabled = !!firebaseConfig.apiKey && 
                           firebaseConfig.apiKey !== 'dummy-api-key' && 
                           !firebaseConfig.apiKey.includes('dummy');

if (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('petplant_mock_auth') === 'true') {
  isFirebaseEnabled = false;
}

import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';

let db: Firestore | null = null;
export let auth: Auth | null = null;

if (isFirebaseEnabled) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    // Utilizar initializeFirestore para forzar HTTP Long Polling en dispositivos móviles
    // y redes que puedan tener WebSockets/gRPC bloqueados por los operadores.
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true
    });
    auth = getAuth(app);
    // Enable multi-tab offline persistence
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
      console.warn("Firestore persistence failed:", err.code);
    });
  } catch (e) {
    console.error("Failed to initialize Firebase sync, falling back to mock mode:", e);
    db = null;
    auth = null;
  }
}

// Broadcast Channel for mock multi-tab sync (safely wrapped for older browser support)
const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('petplant-hogar-sync-channel') : null;

export interface HogarCloudData {
  nombre: string;
  mascotas: Mascota[];
  plantas: Planta[];
  exoticos: AnimalExotico[];
  updatedAt: number;
  lastUpdatedBy: string; // Tab/Device unique ID
  theme?: string; // Soportar sincronización del tema visual
  eventos?: EventoCalendario[];
  chats?: ChatHistorial[];
}

// Device/Session ID to prevent feedback loops
const deviceSessionId = Math.random().toString(36).substring(2, 11);

export class FirebaseSyncService {
  static isCloudEnabled(): boolean {
    return isFirebaseEnabled && db !== null;
  }

  /**
   * Obtiene el hogar vinculado a un usuario desde la colección /hogares/user_hogar_{uid}
   */
  static async getUserHogar(uid: string): Promise<{ hogarId: string; hogarNombre: string } | null> {
    if (this.isCloudEnabled() && db) {
      const docRef = doc(db, 'hogares', `user_hogar_${uid}`);
      const getDocPromise = getDoc(docRef);
      // Timeout de 10 segundos en lectura para no congelar la app en redes lentas
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout al obtener hogar del usuario en Firestore")), 10000)
      );
      const snap = await Promise.race([getDocPromise, timeoutPromise]);
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.hogarId) {
          return {
            hogarId: data.hogarId,
            hogarNombre: data.hogarNombre || "Mi Hogar"
          };
        }
      }
    }
    return null;
  }

  /**
   * Vincula un hogar a un usuario en la colección /hogares/user_hogar_{uid}
   */
  static async saveUserHogar(uid: string, hogarId: string, hogarNombre: string): Promise<void> {
    if (this.isCloudEnabled() && db) {
      const docRef = doc(db, 'hogares', `user_hogar_${uid}`);
      await setDoc(docRef, {
        hogarId,
        hogarNombre,
        updatedAt: Date.now()
      }, { merge: true });
    }
  }

  /**
   * Elimina la vinculación de hogar de un usuario en la colección /hogares/user_hogar_{uid}
   */
  static async deleteUserHogar(uid: string): Promise<void> {
    if (this.isCloudEnabled() && db) {
      const docRef = doc(db, 'hogares', `user_hogar_${uid}`);
      await setDoc(docRef, {
        hogarId: "",
        hogarNombre: "",
        updatedAt: Date.now()
      }, { merge: true });
    }
  }

  /**
   * Genera un código de invitación aleatorio con formato HOGAR-XXXX-XXXX
   */
  static generateHogarCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like O, 0, I, 1
    const part1 = Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    const part2 = Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    return `HOGAR-${part1}-${part2}`;
  }

  /**
   * Crea un nuevo Hogar en la nube (o mock local)
   */
  static async createHogar(
    nombre: string, 
    mascotas: Mascota[], 
    plantas: Planta[], 
    exoticos: AnimalExotico[], 
    theme?: string,
    eventos?: EventoCalendario[],
    chats?: ChatHistorial[]
  ): Promise<string> {
    const code = this.generateHogarCode();
    const data: HogarCloudData = {
      nombre,
      mascotas: mascotas || [],
      plantas: plantas || [],
      exoticos: exoticos || [],
      updatedAt: Date.now(),
      lastUpdatedBy: deviceSessionId
    };
    if (theme !== undefined) data.theme = theme;
    if (eventos !== undefined) data.eventos = eventos;
    if (chats !== undefined) data.chats = chats;

    if (this.isCloudEnabled() && db) {
      const docRef = doc(db, 'hogares', code);
      await setDoc(docRef, data);
    } else {
      // Mock store in localStorage
      localStorage.setItem(`mock_hogar_${code}`, JSON.stringify(data));
    }

    return code;
  }

  /**
   * Obtiene los datos de un hogar por código
   */
  static async getHogarData(code: string): Promise<HogarCloudData | null> {
    if (this.isCloudEnabled() && db) {
      const docRef = doc(db, 'hogares', code);
      const getDocPromise = getDoc(docRef);
      // Timeout de 10 segundos en lectura para no congelar la app en redes lentas
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout al obtener datos del hogar en Firestore")), 10000)
      );
      const snap = await Promise.race([getDocPromise, timeoutPromise]);
      if (snap.exists()) {
        return snap.data() as HogarCloudData;
      }
      return null;
    } else {
      const local = localStorage.getItem(`mock_hogar_${code}`);
      return local ? JSON.parse(local) : null;
    }
  }

  /**
   * Sube cambios al hogar activo
   */
  static async uploadChanges(
    code: string, 
    nombre: string, 
    mascotas: Mascota[], 
    plantas: Planta[], 
    exoticos: AnimalExotico[], 
    theme?: string,
    eventos?: EventoCalendario[],
    chats?: ChatHistorial[]
  ): Promise<void> {
    const data: HogarCloudData = {
      nombre,
      mascotas: mascotas || [],
      plantas: plantas || [],
      exoticos: exoticos || [],
      updatedAt: Date.now(),
      lastUpdatedBy: deviceSessionId
    };
    if (theme !== undefined) data.theme = theme;
    if (eventos !== undefined) data.eventos = eventos;
    if (chats !== undefined) data.chats = chats;

    if (this.isCloudEnabled() && db) {
      const docRef = doc(db, 'hogares', code);
      await setDoc(docRef, data, { merge: true });
    } else {
      localStorage.setItem(`mock_hogar_${code}`, JSON.stringify(data));
      // Broadcast to other tabs
      if (syncChannel) {
        syncChannel.postMessage({
          type: 'HOGAR_UPDATED',
          code,
          data
        });
      }
    }
  }

  /**
   * Escucha actualizaciones en tiempo real del hogar activo
   */
  static listenToHogar(
    code: string, 
    callback: (data: HogarCloudData) => void
  ): () => void {
    if (this.isCloudEnabled() && db) {
      const docRef = doc(db, 'hogares', code);
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as HogarCloudData;
          // Solo llamamos al callback si el cambio lo hizo otro dispositivo/pestaña
          if (data.lastUpdatedBy !== deviceSessionId) {
            callback(data);
          }
        }
      }, (err) => {
        console.error("Firestore onSnapshot error:", err);
      });
      return unsubscribe;
    } else {
      // Mock listener using BroadcastChannel
      const listener = (event: MessageEvent) => {
        if (event.data && event.data.type === 'HOGAR_UPDATED' && event.data.code === code) {
          const data = event.data.data as HogarCloudData;
          if (data.lastUpdatedBy !== deviceSessionId) {
            callback(data);
          }
        }
      };
      if (syncChannel) {
        syncChannel.addEventListener('message', listener);
      }
      
      // Retornamos función para desuscribirse
      return () => {
        if (syncChannel) {
          syncChannel.removeEventListener('message', listener);
        }
      };
    }
  }
}
