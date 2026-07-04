import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAppData } from '../hooks/useAppData';
import { useSyncManager } from '../hooks/useSyncManager';
import { NotificationManager } from '../utils/notificationManager';
import { StatsView } from '../components/StatsView';
import { usePWAManager } from '../hooks/usePWAManager';
import { useGPSWeather } from '../hooks/useGPSWeather';
import { useTranslations } from '../utils/i18n';
import { ExtremeWeatherPanel } from '../components/ExtremeWeatherPanel';
import { playSoundClick, playSoundSuccess } from '../utils/audioFeedback';


// ── Lazy-loaded components (se descargan solo cuando se necesitan) ──────────
const ScannerModal       = lazy(() => import('../components/ScannerModal').then(m => ({ default: m.ScannerModal })));
const IAConsultantsView  = lazy(() => import('../components/IAConsultantsView').then(m => ({ default: m.IAConsultantsView })));
const PetCard            = lazy(() => import('../components/PetCard').then(m => ({ default: m.PetCard })));
const PlantCard          = lazy(() => import('../components/PlantCard').then(m => ({ default: m.PlantCard })));
const EcosystemCalendar  = lazy(() => import('../components/EcosystemCalendar').then(m => ({ default: m.EcosystemCalendar })));
const VacationAdvice     = lazy(() => import('../components/VacationAdvice').then(m => ({ default: m.VacationAdvice })));
const ManualPetForm      = lazy(() => import('../components/ManualRegisterModal').then(m => ({ default: m.ManualPetForm })));
const ManualPlantForm    = lazy(() => import('../components/ManualRegisterModal').then(m => ({ default: m.ManualPlantForm })));
const SettingsView       = lazy(() => import('../components/SettingsView').then(m => ({ default: m.SettingsView })));
const ConfettiOverlay    = lazy(() => import('../components/ConfettiOverlay').then(m => ({ default: m.ConfettiOverlay })));

