/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity */
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { LocalDatabase } from '../database/db';
import type { Mascota, Planta, AnimalExotico } from '../database/types';
import { initFirebase, getFirebaseCached } from '../database/firebaseLazy';
import { WeatherService } from '../services/weatherService';
import { MicrosoftSyncService } from '../services/microsoftSync';


// ── Lazy-loaded components (se descargan solo cuando se necesitan) ──────────
const ScannerModal       = lazy(() => import('../components/ScannerModal').then(m => ({ default: m.ScannerModal })));
const IAConsultantsView  = lazy(() => import('../components/IAConsultantsView').then(m => ({ default: m.IAConsultantsView })));
const PetCard            = lazy(() => import('../components/PetCard').then(m => ({ default: m.PetCard })));
const PlantCard          = lazy(() => import('../components/PlantCard').then(m => ({ default: m.PlantCard })));
const ExoticCard         = lazy(() => import('../components/ExoticCard').then(m => ({ default: m.ExoticCard })));
const EcosystemCalendar  = lazy(() => import('../components/EcosystemCalendar').then(m => ({ default: m.EcosystemCalendar })));
const VacationAdvice     = lazy(() => import('../components/VacationAdvice').then(m => ({ default: m.VacationAdvice })));
const ManualPetForm      = lazy(() => import('../components/ManualRegisterModal').then(m => ({ default: m.ManualPetForm })));
const ManualPlantForm    = lazy(() => import('../components/ManualRegisterModal').then(m => ({ default: m.ManualPlantForm })));
const ManualExoticForm   = lazy(() => import('../components/ManualRegisterModal').then(m => ({ default: m.ManualExoticForm })));

