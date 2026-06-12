import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import type { Mascota, Planta, AnimalExotico } from './types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDGQWW8tVP8kk6Nss-GCutohfD6IouLzp0",
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

let db: any = null;
export let auth: any = null;

if (isFirebaseEnabled) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
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
}

// Device/Session ID to prevent feedback loops
const deviceSessionId = Math.random().toString(36).substring(2, 11);

export class FirebaseSyncService {
  static isCloudEnabled(): boolean {
    return isFirebaseEnabled && db !== null;
  }

  /**
   * Obtiene el hogar vinculado a un usuario desde la colección /users/{uid}
   */
  static async getUserHogar(uid: string): Promise<{ hogarId: string; hogarNombre: string } | null> {
    if (this.isCloudEnabled()) {
      try {
        const docRef = doc(db, 'users', uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.hogarId) {
            return {
              hogarId: data.hogarId,
              hogarNombre: data.hogarNombre || "Mi Hogar"
            };
          }
        }
      } catch (e) {
        console.error("Error al obtener la asociación de hogar del usuario:", e);
      }
    }
    return null;
  }

  /**
   * Vincula un hogar a un usuario en la colección /users/{uid}
   */
  static async saveUserHogar(uid: string, hogarId: string, hogarNombre: string): Promise<void> {
    if (this.isCloudEnabled()) {
      try {
        const docRef = doc(db, 'users', uid);
        await setDoc(docRef, {
          hogarId,
          hogarNombre,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (e) {
        console.error("Error al guardar la asociación de hogar del usuario:", e);
      }
    }
  }

  /**
   * Elimina la vinculación de hogar de un usuario en la colección /users/{uid}
   */
  static async deleteUserHogar(uid: string): Promise<void> {
    if (this.isCloudEnabled()) {
      try {
        const docRef = doc(db, 'users', uid);
        await setDoc(docRef, {
          hogarId: "",
          hogarNombre: "",
          updatedAt: Date.now()
        }, { merge: true });
      } catch (e) {
        console.error("Error al eliminar la asociación de hogar del usuario:", e);
      }
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
  static async createHogar(nombre: string, mascotas: Mascota[], plantas: Planta[], exoticos: AnimalExotico[]): Promise<string> {
    const code = this.generateHogarCode();
    const data: HogarCloudData = {
      nombre,
      mascotas,
      plantas,
      exoticos,
      updatedAt: Date.now(),
      lastUpdatedBy: deviceSessionId
    };

    if (this.isCloudEnabled()) {
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
    if (this.isCloudEnabled()) {
      try {
        const docRef = doc(db, 'hogares', code);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return snap.data() as HogarCloudData;
        }
      } catch (e) {
        console.error("Error fetching Hogar from firestore:", e);
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
  static async uploadChanges(code: string, nombre: string, mascotas: Mascota[], plantas: Planta[], exoticos: AnimalExotico[]): Promise<void> {
    const data: HogarCloudData = {
      nombre,
      mascotas,
      plantas,
      exoticos,
      updatedAt: Date.now(),
      lastUpdatedBy: deviceSessionId
    };

    if (this.isCloudEnabled()) {
      try {
        const docRef = doc(db, 'hogares', code);
        await setDoc(docRef, data, { merge: true });
      } catch (e) {
        console.error("Failed to upload changes to Firestore:", e);
      }
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
    if (this.isCloudEnabled()) {
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
