/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react';
import { LocalDatabase } from '../database/db';
import type { Mascota, Planta } from '../database/types';
import { initFirebase, getFirebaseCached } from '../database/firebaseLazy';
import { MicrosoftSyncService } from '../services/microsoftSync';

const getNowTimestamp = (): number => Date.now();

const isDatabaseDefaultDemo = (mascotas: Mascota[], plantas: Planta[]) => {
  return (
    mascotas.length === 1 &&
    mascotas[0].id === 'mascota-luna-id' &&
    plantas.length === 1 &&
    plantas[0].id === 'planta-fern-id'
  );
};

interface UseSyncManagerProps {
  uiTheme: 'gaming' | 'nature' | 'kawaii';
  setUiTheme: React.Dispatch<React.SetStateAction<'gaming' | 'nature' | 'kawaii'>>;
  onCloudDataReceived: () => Promise<void>;
  isOffline: boolean;
}

export const useSyncManager = ({
  uiTheme,
  setUiTheme,
  onCloudDataReceived,
  isOffline
}: UseSyncManagerProps) => {
  const isRemoteSyncingRef = useRef(false);
  const msSyncTimeoutRef = useRef<any>(null);
  const lastSyncedThemeRef = useRef<string | null>(null);

  const [hogarId, setHogarId] = useState<string>(() => localStorage.getItem('petplant_hogar_id') || '');
  const [hogarNombre, setHogarNombre] = useState<string>(() => localStorage.getItem('petplant_hogar_nombre') || '');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [firebaseLoaded, setFirebaseLoaded] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; photoURL?: string } | null>(null);

  const [joinedHogares, setJoinedHogares] = useState<Array<{ id: string; nombre: string }>>(() => {
    try {
      const saved = localStorage.getItem('petplant_joined_hogares');
      const parsed = saved ? JSON.parse(saved) : [];
      const activeId = localStorage.getItem('petplant_hogar_id') || '';
      const activeNombre = localStorage.getItem('petplant_hogar_nombre') || '';
      if (activeId && activeNombre && !parsed.some((h: any) => h.id === activeId)) {
        parsed.push({ id: activeId, nombre: activeNombre });
        localStorage.setItem('petplant_joined_hogares', JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return [];
    }
  });

  const [isCloudEnabled] = useState(() => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || "";
    return !!apiKey && !apiKey.includes('dummy') && localStorage.getItem('petplant_mock_auth') !== 'true';
  });

  // Microsoft OneDrive backup helper
  const syncFromOneDrive = async () => {
    setSyncStatus('syncing');
    try {
      const backup = await MicrosoftSyncService.downloadBackup();
      
      const listMascotas = await LocalDatabase.getMascotas();
      const listPlantas = await LocalDatabase.getPlantas();
            
      const isLocalDemo = isDatabaseDefaultDemo(listMascotas, listPlantas);
      const isLocalEmpty = listMascotas.length === 0 && listPlantas.length === 0;

      if (backup) {
        const isCloudDemo = isDatabaseDefaultDemo(backup.mascotas || [], backup.plantas || []);
        const localLastUpdated = Number(localStorage.getItem('petplant_db_last_updated') || 0);
        const remoteIsNewer = backup.updatedAt > localLastUpdated;
        
        if (!isLocalDemo && isCloudDemo) {
          console.log("OneDrive: Local has real data, cloud has demo. Uploading local data.");
          await triggerOneDriveSyncDirect();
          setSyncStatus('synced');
        } else if (!isLocalDemo && !isCloudDemo && !remoteIsNewer) {
          console.log("OneDrive: Local is newer or equal. Uploading local data.");
          await triggerOneDriveSyncDirect();
          setSyncStatus('synced');
        } else {
          console.log("OneDrive: Cloud is newer or local is demo/empty. Downloading cloud data.");
          isRemoteSyncingRef.current = true;
          await LocalDatabase.overwriteFullDatabase(
            backup.mascotas || [],
            backup.plantas || [],
            backup.eventos || [],
            backup.chats || []
          );
          isRemoteSyncingRef.current = false;
          await onCloudDataReceived();
          setSyncStatus('synced');
        }
      } else {
        if (!isLocalDemo && !isLocalEmpty) {
          console.log("OneDrive: No remote backup found, but local has real data. Uploading local data.");
          await triggerOneDriveSyncDirect();
          setSyncStatus('synced');
        } else {
          console.log("OneDrive: No remote backup and local is empty/demo. Seeding demo and uploading.");
          isRemoteSyncingRef.current = true;
          await LocalDatabase.resetToDemo();
          isRemoteSyncingRef.current = false;
          await onCloudDataReceived();
          await triggerOneDriveSyncDirect();
          setSyncStatus('synced');
        }
      }
    } catch (err: any) {
      console.error("Error al descargar o sincronizar con OneDrive:", err);
      setSyncStatus('error');
      setSyncErrorMessage(err.message || String(err));
    }
  };

  const triggerOneDriveSyncDirect = async () => {
    try {
      const activeMsUser = await MicrosoftSyncService.getActiveUser();
      if (!activeMsUser) return;

      setSyncStatus('syncing');
      const listMascotas = await LocalDatabase.getMascotas();
      const listPlantas = await LocalDatabase.getPlantas();
            const listEventos = await LocalDatabase.getEventosCalendario();
      
      const chats = [];
      const consultantIds = ['veterinario', 'agronomo'];
      for (const id of consultantIds) {
        const chat = await LocalDatabase.getChatHistorial(id);
        if (chat) chats.push(chat);
      }

      await MicrosoftSyncService.uploadBackup({
        mascotas: listMascotas,
        plantas: listPlantas,
        eventos: listEventos,
        chats: chats,
        updatedAt: getNowTimestamp()
      });
      setSyncStatus('synced');
      setSyncErrorMessage(null);
    } catch (err: any) {
      console.error("Error al subir copia a OneDrive:", err);
      setSyncStatus('error');
      setSyncErrorMessage(err.message || String(err));
    }
  };

  const queueOneDriveSync = () => {
    if (msSyncTimeoutRef.current) {
      clearTimeout(msSyncTimeoutRef.current);
    }
    msSyncTimeoutRef.current = setTimeout(() => {
      triggerOneDriveSyncDirect();
    }, 3000);
  };

  const forceSyncToCloud = async () => {
    if (isOffline) {
      alert("No se puede sincronizar: estás sin conexión a internet.");
      return;
    }

    const provider = localStorage.getItem('petplant_login_provider');
    const activeHogar = localStorage.getItem('petplant_hogar_id');

    setSyncStatus('syncing');
    try {
      const listMascotas = await LocalDatabase.getMascotas();
      const listPlantas = await LocalDatabase.getPlantas();
            const listEventos = await LocalDatabase.getEventosCalendario();
      
      const chats = [];
      const consultantIds = ['veterinario', 'agronomo'];
      for (const id of consultantIds) {
        const chat = await LocalDatabase.getChatHistorial(id);
        if (chat) chats.push(chat);
      }

      if (provider === 'microsoft') {
        console.log('Subiendo copia a OneDrive...');
        await MicrosoftSyncService.uploadBackup({
          mascotas: listMascotas,
          plantas: listPlantas,
          eventos: listEventos,
          chats: chats,
          updatedAt: getNowTimestamp()
        });
        setSyncStatus('synced');
        setSyncErrorMessage(null);
        alert("✔️ Sincronización exitosa: copia de seguridad subida a Microsoft OneDrive.");
      } else if (activeHogar) {
        const { auth, FirebaseSyncService, signInAnonymously } = await initFirebase();
        if (auth && !auth.currentUser) {
          console.log("No Firebase session found, signing in anonymously before force sync...");
          try {
            await Promise.race([
              signInAnonymously(auth),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout de autenticación de fondo")), 5000))
            ]);
          } catch (e: any) {
            console.error("Failed anonymous signin fallback in force sync:", e);
            throw new Error("Error de inicio de sesión en Firebase: " + (e.message || String(e)) + ". Verifica que esté activado el proveedor 'Anónimo' (Anonymous) en tu panel de Firebase Console -> Authentication -> Sign-in method.");
          }
        }
        
        const fbSync = FirebaseSyncService;
        const activeNombre = localStorage.getItem('petplant_hogar_nombre') || "Mi Hogar";
        
        console.log('Subiendo copia a Firebase...');
        const uploadPromise = fbSync.uploadChanges(activeHogar, activeNombre, listMascotas, listPlantas, uiTheme, listEventos, chats);
        await Promise.race([
          uploadPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout de conexión con la nube. Tus datos están a salvo localmente en el dispositivo y se sincronizarán de forma automática en segundo plano cuando vuelva la conexión.")), 12000))
        ]);
        
        setSyncStatus('synced');
        setSyncErrorMessage(null);
        alert(`✔️ Sincronización exitosa: datos de tu grupo hogar '${activeNombre}' subidos correctamente a Firebase Cloud.`);
      } else {
        alert("⚠️ No tienes configurado un grupo hogar activo o cuenta en la nube. Ve a 'Ajustes' para registrarte o vincularte.");
        setSyncStatus('synced');
        setSyncErrorMessage(null);
      }
    } catch (err: any) {
      console.error("Fallo en sincronización manual:", err);
      setSyncStatus('error');
      setSyncErrorMessage(err.message || String(err));
      alert("❌ Error en la sincronización: " + (err.message || err));
    }
  };

  const uploadChangesToFirebaseDirect = async (
    activeHogar: string,
    listMascotas: Mascota[],
    listPlantas: Planta[]
  ) => {
    const activeNombre = localStorage.getItem('petplant_hogar_nombre') || "Hogar Sincronizado";
    setSyncStatus('synced');
    setSyncErrorMessage(null);

    try {
      const [listEventos, chats] = await Promise.all([
        LocalDatabase.getEventosCalendario(),
        (async () => {
          const res = [];
          const consultantIds = ['veterinario', 'agronomo'];
          for (const id of consultantIds) {
            const chat = await LocalDatabase.getChatHistorial(id);
            if (chat) res.push(chat);
          }
          return res;
        })()
      ]);

      const { auth, FirebaseSyncService, signInAnonymously } = await initFirebase();
      if (auth && !auth.currentUser) {
        console.log("No Firebase session found, signing in anonymously before direct upload...");
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Failed anonymous signin fallback in direct upload:", e);
        }
      }
      
      const fbSync = FirebaseSyncService;
      await fbSync.uploadChanges(
        activeHogar, 
        activeNombre, 
        listMascotas, 
        listPlantas, 
        uiTheme,
        listEventos,
        chats
      );
    } catch (err: any) {
      console.error("Error al sincronizar cambios en segundo plano:", err);
      const errMsg = err.message || String(err);
      if (
        errMsg.includes('permission') || 
        errMsg.includes('insufficient') || 
        errMsg.includes('unauthenticated') || 
        errMsg.includes('auth/') ||
        errMsg.includes('not-found')
      ) {
        setSyncStatus('error');
        setSyncErrorMessage(`Error de autorización en la nube: ${errMsg}`);
      }
    }
  };

  const handleLocalDataChanged = async (
    data: { mascotas: Mascota[]; plantas: Planta[] },
    isLocalEdit: boolean
  ) => {
    if (!isLocalEdit) return;

    if (lastSyncedThemeRef.current === uiTheme) {
      lastSyncedThemeRef.current = null;
      return;
    }

    const provider = localStorage.getItem('petplant_login_provider');
    if (provider === 'microsoft') {
      queueOneDriveSync();
    } else {
      const activeHogar = localStorage.getItem('petplant_hogar_id');
      if (activeHogar && !isRemoteSyncingRef.current && provider !== 'microsoft') {
        await uploadChangesToFirebaseDirect(activeHogar, data.mascotas, data.plantas);
      }
    }
  };

  const crearHogar = async (nombre: string) => {
    setSyncStatus('syncing');
    try {
      const [listMascotas, listPlantas, listEventos, chats] = await Promise.all([
        LocalDatabase.getMascotas(),
        LocalDatabase.getPlantas(),
        LocalDatabase.getEventosCalendario(),
        (async () => {
          const res = [];
          const consultantIds = ['veterinario', 'agronomo'];
          for (const id of consultantIds) {
            const chat = await LocalDatabase.getChatHistorial(id);
            if (chat) res.push(chat);
          }
          return res;
        })()
      ]);
      
      const code = await (getFirebaseCached()?.FirebaseSyncService ?? (await initFirebase()).FirebaseSyncService).createHogar(
        nombre.trim(), 
        listMascotas, 
        listPlantas, 
        uiTheme,
        listEventos,
        chats
      );
      setHogarId(code);
      setHogarNombre(nombre.trim());
      localStorage.setItem('petplant_hogar_id', code);
      localStorage.setItem('petplant_hogar_nombre', nombre.trim());

      const cachedFb = getFirebaseCached();
      if (cachedFb?.auth && cachedFb.auth.currentUser) {
        await cachedFb.FirebaseSyncService.saveUserHogar(cachedFb.auth.currentUser.uid, code, nombre.trim());
      }

      const h = { id: code, nombre: nombre.trim() };
      setJoinedHogares(prev => {
        const updated = [...prev.filter(x => x.id !== code), h];
        localStorage.setItem('petplant_joined_hogares', JSON.stringify(updated));
        return updated;
      });

      setSyncStatus('synced');
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      throw err;
    }
  };

  const unirseAHogar = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;
    setSyncStatus('syncing');
    try {
      const fbSync = getFirebaseCached()?.FirebaseSyncService ?? (await initFirebase()).FirebaseSyncService;
      const data = await fbSync.getHogarData(cleanCode);
      if (data) {
        setHogarId(cleanCode);
        setHogarNombre(data.nombre);
        localStorage.setItem('petplant_hogar_id', cleanCode);
        localStorage.setItem('petplant_hogar_nombre', data.nombre);

        const cachedFb2 = getFirebaseCached();
        if (cachedFb2?.auth && cachedFb2.auth.currentUser) {
          await cachedFb2.FirebaseSyncService.saveUserHogar(cachedFb2.auth.currentUser.uid, cleanCode, data.nombre);
        }
        
        isRemoteSyncingRef.current = true;
        await LocalDatabase.overwriteFullDatabase(
          data.mascotas || [],
          data.plantas || [],
          data.eventos,
          data.chats
        );
        isRemoteSyncingRef.current = false;

        const h = { id: cleanCode, nombre: data.nombre };
        setJoinedHogares(prev => {
          const updated = [...prev.filter(x => x.id !== cleanCode), h];
          localStorage.setItem('petplant_joined_hogares', JSON.stringify(updated));
          return updated;
        });

        if (data.theme && (data.theme === 'nature' || data.theme === 'gaming' || data.theme === 'kawaii')) {
          lastSyncedThemeRef.current = data.theme || null;
          setUiTheme(data.theme as any);
        }
        
        setSyncStatus('synced');
        await onCloudDataReceived();
      } else {
        setSyncStatus('error');
        throw new Error("Código de hogar inválido o no encontrado.");
      }
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      throw err;
    }
  };

  const desvincularHogar = async () => {
    const cachedFb3 = getFirebaseCached();
    if (cachedFb3?.auth && cachedFb3.auth.currentUser) {
      try {
        await cachedFb3.FirebaseSyncService.deleteUserHogar(cachedFb3.auth.currentUser.uid);
      } catch (err) {
        console.error("Error al desvincular hogar del usuario en la nube:", err);
      }
    }
    setHogarId('');
    setHogarNombre('');
    localStorage.removeItem('petplant_hogar_id');
    localStorage.removeItem('petplant_hogar_nombre');
    setSyncStatus('idle');
  };

  const cambiarHogar = async (code: string) => {
    if (code === hogarId) return;
    setSyncStatus('syncing');
    try {
      if (!code) {
        setHogarId('');
        setHogarNombre('');
        localStorage.removeItem('petplant_hogar_id');
        localStorage.removeItem('petplant_hogar_nombre');
        setSyncStatus('idle');
        await LocalDatabase.overwriteFullDatabase([], [], [], []);
        await onCloudDataReceived();
        return;
      }

      const fbSync = getFirebaseCached()?.FirebaseSyncService ?? (await initFirebase()).FirebaseSyncService;
      const data = await fbSync.getHogarData(code);
      if (data) {
        setHogarId(code);
        setHogarNombre(data.nombre);
        localStorage.setItem('petplant_hogar_id', code);
        localStorage.setItem('petplant_hogar_nombre', data.nombre);

        const cachedFb = getFirebaseCached();
        if (cachedFb?.auth && cachedFb.auth.currentUser) {
          await cachedFb.FirebaseSyncService.saveUserHogar(cachedFb.auth.currentUser.uid, code, data.nombre);
        }

        isRemoteSyncingRef.current = true;
        await LocalDatabase.overwriteFullDatabase(
          data.mascotas || [],
          data.plantas || [],
          data.eventos,
          data.chats
        );
        isRemoteSyncingRef.current = false;

        if (data.theme && (data.theme === 'nature' || data.theme === 'gaming' || data.theme === 'kawaii')) {
          lastSyncedThemeRef.current = data.theme;
          setUiTheme(data.theme as any);
        }

        setSyncStatus('synced');
        await onCloudDataReceived();
      } else {
        setSyncStatus('error');
        throw new Error("No se pudieron descargar los datos del hogar seleccionado.");
      }
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      throw err;
    }
  };

  const abandonarHogar = async (code: string) => {
    const confirmacion = window.confirm("¿Estás seguro de que deseas eliminar este hogar de tu lista de accesos rápidos?");
    if (!confirmacion) return;

    setJoinedHogares(prev => {
      const updated = prev.filter(h => h.id !== code);
      localStorage.setItem('petplant_joined_hogares', JSON.stringify(updated));
      return updated;
    });

    if (code === hogarId) {
      await cambiarHogar('');
    }
  };

  const handleGoogleSignIn = async () => {
    localStorage.setItem('petplant_login_provider', 'google');
    const { auth, GoogleAuthProvider, signInWithPopup, signInWithCredential } = await initFirebase();
    if (auth) {
      const isCapacitor = (window as any).Capacitor || window.location.protocol === 'capacitor:';
      if (isCapacitor) {
        try {
          const { GoogleSignIn } = await import('@capawesome/capacitor-google-sign-in');
          const webClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1044210464501-dummy.apps.googleusercontent.com';
          try {
            await GoogleSignIn.initialize({ clientId: webClientId });
          } catch {
            // Ignore if already initialized
          }
          const result = await GoogleSignIn.signIn();
          const idToken = result.idToken;
          if (!idToken) {
            throw new Error("No se pudo obtener el token de Google.");
          }
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
        } catch (err: any) {
          console.error("Error en inicio de sesión nativo con Google:", err);
          const errMsg = err.message || String(err);
          if (errMsg.includes('credential') || errMsg.includes('developer') || errMsg.includes('10') || errMsg.includes('internal')) {
            alert("📱 Google Sign-In Nativo:\n\nPara que el inicio de sesión con Google funcione en este APK nativo, recuerda registrar la firma SHA-1 de tu debug.keystore en tu consola de Firebase.\n\nAlternativa: puedes sincronizar tus datos al instante usando la clave de tu 'Grupo Hogar' en Ajustes 🔑");
          } else {
            alert("Error al iniciar sesión nativo: " + errMsg);
          }
        }
      } else {
        try {
          const provider = new GoogleAuthProvider();
          await signInWithPopup(auth, provider);
        } catch (err: any) {
          console.error("Error al iniciar sesión con Google:", err);
          alert("Error al iniciar sesión con Google: " + err.message);
        }
      }
    } else {
      const simulatedUser = {
        name: "Lorenzo Sanguino (Simulado)",
        email: "lorenzo@sanguino.com"
      };
      localStorage.setItem('petplant_user_session', JSON.stringify(simulatedUser));
      setUser(simulatedUser);
    }
  };

  const handleMicrosoftSignIn = async () => {
    localStorage.setItem('petplant_login_provider', 'microsoft');
    try {
      const loggedUser = await MicrosoftSyncService.login();
      setUser({
        name: loggedUser.name,
        email: loggedUser.email,
        photoURL: loggedUser.avatarUrl
      });
      await syncFromOneDrive();
    } catch (err: any) {
      console.error("Error al iniciar sesión con Microsoft:", err);
      alert("Error al iniciar sesión con Microsoft.");
    }
  };

  const handleMicrosoftLogout = async () => {
    try {
      await MicrosoftSyncService.logout();
    } catch (err) {
      console.error("Error al cerrar sesión de Microsoft:", err);
    }
    setUser(null);
    localStorage.removeItem('petplant_ms_session');
    localStorage.removeItem('petplant_login_provider');
    localStorage.removeItem('petplant_user_session');

    try {
      await LocalDatabase.resetToDemo();
      await onCloudDataReceived();
    } catch (err) {
      console.error("Error al limpiar IndexedDB en logout:", err);
    }

    setHogarId('');
    setHogarNombre('');
  };

  const handleLogout = async () => {
    const provider = localStorage.getItem('petplant_login_provider');
    if (provider === 'microsoft') {
      await handleMicrosoftLogout();
      return;
    }

    const cached = getFirebaseCached();
    if (cached?.auth) {
      try {
        const { signOut } = await import('firebase/auth');
        await signOut(cached.auth);
      } catch (err) {
        console.error("Error al cerrar sesión de Google:", err);
      }
    }
    localStorage.removeItem('petplant_user_session');
    localStorage.removeItem('petplant_login_provider');
    localStorage.removeItem('petplant_hogar_id');
    localStorage.removeItem('petplant_hogar_nombre');
    localStorage.removeItem('petplant_last_gps_weather');
    localStorage.removeItem('petplant_db_recordatorios');
    localStorage.removeItem('petplant_seed_done');

    try {
      await LocalDatabase.clear();
      await LocalDatabase.seedInitialData();
      await onCloudDataReceived();
    } catch (dbErr) {
      console.error("Error al limpiar IndexedDB en logout:", dbErr);
    }

    setHogarId('');
    setHogarNombre('');
    setUser(null);
  };

  // Sessions and real-time subscription lifecycle
  useEffect(() => {
    const initSessions = async () => {
      const provider = localStorage.getItem('petplant_login_provider');

      if (provider === 'microsoft') {
        try {
          await MicrosoftSyncService.init();
          const activeMsUser = await MicrosoftSyncService.getActiveUser();
          if (activeMsUser) {
            setUser({
              name: activeMsUser.name,
              email: activeMsUser.email,
              photoURL: activeMsUser.avatarUrl
            });
            await syncFromOneDrive();
          } else {
            setUser(null);
            localStorage.removeItem('petplant_login_provider');
            localStorage.removeItem('petplant_user_session');
            alert("Tu sesión de Microsoft OneDrive ha expirado. Vuelve a iniciar sesión para continuar sincronizando tus datos.");
            await onCloudDataReceived();
          }
        } catch (err) {
          console.error("Error al inicializar sesión de Microsoft:", err);
        }
      } else {
        initFirebase().then(({ auth, FirebaseSyncService, onAuthStateChanged, signInAnonymously }) => {
          setFirebaseLoaded(true);
          if (!auth) {
            const saved = localStorage.getItem('petplant_user_session');
            if (saved) {
              setUser(JSON.parse(saved));
            }
            return;
          }

          const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
              const u = {
                name: firebaseUser.displayName || "Usuario de Google",
                email: firebaseUser.email || "",
                photoURL: firebaseUser.photoURL || undefined
              };
              setUser(u);
              localStorage.setItem('petplant_user_session', JSON.stringify(u));
              localStorage.setItem('petplant_login_provider', 'google');

              if (FirebaseSyncService.isCloudEnabled()) {
                try {
                  const userHogar = await FirebaseSyncService.getUserHogar(firebaseUser.uid);
                  const listMascotas = await LocalDatabase.getMascotas();
                  const listPlantas = await LocalDatabase.getPlantas();
                                    const listEventos = await LocalDatabase.getEventosCalendario();
                  
                  const chats = [];
                  const consultantIds = ['veterinario', 'agronomo'];
                  for (const id of consultantIds) {
                    const chat = await LocalDatabase.getChatHistorial(id);
                    if (chat) chats.push(chat);
                  }

                  if (userHogar) {
                    const { hogarId: cloudHogarId, hogarNombre: cloudHogarNombre } = userHogar;

                    setJoinedHogares(prev => {
                      if (prev.some(x => x.id === cloudHogarId)) return prev;
                      const updated = [...prev, { id: cloudHogarId, nombre: cloudHogarNombre }];
                      localStorage.setItem('petplant_joined_hogares', JSON.stringify(updated));
                      return updated;
                    });

                    let data = await FirebaseSyncService.getHogarData(cloudHogarId);

                    if (data) {
                      localStorage.setItem('petplant_hogar_id', cloudHogarId);
                      localStorage.setItem('petplant_hogar_nombre', cloudHogarNombre);
                      setHogarId(cloudHogarId);
                      setHogarNombre(cloudHogarNombre);

                      if (data && (data.nombre === "Test de Diagnóstico" || !data.nombre)) {
                        console.warn("Detectada contaminación por prueba de diagnóstico en Firestore para el hogar:", cloudHogarId);
                        await FirebaseSyncService.uploadChanges(
                          cloudHogarId,
                          cloudHogarNombre,
                          listMascotas,
                          listPlantas,
                                            uiTheme,
                          listEventos,
                          chats
                        );
                        const updatedData = await FirebaseSyncService.getHogarData(cloudHogarId);
                        if (updatedData) {
                          data = updatedData;
                        }
                      }

                      const isLocalDemo = isDatabaseDefaultDemo(listMascotas, listPlantas);
                      const isCloudDemo = isDatabaseDefaultDemo(data.mascotas || [], data.plantas || []);
                      const cloudHasRealData = !isCloudDemo && (data.mascotas?.length > 0 || data.plantas?.length > 0);

                      const localLastUpdated = Number(localStorage.getItem('petplant_db_last_updated') || 0);
                      const isLocalEmpty = listMascotas.length === 0 && listPlantas.length === 0;
                      const remoteIsNewer = data.updatedAt > localLastUpdated;

                      if (!isLocalDemo && isCloudDemo) {
                        await FirebaseSyncService.uploadChanges(cloudHogarId, cloudHogarNombre, listMascotas, listPlantas, uiTheme, listEventos, chats);
                      } else if (cloudHasRealData && (remoteIsNewer || isLocalEmpty || isLocalDemo)) {
                        isRemoteSyncingRef.current = true;
                        await LocalDatabase.overwriteFullDatabase(
                          data.mascotas || [],
                          data.plantas || [],
                                          data.eventos,
                          data.chats
                        );
                        isRemoteSyncingRef.current = false;
                        await onCloudDataReceived();
                      } else {
                        await FirebaseSyncService.uploadChanges(cloudHogarId, cloudHogarNombre, listMascotas, listPlantas, uiTheme, listEventos, chats);
                      }

                      if (data.theme && (data.theme === 'nature' || data.theme === 'gaming' || data.theme === 'kawaii')) {
                        lastSyncedThemeRef.current = data.theme || null;
                        setUiTheme(data.theme as any);
                      }
                    } else {
                      if (listMascotas.length > 0 || listPlantas.length > 0) {
                        await FirebaseSyncService.uploadChanges(cloudHogarId, cloudHogarNombre, listMascotas, listPlantas, uiTheme, listEventos, chats);
                      }
                    }
                  } else {
                    const localHogarId = localStorage.getItem('petplant_hogar_id') || '';
                    const localHogarNombre = localStorage.getItem('petplant_hogar_nombre') || 'Mi Hogar';
                    if (localHogarId) {
                      await FirebaseSyncService.saveUserHogar(firebaseUser.uid, localHogarId, localHogarNombre);
                      await FirebaseSyncService.uploadChanges(localHogarId, localHogarNombre, listMascotas, listPlantas, uiTheme, listEventos, chats);
                    } else {
                      const nuevoCodigo = await FirebaseSyncService.createHogar("Mi Hogar", listMascotas, listPlantas, uiTheme, listEventos, chats);
                      localStorage.setItem('petplant_hogar_id', nuevoCodigo);
                      localStorage.setItem('petplant_hogar_nombre', "Mi Hogar");
                      setHogarId(nuevoCodigo);
                      setHogarNombre("Mi Hogar");
                      await FirebaseSyncService.saveUserHogar(firebaseUser.uid, nuevoCodigo, "Mi Hogar");
                    }
                  }
                } catch (err) {
                  console.error("Error al recuperar o sincronizar asociación de hogar:", err);
                }
              }
            } else {
              if (localStorage.getItem('petplant_login_provider') === 'google') {
                setUser(null);
                localStorage.removeItem('petplant_login_provider');
                localStorage.removeItem('petplant_user_session');
              }

              // Iniciar sesión anónima de fondo para tener credenciales activas en Firestore
              if (FirebaseSyncService.isCloudEnabled()) {
                signInAnonymously(auth).catch((err) => {
                  console.error("Error al iniciar sesión de forma anónima:", err);
                });
              }

              const localHogarId = localStorage.getItem('petplant_hogar_id');
              if (localHogarId && FirebaseSyncService.isCloudEnabled()) {
                try {
                  let data = await FirebaseSyncService.getHogarData(localHogarId);
                  if (data) {
                    const listMascotas = await LocalDatabase.getMascotas();
                    const listPlantas = await LocalDatabase.getPlantas();
                                        const listEventos = await LocalDatabase.getEventosCalendario();
                    
                    const chats = [];
                    const consultantIds = ['veterinario', 'agronomo'];
                    for (const id of consultantIds) {
                      const chat = await LocalDatabase.getChatHistorial(id);
                      if (chat) chats.push(chat);
                    }

                    if (data && (data.nombre === "Test de Diagnóstico" || !data.nombre)) {
                      const localHogarNombre = localStorage.getItem('petplant_hogar_nombre') || 'Mi Hogar';
                      console.warn("Detectada contaminación por diagnóstico en Firestore (no-auth) para:", localHogarId);
                      await FirebaseSyncService.uploadChanges(
                        localHogarId,
                        localHogarNombre,
                        listMascotas,
                        listPlantas,
                                        uiTheme,
                        listEventos,
                        chats
                      );
                      const updatedData = await FirebaseSyncService.getHogarData(localHogarId);
                      if (updatedData) {
                        data = updatedData;
                      }
                    }

                    const isLocalDemo = isDatabaseDefaultDemo(listMascotas, listPlantas);
                    const isCloudDemo = isDatabaseDefaultDemo(data.mascotas || [], data.plantas || []);
                    const cloudHasRealData = !isCloudDemo && (data.mascotas?.length > 0 || data.plantas?.length > 0);

                    const localLastUpdated = Number(localStorage.getItem('petplant_db_last_updated') || 0);
                    const isLocalEmpty = listMascotas.length === 0 && listPlantas.length === 0;
                    const remoteIsNewer = data.updatedAt > localLastUpdated;

                    if (!isLocalDemo && isCloudDemo) {
                      await FirebaseSyncService.uploadChanges(localHogarId, data.nombre, listMascotas, listPlantas, uiTheme, listEventos, chats);
                    } else if (cloudHasRealData && (remoteIsNewer || isLocalEmpty || isLocalDemo)) {
                      isRemoteSyncingRef.current = true;
                      await LocalDatabase.overwriteFullDatabase(
                        data.mascotas || [],
                        data.plantas || [],
                                      data.eventos,
                        data.chats
                      );
                      isRemoteSyncingRef.current = false;
                      await onCloudDataReceived();
                    } else {
                      await FirebaseSyncService.uploadChanges(localHogarId, data.nombre, listMascotas, listPlantas, uiTheme, listEventos, chats);
                    }

                    if (data.theme && (data.theme === 'nature' || data.theme === 'gaming' || data.theme === 'kawaii')) {
                      lastSyncedThemeRef.current = data.theme || null;
                      setUiTheme(data.theme as any);
                    }
                  }
                } catch (err) {
                  console.error("Error al sincronizar hogar no-auth al iniciar:", err);
                }
              }
            }
          });

          return () => unsubscribe();
        });
      }
    };

    initSessions();
  }, []);

  // Live Firestore listener subscription
  useEffect(() => {
    const provider = localStorage.getItem('petplant_login_provider');
    if (!hogarId || provider === 'microsoft') {
      return;
    }

    const cachedFb = getFirebaseCached();
    if (!cachedFb) return;

    setSyncStatus('synced');
    import('../utils/notificationManager').then(({ NotificationManager }) => {
      NotificationManager.subscribeUserToPush(hogarId);
    }).catch(err => console.error("Error subscribing to push:", err));

    const unsubscribe = cachedFb.FirebaseSyncService.listenToHogar(hogarId, async (data) => {
      const localLastUpdated = Number(localStorage.getItem('petplant_db_last_updated') || 0);
      
      const localMascotas = await LocalDatabase.getMascotas();
      const localPlantas = await LocalDatabase.getPlantas();
            const isLocalEmpty = localMascotas.length === 0 && localPlantas.length === 0;

      const isLocalDemo = isDatabaseDefaultDemo(localMascotas, localPlantas);
      const isCloudDemo = isDatabaseDefaultDemo(data.mascotas || [], data.plantas || []);

      const esIntentoDeMachacarConDemo = isCloudDemo && !isLocalDemo;

      const cloudIsEmpty = (data.mascotas || []).length === 0 && (data.plantas || []).length === 0;
      const esIntentoDeMachacarConVacio = cloudIsEmpty && !isLocalEmpty && !isLocalDemo;

      if (!esIntentoDeMachacarConDemo && !esIntentoDeMachacarConVacio && (data.updatedAt > localLastUpdated || isLocalEmpty || (isLocalDemo && !isCloudDemo))) {
        setSyncStatus('syncing');
        try {
          isRemoteSyncingRef.current = true;
          await LocalDatabase.overwriteFullDatabase(
            data.mascotas || [],
            data.plantas || [],
              data.eventos,
            data.chats
          );
          await onCloudDataReceived();
          setSyncStatus('synced');
        } catch (err) {
          console.error("Error escribiendo actualización remota en base de datos:", err);
          setSyncStatus('error');
        } finally {
          isRemoteSyncingRef.current = false;
        }
      }

      if (data.theme && (data.theme === 'nature' || data.theme === 'gaming' || data.theme === 'kawaii')) {
        setUiTheme((prevTheme: 'gaming' | 'nature' | 'kawaii') => {
          if (prevTheme !== data.theme) {
            lastSyncedThemeRef.current = data.theme || null;
            return data.theme as 'gaming' | 'nature' | 'kawaii';
          }
          return prevTheme;
        });
      }
    });

    return () => { unsubscribe?.(); };
  }, [hogarId, firebaseLoaded]);

  // Upload theme to cloud when local uiTheme state changes
  useEffect(() => {
    const activeHogar = localStorage.getItem('petplant_hogar_id');
    const provider = localStorage.getItem('petplant_login_provider');
    if (activeHogar && provider !== 'microsoft' && firebaseLoaded && !isRemoteSyncingRef.current) {
      if (lastSyncedThemeRef.current === uiTheme) {
        lastSyncedThemeRef.current = null;
        return;
      }
      
      const uploadTheme = async () => {
        try {
          const listMascotas = await LocalDatabase.getMascotas();
          const listPlantas = await LocalDatabase.getPlantas();
                    const listEventos = await LocalDatabase.getEventosCalendario();
          const chats = [];
          const consultantIds = ['veterinario', 'agronomo'];
          for (const id of consultantIds) {
            const chat = await LocalDatabase.getChatHistorial(id);
            if (chat) chats.push(chat);
          }
          const fbSync = getFirebaseCached()?.FirebaseSyncService ?? (await initFirebase()).FirebaseSyncService;
          const activeNombre = localStorage.getItem('petplant_hogar_nombre') || "Hogar Sincronizado";
          await fbSync.uploadChanges(
            activeHogar, 
            activeNombre, 
            listMascotas, 
            listPlantas, 
                uiTheme,
            listEventos,
            chats
          );
        } catch (err) {
          console.error("Error uploading theme to Firebase:", err);
        }
      };
      
      const timeout = setTimeout(() => {
        void uploadTheme();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [uiTheme, firebaseLoaded, hogarId]);

  return {
    user,
    hogarId,
    hogarNombre,
    joinedHogares,
    syncStatus,
    syncErrorMessage,
    isCloudEnabled,
    firebaseLoaded,
    isRemoteSyncingRef,
    forceSyncToCloud,
    syncFromOneDrive,
    handleLocalDataChanged,
    crearHogar,
    unirseAHogar,
    desvincularHogar,
    cambiarHogar,
    abandonarHogar,
    handleGoogleSignIn,
    handleMicrosoftSignIn,
    handleLogout
  };
};
