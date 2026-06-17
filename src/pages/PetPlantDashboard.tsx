/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { LocalDatabase } from '../database/db';
import type { Mascota, Planta, AnimalExotico, EventoCalendario } from '../database/types';
import { initFirebase, getFirebaseCached } from '../database/firebaseLazy';
import { MicrosoftSyncService } from '../services/microsoftSync';
import { NotificationManager } from '../utils/notificationManager';
import { usePWAManager } from '../hooks/usePWAManager';
import { useGPSWeather } from '../hooks/useGPSWeather';
import { useTranslations } from '../utils/i18n';
import { ExtremeWeatherPanel } from '../components/ExtremeWeatherPanel';


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
const LandingView        = lazy(() => import('../components/LandingView').then(m => ({ default: m.LandingView })));
const SettingsView       = lazy(() => import('../components/SettingsView').then(m => ({ default: m.SettingsView })));

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


const isDatabaseDefaultDemo = (mascotas: Mascota[], plantas: Planta[], exoticos: AnimalExotico[]) => {
  if (mascotas.length > 1 || plantas.length > 1 || exoticos.length > 0) {
    return false;
  }
  if (mascotas.length === 1 && mascotas[0].id !== 'mascota-luna-id') {
    return false;
  }
  if (plantas.length === 1 && plantas[0].id !== 'planta-fern-id') {
    return false;
  }
  return true;
};