// ── Spinner de carga mínimo (se muestra mientras el chunk carga) ────────────
const ChunkLoader: React.FC<{ height?: string }> = ({ height = '120px' }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height, width: '100%', flexDirection: 'column', gap: '10px',
    color: 'var(--game-text, #888)', fontSize: '13px'
  }}>
    <div style={{
      width: '28px', height: '28px',
      border: '3px solid var(--game-border-color, #ccc)',
      borderTopColor: 'var(--game-accent, #1976d2)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite'
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    Cargando...
  </div>
);


export const PetPlantDashboard: React.FC = () => {
  const isRemoteSyncingRef = useRef(false);
  const msSyncTimeoutRef = useRef<any>(null);

  // Estados para Grupo Hogar
  const [hogarId, setHogarId] = useState<string>(() => localStorage.getItem('petplant_hogar_id') || '');
  const [hogarNombre, setHogarNombre] = useState<string>(() => localStorage.getItem('petplant_hogar_nombre') || '');
  const [nuevoHogarNombre, setNuevoHogarNombre] = useState('');
  const [joinHogarId, setJoinHogarId] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [isCloudEnabled] = useState(() => {
    // Comprobación rápida sin cargar Firebase — si la config existe asumimos que está habilitado
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDGQWW8tVP8kk6Nss-GCutohfD6IouLzp0";
    return !!apiKey && !apiKey.includes('dummy') && localStorage.getItem('petplant_mock_auth') !== 'true';
  });

  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [exoticos, setExoticos] = useState<AnimalExotico[]>([]);
  

  const getAccentColor = () => {
    if (experienceMode === 'pets') return '#1976d2';
    if (experienceMode === 'exotics') return '#ff8f00';
    return '#2e7d32'; // plants
  };

  const [showScanner, setShowScanner] = useState(false);
  const [showManualRegister, setShowManualRegister] = useState<'pet' | 'plant' | 'exotic' | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isFading, setIsFading] = useState(false);
  
  // Google Sign-in / Microsoft session state unified
  const [user, setUser] = useState<{ name: string; email: string; photoURL?: string } | null>(null);

  const handleContinue = () => {
    setIsFading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (localStorage.getItem('petplant_gps_sync_enabled') === 'true') {
        sincronizarTodasLasPlantasPorGPS();
      }
      // Precargar chunks lazy en segundo plano para que la primera navegación sea instantánea
      setTimeout(() => {
        import('../components/PetCard').catch(() => {});
        import('../components/PlantCard').catch(() => {});
        import('../components/ExoticCard').catch(() => {});
        import('../components/IAConsultantsView').catch(() => {});
        import('../components/ScannerModal').catch(() => {});
      }, 1500);
    }, 500);
  };

  const [loadingGPS, setLoadingGPS] = useState(false);
  const [gpsSyncSuccess, setGpsSyncSuccess] = useState<string | null>(null);
  const [gpsSyncEnabled, setGpsSyncEnabled] = useState<'undecided' | 'active' | 'inactive'>(() => {
    const saved = localStorage.getItem('petplant_gps_sync_enabled');
    if (saved === 'true') return 'active';
    if (saved === 'false') return 'inactive';
    return 'undecided';
  });

  const handleGPSToggle = async () => {
    if (gpsSyncEnabled === 'undecided') {
      const activar = window.confirm("¿Quieres activar la sincronización GPS automática? Esto adaptará el intervalo de riego de tus plantas al clima en tiempo real.");
      if (activar) {
        localStorage.setItem('petplant_gps_sync_enabled', 'true');
        setGpsSyncEnabled('active');
        sincronizarTodasLasPlantasPorGPS();
      } else {
        localStorage.setItem('petplant_gps_sync_enabled', 'false');
        setGpsSyncEnabled('inactive');
      }
    } else {
      const nuevoEstado = gpsSyncEnabled === 'active' ? 'inactive' : 'active';
      localStorage.setItem('petplant_gps_sync_enabled', nuevoEstado === 'active' ? 'true' : 'false');
      setGpsSyncEnabled(nuevoEstado);
      if (nuevoEstado === 'active') {
        sincronizarTodasLasPlantasPorGPS();
      }
    }
  };

  const sincronizarTodasLasPlantasPorGPS = async () => {
    setLoadingGPS(true);
    setGpsSyncSuccess(null);
    try {
      const coords = await WeatherService.getCoordenadasGPS();
      const clima = await WeatherService.obtenerClimaEnVivo(coords.latitude, coords.longitude);
      
      // Guardar clima obtenido en caché local
      localStorage.setItem('petplant_last_gps_weather', JSON.stringify(clima));

      const listPlantas = await LocalDatabase.getPlantas();
      for (const p of listPlantas) {
        const baseIntervalo = p.intervaloRiegoDias || 7;
        const nuevoIntervalo = WeatherService.calcularIntervaloRiegoClimatico(
          baseIntervalo,
          p.grosorHoja || 'Normal',
          clima
        );
        const proximaFecha = new Date(Date.now() + nuevoIntervalo * 24 * 3600 * 1000).toISOString();
        const plantaActualizada = {
          ...p,
          intervaloRiegoDias: nuevoIntervalo,
          proximaFechaRiego: proximaFecha,
          temperaturaZona: Math.round(clima.temperatura)
        };
        await LocalDatabase.savePlanta(plantaActualizada);
      }
      
      await refreshData(true);
      setGpsSyncSuccess(`¡Sincronizado con éxito! Clima: ${Math.round(clima.temperatura)}°C, HR: ${clima.humedad}%`);
    } catch (err: any) {
      console.warn("Fallo GPS en Dashboard, usando simulación de Madrid:", err);
      try {
        const climaSimulado = await WeatherService.obtenerClimaEnVivo(40.4167, -3.7037);
        
        // Guardar clima simulado obtenido en caché local
        localStorage.setItem('petplant_last_gps_weather', JSON.stringify(climaSimulado));

        const listPlantas = await LocalDatabase.getPlantas();
        for (const p of listPlantas) {
          const baseIntervalo = p.intervaloRiegoDias || 7;
          const nuevoIntervalo = WeatherService.calcularIntervaloRiegoClimatico(
            baseIntervalo,
            p.grosorHoja || 'Normal',
            climaSimulado
          );
          const proximaFecha = new Date(Date.now() + nuevoIntervalo * 24 * 3600 * 1000).toISOString();
          const plantaActualizada = {
            ...p,
            intervaloRiegoDias: nuevoIntervalo,
            proximaFechaRiego: proximaFecha,
            temperaturaZona: Math.round(climaSimulado.temperatura)
          };
          await LocalDatabase.savePlanta(plantaActualizada);
        }
        await refreshData(true);
        setGpsSyncSuccess(`¡Sincronizado con éxito! (Clima simulado): ${Math.round(climaSimulado.temperatura)}°C, HR: ${climaSimulado.humedad}%`);
      } catch (innerErr) {
        console.warn("No se pudo realizar la sincronización climática GPS:", innerErr);
        alert("No se pudo realizar la sincronización climática GPS.");
      }
    } finally {
      setLoadingGPS(false);
    }
  };

  // Modo de Experiencia: 'landing', 'pets', 'plants', 'exotics'
  const [experienceMode, setExperienceMode] = useState<'landing' | 'pets' | 'plants' | 'exotics'>('landing');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'consultants' | 'settings'>('dashboard');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const handleNavigateToAsset = (tipo: 'mascota' | 'planta' | 'exotico', id: string) => {
    if (tipo === 'mascota') setExperienceMode('pets');
    else if (tipo === 'planta') setExperienceMode('plants');
    else if (tipo === 'exotico') setExperienceMode('exotics');

    setActiveTab('dashboard');
    setExpandedCardId(id);
  };

  const [scannerMode, setScannerMode] = useState<'registrar_mascota' | 'salud_mascota' | 'registrar_planta' | 'enfermedad_planta' | 'registrar_exotico' | 'salud_exotico' | null>(null);
  const [scannerAssetId, setScannerAssetId] = useState<string | null>(null);

  // Estados de PWA y Conexión Offline
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOffline, setIsOffline] = useState(typeof window !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA installation outcome: ${outcome}`);
    setDeferredPrompt(null);
  };

  const [uiTheme, setUiTheme] = useState<'gaming' | 'nature' | 'kawaii'>(() => {
    const saved = localStorage.getItem('petplant_game_theme');
    return (saved === 'gaming' || saved === 'nature' || saved === 'kawaii')
      ? saved as 'gaming' | 'nature' | 'kawaii'
      : 'nature';
  });

  useEffect(() => {
    localStorage.setItem('petplant_game_theme', uiTheme);
  }, [uiTheme]);

  const [customApiKey, setCustomApiKey] = useState<string>(() => localStorage.getItem('petplant_gemini_api_key') || '');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // Interceptar botón de Atrás en Android (popstate)
  useEffect(() => {
    if (experienceMode === 'landing') return;

    // Push a state so popstate event fires when pressing back
    window.history.pushState({ mode: experienceMode, tab: activeTab }, '');

    const handlePopState = () => {
      if (showScanner) {
        setShowScanner(false);
        setScannerAssetId(null);
        window.history.pushState({ mode: experienceMode, tab: activeTab }, '');
      } else if (showManualRegister) {
        setShowManualRegister(null);
        window.history.pushState({ mode: experienceMode, tab: activeTab }, '');
      } else {
        setExperienceMode('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [experienceMode, activeTab, showScanner, showManualRegister]);

  // Registrar el Service Worker al montar
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Forzar recarga automática al detectar nueva versión del service worker
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Service Worker registrado correctamente'))
        .catch(err => console.warn('Error al registrar Service Worker:', err));
    }
  }, []);



  // Estados para Grupo Hogar (Moved to top of component to prevent TDZ errors)

  const dispararLogroVisual = (texto: string, subtitulo: string, tipo: 'lvl_up' | 'victory') => {
    // No-op para desactivar mensajes de level up
    void texto;
    void subtitulo;
    void tipo;
  };

  const refreshData = async (isLocalEdit = true) => {
    try {
      if (isLocalEdit) {
        localStorage.setItem('petplant_db_last_updated', Date.now().toString());
      }

      const listMascotas = await LocalDatabase.getMascotas();
      const listPlantas = await LocalDatabase.getPlantas();
      const listExoticos = await LocalDatabase.getExoticos();
      
      setMascotas(listMascotas);
      setPlantas(listPlantas);
      setExoticos(listExoticos);

      // Sincronización automática tras cambios locales con Microsoft OneDrive
      if (isLocalEdit && localStorage.getItem('petplant_login_provider') === 'microsoft') {
        queueOneDriveSync();
      }

      // Sincronización automática tras cambios locales con Firebase
      const activeHogar = localStorage.getItem('petplant_hogar_id');
      if (activeHogar && !isRemoteSyncingRef.current && localStorage.getItem('petplant_login_provider') === 'google') {
        const activeNombre = localStorage.getItem('petplant_hogar_nombre') || "Hogar Sincronizado";
        setSyncStatus('syncing');
        const uploadPromise = getFirebaseCached()?.FirebaseSyncService.uploadChanges(activeHogar, activeNombre, listMascotas, listPlantas, listExoticos);
        if (uploadPromise) {
          uploadPromise
            .then(() => setSyncStatus('synced'))
            .catch((err: any) => {
              console.error("Error al sincronizar cambios locales:", err);
              setSyncStatus('error');
            });
        }
      }
    } catch (err) {
      console.error("Fallo al refrescar IndexedDB:", err);
    }
  };

  // ── Microsoft & Google Cloud Sync & Auth Helpers ───────────────────────────
  const syncFromOneDrive = async () => {
    setSyncStatus('syncing');
    try {
      const backup = await MicrosoftSyncService.downloadBackup();
      if (backup) {
        isRemoteSyncingRef.current = true;
        await LocalDatabase.overwriteFullDatabase(
          backup.mascotas || [],
          backup.plantas || [],
          backup.exoticos || [],
          backup.eventos || [],
          backup.chats || []
        );
        isRemoteSyncingRef.current = false;
        await refreshData(false);
        setSyncStatus('synced');
      } else {
        // No backup found -> first time user for MS account
        // Clear local database and seed only demo cards
        isRemoteSyncingRef.current = true;
        await LocalDatabase.resetToDemo();
        isRemoteSyncingRef.current = false;
        await refreshData(false);
        // Upload initial demo cards to OneDrive to create backup file
        await triggerOneDriveSyncDirect();
      }
    } catch (err) {
      console.error("Error al descargar copia de seguridad de OneDrive:", err);
      setSyncStatus('error');
    }
  };

  const triggerOneDriveSyncDirect = async () => {
    try {
      const activeMsUser = await MicrosoftSyncService.getActiveUser();
      if (!activeMsUser) return;

      setSyncStatus('syncing');
      const listMascotas = await LocalDatabase.getMascotas();
      const listPlantas = await LocalDatabase.getPlantas();
      const listExoticos = await LocalDatabase.getExoticos();
      const listEventos = await LocalDatabase.getEventosCalendario();
      
      const chats = [];
      const consultantIds = ['veterinario', 'agronomo', 'exotico'];
      for (const id of consultantIds) {
        const chat = await LocalDatabase.getChatHistorial(id);
        if (chat) chats.push(chat);
      }

      await MicrosoftSyncService.uploadBackup({
        mascotas: listMascotas,
        plantas: listPlantas,
        exoticos: listExoticos,
        eventos: listEventos,
        chats: chats,
        updatedAt: Date.now()
      });
      setSyncStatus('synced');
    } catch (err) {
      console.error("Error al subir copia a OneDrive:", err);
      setSyncStatus('error');
    }
  };

  const queueOneDriveSync = () => {
    if (msSyncTimeoutRef.current) {
      clearTimeout(msSyncTimeoutRef.current);
    }
    msSyncTimeoutRef.current = setTimeout(() => {
      triggerOneDriveSyncDirect();
    }, 3000); // 3 seconds debounce
  };

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
            // MSAL session expired or not found
            setUser(null);
            localStorage.removeItem('petplant_login_provider');
            localStorage.removeItem('petplant_user_session');
            await LocalDatabase.resetToDemo();
            await refreshData(false);
          }
        } catch (err) {
          console.error("Error al inicializar sesión de Microsoft:", err);
        }
      } else {
        // Google/Firebase session initialization
        initFirebase().then(({ auth, FirebaseSyncService, onAuthStateChanged }) => {
          if (!auth) {
            const saved = localStorage.getItem('petplant_user_session');
            if (saved) {
              setUser(JSON.parse(saved));
            }
            return;
          }

          const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
            if (firebaseUser) {
              const u = {
                name: firebaseUser.displayName || "Usuario de Google",
                email: firebaseUser.email || "",
                photoURL: firebaseUser.photoURL || undefined
              };
              setUser(u);
              localStorage.setItem('petplant_user_session', JSON.stringify(u));
              localStorage.setItem('petplant_login_provider', 'google');

              // Cargar hogar asociado en Firestore e iniciar sincronización bidireccional inmediata
              if (FirebaseSyncService.isCloudEnabled()) {
                try {
                  const userHogar = await FirebaseSyncService.getUserHogar(firebaseUser.uid);
                  const listMascotas = await LocalDatabase.getMascotas();
                  const listPlantas = await LocalDatabase.getPlantas();
                  const listExoticos = await LocalDatabase.getExoticos();

                  if (userHogar) {
                    const { hogarId: cloudHogarId, hogarNombre: cloudHogarNombre } = userHogar;
                    const localHogarId = localStorage.getItem('petplant_hogar_id') || '';

                    // Intentar recuperar los datos del hogar en la nube
                    const data = await FirebaseSyncService.getHogarData(cloudHogarId);

                    if (data) {
                      // Si el hogar en la nube tiene datos y estamos en un dispositivo diferente o vacío localmente, sincronizar
                      if (cloudHogarId !== localHogarId) {
                        localStorage.setItem('petplant_hogar_id', cloudHogarId);
                        localStorage.setItem('petplant_hogar_nombre', cloudHogarNombre);
                        setHogarId(cloudHogarId);
                        setHogarNombre(cloudHogarNombre);

                        isRemoteSyncingRef.current = true;
                        await LocalDatabase.overwriteDatabase(data.mascotas || [], data.plantas || [], data.exoticos || []);
                        isRemoteSyncingRef.current = false;
                        await refreshData(false);
                      }
                    } else {
                      // Si no hay datos en la nube para este hogarId pero tenemos datos locales, los subimos de inmediato
                      if (listMascotas.length > 0 || listPlantas.length > 0 || listExoticos.length > 0) {
                        await FirebaseSyncService.uploadChanges(cloudHogarId, cloudHogarNombre, listMascotas, listPlantas, listExoticos);
                      }
                    }
                  } else {
                    const localHogarId = localStorage.getItem('petplant_hogar_id') || '';
                    const localHogarNombre = localStorage.getItem('petplant_hogar_nombre') || 'Mi Hogar';
                    if (localHogarId) {
                      await FirebaseSyncService.saveUserHogar(firebaseUser.uid, localHogarId, localHogarNombre);
                      // Subir los datos locales actuales para asegurar que el hogar en la nube esté creado
                      await FirebaseSyncService.uploadChanges(localHogarId, localHogarNombre, listMascotas, listPlantas, listExoticos);
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
            }
          });

          return () => unsubscribe();
        });
      }
    };

    initSessions();
  }, []);

  const handleGoogleSignIn = async () => {
    localStorage.setItem('petplant_login_provider', 'google');
    const { auth, GoogleAuthProvider, signInWithPopup } = await initFirebase();
    if (auth) {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (err: any) {
        console.error("Error al iniciar sesión con Google:", err);
        alert("Error al iniciar sesión con Google: " + err.message);
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
      await refreshData(false);
    } catch (err) {
      console.error("Error al limpiar IndexedDB en logout:", err);
    }

    setHogarId('');
    setHogarNombre('');
    setMascotas([]);
    setPlantas([]);
    setExoticos([]);
    setIsLoading(true);
    setIsFading(false);
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
    // Limpiar toda la información local de sesión e IndexedDB para evitar fugas
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
    } catch (dbErr) {
      console.error("Error al limpiar IndexedDB en logout:", dbErr);
    }

    setHogarId('');
    setHogarNombre('');
    setMascotas([]);
    setPlantas([]);
    setExoticos([]);
    setUser(null);
    setIsLoading(true);
    setIsFading(false);
  };

  useEffect(() => {
    const initDB = async () => {
      try {
        // Solo hacer seed si NO estamos vinculados a un Hogar
        const hasHogar = !!localStorage.getItem('petplant_hogar_id');
        if (!hasHogar) {
          await LocalDatabase.seedInitialData();
        }
        await refreshData(false);
      } catch (err) {
        console.error("Fallo al inicializar base de datos:", err);
      }
    };
    initDB();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suscripción en tiempo real a cambios de Grupo Hogar con validación de timestamps
  useEffect(() => {
    if (!hogarId) return;

    setSyncStatus('synced');
    const unsubscribe = getFirebaseCached()?.FirebaseSyncService.listenToHogar(hogarId, async (data) => {
      const localLastUpdated = Number(localStorage.getItem('petplant_db_last_updated') || 0);
      
      // Comprobar si la base de datos local está totalmente vacía
      const localMascotas = await LocalDatabase.getMascotas();
      const localPlantas = await LocalDatabase.getPlantas();
      const localExoticos = await LocalDatabase.getExoticos();
      const isLocalEmpty = localMascotas.length === 0 && localPlantas.length === 0 && localExoticos.length === 0;

      // Solo sobreescribir si la actualización remota es estrictamente más nueva o si local está vacío
      if (data.updatedAt > localLastUpdated || isLocalEmpty) {
        setSyncStatus('syncing');
        try {
          isRemoteSyncingRef.current = true;
          await LocalDatabase.overwriteDatabase(data.mascotas || [], data.plantas || [], data.exoticos || []);
          await refreshData(false);
          setSyncStatus('synced');
          dispararLogroVisual("SINCRO HOGAR", "Datos del hogar actualizados en vivo.", 'lvl_up');
        } catch (err) {
          console.error("Error escribiendo actualización remota en base de datos:", err);
          setSyncStatus('error');
        } finally {
          isRemoteSyncingRef.current = false;
        }
      }
    });

    return () => { unsubscribe?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hogarId]);

  const crearHogar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoHogarNombre.trim()) return;
    setSyncStatus('syncing');
    try {
      const code = await (getFirebaseCached()?.FirebaseSyncService ?? (await initFirebase()).FirebaseSyncService).createHogar(nuevoHogarNombre.trim(), mascotas, plantas, exoticos);
      setHogarId(code);
      setHogarNombre(nuevoHogarNombre.trim());
      localStorage.setItem('petplant_hogar_id', code);
      localStorage.setItem('petplant_hogar_nombre', nuevoHogarNombre.trim());

      const cachedFb = getFirebaseCached();
      if (cachedFb?.auth && (cachedFb.auth as any).currentUser) {
        await cachedFb.FirebaseSyncService.saveUserHogar((cachedFb.auth as any).currentUser.uid, code, nuevoHogarNombre.trim());
      }

      setNuevoHogarNombre('');
      setSyncStatus('synced');
      dispararLogroVisual("¡HOGAR CREADO!", `Código compartido: ${code}`, 'lvl_up');
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
    }
  };

  const unirseAHogar = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinHogarId.trim().toUpperCase();
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
        if (cachedFb2?.auth && (cachedFb2.auth as any).currentUser) {
          await cachedFb2.FirebaseSyncService.saveUserHogar((cachedFb2.auth as any).currentUser.uid, cleanCode, data.nombre);
        }
        
        isRemoteSyncingRef.current = true;
        await LocalDatabase.overwriteDatabase(data.mascotas || [], data.plantas || [], data.exoticos || []);
        isRemoteSyncingRef.current = false;
        
        setJoinHogarId('');
        setSyncStatus('synced');
        await refreshData(false);
        dispararLogroVisual("¡HOGAR VINCULADO!", `Descargados los datos de tu hogar.`, 'victory');
      } else {
        alert("Código de hogar inválido o no encontrado.");
        setSyncStatus('error');
      }
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
    }
  };

  const desvincularHogar = async () => {
    const cachedFb3 = getFirebaseCached();
    if (cachedFb3?.auth && (cachedFb3.auth as any).currentUser) {
      try {
        await cachedFb3.FirebaseSyncService.deleteUserHogar((cachedFb3.auth as any).currentUser.uid);
      } catch (err) {
        console.error("Error al desvincular hogar del usuario en la nube:", err);
      }
    }
    setHogarId('');
    setHogarNombre('');
    localStorage.removeItem('petplant_hogar_id');
    localStorage.removeItem('petplant_hogar_nombre');
    setSyncStatus('idle');
    dispararLogroVisual("DESVINCULADO", "Revertido a base de datos local.", 'lvl_up');
  };

  useEffect(() => {
    if (uiTheme !== 'gaming' || experienceMode === 'landing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
        return;
      }
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const tabs: ('dashboard' | 'consultants' | 'settings')[] = [
        'dashboard', 'consultants', 'settings'
      ];

      if (e.key >= '1' && e.key <= '3') {
        const idx = parseInt(e.key) - 1;
        const targetTab = tabs[idx];
        if (targetTab) {
          setActiveTab(targetTab);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uiTheme, experienceMode]);




  return (
    <div 
      data-game-theme={uiTheme}
      style={{ 
        background: 'var(--game-bg, #fcfcfc)', 
        backgroundImage: uiTheme === 'gaming' 
          ? 'linear-gradient(rgba(11, 12, 16, 0.75), rgba(11, 12, 16, 0.75)), url(/flow_lab_imagenes/carga_gaming.webp)' 
          : (uiTheme === 'kawaii'
            ? 'linear-gradient(rgba(255, 245, 247, 0.82), rgba(255, 245, 247, 0.82)), url(/flow_lab_imagenes/carga_kawaii.webp)'
            : 'linear-gradient(rgba(243, 247, 244, 0.8), rgba(243, 247, 244, 0.8)), url(/flow_lab_imagenes/carga_nature.webp)'),
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        minHeight: '100vh', 
        height: isLoading ? '100svh' : 'auto',
        maxHeight: isLoading ? '100svh' : 'none',
        overflow: isLoading ? 'hidden' : 'visible',
        fontFamily: 'var(--game-font, sans-serif)', 
        color: 'var(--game-text, #333)',
        padding: (experienceMode === 'landing' || isLoading) ? '12px 10px 24px 10px' : '24px 16px',
        position: 'relative',
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {/* Offline Alert Banner */}
      {isOffline && (
        <div style={{
          position: 'fixed',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: uiTheme === 'gaming' ? 'rgba(15, 15, 22, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          border: uiTheme === 'gaming' ? '1px solid #ff0055' : '1.5px solid #ef5350',
          borderRadius: uiTheme === 'gaming' ? '0px' : '12px',
          padding: '10px 20px',
          color: uiTheme === 'gaming' ? '#ff0055' : '#c62828',
          fontSize: '13px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: 999999,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--game-font, sans-serif)'
        }}>
          <span>⚠️ Navegando sin conexión. Las funciones locales de IndexedDB siguen disponibles.</span>
        </div>
      )}

      {isLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          background: uiTheme === 'gaming' 
            ? 'linear-gradient(rgba(15, 15, 22, 0.45), rgba(15, 15, 22, 0.8)), url(/flow_lab_imagenes/carga_gaming.webp)' 
            : (uiTheme === 'kawaii' 
              ? 'linear-gradient(rgba(255, 245, 247, 0.35), rgba(255, 245, 247, 0.65)), url(/flow_lab_imagenes/carga_kawaii.webp)' 
              : 'linear-gradient(rgba(243, 247, 244, 0.35), rgba(243, 247, 244, 0.75)), url(/flow_lab_imagenes/carga_nature.webp)'),
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          zIndex: 99999,
          opacity: isFading ? 0 : 1,
          transition: 'opacity 0.5s ease',
          color: uiTheme === 'gaming' ? '#ffffff' : (uiTheme === 'kawaii' ? '#b05273' : '#2e7d32'),
          fontFamily: 'var(--game-font, sans-serif)',
          textAlign: 'center',
          padding: '24px 20px',
          boxSizing: 'border-box',
          textShadow: uiTheme === 'gaming' 
            ? '0 2px 10px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 255, 127, 0.4)' 
            : (uiTheme === 'kawaii' ? '0 1px 6px rgba(255, 255, 255, 0.8)' : '0 1px 6px rgba(255, 255, 255, 0.8)')
        }}>
          {/* Bloque superior: Emojis y Textos */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              display: 'flex', 
              gap: '16px', 
              fontSize: '48px',
              animation: uiTheme === 'gaming' 
                ? 'pulseNeon 1.5s ease-in-out infinite alternate' 
                : (uiTheme === 'kawaii' ? 'pulseKawaii 1.5s ease-in-out infinite alternate' : 'none')
            }}>
              <span>🐶</span>
              <span>🌿</span>
              <span>🐱</span>
              <span>🌱</span>
            </div>
            <div>
              <h2 style={{ 
                margin: '0 0 8px 0', 
                fontSize: '28px', 
                fontWeight: 'bold',
                letterSpacing: '1px',
                color: uiTheme === 'gaming' ? '#00ff7f' : (uiTheme === 'kawaii' ? '#ff6b8b' : '#2e7d32')
              }}>
                Pet & Plant Pro
              </h2>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                opacity: 0.9, 
                color: uiTheme === 'gaming' ? '#e0e0e0' : (uiTheme === 'kawaii' ? '#b05273' : '#2e7d32'),
                fontWeight: uiTheme === 'gaming' ? '500' : 'normal'
              }}>
                Cargando tu ecosistema seguro...
              </p>
            </div>
          </div>

          {/* Bloque inferior: Tarjeta de sesión o Google Login */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '12px' }}>
            {user ? (
              <div style={{
                background: uiTheme === 'gaming' ? 'rgba(20, 26, 35, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                padding: uiTheme === 'gaming' ? '12px 16px' : '10px 14px',
                borderRadius: uiTheme === 'gaming' ? '0px' : (uiTheme === 'kawaii' ? '24px' : '16px'),
                border: uiTheme === 'gaming' ? '2px solid #66fcf1' : '2px solid rgba(255, 255, 255, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                maxWidth: '340px',
                width: '100%',
                boxShadow: uiTheme === 'gaming' ? '0 0 20px rgba(102, 252, 241, 0.35)' : '0 10px 40px rgba(0, 0, 0, 0.15)',
                color: uiTheme === 'gaming' ? '#ffffff' : '#1a1a1a',
                textShadow: 'none',
                boxSizing: 'border-box'
              }}>
                <span style={{ fontSize: '9px', color: uiTheme === 'gaming' ? '#66fcf1' : '#666', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Sesión Detectada ({localStorage.getItem('petplant_login_provider') === 'microsoft' ? 'Microsoft / Hotmail' : 'Google'})
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', borderBottom: uiTheme === 'gaming' ? '1px solid #2e3b4e' : '1px solid #eee', paddingBottom: '4px' }}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Foto de perfil" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--game-border-color, #1976d2)', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eaeaea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>👤</div>
                  )}
                  <div style={{ textAlign: 'left', overflow: 'hidden', flex: 1 }}>
                    <strong style={{ fontSize: '12px', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: uiTheme === 'gaming' ? '#fff' : '#111' }}>{user.name}</strong>
                    <span style={{ fontSize: '10px', color: uiTheme === 'gaming' ? '#c5a1ff' : '#555', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{user.email}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <button
                    onClick={handleContinue}
                    className="continue-pulse-button"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(46, 125, 50, 0.25)',
                      fontFamily: 'var(--game-font, sans-serif)',
                      transition: 'all 0.2s'
                    }}
                  >
                    Continuar al Dashboard 🚀
                  </button>

                  {deferredPrompt && (
                    <button
                      onClick={handleInstallPWA}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
                        fontFamily: 'var(--game-font, sans-serif)',
                        transition: 'all 0.2s'
                      }}
                    >
                      Instalar App en tu Dispositivo 📱
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      padding: '6px 12px',
                      background: 'transparent',
                      color: '#ef4444',
                      border: '1.5px solid #ef4444',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontFamily: 'var(--game-font, sans-serif)',
                      transition: 'all 0.2s'
                    }}
                  >
                    Cerrar Sesión / Usar otra cuenta 🚪
                  </button>
                  <button
                    type="button"
                    onClick={handleGPSToggle}
                    className="gps-pulse-button"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                      color: '#ffffff',
                      border: '2px solid #f59e0b',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
                      fontFamily: 'var(--game-font, sans-serif)',
                      transition: 'all 0.2s',
                      textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                    }}
                  >
                    {gpsSyncEnabled === 'active' 
                      ? 'GPS: Sincronización Activa 🛰️' 
                      : (gpsSyncEnabled === 'inactive' ? 'GPS: Sincronización Inactiva 🛰️' : 'Configurar Sincronización GPS 🛰️')}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                <button
                  onClick={handleGoogleSignIn}
                  style={{
                    padding: '14px 28px',
                    background: '#4285F4',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '30px',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 20px rgba(66, 133, 244, 0.35)',
                    fontFamily: 'var(--game-font, sans-serif)',
                    transition: 'all 0.2s',
                    width: '100%',
                    maxWidth: '320px',
                    justifyContent: 'center'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 18 18" fill="none" style={{ background: '#fff', borderRadius: '50%', padding: '2px', flexShrink: 0 }}>
                    <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.8 2.71v2.24h2.9c1.7-1.57 2.7-3.88 2.7-6.58z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.47-.8 5.96-2.22l-2.9-2.24c-.8.54-1.84.87-3.06.87-2.35 0-4.33-1.58-5.04-3.71H.92v2.3C2.4 15.96 5.48 18 9 18z" fill="#34A853"/>
                    <path d="M3.96 10.7c-.18-.54-.28-1.12-.28-1.7s.1-1.16.28-1.7V5H.92C.33 6.18 0 7.55 0 9s.33 2.82.92 4l3.04-2.3z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.1C13.46.7 11.43 0 9 0 5.48 0 2.4 2.04.92 5.04l3.04 2.3c.7-2.13 2.69-3.76 5.04-3.76z" fill="#EA4335"/>
                  </svg>
                  Iniciar Sesión con Google
                </button>

                <button
                  onClick={handleMicrosoftSignIn}
                  style={{
                    padding: '14px 28px',
                    background: '#2F2F2F',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '30px',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                    fontFamily: 'var(--game-font, sans-serif)',
                    transition: 'all 0.2s',
                    width: '100%',
                    maxWidth: '320px',
                    justifyContent: 'center'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 23 23" style={{ flexShrink: 0 }}>
                    <rect x="0" y="0" width="10.5" height="10.5" fill="#f25022"/>
                    <rect x="11.5" y="0" width="10.5" height="10.5" fill="#7fba00"/>
                    <rect x="0" y="11.5" width="10.5" height="10.5" fill="#00a4ef"/>
                    <rect x="11.5" y="11.5" width="10.5" height="10.5" fill="#ffb900"/>
                  </svg>
                  Iniciar Sesión con Microsoft / Hotmail
                </button>

                <button
                  type="button"
                  onClick={handleGPSToggle}
                  className="gps-pulse-button"
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                    color: '#ffffff',
                    border: '2px solid #f59e0b',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
                    fontFamily: 'var(--game-font, sans-serif)',
                    transition: 'all 0.2s',
                    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }}
                >
                  {gpsSyncEnabled === 'active' 
                    ? 'GPS: Sincronización Activa 🛰️' 
                    : (gpsSyncEnabled === 'inactive' ? 'GPS: Sincronización Inactiva 🛰️' : 'Activar Sincronización GPS 🛰️')}
                </button>
              </div>
            )}
          </div>
          {uiTheme === 'gaming' && (
            <style>{`
              @keyframes pulseNeon {
                from { filter: drop-shadow(0 0 2px rgba(0, 255, 127, 0.4)); }
                to { filter: drop-shadow(0 0 12px rgba(0, 255, 127, 0.8)); }
              }
            `}</style>
          )}
          {uiTheme === 'kawaii' && (
            <style>{`
              @keyframes pulseKawaii {
                from { transform: scale(1); filter: drop-shadow(0 0 2px rgba(255, 107, 139, 0.3)); }
                to { transform: scale(1.08); filter: drop-shadow(0 0 10px rgba(255, 107, 139, 0.6)); }
              }
            `}</style>
          )}
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes continuePulseGlow {
              0% { box-shadow: 0 0 5px rgba(46, 125, 50, 0.45), 0 4px 10px rgba(46, 125, 50, 0.25); transform: scale(1); }
              50% { box-shadow: 0 0 20px rgba(46, 125, 50, 0.95), 0 6px 25px rgba(46, 125, 50, 0.55); transform: scale(1.035); }
              100% { box-shadow: 0 0 5px rgba(46, 125, 50, 0.45), 0 4px 10px rgba(46, 125, 50, 0.25); transform: scale(1); }
            }
            .continue-pulse-button {
              animation: continuePulseGlow 1.8s infinite ease-in-out !important;
            }
            .continue-pulse-button:hover {
              transform: scale(1.06) !important;
            }
            @keyframes gpsPulseGlow {
              0% {
                box-shadow: 0 0 4px rgba(245, 158, 11, 0.4), 0 4px 10px rgba(245, 158, 11, 0.2);
                transform: scale(1);
              }
              50% {
                box-shadow: 0 0 16px rgba(245, 158, 11, 0.8), 0 6px 20px rgba(245, 158, 11, 0.4);
                transform: scale(1.03);
              }
              100% {
                box-shadow: 0 0 4px rgba(245, 158, 11, 0.4), 0 4px 10px rgba(245, 158, 11, 0.2);
                transform: scale(1);
              }
            }
            .gps-pulse-button {
              animation: gpsPulseGlow 2s infinite ease-in-out !important;
            }
            .gps-pulse-button:hover {
              transform: scale(1.05) !important;
            }
            .landing-container {
              display: flex;
              gap: 20px;
              width: 100%;
              justify-content: center;
              margin-top: 16px;
              z-index: 2;
              box-sizing: border-box;
            }
            .landing-card {
              flex: 1;
              min-width: 250px;
              max-width: 320px;
              background: var(--game-card-bg, #ffffff);
              border-radius: var(--game-radius, 20px);
              padding: 16px 12px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
              transition: transform 0.3s, box-shadow 0.3s;
              cursor: pointer;
              box-sizing: border-box;
              text-align: center;
            }
            .landing-card-title {
              margin: 0 0 2px 0;
              font-size: 16px;
              font-weight: bold;
              font-family: var(--game-font, sans-serif);
            }
            .landing-card-desc {
              margin: 0;
              font-size: 11px;
              color: var(--game-text, #666);
              line-height: 1.35;
              font-family: var(--game-font, sans-serif);
            }
            .landing-card-button {
              margin-top: auto;
              padding: 6px 14px;
              color: #fff;
              border: none;
              border-radius: var(--game-radius, 25px);
              font-size: 11px;
              font-weight: bold;
              cursor: pointer;
              font-family: var(--game-font, sans-serif);
            }
            @media (max-width: 600px) {
              .landing-container {
                flex-direction: column;
                gap: 5px !important;
                margin-top: 2px !important;
              }
              .landing-card {
                flex-direction: row !important;
                text-align: left !important;
                align-items: center !important;
                padding: 6px 10px !important;
                max-width: 100% !important;
                min-width: 100% !important;
                gap: 6px !important;
                border-radius: 10px !important;
              }
              .landing-card .premium-logo-cat,
              .landing-card .premium-logo-fern,
              .landing-card .premium-logo-exotic {
                width: 32px !important;
                height: 32px !important;
                font-size: 18px !important;
                border-width: 1.5px !important;
                flex-shrink: 0 !important;
              }
              .landing-card-title {
                font-size: 12px !important;
              }
              .landing-card-desc {
                font-size: 9px !important;
                display: -webkit-box;
                -webkit-line-clamp: 1;
                -webkit-box-orient: vertical;
                overflow: hidden;
                line-height: 1.2;
              }
              .landing-card-button {
                display: none !important;
              }
            }
          `}</style>
        </div>
      )}

      
      {/* 1. VIDEOJUEGO LANDING SPLASH SCREEN */}
      {experienceMode === 'landing' && (
        <div style={{
          maxWidth: '850px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '16px',
          position: 'relative',
          padding: '24px 10px 32px 10px',
          boxSizing: 'border-box',
          minHeight: 'calc(100vh - 24px)',
          justifyContent: 'center',
          overflow: 'visible'
        }}>
          {/* Floating Decorators - Emojis y Huellas */}
          <div className="landing-decorator" style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '32px' }}>🌿</div>
          <div className="landing-decorator-delay" style={{ position: 'absolute', top: '120px', left: '30px', fontSize: '28px' }}>🐾</div>
          <div className="landing-decorator" style={{ position: 'absolute', bottom: '150px', left: '20px', fontSize: '36px' }}>🍃</div>
          <div className="landing-decorator-delay" style={{ position: 'absolute', top: '5px', right: '15px', fontSize: '32px' }}>🌱</div>
          <div className="landing-decorator" style={{ position: 'absolute', top: '140px', right: '25px', fontSize: '28px' }}>🐾</div>
          <div className="landing-decorator-delay" style={{ position: 'absolute', bottom: '120px', right: '20px', fontSize: '34px' }}>🌿</div>
          <div className="landing-decorator" style={{ position: 'absolute', top: '45%', left: '10px', fontSize: '24px' }}>🌸</div>
          <div className="landing-decorator-delay" style={{ position: 'absolute', top: '65%', right: '15px', fontSize: '24px' }}>🍀</div>

          <div style={{ zIndex: 2 }}>
            <h1 style={{ 
              margin: '0 0 4px 0', 
              fontSize: '28px', 
              color: 'var(--game-text-bright, #1a1a1a)', 
              fontWeight: 'bold', 
              letterSpacing: '-0.5px', 
              fontFamily: 'var(--game-font, sans-serif)',
              textShadow: uiTheme === 'gaming' ? '0 0 8px rgba(102,252,241,0.6)' : 'none'
            }}>
              🐾 PET & PLANT PRO 🌿
            </h1>
            <p style={{ margin: '0', fontSize: '13px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)', fontWeight: '500' }}>
              Bienvenido al centro integrado seguro. Selecciona el ecosistema que deseas gestionar:
            </p>
          </div>

          <div className="landing-container">
            {/* Panel de Entrada Mascotas */}
            <div 
              className="landing-card"
              style={{
                border: 'var(--game-border, 1px solid #e3f2fd)',
                boxShadow: 'var(--game-shadow, 0 8px 30px rgba(33, 150, 243, 0.05))',
              }}
              onClick={() => { setExperienceMode('pets'); setActiveTab('dashboard'); }}
              onMouseEnter={(e) => {
                if (window.innerWidth > 600) {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(33, 150, 243, 0.15)';
                }
                const logo = e.currentTarget.querySelector('.premium-logo-cat');
                if (logo && window.innerWidth > 600) (logo as HTMLElement).style.transform = 'scale(1.1) rotate(-4deg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'var(--game-shadow, 0 8px 30px rgba(33, 150, 243, 0.05))';
                const logo = e.currentTarget.querySelector('.premium-logo-cat');
                if (logo) (logo as HTMLElement).style.transform = 'none';
              }}
            >
              {/* Logo Premium Gato */}
              <div 
                className="premium-logo-cat"
                style={{ 
                  width: '76px', 
                  height: '76px', 
                  borderRadius: '50%', 
                  background: 'radial-gradient(circle, var(--game-card-bg, #ffffff) 20%, rgba(33, 150, 243, 0.15) 80%)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '40px',
                  border: '4px solid var(--game-border-color, #1976d2)',
                  boxShadow: '0 12px 28px rgba(33, 150, 243, 0.25), inset 0 2px 5px rgba(255,255,255,0.7)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
              >
                <span className="landing-decorator-delay" style={{ position: 'absolute', opacity: 0.15, fontSize: '30px', top: '5px', left: '5px', pointerEvents: 'none' }}>🐾</span>
                <span style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.15))', zIndex: 1 }}>🐱</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h2 className="landing-card-title" style={{ color: '#1976d2' }}>Mis Mascotas</h2>
                <p className="landing-card-desc">
                  Expedientes clínicos, trazados de curvas de peso preventivos, calculadoras metabólicas RER/DER, vacunas y consultas especializadas de bienestar animal por IA.
                </p>
              </div>
              <button className="landing-card-button" style={{ background: '#1976d2', boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)' }}>
                Acceder a Mascotas 🐾
              </button>
            </div>

            {/* Panel de Entrada Plantas */}
            <div 
              className="landing-card"
              style={{
                border: 'var(--game-border, 1px solid #e8f5e9)',
                boxShadow: 'var(--game-shadow, 0 8px 30px rgba(76, 175, 80, 0.05))',
              }}
              onClick={() => { setExperienceMode('plants'); setActiveTab('dashboard'); }}
              onMouseEnter={(e) => {
                if (window.innerWidth > 600) {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(76, 175, 80, 0.15)';
                }
                const logo = e.currentTarget.querySelector('.premium-logo-fern');
                if (logo && window.innerWidth > 600) (logo as HTMLElement).style.transform = 'scale(1.1) rotate(4deg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'var(--game-shadow, 0 8px 30px rgba(76, 175, 80, 0.05))';
                const logo = e.currentTarget.querySelector('.premium-logo-fern');
                if (logo) (logo as HTMLElement).style.transform = 'none';
              }}
            >
              {/* Logo Premium Helecho */}
              <div 
                className="premium-logo-fern"
                style={{ 
                  width: '76px', 
                  height: '76px', 
                  borderRadius: '50%', 
                  background: 'radial-gradient(circle, var(--game-card-bg, #ffffff) 20%, rgba(76, 175, 80, 0.15) 80%)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '40px',
                  border: '4px solid var(--game-border-color, #2e7d32)',
                  boxShadow: '0 12px 28px rgba(76, 175, 80, 0.25), inset 0 2px 5px rgba(255,255,255,0.7)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
              >
                <span className="landing-decorator" style={{ position: 'absolute', opacity: 0.15, fontSize: '30px', bottom: '5px', right: '5px', pointerEvents: 'none' }}>🌿</span>
                <span style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.15))', zIndex: 1 }}>🪴</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h2 className="landing-card-title" style={{ color: '#2e7d32' }}>Mis Plantas</h2>
                <p className="landing-card-desc">
                  Microclimas botánicos, control de evapotranspiración por tipo de hoja y temperatura estacional, catálogo toxicológico ASPCA y consultor agrónomo por IA.
                </p>
              </div>
              <button className="landing-card-button" style={{ background: '#2e7d32', boxShadow: '0 4px 12px rgba(46, 125, 50, 0.2)' }}>
                Acceder a Plantas 🌿
              </button>
            </div>

            {/* Panel de Entrada Exóticos */}
            <div 
              className="landing-card"
              style={{
                border: 'var(--game-border, 1px solid #fff8e1)',
                boxShadow: 'var(--game-shadow, 0 8px 30px rgba(255, 143, 0, 0.05))',
              }}
              onClick={() => { setExperienceMode('exotics'); setActiveTab('dashboard'); }}
              onMouseEnter={(e) => {
                if (window.innerWidth > 600) {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(255, 143, 0, 0.15)';
                }
                const logo = e.currentTarget.querySelector('.premium-logo-exotic');
                if (logo && window.innerWidth > 600) (logo as HTMLElement).style.transform = 'scale(1.1) rotate(-4deg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'var(--game-shadow, 0 8px 30px rgba(255, 143, 0, 0.05))';
                const logo = e.currentTarget.querySelector('.premium-logo-exotic');
                if (logo) (logo as HTMLElement).style.transform = 'none';
              }}
            >
              {/* Logo Premium Exóticos */}
              <div 
                className="premium-logo-exotic"
                style={{ 
                  width: '76px', 
                  height: '76px', 
                  borderRadius: '50%', 
                  background: 'radial-gradient(circle, var(--game-card-bg, #ffffff) 20%, rgba(255, 143, 0, 0.15) 80%)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '40px',
                  border: '4px solid var(--game-border-color, #ff8f00)',
                  boxShadow: '0 12px 28px rgba(255, 143, 0, 0.25), inset 0 2px 5px rgba(255,255,255,0.7)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
              >
                <span className="landing-decorator" style={{ position: 'absolute', opacity: 0.15, fontSize: '30px', bottom: '5px', right: '5px', pointerEvents: 'none' }}>🦎</span>
                <span style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.15))', zIndex: 1 }}>🐍</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h2 className="landing-card-title" style={{ color: '#ff8f00' }}>Animales Exóticos</h2>
                <p className="landing-card-desc">
                  Terrarios y microclimas, control de temperatura y humedad ideal, alertas de última alimentación, registros de mudas y asesor de terrarios por IA.
                </p>
              </div>
              <button className="landing-card-button" style={{ background: '#ff8f00', boxShadow: '0 4px 12px rgba(255, 143, 0, 0.2)' }}>
                Acceder a Exóticos 🦎
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ECOSISTEMAS DEDICADOS E INDEPENDIENTES */}
      {experienceMode !== 'landing' && (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          {/* Header Ecosistema */}
          <div className="ecosystem-header-responsive" style={{
            background: 'var(--game-card-bg, #ffffff)',
            borderRadius: '16px',
            padding: activeTab === 'consultants' ? '10px 16px' : '20px 24px',
            border: 'var(--game-border, 1px solid #f0f0f0)',
            display: 'flex',
            flexDirection: activeTab === 'consultants' ? 'row' : 'column',
            justifyContent: activeTab === 'consultants' ? 'space-between' : 'center',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: '16px',
            gap: activeTab === 'consultants' ? '8px' : '16px',
            flexWrap: 'wrap'
          }}>
            {activeTab !== 'consultants' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <span style={{ fontSize: '24px' }}>{experienceMode === 'pets' ? '🐾' : experienceMode === 'exotics' ? '🦎' : '🌿'}</span>
                  <h1 style={{ margin: '0', fontSize: '20px', color: 'var(--game-text-bright, #1a1a1a)', fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)', textAlign: 'center' }}>
                    {experienceMode === 'pets' ? 'Ecosistema de Bienestar Animal' : experienceMode === 'exotics' ? 'Ecosistema de Animales Exóticos' : 'Ecosistema de Cultivo Botánico'}
                  </h1>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)', textAlign: 'center' }}>
                  {experienceMode === 'pets' ? 'Gestión preventiva de expedientes y nutrición' : experienceMode === 'exotics' ? 'Terrarios, mudas, humedad y control preventivo' : 'Control agronómico y catálogo biocomparativo'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '20px' }}>{experienceMode === 'pets' ? '🐾' : experienceMode === 'exotics' ? '🦎' : '🌿'}</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--game-text-bright, #1a1a1a)', fontFamily: 'var(--game-font, sans-serif)' }}>
                  {experienceMode === 'pets' ? 'Consultor de Mascotas' : experienceMode === 'exotics' ? 'Consultor de Exóticos' : 'Consultor de Plantas'}
                </span>
              </div>
            )}
            
            <div className="ecosystem-buttons-responsive" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', width: activeTab === 'consultants' ? 'auto' : '100%' }}>
              <button 
                disabled={experienceMode === 'pets'}
                onClick={() => { setExperienceMode('pets'); setActiveTab('dashboard'); }}
                style={{
                  padding: '6px 12px',
                  background: experienceMode === 'pets' ? 'var(--game-accent-light, #e3f2fd)' : '#f5f5f5',
                  color: experienceMode === 'pets' ? '#1976d2' : '#666',
                  border: '1px solid #eaeaea',
                  borderRadius: '12px',
                  fontSize: '11.5px',
                  fontWeight: 'bold',
                  cursor: experienceMode === 'pets' ? 'default' : 'pointer',
                  opacity: experienceMode === 'pets' ? 0.9 : 1
                }}
              >
                Mascotas 🐾
              </button>
              <button 
                disabled={experienceMode === 'plants'}
                onClick={() => { setExperienceMode('plants'); setActiveTab('dashboard'); }}
                style={{
                  padding: '6px 12px',
                  background: experienceMode === 'plants' ? 'var(--game-accent-light, #e8f5e9)' : '#f5f5f5',
                  color: experienceMode === 'plants' ? '#2e7d32' : '#666',
                  border: '1px solid #eaeaea',
                  borderRadius: '12px',
                  fontSize: '11.5px',
                  fontWeight: 'bold',
                  cursor: experienceMode === 'plants' ? 'default' : 'pointer',
                  opacity: experienceMode === 'plants' ? 0.9 : 1
                }}
              >
                Plantas 🌿
              </button>
              <button 
                disabled={experienceMode === 'exotics'}
                onClick={() => { setExperienceMode('exotics'); setActiveTab('dashboard'); }}
                style={{
                  padding: '6px 12px',
                  background: experienceMode === 'exotics' ? 'var(--game-accent-light, #fff8e1)' : '#f5f5f5',
                  color: experienceMode === 'exotics' ? '#ff8f00' : '#666',
                  border: '1px solid #eaeaea',
                  borderRadius: '12px',
                  fontSize: '11.5px',
                  fontWeight: 'bold',
                  cursor: experienceMode === 'exotics' ? 'default' : 'pointer',
                  opacity: experienceMode === 'exotics' ? 0.9 : 1
                }}
              >
                Exóticos 🦎
              </button>
            </div>
          </div>

          {/* Navigation Bar (Tabs Filtradas) */}
          <div style={{
            display: 'flex',
            gap: '4px',
            borderBottom: '1px solid #eaeaea',
            marginBottom: '24px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'dashboard' ? `3px solid ${getAccentColor()}` : '3px solid transparent',
                color: activeTab === 'dashboard' ? getAccentColor() : '#666',
                fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              📊 Mi Dashboard
            </button>
            


            <button
              onClick={() => setActiveTab('consultants')}
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'consultants' ? `3px solid ${getAccentColor()}` : '3px solid transparent',
                color: activeTab === 'consultants' ? getAccentColor() : '#666',
                fontWeight: activeTab === 'consultants' ? 'bold' : 'normal',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              💬 Consultor IA
            </button>
            
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'settings' ? `3px solid ${getAccentColor()}` : '3px solid transparent',
                color: activeTab === 'settings' ? getAccentColor() : '#666',
                fontWeight: activeTab === 'settings' ? 'bold' : 'normal',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              ⚙️ Ajustes
            </button>
          </div>

          {/* Contenido Dinámico de las Pestañas según el Ecosistema */}
          <div style={{ width: '100%' }}>
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Barra de Acciones de Registro Glassmorphism */}
                <div style={{
                  background: 'var(--game-card-bg, rgba(255, 255, 255, 0.65))',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: 'var(--game-border, 1px solid rgba(255, 255, 255, 0.4))',
                  borderRadius: 'var(--game-radius, 16px)',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                  boxShadow: 'var(--game-shadow, 0 8px 32px 0 rgba(31, 38, 135, 0.04))'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--game-text-bright, #2c3e50)', fontFamily: 'var(--game-font, sans-serif)' }}>
                      {experienceMode === 'pets' ? '🐾 Registro de Mascotas' : experienceMode === 'exotics' ? '🦎 Registro de Exóticos' : '🌿 Registro de Plantas'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--game-text, #7f8c8d)', fontFamily: 'var(--game-font, sans-serif)' }}>
                      {experienceMode === 'pets' ? 'Agrega un nuevo perro, gato u otro animal de compañía.' : experienceMode === 'exotics' ? 'Registra tu terrario, anfibios, reptiles o arácnidos.' : 'Añade una planta especificando su ubicación e intervalos de riego.'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                      onClick={() => {
                        if (experienceMode === 'pets') setScannerMode('registrar_mascota');
                        else if (experienceMode === 'plants') setScannerMode('registrar_planta');
                        else if (experienceMode === 'exotics') setScannerMode('registrar_exotico');
                        setShowScanner(true);
                      }}
                      style={{
                        padding: '10px 18px',
                        background: `linear-gradient(135deg, ${getAccentColor()} 0%, ${getAccentColor()}ee 100%)`,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontFamily: 'var(--game-font, sans-serif)',
                        boxShadow: `0 4px 14px rgba(0, 0, 0, 0.1)`,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>📷</span> Registrar con IA (Escanear)
                    </button>
                    <button
                      onClick={() => {
                        if (experienceMode === 'pets') setShowManualRegister('pet');
                        else if (experienceMode === 'plants') setShowManualRegister('plant');
                        else setShowManualRegister('exotic');
                      }}
                      style={{
                        padding: '10px 18px',
                        background: 'transparent',
                        border: `2px solid ${getAccentColor()}`,
                        color: getAccentColor(),
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontFamily: 'var(--game-font, sans-serif)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>➕</span> Registro Manual
                    </button>
                  </div>
                </div>

                {/* Cuadrícula Principal */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '24px', width: '100%', boxSizing: 'border-box' }}>
                  
                  {/* Tarjetas según el ecosistema */}
                  {experienceMode === 'pets' && (
                    /* Mis Mascotas */
                    <div style={{ background: 'var(--game-card-bg, #ffffff)', borderRadius: '16px', padding: '20px', border: 'var(--game-border, 1px solid #f0f0f0)', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e3f2fd', paddingBottom: '8px', width: '100%', boxSizing: 'border-box' }}>
                        <h2 style={{ margin: '0', fontSize: '17px', color: '#1976d2', fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)' }}>🐾 Mis Mascotas</h2>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                        {mascotas.length === 0 ? (
                          <p style={{ fontSize: '12px', color: 'var(--game-text, #888)', fontStyle: 'italic', textAlign: 'center', padding: '12px', fontFamily: 'var(--game-font, sans-serif)' }}>No hay mascotas registradas.</p>
                        ) : (
                          mascotas.map(m => (
                            <Suspense key={m.id} fallback={<ChunkLoader height="80px" />}>
                              <PetCard
                                mascota={m}
                                onUpdate={refreshData}
                                onOpenScanner={(mode, assetId) => {
                                  setScannerMode(mode);
                                  setScannerAssetId(assetId);
                                  setShowScanner(true);
                                }}
                                isExpanded={expandedCardId === m.id}
                                onToggleExpand={() => setExpandedCardId(expandedCardId === m.id ? null : m.id)}
                              />
                            </Suspense>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {experienceMode === 'plants' && (
                    /* Mis Plantas */
                    <div style={{ background: 'var(--game-card-bg, #ffffff)', borderRadius: '16px', padding: '20px', border: 'var(--game-border, 1px solid #f0f0f0)', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e8f5e9', paddingBottom: '8px', width: '100%', boxSizing: 'border-box' }}>
                        <h2 style={{ margin: '0', fontSize: '17px', color: '#2e7d32', fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)' }}>🌿 Mis Plantas</h2>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                        {plantas.length === 0 ? (
                          <p style={{ fontSize: '12px', color: 'var(--game-text, #888)', fontStyle: 'italic', textAlign: 'center', padding: '12px', fontFamily: 'var(--game-font, sans-serif)' }}>No hay plantas registradas.</p>
                        ) : (
                          plantas.map(p => (
                            <Suspense key={p.id} fallback={<ChunkLoader height="80px" />}>
                              <PlantCard
                                planta={p}
                                onUpdate={refreshData}
                                onOpenScanner={(mode, assetId) => {
                                  setScannerMode(mode);
                                  setScannerAssetId(assetId);
                                  setShowScanner(true);
                                }}
                                isExpanded={expandedCardId === p.id}
                                onToggleExpand={() => setExpandedCardId(expandedCardId === p.id ? null : p.id)}
                              />
                            </Suspense>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {experienceMode === 'exotics' && (
                    /* Mis Exóticos */
                    <div style={{ background: 'var(--game-card-bg, #ffffff)', borderRadius: '16px', padding: '20px', border: 'var(--game-border, 1px solid #f0f0f0)', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #fff8e1', paddingBottom: '8px', width: '100%', boxSizing: 'border-box' }}>
                        <h2 style={{ margin: '0', fontSize: '17px', color: '#ff8f00', fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)' }}>🦎 Mis Animales Exóticos</h2>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                        {exoticos.length === 0 ? (
                          <p style={{ fontSize: '12px', color: 'var(--game-text, #888)', fontStyle: 'italic', textAlign: 'center', padding: '12px', fontFamily: 'var(--game-font, sans-serif)' }}>No hay animales exóticos registrados.</p>
                        ) : (
                          exoticos.map(e => (
                            <Suspense key={e.id} fallback={<ChunkLoader height="80px" />}>
                              <ExoticCard
                                exotico={e}
                                onUpdate={refreshData}
                                onOpenScanner={(mode, assetId) => {
                                  setScannerMode(mode);
                                  setScannerAssetId(assetId);
                                  setShowScanner(true);
                                }}
                                isExpanded={expandedCardId === e.id}
                                onToggleExpand={() => setExpandedCardId(expandedCardId === e.id ? null : e.id)}
                              />
                            </Suspense>
                          ))
                        )}
                      </div>
                    </div>
                  )}



                </div>

                {/* Calendario e Información de Viaje */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                  <Suspense fallback={<ChunkLoader height="160px" />}>
                    <EcosystemCalendar 
                      plantas={plantas}
                      mascotas={mascotas}
                      onUpdate={refreshData} 
                    />
                  </Suspense>

                  <Suspense fallback={<ChunkLoader height="160px" />}>
                    <VacationAdvice mode={experienceMode} />
                  </Suspense>
                </div>

              </div>
            )}



            {/* 2.4 Tab Consultor IA Filtrado */}
            {activeTab === 'consultants' && (
              <Suspense fallback={<ChunkLoader height="300px" />}>
                <IAConsultantsView 
                  forceConsultant={
                    experienceMode === 'pets' 
                      ? 'veterinario' 
                      : experienceMode === 'exotics' 
                      ? 'exoticos' 
                      : 'agronomo'
                  } 
                  hideSelector={true} 
                  onNavigateToAsset={handleNavigateToAsset}
                />
              </Suspense>
            )}

            {/* 2.6 Tab Ajustes */}
            {activeTab === 'settings' && (
              <div style={{
                background: 'var(--game-card-bg, #ffffff)',
                borderRadius: '16px',
                padding: '32px 24px',
                border: 'var(--game-border, 1px solid #f0f0f0)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                maxWidth: '800px',
                margin: '0 auto',
                boxShadow: 'var(--shadow, 0 4px 20px rgba(0,0,0,0.02))'
              }}>
                <div>
                  <h2 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '24px', 
                    color: 'var(--game-text-bright, #1a1a1a)', 
                    fontWeight: 'bold',
                    fontFamily: 'var(--game-font, sans-serif)'
                  }}>
                    ⚙️ Ajustes del Sistema
                  </h2>
                  <p style={{ margin: '0', fontSize: '14px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)' }}>
                    Configura y personaliza la interfaz visual y la sincronización de tu ecosistema.
                  </p>
                </div>

                {/* SELECCIÓN DE TEMAS COMPACTA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--game-text-bright, #1a1a1a)' }}>Temas del Sistema</span>
                  <div className="theme-buttons-container" style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    {/* Tema 1: Nature */}
                    <div 
                      className="theme-button-item"
                      onClick={() => setUiTheme('nature')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setUiTheme('nature');
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      style={{
                        padding: '10px 16px',
                        background: uiTheme === 'nature' ? 'var(--game-accent-light, rgba(76, 175, 80, 0.1))' : 'transparent',
                        borderRadius: '10px',
                        border: uiTheme === 'nature' 
                          ? '2px solid var(--game-border-color, #2e7d32)' 
                          : '1px solid rgba(128, 128, 128, 0.3)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>🌿</span>
                      <strong style={{ fontSize: '13px', color: 'var(--game-text-bright, #111)', fontFamily: 'var(--game-font, sans-serif)' }}>Nature</strong>
                    </div>

                    {/* Tema 2: Kawaii */}
                    <div 
                      className="theme-button-item"
                      onClick={() => setUiTheme('kawaii')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setUiTheme('kawaii');
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      style={{
                        padding: '10px 16px',
                        background: uiTheme === 'kawaii' ? 'var(--game-accent-light, rgba(255, 182, 193, 0.25))' : 'transparent',
                        borderRadius: 'var(--game-radius, 12px)',
                        border: uiTheme === 'kawaii' 
                          ? '2px dashed var(--game-border-color, #ffb6c1)' 
                          : '1px solid rgba(128, 128, 128, 0.3)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>✨</span>
                      <strong style={{ fontSize: '13px', color: 'var(--game-text-bright, #ff6b8b)', fontFamily: 'var(--game-font, sans-serif)' }}>Kawaii</strong>
                    </div>

                    {/* Tema 3: Gaming */}
                    <div 
                      className="theme-button-item"
                      onClick={() => setUiTheme('gaming')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setUiTheme('gaming');
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      style={{
                        padding: '10px 16px',
                        background: uiTheme === 'gaming' ? 'var(--game-accent-light, rgba(102, 252, 241, 0.1))' : 'transparent',
                        borderRadius: '10px',
                        border: uiTheme === 'gaming' 
                          ? '2px solid var(--game-border-color, #66fcf1)' 
                          : '1px solid rgba(128, 128, 128, 0.3)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>🎮</span>
                      <strong style={{ fontSize: '13px', color: 'var(--game-text-bright, #111)', fontFamily: 'var(--game-font, sans-serif)' }}>Gaming</strong>
                    </div>
                  </div>
                </div>

                {/* SINCRONIZACIÓN GPS SATÉLITE GLOBAL */}
                <div style={{
                  borderTop: 'var(--game-border, 1px solid #f0f0f0)',
                  paddingTop: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div>
                    <h3 style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '18px', 
                      color: 'var(--game-text-bright, #1a1a1a)', 
                      fontWeight: 'bold',
                      fontFamily: 'var(--game-font, sans-serif)'
                    }}>
                      🛰️ Sincronización GPS Satélite Climática
                    </h3>
                    <p style={{ margin: '0', fontSize: '13px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)', lineHeight: '1.4' }}>
                      Calcula automáticamente el intervalo de riego óptimo para todas tus plantas a la vez, utilizando tu ubicación exacta y los sensores satelitales en vivo de Open-Meteo.
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                    <button
                      onClick={sincronizarTodasLasPlantasPorGPS}
                      disabled={loadingGPS}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontFamily: 'var(--game-font, sans-serif)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {loadingGPS ? 'Sincronizando todo...' : 'Sincronizar todo el Ecosistema por Satélite 🛰️'}
                    </button>
                    {gpsSyncSuccess && (
                      <span style={{ fontSize: '12px', color: '#2e7d32', fontWeight: 'bold' }}>✓ {gpsSyncSuccess}</span>
                    )}
                  </div>
                </div>

                {/* GRUPO HOGAR (SINCRONIZACIÓN FAMILIAR) */}
                <div style={{
                  borderTop: 'var(--game-border, 1px solid #f0f0f0)',
                  paddingTop: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <div>
                    <h3 style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '18px', 
                      color: 'var(--game-text-bright, #1a1a1a)', 
                      fontWeight: 'bold',
                      fontFamily: 'var(--game-font, sans-serif)'
                    }}>
                      🏠 Grupo Hogar (Sincronización en la Nube)
                    </h3>
                    <p style={{ margin: '0', fontSize: '13px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)', lineHeight: '1.4' }}>
                      Comparte el estado de tus mascotas, riegos y clínica veterinaria en tiempo real con tu familia y cuidadores.
                    </p>
                    {!isCloudEnabled && (
                      <div style={{
                        marginTop: '8px',
                        fontSize: '11px',
                        color: 'var(--game-accent, #2196f3)',
                        fontFamily: 'var(--game-font, monospace)',
                        background: 'var(--game-accent-light, rgba(33, 150, 243, 0.1))',
                        padding: '6px 12px',
                        borderRadius: 'var(--game-radius, 6px)',
                        border: 'var(--game-border, 1px solid rgba(33, 150, 243, 0.3))'
                      }}>
                        ⚡ Modo Sincronización en vivo disponible a través de Firestore.
                      </div>
                    )}
                  </div>

                  {hogarId ? (
                    // Conectado a un Hogar
                    <div style={{
                      padding: '20px',
                      background: 'var(--game-accent-light, #f5f5f5)',
                      borderRadius: 'var(--game-radius, 12px)',
                      border: 'var(--game-border, 1.5px solid var(--game-border-color, #eaeaea))',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}>
                      <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--game-text, #888)', fontWeight: 'bold', fontFamily: 'var(--game-font, monospace)' }}>Hogar Activo</span>
                          <h4 style={{ margin: '0', fontSize: '20px', color: 'var(--game-text-bright, #333)', fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)' }}>{hogarNombre}</h4>
                        </div>
                        <span style={{
                          fontSize: '11px',
                          background: syncStatus === 'synced' ? '#e8f5e9' : syncStatus === 'syncing' ? '#fff3e0' : '#ffebee',
                          color: syncStatus === 'synced' ? '#2e7d32' : syncStatus === 'syncing' ? '#e65100' : '#c62828',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontFamily: 'var(--game-font, sans-serif)'
                        }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: syncStatus === 'synced' ? '#4caf50' : syncStatus === 'syncing' ? '#ff9800' : '#f44336',
                            display: 'inline-block'
                          }} />
                          {syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Error de Sincro'}
                        </span>
                      </div>

                      <div style={{
                        padding: '12px',
                        background: 'var(--game-bg, #ffffff)',
                        border: 'var(--game-border, 1px solid #e0e0e0)',
                        borderRadius: 'var(--game-radius, 8px)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div>
                          <p style={{ margin: '0', fontSize: '11px', color: 'var(--game-text, #666)' }}>Código de invitación para tu familia:</p>
                          <strong style={{ fontSize: '16px', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, monospace)' }}>{hogarId}</strong>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(hogarId);
                            dispararLogroVisual("CÓDIGO COPIADO", "Compártelo con tu familia por chat", 'lvl_up');
                          }}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--game-accent, #1a1a1a)',
                            color: uiTheme === 'gaming' ? '#000' : '#fff',
                            border: 'none',
                            borderRadius: uiTheme === 'gaming' ? '0px' : '6px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontFamily: 'var(--game-font, sans-serif)'
                          }}
                        >
                          Copiar Código
                        </button>
                      </div>

                      <button
                        onClick={desvincularHogar}
                        style={{
                          alignSelf: 'flex-start',
                          padding: '8px 16px',
                          background: 'transparent',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          borderRadius: 'var(--game-radius, 8px)',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontFamily: 'var(--game-font, sans-serif)',
                          transition: 'all 0.2s'
                        }}
                      >
                        Desvincular Grupo Hogar 🚪
                      </button>
                    </div>
                  ) : (
                    // No conectado (Crear o Unirse)
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '20px'
                    }}>
                      {/* Crear Hogar */}
                      <form onSubmit={crearHogar} style={{
                        padding: '20px',
                        background: 'var(--game-card-bg, #fff)',
                        border: 'var(--game-border, 1px solid #eaeaea)',
                        borderRadius: uiTheme === 'gaming' ? '0px' : '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <h4 style={{ margin: '0', fontSize: '15px', color: 'var(--game-text-bright, #333)', fontWeight: 'bold' }}>Crear Nuevo Grupo Hogar</h4>
                        <p style={{ margin: '0', fontSize: '11px', color: 'var(--game-text, #777)', lineHeight: '1.4' }}>
                          Sube tu base de datos actual y genera un código de invitación único.
                        </p>
                        <input
                          type="text"
                          placeholder="Nombre del Hogar (Ej. Casa Lorenzo)"
                          value={nuevoHogarNombre}
                          onChange={(e) => setNuevoHogarNombre(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            background: 'var(--game-bg, #fff)',
                            color: 'var(--game-text-bright, #333)',
                            border: 'var(--game-border, 1px solid #ccc)',
                            borderRadius: uiTheme === 'gaming' ? '0px' : '6px',
                            fontSize: '12px',
                            outline: 'none',
                            fontFamily: 'var(--game-font, sans-serif)'
                          }}
                        />
                        <button
                          type="submit"
                          disabled={syncStatus === 'syncing'}
                          style={{
                            padding: '10px',
                            background: 'var(--game-accent, #2e7d32)',
                            color: uiTheme === 'gaming' ? '#000' : '#fff',
                            border: 'none',
                            borderRadius: uiTheme === 'gaming' ? '0px' : '6px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontFamily: 'var(--game-font, sans-serif)'
                          }}
                        >
                          {syncStatus === 'syncing' ? 'Creando...' : 'Crear y Subir Base de Datos 🏠'}
                        </button>
                      </form>

                      {/* Unirse a Hogar */}
                      <form onSubmit={unirseAHogar} style={{
                        padding: '20px',
                        background: 'var(--game-card-bg, #fff)',
                        border: 'var(--game-border, 1px solid #eaeaea)',
                        borderRadius: uiTheme === 'gaming' ? '0px' : '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <h4 style={{ margin: '0', fontSize: '15px', color: 'var(--game-text-bright, #333)', fontWeight: 'bold' }}>Unirse a un Grupo Hogar Existente</h4>
                        <p style={{ margin: '0', fontSize: '11px', color: 'var(--game-text, #777)', lineHeight: '1.4' }}>
                          Introduce el código compartido para descargar la base de datos y unirte al grupo.
                        </p>
                        <input
                          type="text"
                          placeholder="Código: HOGAR-XXXX-XXXX"
                          value={joinHogarId}
                          onChange={(e) => setJoinHogarId(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            background: 'var(--game-bg, #fff)',
                            color: 'var(--game-text-bright, #333)',
                            border: 'var(--game-border, 1px solid #ccc)',
                            borderRadius: uiTheme === 'gaming' ? '0px' : '6px',
                            fontSize: '12px',
                            outline: 'none',
                            fontFamily: 'var(--game-font, monospace)'
                          }}
                        />
                        <button
                          type="submit"
                          disabled={syncStatus === 'syncing'}
                          style={{
                            padding: '10px',
                            background: 'var(--game-accent, #1976d2)',
                            color: uiTheme === 'gaming' ? '#000' : '#fff',
                            border: 'none',
                            borderRadius: uiTheme === 'gaming' ? '0px' : '6px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontFamily: 'var(--game-font, sans-serif)'
                          }}
                        >
                          {syncStatus === 'syncing' ? 'Vinculando...' : 'Unirse y Descargar Datos 🔌'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* CLAVE API DE GEMINI */}
                <div style={{
                  borderTop: 'var(--game-border, 1px solid #f0f0f0)',
                  paddingTop: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div>
                    <h3 style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '18px', 
                      color: 'var(--game-text-bright, #1a1a1a)', 
                      fontWeight: 'bold',
                      fontFamily: 'var(--game-font, sans-serif)'
                    }}>
                      🔑 Clave API de Gemini Personal
                    </h3>
                    <p style={{ margin: '0', fontSize: '13px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)', lineHeight: '1.4' }}>
                      Evita el límite de cuota diario de la clave pública añadiendo tu propia clave API gratuita de Google Gemini. Tus datos se guardan localmente en tu navegador de forma segura.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', maxWidth: '500px' }}>
                    <input
                      type={showApiKey ? "text" : "password"}
                      placeholder="AIzaSy..."
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: 'var(--game-bg, #fff)',
                        color: 'var(--game-text-bright, #333)',
                        border: 'var(--game-border, 1px solid #ccc)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        outline: 'none',
                        fontFamily: 'monospace'
                      }}
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      type="button"
                      style={{
                        padding: '10px',
                        background: 'rgba(0,0,0,0.05)',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                      title={showApiKey ? "Ocultar clave" : "Mostrar clave"}
                    >
                      {showApiKey ? "👁️" : "🙈"}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => {
                        if (customApiKey.trim()) {
                          localStorage.setItem('petplant_gemini_api_key', customApiKey.trim());
                          dispararLogroVisual("CLAVE API GUARDADA", "Usando tu clave personal de Gemini", 'lvl_up');
                        } else {
                          localStorage.removeItem('petplant_gemini_api_key');
                          dispararLogroVisual("CLAVE REMOVIDA", "Usando clave de demostración por defecto", 'victory');
                        }
                      }}
                      style={{
                        padding: '10px 20px',
                        background: 'var(--game-accent, #1976d2)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontFamily: 'var(--game-font, sans-serif)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                      }}
                    >
                      Guardar Clave API
                    </button>
                    {localStorage.getItem('petplant_gemini_api_key') && (
                      <button
                        onClick={() => {
                          localStorage.removeItem('petplant_gemini_api_key');
                          setCustomApiKey('');
                          dispararLogroVisual("CLAVE REMOVIDA", "Usando clave de demostración por defecto", 'victory');
                        }}
                        style={{
                          padding: '10px 20px',
                          background: 'transparent',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontFamily: 'var(--game-font, sans-serif)'
                        }}
                      >
                        Eliminar Clave
                      </button>
                    )}
                  </div>
                </div>

                {/* SESIÓN DE USUARIO EN LA NUBE */}
                <div style={{
                  borderTop: 'var(--game-border, 1px solid #f0f0f0)',
                  paddingTop: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div>
                    <h3 style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '18px', 
                      color: 'var(--game-text-bright, #1a1a1a)', 
                      fontWeight: 'bold',
                      fontFamily: 'var(--game-font, sans-serif)'
                    }}>
                      🔑 Sesión en la Nube
                    </h3>
                    {user ? (
                      <p style={{ margin: '0', fontSize: '13px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)' }}>
                        Conectado con cuenta de {localStorage.getItem('petplant_login_provider') === 'microsoft' ? 'Microsoft / Hotmail' : 'Google'} como <strong>{user.name}</strong> ({user.email})
                      </p>
                    ) : (
                      <p style={{ margin: '0', fontSize: '13px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)' }}>
                        No has iniciado sesión. Tus datos se guardan de forma local en tu navegador. Inicia sesión para guardar tus datos de forma segura en la nube.
                      </p>
                    )}
                  </div>
                  {user ? (
                    <button
                      onClick={handleLogout}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '10px 20px',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontFamily: 'var(--game-font, sans-serif)'
                      }}
                    >
                      Cerrar Sesión 🚪
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        onClick={handleGoogleSignIn}
                        style={{
                          padding: '10px 20px',
                          background: '#4285F4',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontFamily: 'var(--game-font, sans-serif)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 10px rgba(66, 133, 244, 0.2)'
                        }}
                      >
                        Iniciar Sesión con Google 🔑
                      </button>
                      <button
                        onClick={handleMicrosoftSignIn}
                        style={{
                          padding: '10px 20px',
                          background: '#2F2F2F',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontFamily: 'var(--game-font, sans-serif)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 23 23" style={{ flexShrink: 0 }}>
                          <rect x="0" y="0" width="10.5" height="10.5" fill="#f25022"/>
                          <rect x="11.5" y="0" width="10.5" height="10.5" fill="#7fba00"/>
                          <rect x="0" y="11.5" width="10.5" height="10.5" fill="#00a4ef"/>
                          <rect x="11.5" y="11.5" width="10.5" height="10.5" fill="#ffb900"/>
                        </svg>
                        Iniciar Sesión con Microsoft / Hotmail 🔑
                      </button>
                    </div>
                  )}
                </div>

                {/* APLICACIÓN DE ESCRITORIO Y MÓVIL (PWA) */}
                <div style={{
                  borderTop: 'var(--game-border, 1px solid #f0f0f0)',
                  paddingTop: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div>
                    <h3 style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '18px', 
                      color: 'var(--game-text-bright, #1a1a1a)', 
                      fontWeight: 'bold',
                      fontFamily: 'var(--game-font, sans-serif)'
                    }}>
                      📱 Aplicación de Escritorio y Móvil
                    </h3>
                    {deferredPrompt ? (
                      <>
                        <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)', lineHeight: '1.4' }}>
                          Instala Pet & Plant Pro directamente en tu dispositivo para un acceso rápido y soporte completo sin conexión.
                        </p>
                        <button
                          onClick={handleInstallPWA}
                          style={{
                            alignSelf: 'flex-start',
                            padding: '10px 20px',
                            background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontFamily: 'var(--game-font, sans-serif)',
                            boxShadow: '0 4px 12px rgba(46, 125, 50, 0.15)',
                            transition: 'all 0.2s'
                          }}
                        >
                          Instalar Aplicación en Dispositivo 📲
                        </button>
                      </>
                    ) : (
                      <p style={{ margin: '0', fontSize: '13px', color: '#2e7d32', fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ✓ Aplicación instalada o funcionando en modo standalone de pantalla de inicio.
                      </p>
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>

          {showScanner && (
            <Suspense fallback={<ChunkLoader height="200px" />}>
              <ScannerModal 
                onClose={() => {
                  setShowScanner(false);
                  setScannerMode(null);
                  setScannerAssetId(null);
                }} 
                mascotas={mascotas}
                plantas={plantas}
                exoticos={exoticos}
                onUpdate={refreshData}
                forcedMode={scannerMode || undefined}
                forcedAssetId={scannerAssetId || undefined}
              />
            </Suspense>
          )}

          {showManualRegister && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999,
              padding: '16px',
              overflowY: 'auto',
              overflowX: 'hidden'
            }}>
              <Suspense fallback={<ChunkLoader height="200px" />}>
                {showManualRegister === 'pet' ? (
                  <ManualPetForm 
                    onClose={() => setShowManualRegister(null)}
                    onUpdate={refreshData}
                  />
                ) : showManualRegister === 'exotic' ? (
                  <ManualExoticForm
                    onClose={() => setShowManualRegister(null)}
                    onUpdate={refreshData}
                  />
                ) : (
                  <ManualPlantForm
                    onClose={() => setShowManualRegister(null)}
                    onUpdate={refreshData}
                  />
                )}
              </Suspense>
            </div>
          )}

          {dbError && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px'
            }}>
              <div style={{
                background: 'var(--game-card-bg, #ffffff)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '440px',
                padding: '24px',
                position: 'relative',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                border: '2px solid #ef4444',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '16px'
                }}>
                  ⚠️
                </div>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#ef4444',
                  fontFamily: 'var(--game-font, sans-serif)'
                }}>
                  Error de Almacenamiento
                </h3>
                <p style={{
                  margin: '0 0 20px 0',
                  fontSize: '14px',
                  color: 'var(--game-text, #4b5563)',
                  lineHeight: '1.5',
                  fontFamily: 'var(--game-font, sans-serif)'
                }}>
                  {dbError}
                </p>
                <button
                  onClick={() => setDbError(null)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)',
                    transition: 'background 0.2s',
                    fontFamily: 'var(--game-font, sans-serif)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                >
                  Entendido
                </button>
              </div>
            </div>
          )}



        </div>
      )}



    </div>
  );
};
