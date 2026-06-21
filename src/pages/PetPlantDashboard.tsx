import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAppData } from '../hooks/useAppData';
import { useSyncManager } from '../hooks/useSyncManager';
import { NotificationManager } from '../utils/notificationManager';
import { usePWAManager } from '../hooks/usePWAManager';
import { useGPSWeather } from '../hooks/useGPSWeather';
import { useTranslations } from '../utils/i18n';
import { ExtremeWeatherPanel } from '../components/ExtremeWeatherPanel';
import { playSoundClick } from '../utils/audioFeedback';


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
  
  const [uiTheme, setUiTheme] = useState<'gaming' | 'nature' | 'kawaii' | 'vintage'>(() => {
    const saved = localStorage.getItem('petplant_game_theme');
    return (saved === 'gaming' || saved === 'nature' || saved === 'kawaii' || saved === 'vintage')
      ? saved as 'gaming' | 'nature' | 'kawaii' | 'vintage'
      : 'nature';
  });

  const [nuevoHogarNombre, setNuevoHogarNombre] = useState('');
  const [joinHogarId, setJoinHogarId] = useState('');
  
  // Modo de Experiencia: 'landing', 'pets', 'plants', 'exotics', 'travels', 'consultants'
  // Al refrescar la página, siempre iniciamos en la página de inicio ('landing') y pestaña 'dashboard'
  const [experienceMode, setExperienceMode] = useState<'landing' | 'pets' | 'plants' | 'exotics' | 'travels' | 'consultants'>('landing');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'consultants' | 'settings'>('dashboard');

  // Page transition ripple states
  const [rippleX, setRippleX] = useState(0);
  const [rippleY, setRippleY] = useState(0);
  const [rippleColor, setRippleColor] = useState('#2e7d32');
  const [isRippling, setIsRippling] = useState(false);

  const triggerRippleTransition = React.useCallback((
    mode: 'landing' | 'pets' | 'plants' | 'exotics' | 'travels' | 'consultants',
    tab: 'dashboard' | 'consultants' | 'settings',
    e?: React.MouseEvent | MouseEvent
  ) => {
    try { playSoundClick(); } catch {}

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
      x = e.clientX;
      y = e.clientY;
    }

    setRippleX(x);
    setRippleY(y);

    let color = '#2e7d32';
    if (mode === 'pets') color = '#1976d2';
    else if (mode === 'exotics') color = '#ff8f00';
    else if (mode === 'travels') color = '#0284c7';
    else if (mode === 'consultants') color = '#7b1fa2';
    else if (mode === 'plants') color = '#2e7d32';
    else {
      if (uiTheme === 'gaming') color = '#0f1624';
      else if (uiTheme === 'kawaii') color = '#ffb6c1';
      else if (uiTheme === 'vintage') color = '#fedcb5';
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
  const [showManualRegister, setShowManualRegister] = useState<'pet' | 'plant' | 'exotic' | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [customApiKey, setCustomApiKey] = useState<string>(() => localStorage.getItem('petplant_gemini_api_key') || '');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [scannerMode, setScannerMode] = useState<'registrar_mascota' | 'salud_mascota' | 'registrar_planta' | 'enfermedad_planta' | 'registrar_exotico' | 'salud_exotico' | null>(null);
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
    if (!joinHogarId.trim()) return;
    try {
      await unirseAHogarSync(joinHogarId);
      setJoinHogarId('');
    } catch (err: any) {
      alert("Error al unirse al hogar: " + err.message);
    }
  };

  const {
    mascotas,
    plantas,
    exoticos,
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
    if (experienceMode === 'exotics') return '#ff8f00';
    if (experienceMode === 'travels') return '#0284c7';
    if (experienceMode === 'consultants') return '#7b1fa2';
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
        import('../components/ExoticCard').catch(() => {});
        import('../components/IAConsultantsView').catch(() => {});
        import('../components/ScannerModal').catch(() => {});
      }, 1500);
    }, 500);
  };

  const handleNavigateToAsset = (tipo: 'mascota' | 'planta' | 'exotico', id: string) => {
    void id;
    const mode = tipo === 'mascota' ? 'pets' : tipo === 'planta' ? 'plants' : 'exotics';
    triggerRippleTransition(mode, 'dashboard');
  };

  // Interceptar botón de Atrás en Android (popstate)
  useEffect(() => {
    if (experienceMode === 'landing') return;

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
          triggerRippleTransition('landing', 'dashboard');
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
      titleTip = 'Sin conexión a internet. Funcionando en modo local.';
    } else {
      // Online
      const provider = localStorage.getItem('petplant_login_provider');
      if (!hogarId) {
        ledColor = '#2196f3'; // Blue (Online, local database only)
        text = 'Online (Local)';
        isPulsing = false;
        titleTip = 'Conectado a internet. Datos guardados localmente. Configura la nube en Ajustes para sincronizar.';
      } else {
        // Connected to Cloud (via Google, Microsoft or direct Hogar code)
        if (syncStatus === 'synced' || syncStatus === 'idle') {
          ledColor = '#4caf50'; // Green
          text = provider === 'microsoft' ? 'Nube (MS)' : 'Nube (Hogar)';
          isPulsing = false;
          titleTip = provider === 'microsoft'
            ? 'Copia de seguridad en Microsoft OneDrive sincronizada y al día.'
            : 'Grupo Hogar en la nube (Firebase Firestore) totalmente sincronizado en tiempo real.';
        } else if (syncStatus === 'syncing') {
          ledColor = '#ffeb3b'; // Yellow
          text = 'Sincronizando...';
          isPulsing = true;
          titleTip = 'Actualizando cambios con la nube...';
        } else {
          ledColor = '#ff9800'; // Orange
          text = 'Error Nube';
          isPulsing = true;
          titleTip = `Fallo en la comunicación con la nube. Detalles: ${syncErrorMessage || 'Error desconocido'}.`;
        }
      }
    }

    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', margin: '4px 0' }}>
          <button 
            type="button"
            title={`${titleTip} (Haz clic para forzar sincronización y comprobar la nube)`}
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
    // No-op para desactivar mensajes de level up
    void texto;
    void subtitulo;
    void tipo;
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
          triggerRippleTransition(experienceMode, targetTab);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uiTheme, experienceMode, triggerRippleTransition]);




  return (
    <div 
      data-game-theme={uiTheme}
      className="dashboard-root"
      style={{ 
        background: 'var(--game-bg, #fcfcfc)', 
        backgroundImage: 'var(--game-bg-image)',
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
            clima={climaActual}
            onNavigate={(mode, tab, e) => triggerRippleTransition(mode, tab, e)}
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
                <button 
                  disabled={experienceMode === 'exotics'}
                  onClick={(e) => triggerRippleTransition('exotics', 'dashboard', e)}
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
                onClick={(e) => triggerRippleTransition('travels', 'dashboard', e)}
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
                onClick={(e) => triggerRippleTransition('consultants', 'dashboard', e)}
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
          <div className="dashboard-tabs-container" style={{
            display: 'flex',
            gap: '4px',
            borderBottom: '1px solid #eaeaea',
            marginBottom: '24px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            <button
              onClick={(e) => triggerRippleTransition(experienceMode, 'dashboard', e)}
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
              onClick={(e) => triggerRippleTransition(experienceMode, 'settings', e)}
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
                <div className="main-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '24px', width: '100%', boxSizing: 'border-box' }}>
                  
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
                                clima={climaActual}
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

                {/* Calendario */}
                <div style={{ display: 'block', width: '100%' }}>
                  <Suspense fallback={<ChunkLoader height="160px" />}>
                    <EcosystemCalendar 
                      plantas={plantas}
                      mascotas={mascotas}
                      exoticos={exoticos}
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
                    exoticos={exoticos}
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
                        : experienceMode === 'exotics' 
                        ? 'exoticos' 
                        : 'agronomo'
                    } 
                    hideSelector={true} 
                    onNavigateToAsset={handleNavigateToAsset}
                    onUpdate={refreshData}
                  />
                </Suspense>
              </div>
            )}

            {/* 2.6 Tab Ajustes */}
            {activeTab === 'settings' && (
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
                exoticos={exoticos}
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
      )}



    </div>
  );
};