export const PetPlantDashboard: React.FC = () => {
  const { t } = useTranslations();
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



  const [climaActual, setClimaActual] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('petplant_last_gps_weather');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [exoticos, setExoticos] = useState<AnimalExotico[]>([]);
  

  const getAccentColor = () => {
    if (experienceMode === 'pets') return '#1976d2';
    if (experienceMode === 'exotics') return '#ff8f00';
    if (experienceMode === 'travels') return '#0284c7';
    if (experienceMode === 'consultants') return '#7b1fa2';
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

  const {
    deferredPrompt,
    isOffline,
    dismissedInstallBanner,
    setDismissedInstallBanner,
    networkNotification,
    handleInstallPWA
  } = usePWAManager();

  const {
    loadingGPS,
    gpsSyncSuccess,
    gpsSyncEnabled,
    handleGPSToggle,
    sincronizarTodasLasPlantasPorGPS
  } = useGPSWeather(refreshData);

  // Modo de Experiencia: 'landing', 'pets', 'plants', 'exotics', 'travels', 'consultants'
  const [experienceMode, setExperienceMode] = useState<'landing' | 'pets' | 'plants' | 'exotics' | 'travels' | 'consultants'>('landing');
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



  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (showManualRegister) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [showManualRegister]);



  const [uiTheme, setUiTheme] = useState<'gaming' | 'nature' | 'kawaii'>(() => {
    const saved = localStorage.getItem('petplant_game_theme');
    return (saved === 'gaming' || saved === 'nature' || saved === 'kawaii')
      ? saved as 'gaming' | 'nature' | 'kawaii'
      : 'nature';
  });

  const lastSyncedThemeRef = useRef<string | null>(null);
  const isInitialThemeMount = useRef(true);

  useEffect(() => {
    localStorage.setItem('petplant_game_theme', uiTheme);

    if (isInitialThemeMount.current) {
      isInitialThemeMount.current = false;
      return;
    }

    if (lastSyncedThemeRef.current === uiTheme) {
      lastSyncedThemeRef.current = null;
      return;
    }

    const activeHogar = localStorage.getItem('petplant_hogar_id');
    if (activeHogar && localStorage.getItem('petplant_login_provider') === 'google') {
      refreshData(true);
    }
  }, [uiTheme]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Limpieza agresiva de Service Workers y cachés antiguas para corregir fichas en móviles
  // Adicionalmente redirigimos si el usuario está en una URL de previsualización antigua de Vercel
  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname.endsWith('.vercel.app') && hostname !== 'pet-plant-app.vercel.app') {
      window.location.replace('https://pet-plant-app.vercel.app' + window.location.pathname + window.location.search);
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registrado con éxito en scope:', reg.scope);
        })
        .catch((err) => {
          console.error('Error al registrar Service Worker:', err);
        });
    }

    import('../services/syncQueue').then(({ SyncQueueService }) => {
      SyncQueueService.processQueue().catch((err) => {
        console.error('Error al procesar cola de sincronización inicial:', err);
      });
    });

    NotificationManager.checkAndTriggerPendingNotifications().catch((err) => {
      console.error('Error al procesar notificaciones programadas iniciales:', err);
    });
  }, []);



  // Estados para Grupo Hogar (Moved to top of component to prevent TDZ errors)

  const renderConnectivityIndicator = () => {
    let ledColor: string;
    let text: string;
    let isPulsing: boolean;
    let titleTip: string;

    if (isOffline) {
      ledColor = '#f44336'; // Red
      text = 'Offline';
      isPulsing = true;
      titleTip = 'Sin conexión a internet. Funcionando en modo local.';
    } else {
      // Online
      if (!hogarId) {
        ledColor = '#2196f3'; // Blue (Online, local database only)
        text = 'Online (Local)';
        isPulsing = false;
        titleTip = 'Conectado a internet. Datos guardados localmente. Configura la nube en Ajustes para sincronizar.';
      } else {
        // Connected to Cloud
        if (syncStatus === 'synced') {
          ledColor = '#4caf50'; // Green
          text = 'Nube OK';
          isPulsing = true;
          titleTip = 'Sincronizado con la nube de forma segura.';
        } else if (syncStatus === 'syncing') {
          ledColor = '#ff9800'; // Amber/Orange
          text = 'Sincronizando...';
          isPulsing = true;
          titleTip = 'Subiendo o descargando cambios en tiempo real...';
        } else if (syncStatus === 'error') {
          ledColor = '#f44336'; // Red
          text = 'Error Nube';
          isPulsing = true;
          titleTip = 'Error al sincronizar con la nube. Se reintentará automáticamente.';
        } else {
          ledColor = '#4caf50'; // Green
          text = 'Conectado';
          isPulsing = false;
          titleTip = 'Conectado al grupo hogar.';
        }
      }
    }

    return (
      <div 
        title={titleTip}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          background: uiTheme === 'gaming' ? 'rgba(0,0,0,0.4)' : 'rgba(255, 255, 255, 0.7)',
          border: uiTheme === 'gaming' ? '1px solid var(--game-border-color)' : '1px solid #eaeaea',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 'bold',
          color: 'var(--game-text-bright, #333)',
          fontFamily: 'var(--game-font, sans-serif)',
          cursor: 'help',
          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
          transition: 'all 0.3s ease',
          margin: '4px 0'
        }}
      >
        <span 
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: ledColor,
            boxShadow: `0 0 8px ${ledColor}`,
            display: 'inline-block',
            animation: isPulsing ? 'ledPulse 1.5s infinite alternate' : 'none'
          }} 
        />
        <span>{text}</span>
      </div>
    );
  };

  const dispararLogroVisual = (texto: string, subtitulo: string, tipo: 'lvl_up' | 'victory') => {
    // No-op para desactivar mensajes de level up
    void texto;
    void subtitulo;
    void tipo;
  };

  const notificadosRef = useRef<Set<string>>(new Set());

  const evaluarRecordatoriosYPendientes = async () => {
    try {
      const listEventos: EventoCalendario[] = await LocalDatabase.getEventosCalendario();
      
      const mañana = new Date();
      mañana.setDate(mañana.getDate() + 1);
      const añoM = mañana.getFullYear();
      const mesM = String(mañana.getMonth() + 1).padStart(2, '0');
      const diaM = String(mañana.getDate()).padStart(2, '0');
      const mañanaStr = `${añoM}-${mesM}-${diaM}`;

      const eventosMañana = listEventos.filter(ev => 
        ev.fecha === mañanaStr && 
        !ev.completado && 
        !notificadosRef.current.has(ev.id)
      );

      const hoy = new Date();
      const añoH = hoy.getFullYear();
      const mesH = String(hoy.getMonth() + 1).padStart(2, '0');
      const diaH = String(hoy.getDate()).padStart(2, '0');
      const hoyStr = `${añoH}-${mesH}-${diaH}`;

      const eventosHoy = listEventos.filter(ev => 
        ev.fecha === hoyStr && 
        !ev.completado && 
        !notificadosRef.current.has(ev.id)
      );

      const listPlantas = await LocalDatabase.getPlantas();
      const listExoticos = await LocalDatabase.getExoticos();

      const hoyInicioDia = new Date();
      hoyInicioDia.setHours(0, 0, 0, 0);

      const plantasPendientes = listPlantas.filter(p => {
        if (!p.proximaFechaRiego) return false;
        const prox = new Date(p.proximaFechaRiego);
        prox.setHours(0, 0, 0, 0);
        return prox <= hoyInicioDia && !notificadosRef.current.has(`riego-${p.id}`);
      });

      const exoticosPendientes = listExoticos.filter(ex => {
        if (!ex.ultimaAlimentacion || !ex.intervaloAlimentacionDias) return false;
        const ult = new Date(ex.ultimaAlimentacion);
        ult.setHours(0, 0, 0, 0);
        const proxAlimentacion = new Date(ult.getTime() + ex.intervaloAlimentacionDias * 24 * 3600 * 1000);
        proxAlimentacion.setHours(0, 0, 0, 0);
        return proxAlimentacion <= hoyInicioDia && !notificadosRef.current.has(`alimentacion-${ex.id}`);
      });

      const totalAlertas = eventosMañana.length + eventosHoy.length + plantasPendientes.length + exoticosPendientes.length;
      if (totalAlertas === 0) return;

      const permisoConcedido = await NotificationManager.requestPermission();
      if (!permisoConcedido) return;

      for (const ev of eventosHoy) {
        notificadosRef.current.add(ev.id);
        let prefijo = '📅 Recordatorio Hoy';
        if (ev.categoria === 'veterinario') prefijo = '🐾 Veterinaria Hoy';
        else if (ev.categoria === 'riego') prefijo = '💧 Riego Hoy';
        else if (ev.categoria === 'medicacion') prefijo = '💊 Medicación Hoy';
        else if (ev.categoria === 'abono') prefijo = '🌿 Abono Hoy';

        await NotificationManager.sendNotification(
          prefijo,
          ev.texto
        );
      }

      for (const ev of eventosMañana) {
        notificadosRef.current.add(ev.id);
        let prefijo = '📅 Recordatorio Mañana';
        if (ev.categoria === 'veterinario') prefijo = '🐾 Veterinaria Mañana';
        else if (ev.categoria === 'riego') prefijo = '💧 Riego Mañana';
        else if (ev.categoria === 'medicacion') prefijo = '💊 Medicación Mañana';
        else if (ev.categoria === 'abono') prefijo = '🌿 Abono Mañana';

        await NotificationManager.sendNotification(
          prefijo,
          ev.texto
        );
      }

      for (const p of plantasPendientes) {
        notificadosRef.current.add(`riego-${p.id}`);
        await NotificationManager.sendNotification(
          `💧 Riego Pendiente`,
          `¡Es hora de regar tu ${p.nombreComun}! (${p.ubicacionHabitacion})`
        );
      }

      for (const ex of exoticosPendientes) {
        notificadosRef.current.add(`alimentacion-${ex.id}`);
        await NotificationManager.sendNotification(
          `🦎 Alimentación Pendiente`,
          `¡Es hora de alimentar a ${ex.nombre} (${ex.tipoEspecifico})!`
        );
      }
    } catch (err) {
      console.warn("Error al evaluar recordatorios y tareas pendientes:", err);
    }
  };

  const exportarCopiaSeguridad = async () => {
    try {
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

      const backupData = {
        mascotas: listMascotas,
        plantas: listPlantas,
        exoticos: listExoticos,
        eventos: listEventos,
        chats: chats,
        exportadoEn: new Date().toISOString(),
        version: 2
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fechaStr = new Date().toISOString().slice(0, 10);
      a.download = `copia-seguridad-ecosistema-${fechaStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert("Copia de seguridad exportada con éxito. Revisa tus descargas.");
    } catch (err) {
      console.error("Fallo al exportar copia de seguridad:", err);
      alert("Error al exportar la copia de seguridad. Revisa la consola para más detalles.");
    }
  };

  const importarCopiaSeguridad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmacion = window.confirm(
      "ATENCIÓN: Importar esta copia de seguridad sobrescribirá todos tus datos locales de mascotas, plantas, exóticos, eventos de calendario y chats. ¿Seguro que deseas continuar?"
    );
    if (!confirmacion) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const data = JSON.parse(content);

        // Validación básica
        if (!data || (!Array.isArray(data.mascotas) && !Array.isArray(data.plantas) && !Array.isArray(data.exoticos))) {
          throw new Error("El archivo JSON no tiene un formato de copia de seguridad válido.");
        }

        const importMascotas = Array.isArray(data.mascotas) ? data.mascotas : [];
        const importPlantas = Array.isArray(data.plantas) ? data.plantas : [];
        const importExoticos = Array.isArray(data.exoticos) ? data.exoticos : [];
        const importEventos = Array.isArray(data.eventos) ? data.eventos : [];
        const importChats = Array.isArray(data.chats) ? data.chats : [];

        await LocalDatabase.overwriteFullDatabase(
          importMascotas,
          importPlantas,
          importExoticos,
          importEventos,
          importChats
        );

        await refreshData(true);
        alert("¡Copia de seguridad importada correctamente!");
      } catch (err: any) {
        console.error("Error al importar copia de seguridad:", err);
        alert(`Fallo al importar: ${err.message || 'Formato de archivo inválido'}`);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  async function refreshData(isLocalEdit = true) {
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

      const savedClima = localStorage.getItem('petplant_last_gps_weather');
      if (savedClima) {
        try {
          setClimaActual(JSON.parse(savedClima));
        } catch (e) {
          console.error(e);
        }
      }

      // Sincronización automática tras cambios locales con Microsoft OneDrive
      if (isLocalEdit && localStorage.getItem('petplant_login_provider') === 'microsoft') {
        queueOneDriveSync();
      }

      // Sincronización automática tras cambios locales con Firebase
      const activeHogar = localStorage.getItem('petplant_hogar_id');
      if (activeHogar && !isRemoteSyncingRef.current && localStorage.getItem('petplant_login_provider') === 'google') {
        const activeNombre = localStorage.getItem('petplant_hogar_nombre') || "Hogar Sincronizado";
        setSyncStatus('syncing');
        const uploadPromise = getFirebaseCached()?.FirebaseSyncService.uploadChanges(activeHogar, activeNombre, listMascotas, listPlantas, listExoticos, uiTheme);
        if (uploadPromise) {
          uploadPromise
            .then(() => setSyncStatus('synced'))
            .catch((err: any) => {
              console.error("Error al sincronizar cambios locales:", err);
              setSyncStatus('error');
            });
        }
      }

      // Evaluar recordatorios de agenda y tareas pendientes de manera asíncrona
      evaluarRecordatoriosYPendientes();
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

              // Cargar hogar asociado en Firestore e iniciar sincronización bidireccional inmediata
              if (FirebaseSyncService.isCloudEnabled()) {
                try {
                  const userHogar = await FirebaseSyncService.getUserHogar(firebaseUser.uid);
                  const listMascotas = await LocalDatabase.getMascotas();
                  const listPlantas = await LocalDatabase.getPlantas();
                  const listExoticos = await LocalDatabase.getExoticos();

                  if (userHogar) {
                    const { hogarId: cloudHogarId, hogarNombre: cloudHogarNombre } = userHogar;

                    setJoinedHogares(prev => {
                      if (prev.some(x => x.id === cloudHogarId)) return prev;
                      const updated = [...prev, { id: cloudHogarId, nombre: cloudHogarNombre }];
                      localStorage.setItem('petplant_joined_hogares', JSON.stringify(updated));
                      return updated;
                    });

                    const localHogarId = localStorage.getItem('petplant_hogar_id') || '';

                    // Intentar recuperar los datos del hogar en la nube
                    const data = await FirebaseSyncService.getHogarData(cloudHogarId);

                    if (data) {
                      // Vincular siempre al hogar de la nube
                      localStorage.setItem('petplant_hogar_id', cloudHogarId);
                      localStorage.setItem('petplant_hogar_nombre', cloudHogarNombre);
                      setHogarId(cloudHogarId);
                      setHogarNombre(cloudHogarNombre);

                      const isLocalDemo = isDatabaseDefaultDemo(listMascotas, listPlantas, listExoticos);
                      const isCloudDemo = isDatabaseDefaultDemo(data.mascotas || [], data.plantas || [], data.exoticos || []);
                      const cloudHasRealData = !isCloudDemo && (data.mascotas?.length > 0 || data.plantas?.length > 0 || data.exoticos?.length > 0);

                      if (!isLocalDemo && isCloudDemo) {
                        // Local tiene datos reales, nube solo tiene demo → subir local a la nube
                        await FirebaseSyncService.uploadChanges(cloudHogarId, cloudHogarNombre, listMascotas, listPlantas, listExoticos, uiTheme);
                      } else if (cloudHasRealData) {
                        // La nube tiene datos reales → SIEMPRE descargar de la nube (fuente de verdad)
                        // Esto cubre el caso de borrar datos locales en el móvil
                        isRemoteSyncingRef.current = true;
                        await LocalDatabase.overwriteDatabase(data.mascotas || [], data.plantas || [], data.exoticos || []);
                        isRemoteSyncingRef.current = false;
                        await refreshData(false);
                      } else if (cloudHogarId !== localHogarId) {
                        // Hogar diferente y la nube está vacía → subir lo que haya en local
                        if (listMascotas.length > 0 || listPlantas.length > 0 || listExoticos.length > 0) {
                          await FirebaseSyncService.uploadChanges(cloudHogarId, cloudHogarNombre, listMascotas, listPlantas, listExoticos, uiTheme);
                        }
                      }

                      // Aplicar tema de la nube si existe y es válido
                      if (data.theme && (data.theme === 'nature' || data.theme === 'gaming' || data.theme === 'kawaii')) {
                        lastSyncedThemeRef.current = data.theme || null;
                        setUiTheme(data.theme);
                      }
                    } else {
                      // Si no hay datos en la nube para este hogarId pero tenemos datos locales, los subimos de inmediato
                      if (listMascotas.length > 0 || listPlantas.length > 0 || listExoticos.length > 0) {
                        await FirebaseSyncService.uploadChanges(cloudHogarId, cloudHogarNombre, listMascotas, listPlantas, listExoticos, uiTheme);
                      }
                    }
                  } else {
                    const localHogarId = localStorage.getItem('petplant_hogar_id') || '';
                    const localHogarNombre = localStorage.getItem('petplant_hogar_nombre') || 'Mi Hogar';
                    if (localHogarId) {
                      await FirebaseSyncService.saveUserHogar(firebaseUser.uid, localHogarId, localHogarNombre);
                      // Subir los datos locales actuales para asegurar que el hogar en la nube esté creado
                      await FirebaseSyncService.uploadChanges(localHogarId, localHogarNombre, listMascotas, listPlantas, listExoticos, uiTheme);
                    } else {
                      // Crear automáticamente un hogar nuevo si el usuario no tiene ninguno local ni remoto
                      const nuevoCodigo = await FirebaseSyncService.createHogar("Mi Hogar", listMascotas, listPlantas, listExoticos, uiTheme);
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
            }
          });

          return () => unsubscribe();
        });
      }
    };

    initSessions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

      const isLocalDemo = isDatabaseDefaultDemo(localMascotas, localPlantas, localExoticos);
      const isCloudDemo = isDatabaseDefaultDemo(data.mascotas || [], data.plantas || [], data.exoticos || []);

      // Solo sobreescribir si la actualización remota es estrictamente más nueva, si local está vacío, o si local es demo y la nube es real
      if (data.updatedAt > localLastUpdated || isLocalEmpty || (isLocalDemo && !isCloudDemo)) {
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

      // Aplicar el tema visual de la nube si existe y es diferente
      if (data.theme && (data.theme === 'nature' || data.theme === 'gaming' || data.theme === 'kawaii')) {
        setUiTheme(prevTheme => {
          if (prevTheme !== data.theme) {
            lastSyncedThemeRef.current = data.theme || null;
            return data.theme as 'nature' | 'gaming' | 'kawaii';
          }
          return prevTheme;
        });
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
      const code = await (getFirebaseCached()?.FirebaseSyncService ?? (await initFirebase()).FirebaseSyncService).createHogar(nuevoHogarNombre.trim(), mascotas, plantas, exoticos, uiTheme);
      setHogarId(code);
      setHogarNombre(nuevoHogarNombre.trim());
      localStorage.setItem('petplant_hogar_id', code);
      localStorage.setItem('petplant_hogar_nombre', nuevoHogarNombre.trim());

      const cachedFb = getFirebaseCached();
      if (cachedFb?.auth && cachedFb.auth.currentUser) {
        await cachedFb.FirebaseSyncService.saveUserHogar(cachedFb.auth.currentUser.uid, code, nuevoHogarNombre.trim());
      }

      const h = { id: code, nombre: nuevoHogarNombre.trim() };
      setJoinedHogares(prev => {
        const updated = [...prev.filter(x => x.id !== code), h];
        localStorage.setItem('petplant_joined_hogares', JSON.stringify(updated));
        return updated;
      });

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
        if (cachedFb2?.auth && cachedFb2.auth.currentUser) {
          await cachedFb2.FirebaseSyncService.saveUserHogar(cachedFb2.auth.currentUser.uid, cleanCode, data.nombre);
        }
        
        isRemoteSyncingRef.current = true;
        await LocalDatabase.overwriteDatabase(data.mascotas || [], data.plantas || [], data.exoticos || []);
        isRemoteSyncingRef.current = false;

        const h = { id: cleanCode, nombre: data.nombre };
        setJoinedHogares(prev => {
          const updated = [...prev.filter(x => x.id !== cleanCode), h];
          localStorage.setItem('petplant_joined_hogares', JSON.stringify(updated));
          return updated;
        });

        // Aplicar el tema visual si está presente en el hogar al que nos unimos
        if (data.theme && (data.theme === 'nature' || data.theme === 'gaming' || data.theme === 'kawaii')) {
          lastSyncedThemeRef.current = data.theme || null;
          setUiTheme(data.theme);
        }
        
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
    dispararLogroVisual("DESVINCULADO", "Revertido a base de datos local.", 'lvl_up');
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
        await refreshData(false);
        dispararLogroVisual("MODO LOCAL", "Cargada base de datos local.", 'lvl_up');
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
          data.exoticos || [],
          [],
          []
        );
        isRemoteSyncingRef.current = false;

        if (data.theme && (data.theme === 'nature' || data.theme === 'gaming' || data.theme === 'kawaii')) {
          lastSyncedThemeRef.current = data.theme;
          setUiTheme(data.theme);
        }

        setSyncStatus('synced');
        await refreshData(false);
        dispararLogroVisual("HOGAR CAMBIADO", `Conectado a: ${data.nombre}`, 'victory');
      } else {
        alert("No se pudieron descargar los datos del hogar seleccionado.");
        setSyncStatus('error');
      }
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
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
    } else {
      dispararLogroVisual("HOGAR REMOVIDO", "Se quitó de la lista de accesos rápidos.", 'lvl_up');
    }
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
      {/* Notificaciones flotantes de estado de red */}
      {networkNotification.message && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: networkNotification.type === 'offline' 
            ? 'rgba(239, 83, 80, 0.95)' 
            : 'rgba(76, 175, 80, 0.95)',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: uiTheme === 'gaming' ? '0px' : '30px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 'bold',
          animation: 'fadeInSlideDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          fontFamily: 'var(--game-font, sans-serif)',
          whiteSpace: 'nowrap'
        }}>
          <span>{networkNotification.message}</span>
        </div>
      )}

      {/* Banner flotante de instalación PWA */}
      {deferredPrompt && !dismissedInstallBanner && !isLoading && (
        <div style={{
          background: uiTheme === 'gaming' 
            ? 'rgba(26, 26, 26, 0.98)' 
            : (uiTheme === 'kawaii' ? 'rgba(255, 245, 247, 0.98)' : 'rgba(240, 248, 241, 0.98)'),
          border: uiTheme === 'gaming'
            ? '2px solid #66fcf1'
            : (uiTheme === 'kawaii' ? '2px solid #f48fb1' : '2px solid #81c784'),
          borderRadius: uiTheme === 'gaming' ? '0px' : '16px',
          padding: '16px 20px',
          margin: '0 auto 16px auto',
          maxWidth: '1000px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          animation: 'fadeInSlide 0.3s ease-out',
          position: 'relative',
          zIndex: 9999
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '240px' }}>
            <span style={{ fontSize: '28px' }}>📱</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
              <strong style={{ fontSize: '14px', color: 'var(--game-text-bright, #1a1a1a)' }}>
                Instalar Pet & Plant Pro
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--game-text, #666)' }}>
                Instala la aplicación en tu pantalla de inicio para acceso instantáneo y soporte offline completo.
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleInstallPWA}
              style={{
                padding: '8px 16px',
                background: 'var(--game-accent, #2e7d32)',
                color: uiTheme === 'gaming' ? '#000' : '#fff',
                border: 'none',
                borderRadius: uiTheme === 'gaming' ? '0px' : '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                fontFamily: 'var(--game-font, sans-serif)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Instalar 📲
            </button>
            <button
              onClick={() => setDismissedInstallBanner(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--game-text, #888)',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Descartar"
            >
              ✕
            </button>
          </div>
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
          justifyContent: 'space-between',
          gap: '24px',
          zIndex: 99999,
          opacity: isFading ? 0 : 1,
          transition: 'opacity 0.5s ease',
          color: uiTheme === 'gaming' ? '#ffffff' : (uiTheme === 'kawaii' ? '#b05273' : '#2e7d32'),
          fontFamily: 'var(--game-font, sans-serif)',
          textAlign: 'center',
          padding: '80px 24px 60px 24px',
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
        <Suspense fallback={<ChunkLoader height="300px" />}>
          <LandingView 
            uiTheme={uiTheme}
            setExperienceMode={setExperienceMode}
            setActiveTab={setActiveTab}
          />
        </Suspense>
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
                  <span style={{ fontSize: '24px' }}>{experienceMode === 'pets' ? '🐾' : experienceMode === 'exotics' ? '🦎' : experienceMode === 'travels' ? '✈️' : experienceMode === 'consultants' ? '💬' : '🌿'}</span>
                  <h1 style={{ margin: '0', fontSize: '20px', color: 'var(--game-text-bright, #1a1a1a)', fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)', textAlign: 'center' }}>
                    {experienceMode === 'pets' ? t('appTitlePets') : experienceMode === 'exotics' ? t('appTitleExotics') : experienceMode === 'travels' ? 'Guía de Viajes y Vacaciones' : experienceMode === 'consultants' ? 'Consultores de Inteligencia Artificial' : t('appTitlePlants')}
                  </h1>
                </div>
                <p style={{ margin: '4px 0 8px 0', fontSize: '13px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)', textAlign: 'center' }}>
                  {experienceMode === 'pets' ? t('appSubtitlePets') : experienceMode === 'exotics' ? t('appSubtitleExotics') : experienceMode === 'travels' ? 'Consulta guías y agentes inteligentes para tu viaje' : experienceMode === 'consultants' ? 'Realiza diagnósticos clínicos, preguntas de cultivo y consultas avanzadas' : t('appSubtitlePlants')}
                </p>
                {renderConnectivityIndicator()}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '20px' }}>{experienceMode === 'pets' ? '🐾' : experienceMode === 'exotics' ? '🦎' : experienceMode === 'travels' ? '✈️' : experienceMode === 'consultants' ? '💬' : '🌿'}</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--game-text-bright, #1a1a1a)', fontFamily: 'var(--game-font, sans-serif)' }}>
                  {experienceMode === 'pets' ? t('advisorPets') : experienceMode === 'exotics' ? t('advisorExotics') : experienceMode === 'travels' ? 'Consultores de Viajes' : experienceMode === 'consultants' ? 'Consultores IA' : t('advisorPlants')}
                </span>
                <div style={{ marginLeft: '8px', display: 'inline-block' }}>
                  {renderConnectivityIndicator()}
                </div>
              </div>
            )}
            
            <div className="ecosystem-buttons-responsive" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              width: activeTab === 'consultants' ? 'auto' : '100%',
              alignItems: 'center'
            }}>
              <div style={{
                display: 'flex',
                gap: '8px',
                width: '100%',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <button 
                  disabled={experienceMode === 'pets'}
                  onClick={() => { setExperienceMode('pets'); setActiveTab('dashboard'); }}
                  style={{
                    flex: 1,
                    minWidth: '80px',
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
                  {t('btnPets')}
                </button>
                <button 
                  disabled={experienceMode === 'plants'}
                  onClick={() => { setExperienceMode('plants'); setActiveTab('dashboard'); }}
                  style={{
                    flex: 1,
                    minWidth: '80px',
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
                  {t('btnPlants')}
                </button>
                <button 
                  disabled={experienceMode === 'exotics'}
                  onClick={() => { setExperienceMode('exotics'); setActiveTab('dashboard'); }}
                  style={{
                    flex: 1,
                    minWidth: '80px',
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
                  {t('btnExotics')}
                </button>
              </div>
              <button 
                disabled={experienceMode === 'travels'}
                onClick={() => { setExperienceMode('travels'); setActiveTab('dashboard'); }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: experienceMode === 'travels' ? 'var(--game-accent-light, #e0f2fe)' : '#f5f5f5',
                  color: experienceMode === 'travels' ? '#0284c7' : '#666',
                  border: '1px solid #eaeaea',
                  borderRadius: '12px',
                  fontSize: '11.5px',
                  fontWeight: 'bold',
                  cursor: experienceMode === 'travels' ? 'default' : 'pointer',
                  opacity: experienceMode === 'travels' ? 0.9 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {t('btnTravels')}
              </button>
              <button 
                disabled={experienceMode === 'consultants'}
                onClick={() => { setExperienceMode('consultants'); setActiveTab('dashboard'); }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: experienceMode === 'consultants' ? 'var(--game-accent-light, #f3e5f5)' : '#f5f5f5',
                  color: experienceMode === 'consultants' ? '#7b1fa2' : '#666',
                  border: '1px solid #eaeaea',
                  borderRadius: '12px',
                  fontSize: '11.5px',
                  fontWeight: 'bold',
                  cursor: experienceMode === 'consultants' ? 'default' : 'pointer',
                  opacity: experienceMode === 'consultants' ? 0.9 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {t('btnConsultants')}
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
              {t('tabDashboard')}
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
              {t('tabSettings')}
            </button>
          </div>

          {/* Contenido Dinámico de las Pestañas según el Ecosistema */}
          <div style={{ width: '100%' }}>
            {activeTab === 'dashboard' && experienceMode !== 'travels' && experienceMode !== 'consultants' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

                {/* Calendario */}
                <div style={{ display: 'block', width: '100%' }}>
                  <Suspense fallback={<ChunkLoader height="160px" />}>
                    <EcosystemCalendar 
                      plantas={plantas}
                      mascotas={mascotas}
                      onUpdate={refreshData} 
                    />
                  </Suspense>
                </div>

                <ExtremeWeatherPanel
                  clima={climaActual}
                  gpsSyncEnabled={gpsSyncEnabled}
                  handleGPSToggle={handleGPSToggle}
                  sincronizarTodasLasPlantasPorGPS={sincronizarTodasLasPlantasPorGPS}
                  loadingGPS={loadingGPS}
                  theme={uiTheme}
                />
              </div>
            )}

            {activeTab === 'dashboard' && experienceMode === 'travels' && (
              <div style={{ width: '100%', boxSizing: 'border-box' }}>
                <Suspense fallback={<ChunkLoader height="300px" />}>
                  <VacationAdvice mode="travels" />
                </Suspense>
              </div>
            )}

            {activeTab === 'dashboard' && experienceMode === 'consultants' && (
              <div style={{ width: '100%', boxSizing: 'border-box' }}>
                <Suspense fallback={<ChunkLoader height="300px" />}>
                  <IAConsultantsView 
                    hideSelector={false} 
                    onNavigateToAsset={handleNavigateToAsset} 
                  />
                </Suspense>
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
              <Suspense fallback={<ChunkLoader height="300px" />}>
                <SettingsView 
                  uiTheme={uiTheme}
                  setUiTheme={setUiTheme}
                  loadingGPS={loadingGPS}
                  gpsSyncSuccess={gpsSyncSuccess}
                  sincronizarTodasLasPlantasPorGPS={sincronizarTodasLasPlantasPorGPS}
                  hogarId={hogarId}
                  hogarNombre={hogarNombre}
                  syncStatus={syncStatus}
                  isCloudEnabled={isCloudEnabled}
                  dispararLogroVisual={dispararLogroVisual}
                  forzarSubidaNube={() => {}}
                  forzarDescargaNube={() => {}}
                  desvincularHogar={desvincularHogar}
                  nuevoHogarNombre={nuevoHogarNombre}
                  setNuevoHogarNombre={setNuevoHogarNombre}
                  crearHogar={crearHogar}
                  joinHogarId={joinHogarId}
                  setJoinHogarId={setJoinHogarId}
                  unirseAHogar={unirseAHogar}
                  joinedHogares={joinedHogares}
                  cambiarHogar={cambiarHogar}
                  abandonarHogar={abandonarHogar}
                  autosyncInterval="off"
                  setAutosyncInterval={() => {}}
                  lastAutosyncTime=""
                  customApiKey={customApiKey}
                  setCustomApiKey={setCustomApiKey}
                  showApiKey={showApiKey}
                  setShowApiKey={setShowApiKey}
                  user={user}
                  handleLogout={handleLogout}
                  handleGoogleSignIn={handleGoogleSignIn}
                  handleMicrosoftSignIn={handleMicrosoftSignIn}
                  deferredPrompt={deferredPrompt}
                  handleInstallPWA={handleInstallPWA}
                  exportarCopiaSeguridad={exportarCopiaSeguridad}
                  importarCopiaSeguridad={importarCopiaSeguridad}
                />
              </Suspense>
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