// ── Esqueleto de carga inteligente (se muestra mientras carga el componente) ──
const ChunkLoader: React.FC<{ height?: string }> = ({ height = '120px' }) => (
  <div style={{
    height, width: '100%', 
    background: 'var(--game-card-bg, #ffffff)',
    borderRadius: 'var(--game-radius, 16px)',
    border: 'var(--game-border, 1px solid #f0f0f0)',
    padding: '16px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '12px',
    overflow: 'hidden',
    position: 'relative'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* Circular skeleton (avatar) */}
      <div className="skeleton-item" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Title skeleton */}
        <div className="skeleton-item" style={{ width: '40%', height: '14px', borderRadius: '4px' }} />
        {/* Subtitle skeleton */}
        <div className="skeleton-item" style={{ width: '70%', height: '10px', borderRadius: '4px' }} />
      </div>
    </div>
    {/* Body text skeleton */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, marginTop: '8px' }}>
      <div className="skeleton-item" style={{ width: '100%', height: '8px', borderRadius: '3px' }} />
      <div className="skeleton-item" style={{ width: '92%', height: '8px', borderRadius: '3px' }} />
    </div>
    <style>{`
      .skeleton-item {
        background: linear-gradient(90deg, var(--border, #eaeaea) 25%, var(--code-bg, #f4f3ec) 50%, var(--border, #eaeaea) 75%);
        background-size: 200% 100%;
        animation: loadingShimmer 1.5s infinite linear;
      }
      @keyframes loadingShimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
);


// Helper functions moved to custom hooks

export const PetPlantDashboard: React.FC = () => {
  const { t } = useTranslations();
  
  const [uiTheme, setUiTheme] = useState<'gaming' | 'nature' | 'kawaii'>(() => {
    const saved = localStorage.getItem('petplant_game_theme');
    if (saved === 'gaming' || saved === 'nature' || saved === 'kawaii') {
      return saved as 'gaming' | 'nature' | 'kawaii';
    }
    return 'nature';
  });

  const [nuevoHogarNombre, setNuevoHogarNombre] = useState('');
  const [joinHogarId, setJoinHogarId] = useState('');
  
  // Modo de Experiencia: 'pets', 'plants', 'travels', 'consultants', 'stats', 'settings'
  // Al refrescar la página, iniciamos en la página de Mascotas y pestaña 'dashboard'
  const [experienceMode, setExperienceMode] = useState<'pets' | 'plants' | 'travels' | 'consultants' | 'stats' | 'settings'>('pets');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stats' | 'consultants' | 'settings'>('dashboard');

  // Estados para Búsqueda y Filtros (P3)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubtype, setFilterSubtype] = useState('all');

  useEffect(() => {
    setSearchQuery('');
    setFilterSubtype('all');
  }, [experienceMode]);

  // Page transition ripple states
  const [rippleX, setRippleX] = useState(0);
  const [rippleY, setRippleY] = useState(0);
  const [rippleColor, setRippleColor] = useState('#2e7d32');
  const [isRippling, setIsRippling] = useState(false);

  // Solar cycle state
  const [solarCycle, setSolarCycle] = useState<'day' | 'sunset' | 'night' | 'sunrise'>(() => {
    const hours = new Date().getHours();
    if (hours >= 21 || hours < 6) return 'night';
    if (hours >= 19 && hours < 21) return 'sunset';
    if (hours >= 6 && hours < 8) return 'sunrise';
    return 'day';
  });

  // Parallax background coordinate offsets
  const [bgOffsetX, setBgOffsetX] = useState(0);
  const [bgOffsetY, setBgOffsetY] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const hours = new Date().getHours();
      if (hours >= 21 || hours < 6) setSolarCycle('night');
      else if (hours >= 19 && hours < 21) setSolarCycle('sunset');
      else if (hours >= 6 && hours < 8) setSolarCycle('sunrise');
      else setSolarCycle('day');
    }, 10 * 60 * 1000);

    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth <= 600) return;
      const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      setBgOffsetX(-x * 15);
      setBgOffsetY(-y * 15);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const [showCelebration, setShowCelebration] = useState(false);
  const [achievement, setAchievement] = useState<{ title: string; subtitle: string; tipo: 'lvl_up' | 'victory' } | null>(null);

  const triggerCelebration = () => {
    try {
      playSoundSuccess();
    } catch {
      /* Ignore audio playback error */
    }
    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
    }, 4000);
  };

  const handleSuccessRegister = async () => {
    await refreshData();
    triggerCelebration();
  };

  const triggerRippleTransition = React.useCallback((
    mode: 'pets' | 'plants' | 'travels' | 'consultants' | 'stats' | 'settings',
    tab: 'dashboard' | 'stats' | 'consultants' | 'settings',
    e?: React.MouseEvent | MouseEvent
  ) => {
    try { playSoundClick(); } catch { /* Ignore audio playback error */ }

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
      x = e.clientX;
      y = e.clientY;
    }

    setRippleX(x);
    setRippleY(y);

    let color: string;
    if (mode === 'pets') color = '#1976d2';
    else if (mode === 'travels') color = '#0284c7';
    else if (mode === 'consultants') color = '#7b1fa2';
    else if (mode === 'plants') color = '#2e7d32';
    else if (mode === 'stats') color = '#e11d48';
    else if (mode === 'settings') color = '#475569';
    else {
      if (uiTheme === 'gaming') color = '#0f1624';
      else if (uiTheme === 'kawaii') color = '#ffb6c1';
      else color = '#2e7d32';
    }
    
    setRippleColor(color);
    setIsRippling(true);

    setTimeout(() => {
      setExperienceMode(mode);
      setActiveTab(tab);
    }, 250);

    setTimeout(() => {
      setIsRippling(false);
    }, 600);
  }, [uiTheme]);

  useEffect(() => {
    localStorage.setItem('petplant_game_theme', uiTheme);
  }, [uiTheme]);

  useEffect(() => {
    localStorage.setItem('petplant_experience_mode', experienceMode);
  }, [experienceMode]);

  useEffect(() => {
    localStorage.setItem('petplant_active_tab', activeTab);
  }, [activeTab]);

  const [showScanner, setShowScanner] = useState(false);
  const [showManualRegister, setShowManualRegister] = useState<'pet' | 'plant' | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [customApiKey, setCustomApiKey] = useState<string>(() => localStorage.getItem('petplant_gemini_api_key') || '');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [scannerMode, setScannerMode] = useState<'registrar_mascota' | 'salud_mascota' | 'registrar_planta' | 'enfermedad_planta' | null>(null);
  const [scannerAssetId, setScannerAssetId] = useState<string | null>(null);

  const {
    deferredPrompt,
    isOffline,
    dismissedInstallBanner,
    setDismissedInstallBanner,
    networkNotification,
    handleInstallPWA
  } = usePWAManager();

  // Instantiate Cloud Sync hook
  const syncManager = useSyncManager({
    uiTheme,
    setUiTheme,
    isOffline,
    onCloudDataReceived: async () => {
      await appData.refreshData(false);
    }
  });

  // Instantiate Local Database state hook
  const appData = useAppData((data, isLocalEdit) => {
    syncManager.handleLocalDataChanged(data, isLocalEdit);
  });

  const {
    user,
    hogarId,
    hogarNombre,
    joinedHogares,
    syncStatus,
    syncErrorMessage,
    isCloudEnabled,
    forceSyncToCloud,
    crearHogar: crearHogarSync,
    unirseAHogar: unirseAHogarSync,
    desvincularHogar,
    cambiarHogar,
    abandonarHogar,
    handleGoogleSignIn,
    handleMicrosoftSignIn,
    handleLogout
  } = syncManager;

  const crearHogar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoHogarNombre.trim()) return;
    try {
      await crearHogarSync(nuevoHogarNombre);
      setNuevoHogarNombre('');
    } catch (err: any) {
      alert("Error al crear hogar: " + err.message);
    }
  };

  const unirseAHogar = async (e: React.FormEvent) => {
    e.preventDefault();
    let code = joinHogarId.trim();
    if (code.startsWith('petplant_hogar:')) {
      code = code.replace('petplant_hogar:', '');
    }
    if (!code) return;
    try {
      await unirseAHogarSync(code);
      setJoinHogarId('');
    } catch (err: any) {
      alert("Error al unirse al hogar: " + err.message);
    }
  };

  const {
    mascotas,
    plantas,
    climaActual,
    refreshData,
    exportarCopiaSeguridad,
    importarCopiaSeguridad
  } = appData;

  // Instantiate GPS sync hook
  const {
    loadingGPS,
    gpsSyncSuccess,
    gpsSyncEnabled,
    handleGPSToggle,
    sincronizarTodasLasPlantasPorGPS
  } = useGPSWeather(appData.refreshData);

  const getAccentColor = () => {
    if (experienceMode === 'pets') return '#1976d2';
    if (experienceMode === 'travels') return '#0284c7';
    if (experienceMode === 'consultants') return '#7b1fa2';
    if (experienceMode === 'stats') return '#e11d48';
    if (experienceMode === 'settings') return '#475569';
    return '#2e7d32'; // plants
  };

  const handleContinue = () => {
    setIsFading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (localStorage.getItem('petplant_gps_sync_enabled') === 'true') {
        sincronizarTodasLasPlantasPorGPS();
      }
      setTimeout(() => {
        import('../components/PetCard').catch(() => {});
        import('../components/PlantCard').catch(() => {});
        import('../components/IAConsultantsView').catch(() => {});
        import('../components/ScannerModal').catch(() => {});
      }, 1500);
    }, 500);
  };

  const handleNavigateToAsset = (tipo: 'mascota' | 'planta', id: string) => {
    const mode = tipo === 'mascota' ? 'pets' : 'plants';
    triggerRippleTransition(mode, 'dashboard');
    // Abrir la ficha del asset concreto tras la transición de página
    setTimeout(() => setExpandedCardId(id), 300);
  };

  // Interceptar botón de Atrás en Android (popstate)
  useEffect(() => {
    // Push a state so popstate event fires when pressing back
    window.history.pushState({ mode: experienceMode, tab: activeTab }, '');

    const handlePopState = (e: PopStateEvent) => {
      if (showScanner) {
        setShowScanner(false);
        setScannerAssetId(null);
        window.history.pushState({ mode: experienceMode, tab: activeTab }, '');
      } else if (showManualRegister) {
        setShowManualRegister(null);
        window.history.pushState({ mode: experienceMode, tab: activeTab }, '');
      } else {
        if (!e.state || e.state.mode === 'landing') {
          triggerRippleTransition('pets', 'dashboard');
        } else {
          triggerRippleTransition(e.state.mode, e.state.tab || 'dashboard');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [experienceMode, activeTab, showScanner, showManualRegister, triggerRippleTransition]);

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

          const handleUpdate = () => {
            console.log('Nueva versión detectada; forzando recarga de página para activar cambios...');
            window.location.reload();
          };

          if (reg.waiting) {
            handleUpdate();
            return;
          }

          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    handleUpdate();
                  }
                }
              };
            }
          };
        })
        .catch((err) => {
          console.error('Error al registrar Service Worker:', err);
        });
    }

    // Solicitar permiso de notificaciones push al inicio
    NotificationManager.requestPermission().catch((err) => {
      console.error('Error al solicitar permiso de notificaciones:', err);
    });

    import('../services/syncQueue').then(({ SyncQueueService }) => {
      SyncQueueService.processQueue().catch((err) => {
        console.error('Error al procesar cola de sincronización inicial:', err);
      });
    });

    NotificationManager.checkAndTriggerPendingNotifications().catch((err) => {
      console.error('Error al procesar notificaciones programadas iniciales:', err);
    });

    // Recordatorios de deparasitación (cada 24h)
    NotificationManager.checkDewormingReminders().catch((err) => {
      console.error('Error al comprobar recordatorios de deparasitación:', err);
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
      titleTip = 'No internet connection. Running in local mode.';
    } else {
      // Online
      const provider = localStorage.getItem('petplant_login_provider');
      if (!hogarId) {
        ledColor = '#2196f3'; // Blue (Online, local database only)
        text = 'Online (Local)';
        isPulsing = false;
        titleTip = 'Connected to the internet. Data saved locally. Configure the cloud in Settings to sync.';
      } else {
        // Connected to Cloud (via Google, Microsoft or direct Hogar code)
        if (syncStatus === 'synced' || syncStatus === 'idle') {
          ledColor = '#4caf50'; // Green
          text = provider === 'microsoft' ? 'Cloud (MS)' : 'Cloud (Home)';
          isPulsing = false;
          titleTip = provider === 'microsoft'
            ? 'Microsoft OneDrive backup synced and up to date.'
            : 'Home Group on cloud (Firebase Firestore) fully synced in real time.';
        } else if (syncStatus === 'syncing') {
          ledColor = '#ffeb3b'; // Yellow
          text = 'Syncing...';
          isPulsing = true;
          titleTip = 'Updating changes with the cloud...';
        } else {
          ledColor = '#ff9800'; // Orange
          text = 'Cloud Error';
          isPulsing = true;
          titleTip = `Failed to communicate with the cloud. Details: ${syncErrorMessage || 'Unknown error'}.`;
        }
      }
    }

    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', margin: '4px 0' }}>
          <button 
            type="button"
            title={`${titleTip} (Click to force sync and check the cloud)`}
            onClick={forceSyncToCloud}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              background: uiTheme === 'gaming' ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.85)',
              border: uiTheme === 'gaming' ? '1px solid var(--game-border-color)' : '1px solid #c8e6c9',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 'bold',
              color: 'var(--game-text-bright, #333)',
              fontFamily: 'var(--game-font, sans-serif)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              if (uiTheme !== 'gaming') e.currentTarget.style.background = '#e8f5e9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.background = uiTheme === 'gaming' ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.85)';
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
          </button>
          {!isOffline && hogarId && (
            <span style={{ 
              fontSize: '10.5px', 
              color: 'var(--game-text, #666)', 
              fontStyle: 'italic',
              fontFamily: 'var(--game-font, sans-serif)',
              opacity: 0.85
            }}>
              (Pulsar para sincronizar 🔄)
            </span>
          )}
        </div>
        {syncStatus === 'error' && syncErrorMessage && (
          <div style={{
            fontSize: '11px',
            color: '#ef4444',
            background: uiTheme === 'gaming' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
            border: uiTheme === 'gaming' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(239, 68, 68, 0.15)',
            borderRadius: '6px',
            padding: '4px 10px',
            marginTop: '2px',
            fontFamily: 'var(--game-font, sans-serif)',
            maxWidth: '280px',
            textAlign: 'center',
            wordBreak: 'break-word'
          }}>
            ⚠️ {syncErrorMessage}
          </div>
        )}
      </div>
    );
  };

  const dispararLogroVisual = (texto: string, subtitulo: string, tipo: 'lvl_up' | 'victory') => {
    setAchievement({ title: texto, subtitle: subtitulo, tipo });
    // Para logros de victoria, lanzar también confetti
    if (tipo === 'victory') {
      triggerCelebration();
    } else {
      // Para lvl_up, reproducir sonido de éxito sin confetti
      try { playSoundSuccess(); } catch { /* ignore */ }
    }
    // Auto-ocultar el toast de logro tras 3.5 segundos
    setTimeout(() => setAchievement(null), 3500);
  };













  useEffect(() => {
    if (uiTheme !== 'gaming') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
        return;
      }
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const tabs: ('dashboard' | 'stats' | 'consultants' | 'settings')[] = [
        'dashboard', 'stats', 'consultants', 'settings'
      ];

      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key) - 1;
        const targetTab = tabs[idx];
        if (targetTab) {
          triggerRippleTransition(experienceMode, targetTab);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uiTheme, experienceMode, triggerRippleTransition]);




  const getHeaderInfo = () => {
    const info = {
      icon: '🐾',
      title: t('appTitlePets'),
      desc: ''
    };
    if (experienceMode === 'plants') {
      info.icon = '🌿';
      info.title = t('appTitlePlants');
    } else if (experienceMode === 'travels') {
      info.icon = '✈️';
      info.title = 'Travel & Vacation Guide';
      info.desc = '';
    } else if (experienceMode === 'consultants') {
      info.icon = '💬';
      info.title = 'AI Consultants';
      info.desc = '';
    } else if (experienceMode === 'stats') {
      info.icon = '📈';
      info.title = 'Metrics & Statistics';
      info.desc = '';
    } else if (experienceMode === 'settings') {
      info.icon = '⚙️';
      info.title = 'System Settings';
      info.desc = '';
    }
    return info;
  };

  const headerInfo = getHeaderInfo();

  return (
    <div 
      data-game-theme={uiTheme}
      data-solar-cycle={solarCycle}
      className="dashboard-root"
      style={{ 
        background: 'var(--game-bg, #fcfcfc)', 
        backgroundImage: 'var(--game-bg-image)',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: `calc(50% + ${bgOffsetX}px) calc(50% + ${bgOffsetY}px)`,
        transition: 'background-position 0.1s ease-out',
        backgroundAttachment: 'fixed',
        minHeight: '100vh', 
        height: isLoading ? '100svh' : 'auto',
        maxHeight: isLoading ? '100svh' : 'none',
        overflow: isLoading ? 'hidden' : 'visible',
        fontFamily: 'var(--game-font, sans-serif)', 
        color: 'var(--game-text, #333)',
        padding: isLoading ? '12px 10px 24px 10px' : '24px 16px',
        position: 'relative',
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {/* Ripple overlay */}
      {isRippling && (
        <div 
          className="page-ripple-overlay" 
          style={{ 
            '--ripple-x': `${rippleX}px`, 
            '--ripple-y': `${rippleY}px`, 
            '--ripple-bg': rippleColor 
          } as React.CSSProperties} 
        />
      )}

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
                Install the app on your home screen for instant access and full offline support.
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
              Install 📲
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
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="loading-overlay-root" style={{
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
                Loading your secure ecosystem...
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
                  Session Detected ({localStorage.getItem('petplant_login_provider') === 'microsoft' ? 'Microsoft / Hotmail' : 'Google'})
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
                    Continue to Dashboard 🚀
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
                      Install App on your Device 📱
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
                    Sign Out / Use another account 🚪
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
                  Sign in with Google
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
                  Sign in with Microsoft / Hotmail
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
              .landing-card .premium-logo-fern {
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

      {/* ECOSISTEMAS DEDICADOS E INDEPENDIENTES */}
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          {/* Header Ecosistema */}
          <div className="ecosystem-header-responsive" style={{
            background: 'var(--game-card-bg, #ffffff)',
            borderRadius: '16px',
            padding: '20px 24px',
            border: 'var(--game-border, 1px solid #f0f0f0)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: '16px',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <span style={{ fontSize: '24px' }}>{headerInfo.icon}</span>
                <h1 style={{ margin: '0', fontSize: '20px', color: 'var(--game-text-bright, #1a1a1a)', fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)', textAlign: 'center' }}>
                  {headerInfo.title}
                </h1>
              </div>
              {headerInfo.desc && (
                <p style={{ margin: '4px 0 8px 0', fontSize: '13px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)', textAlign: 'center' }}>
                  {headerInfo.desc}
                </p>
              )}
              {renderConnectivityIndicator()}
            </div>
            
            <div className="ecosystem-buttons-responsive" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              width: '100%',
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
                  onClick={(e) => triggerRippleTransition('pets', 'dashboard', e)}
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
                  onClick={(e) => triggerRippleTransition('plants', 'dashboard', e)}
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
                
              </div>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button 
                  disabled={experienceMode === 'travels'}
                  onClick={(e) => triggerRippleTransition('travels', 'dashboard', e)}
                  style={{
                    flex: 1,
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
                  onClick={(e) => triggerRippleTransition('consultants', 'dashboard', e)}
                  style={{
                    flex: 1,
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

              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button 
                  disabled={experienceMode === 'stats'}
                  onClick={(e) => triggerRippleTransition('stats', 'stats', e)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: experienceMode === 'stats' ? 'var(--game-accent-light, #ffe4e6)' : '#f5f5f5',
                    color: experienceMode === 'stats' ? '#e11d48' : '#666',
                    border: '1px solid #eaeaea',
                    borderRadius: '12px',
                    fontSize: '11.5px',
                    fontWeight: 'bold',
                    cursor: experienceMode === 'stats' ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    opacity: experienceMode === 'stats' ? 0.9 : 1
                  }}
                >
                  {t('tabStats')}
                </button>
                <button 
                  disabled={experienceMode === 'settings'}
                  onClick={(e) => triggerRippleTransition('settings', 'settings', e)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: experienceMode === 'settings' ? 'var(--game-accent-light, #f1f5f9)' : '#f5f5f5',
                    color: experienceMode === 'settings' ? '#475569' : '#666',
                    border: '1px solid #eaeaea',
                    borderRadius: '12px',
                    fontSize: '11.5px',
                    fontWeight: 'bold',
                    cursor: experienceMode === 'settings' ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    opacity: experienceMode === 'settings' ? 0.9 : 1
                  }}
                >
                  {t('tabSettings')}
                </button>
              </div>
            </div>
          </div>

          {/* Contenido Dinámico de las Pestañas según el Ecosistema */}
          <div style={{ width: '100%' }}>
            {activeTab === 'dashboard' && (experienceMode === 'pets' || experienceMode === 'plants') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Barra de Acciones de Registro Glassmorphism */}
                <div className="dashboard-actions-bar" style={{
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
                      {experienceMode === 'pets' ? '🐾 Registro de Mascotas' : '🌿 Registro de Plantas'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                      onClick={() => {
                        if (experienceMode === 'pets') setScannerMode('registrar_mascota');
                        else if (experienceMode === 'plants') setScannerMode('registrar_planta');

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

                {/* Panel de Búsqueda y Filtros (P3) */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  width: '100%',
                  marginBottom: '20px',
                  background: 'var(--game-card-bg, #ffffff)',
                  border: 'var(--game-border, 1px solid #f0f0f0)',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  boxSizing: 'border-box',
                  alignItems: 'center'
                }} className="no-print">
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.02)', border: '1px solid #ccc', borderRadius: '8px', padding: '6px 10px', minWidth: 0 }}>
                    <span style={{ cursor: 'default' }}>🔍</span>
                    <input 
                      type="text" 
                      placeholder={experienceMode === 'pets' ? "Buscar por nombre o raza..." : experienceMode === 'plants' ? "Buscar por nombre..." : "Buscar por nombre o tipo..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: 'var(--game-text)' }}
                    />
                    {searchQuery && (
                      <button type="button" onClick={() => setSearchQuery('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: '#888' }}>✕</button>
                    )}
                  </div>

                  <select
                    value={filterSubtype}
                    onChange={(e) => setFilterSubtype(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px', border: '1px solid #ccc', background: '#fff', color: '#000', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <option value="all">Todos</option>
                    {experienceMode === 'pets' && Array.from(new Set(mascotas.map(m => m.especie))).map(esp => (
                      <option key={esp} value={esp}>{esp}</option>
                    ))}
                    {experienceMode === 'plants' && Array.from(new Set(plantas.map(p => p.ubicacionHabitacion))).filter(Boolean).map(room => (
                      <option key={room} value={room}>{room}</option>
                    ))}

                  </select>
                </div>

                {/* Cuadrícula Principal */}
                <div className="main-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '24px', width: '100%', boxSizing: 'border-box' }}>
                  
                  {/* Tarjetas según el ecosistema */}
                  {experienceMode === 'pets' && (
                    /* Mis Mascotas */
                    <div style={{ background: 'var(--game-card-bg, #ffffff)', borderRadius: '16px', padding: '20px', border: 'var(--game-border, 1px solid #f0f0f0)', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e3f2fd', paddingBottom: '8px', width: '100%', boxSizing: 'border-box' }}>
                        <h2 style={{ margin: '0', fontSize: '17px', color: '#1976d2', fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)' }}>🐾 Mis Mascotas</h2>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                        {(() => {
                          const filtered = mascotas.filter(m => {
                            const matchesSearch = m.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                  (m.raza && m.raza.toLowerCase().includes(searchQuery.toLowerCase()));
                            const matchesFilter = filterSubtype === 'all' || m.especie === filterSubtype;
                            return matchesSearch && matchesFilter;
                          });
                          if (filtered.length === 0) {
                            return <p style={{ fontSize: '12px', color: 'var(--game-text, #888)', fontStyle: 'italic', textAlign: 'center', padding: '12px', fontFamily: 'var(--game-font, sans-serif)' }}>No se encontraron mascotas.</p>;
                          }
                          return filtered.map(m => (
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
                                theme={uiTheme}
                              />
                            </Suspense>
                          ));
                        })()}
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
                        {(() => {
                          const filtered = plantas.filter(p => {
                            const matchesSearch = p.nombreComun.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                  (p.nombreCientifico && p.nombreCientifico.toLowerCase().includes(searchQuery.toLowerCase()));
                            const matchesFilter = filterSubtype === 'all' || p.ubicacionHabitacion === filterSubtype;
                            return matchesSearch && matchesFilter;
                          });
                          if (filtered.length === 0) {
                            return <p style={{ fontSize: '12px', color: 'var(--game-text, #888)', fontStyle: 'italic', textAlign: 'center', padding: '12px', fontFamily: 'var(--game-font, sans-serif)' }}>No se encontraron plantas.</p>;
                          }
                          return filtered.map(p => (
                            <Suspense key={p.id} fallback={<ChunkLoader height="80px" />}>
                              <PlantCard
                                planta={p}
                                clima={climaActual}
                                onUpdate={refreshData}
                                onOpenScanner={(mode, assetId) => {
                                  setScannerMode(mode);
                                  setScannerAssetId(assetId);
                                  setShowScanner(true);
                                }}
                                isExpanded={expandedCardId === p.id}
                                onToggleExpand={() => setExpandedCardId(expandedCardId === p.id ? null : p.id)}
                                theme={uiTheme}
                              />
                            </Suspense>
                          ));
                        })()}
                      </div>
                    </div>
                  )}




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
              <div className="page-transition-enter" style={{ width: '100%', boxSizing: 'border-box' }}>
                <Suspense fallback={<ChunkLoader height="300px" />}>
                  <VacationAdvice 
                    mode="travels" 
                    theme={uiTheme} 
                    mascotas={mascotas}
                    plantas={plantas}
                  />
                </Suspense>
              </div>
            )}

            {activeTab === 'dashboard' && experienceMode === 'consultants' && (
              <div className="page-transition-enter" style={{ width: '100%', boxSizing: 'border-box' }}>
                <Suspense fallback={<ChunkLoader height="300px" />}>
                  <IAConsultantsView 
                    hideSelector={false} 
                    onNavigateToAsset={handleNavigateToAsset} 
                    onUpdate={refreshData}
                  />
                </Suspense>
              </div>
            )}



            {/* 2.4 Tab Consultor IA Filtrado */}
            {activeTab === 'consultants' && (
              <div className="page-transition-enter" style={{ width: '100%' }}>
                <Suspense fallback={<ChunkLoader height="300px" />}>
                  <IAConsultantsView 
                    forceConsultant={
                      experienceMode === 'pets' 
                        ? 'veterinario' 
                        : 'agronomo'
                    } 
                    hideSelector={true} 
                    onNavigateToAsset={handleNavigateToAsset}
                    onUpdate={refreshData}
                  />
                </Suspense>
              </div>
            )}

            {/* Tab Estadísticas */}
            {experienceMode === 'stats' && (
              <div className="page-transition-enter" style={{ width: '100%' }}>
                <StatsView 
                  mascotas={mascotas}
                  plantas={plantas}
                  clima={climaActual}
                  uiTheme={uiTheme}
                />
              </div>
            )}

            {/* 2.6 Tab Ajustes */}
            {experienceMode === 'settings' && (
              <div className="page-transition-enter" style={{ width: '100%' }}>
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
                onUpdate={refreshData}
                forcedMode={scannerMode || undefined}
                forcedAssetId={scannerAssetId || undefined}
              />
            </Suspense>
          )}

          {showManualRegister && (
            <div className="modal-backdrop" style={{
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
                    onUpdate={handleSuccessRegister}
                  />

                ) : (
                  <ManualPlantForm
                    onClose={() => setShowManualRegister(null)}
                    onUpdate={handleSuccessRegister}
                  />
                )}
              </Suspense>
            </div>
          )}

          {dbError && (
            <div className="modal-backdrop" style={{
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



      {showCelebration && (
        <Suspense fallback={null}>
          <ConfettiOverlay />
        </Suspense>
      )}

      {/* Toast de Logro Visual (dispararLogroVisual) */}
      {achievement && (
        <div
          style={{
            position: 'fixed',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: achievement.tipo === 'victory'
              ? 'linear-gradient(135deg, #1a237e, #311b92)'
              : 'linear-gradient(135deg, #1b5e20, #2e7d32)',
            color: '#fff',
            padding: '14px 28px',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            zIndex: 9999999,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            animation: 'fadeInSlide 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            fontFamily: 'var(--game-font, sans-serif)',
            minWidth: '260px',
            maxWidth: '90vw',
            border: achievement.tipo === 'victory' ? '1.5px solid #7c4dff' : '1.5px solid #66bb6a',
          }}
        >
          <span style={{ fontSize: '28px' }}>{achievement.tipo === 'victory' ? '🏆' : '⬆️'}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <strong style={{ fontSize: '14px', letterSpacing: '0.5px' }}>{achievement.title}</strong>
            <span style={{ fontSize: '12px', opacity: 0.85 }}>{achievement.subtitle}</span>
          </div>
        </div>
      )}

    </div>
  );
};
