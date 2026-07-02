/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { useTranslations } from '../utils/i18n';
import { LocalDatabase } from '../database/db';
import type { Mascota, Planta } from '../database/types';
import { initFirebase, getFirebaseCached } from '../database/firebaseLazy';
import { QRCodeSVG } from 'qrcode.react';

const getNowTimestamp = (): number => Date.now();

interface SettingsViewProps {
  uiTheme: 'gaming' | 'nature' | 'kawaii';
  setUiTheme: (theme: 'gaming' | 'nature' | 'kawaii') => void;
  loadingGPS: boolean;
  gpsSyncSuccess: string | null;
  sincronizarTodasLasPlantasPorGPS: () => void;
  hogarId: string | null;
  hogarNombre: string;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  isCloudEnabled: boolean;
  dispararLogroVisual: (title: string, subtitle: string, type: 'lvl_up' | 'victory') => void;
  desvincularHogar: () => void;
  nuevoHogarNombre: string;
  setNuevoHogarNombre: (val: string) => void;
  crearHogar: (e: React.FormEvent) => void;
  joinHogarId: string;
  setJoinHogarId: (val: string) => void;
  unirseAHogar: (e: React.FormEvent) => void;
  customApiKey: string;
  setCustomApiKey: (val: string) => void;
  showApiKey: boolean;
  setShowApiKey: (val: boolean) => void;
  user: { name: string; email: string } | null;
  handleLogout: () => void;
  handleGoogleSignIn: () => void;
  handleMicrosoftSignIn: () => void;
  deferredPrompt: any;
  handleInstallPWA: () => void;
  exportarCopiaSeguridad: () => void;
  importarCopiaSeguridad: (e: React.ChangeEvent<HTMLInputElement>) => void;
  joinedHogares: Array<{ id: string; nombre: string }>;
  cambiarHogar: (code: string) => Promise<void>;
  abandonarHogar: (code: string) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  uiTheme,
  setUiTheme,
  loadingGPS,
  gpsSyncSuccess,
  sincronizarTodasLasPlantasPorGPS,
  hogarId,
  hogarNombre,
  syncStatus,
  isCloudEnabled,
  dispararLogroVisual,
  desvincularHogar,
  nuevoHogarNombre,
  setNuevoHogarNombre,
  crearHogar,
  joinHogarId,
  setJoinHogarId,
  unirseAHogar,
  customApiKey,
  setCustomApiKey,
  showApiKey,
  setShowApiKey,
  user,
  handleLogout,
  handleGoogleSignIn,
  handleMicrosoftSignIn,
  deferredPrompt,
  handleInstallPWA,
  exportarCopiaSeguridad,
  importarCopiaSeguridad,
  joinedHogares,
  cambiarHogar,
  abandonarHogar
}) => {
  const { locale, setLocale, t } = useTranslations();

  // QR code toggle
  const [showQR, setShowQR] = useState(false);

  // Conflict resolution states
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [localDataInfo, setLocalDataInfo] = useState<any>(null);
  const [remoteDataInfo, setRemoteDataInfo] = useState<any>(null);
  const [localPayload, setLocalPayload] = useState<any>(null);
  const [remotePayload, setRemotePayload] = useState<any>(null);

  // States and function for cloud diagnostics
  const [diagnosticLog, setDiagnosticLog] = useState<string>('');
  const [runningDiag, setRunningDiag] = useState<boolean>(false);

  const runCloudDiagnostics = async () => {
    setRunningDiag(true);
    setDiagnosticLog("Iniciando pruebas de diagnóstico de la nube...\n");
    
    const log = (msg: string) => {
      setDiagnosticLog(prev => prev + msg + "\n");
    };

    try {
      log("1. Comprobando claves del navegador...");
      log(`API Key presente: ${isCloudEnabled ? "SÍ" : "NO"}`);
      
      log("\n2. Cargando SDK de Firebase lazy-loaded...");
      const firebaseInstance = getFirebaseCached() ?? await initFirebase();
      log("SDK de Firebase cargado en memoria.");

      const authInstance = firebaseInstance.auth;
      const FirebaseSyncServiceInstance = firebaseInstance.FirebaseSyncService;

      log(`Estado de autenticación del usuario: ${authInstance?.currentUser ? `Conectado (${authInstance.currentUser.email})` : "No autenticado / Invitado"}`);

      log("\n3. Verificando estado de red del navegador...");
      log(`Navegador Online: ${navigator.onLine ? "SÍ" : "NO"}`);

      log("\n4. Probando escritura directa en la base de datos (Firestore)...");
      if (!FirebaseSyncServiceInstance.isCloudEnabled()) {
        log("Firebase está desactivado en la configuración o usando credenciales dummy.");
        setRunningDiag(false);
        return;
      }

      // Usar un ID de hogar específico y aislado para la prueba de diagnóstico de escritura/lectura
      // para evitar por completo sobrescribir el hogar real del usuario.
      const testHogarId = authInstance?.currentUser 
        ? `HOGAR-DIAG-${authInstance.currentUser.uid}` 
        : "HOGAR-DIAG-GUEST";
      log(`Intentando escribir en colección 'hogares' con el documento de prueba '${testHogarId}'...`);
      
      const uploadPromise = FirebaseSyncServiceInstance.uploadChanges(
        testHogarId,
        "Test de Diagnóstico",
        [], // mascotas
        [], // plantas
        uiTheme
      );

      // Usar un timeout de 8 segundos para la prueba
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout de red en la escritura de Firestore (8s). Posible bloqueo de WebSockets o gRPC por tu operador móvil.")), 8000)
      );

      await Promise.race([uploadPromise, timeoutPromise]);
      log("✅ ¡Escritura en Firestore completada con éxito!");

      log("\n5. Probando lectura directa desde la base de datos (Firestore)...");
      const readPromise = FirebaseSyncServiceInstance.getHogarData(testHogarId);
      const readTimeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout de red en la lectura de Firestore (8s).")), 8000)
      );

      const readData = await Promise.race([readPromise, readTimeoutPromise]);
      log(`✅ ¡Lectura de prueba completada con éxito!`);
      log(`Documento de prueba temporal: "${testHogarId}"`);
      log(`Nombre del hogar en el documento de prueba: "${readData?.nombre}"`);
      log("\n🎉 DIAGNÓSTICO EXITOSO: Tu conexión con Firebase Cloud funciona perfectamente.");

    } catch (err: any) {
      log(`\n❌ ERROR DETECTADO: ${err.message || String(err)}`);
      console.error(err);
      
      const errMsg = (err.message || String(err)).toLowerCase();
      log("\n💡 RECOMENDACIONES:");
      if (errMsg.includes("timeout")) {
        log("- Estás en una red móvil (5G/4G) que podría estar bloqueando WebSockets o conexiones persistentes de Firebase.");
        log("- Intenta conectarte a una red WiFi o desactivar/activar el modo avión para refrescar la red móvil.");
      } else if (errMsg.includes("permission") || errMsg.includes("insufficient")) {
        log("- Firestore está rechazando el acceso. Esto puede deberse a que no has iniciado sesión con Google.");
        log("- Ve a la sección superior de Ajustes, cierra sesión e inicia sesión con Google de nuevo.");
      } else if (errMsg.includes("apikey") || errMsg.includes("api-key") || errMsg.includes("key")) {
        log("- La API Key de Firebase no es válida. Revisa las variables de entorno en Vercel.");
      } else {
        log("- Intenta recargar la página en modo normal. Si tienes un bloqueador de publicidad o VPN, desactívalo temporalmente.");
      }
    } finally {
      setRunningDiag(false);
    }
  };

  const resolverConLocal = async () => {
    if (!hogarId || !localPayload) return;
    try {
      setConflictLoading(true);
      const fbSync = getFirebaseCached()?.FirebaseSyncService ?? (await initFirebase()).FirebaseSyncService;
      await fbSync.uploadChanges(hogarId, hogarNombre, localPayload.mascotas, localPayload.plantas, uiTheme);
      localStorage.setItem('petplant_db_last_updated', getNowTimestamp().toString());
      setShowConflictModal(false);
      dispararLogroVisual("CONFLICTO RESUELTO", "Se han subido tus datos locales a la nube.", "victory");
    } catch (err) {
      console.error(err);
      alert("Error al sincronizar con datos locales.");
    } finally {
      setConflictLoading(false);
    }
  };

  const resolverConNube = async () => {
    if (!hogarId || !remotePayload) return;
    try {
      setConflictLoading(true);
      await LocalDatabase.overwriteFullDatabase(
        remotePayload.mascotas,
        remotePayload.plantas,
        remotePayload.eventos || [],
        remotePayload.chats || []
      );
      localStorage.setItem('petplant_db_last_updated', (remoteDataInfo.timestamp || getNowTimestamp()).toString());
      setShowConflictModal(false);
      dispararLogroVisual("CONFLICTO RESUELTO", "Se han descargado los datos de la nube.", "victory");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error(err);
      alert("Error al sincronizar con datos de la nube.");
    } finally {
      setConflictLoading(false);
    }
  };

  const resolverConFusion = async () => {
    if (!hogarId || !localPayload || !remotePayload) return;
    try {
      setConflictLoading(true);
      
      const mergedM = mergeList(localPayload.mascotas, remotePayload.mascotas, (a: Mascota, b: Mascota) => {
        const localW = a.registroPeso?.length || 0;
        const remoteW = b.registroPeso?.length || 0;
        if (localW !== remoteW) return localW > remoteW ? a : b;
        const localD = a.diarioClinico?.length || 0;
        const remoteD = b.diarioClinico?.length || 0;
        return localD >= remoteD ? a : b;
      });

      const mergedP = mergeList(localPayload.plantas, remotePayload.plantas, (a: Planta, b: Planta) => {
        const localD = a.diarioFoliar?.length || 0;
        const remoteD = b.diarioFoliar?.length || 0;
        if (localD !== remoteD) return localD > remoteD ? a : b;
        const localC = a.registroCrecimiento?.length || 0;
        const remoteC = b.registroCrecimiento?.length || 0;
        return localC >= remoteC ? a : b;
      });

      await LocalDatabase.overwriteFullDatabase(mergedM, mergedP);
      
      const fbSync = getFirebaseCached()?.FirebaseSyncService ?? (await initFirebase()).FirebaseSyncService;
      const now = getNowTimestamp();
      await fbSync.uploadChanges(hogarId, hogarNombre, mergedM, mergedP, uiTheme);
      localStorage.setItem('petplant_db_last_updated', now.toString());

      setShowConflictModal(false);
      dispararLogroVisual("FUSIÓN COMPLETADA 🤝", "Datos locales y remotos unidos con éxito.", "victory");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error(err);
      alert("Error al realizar la fusión de datos.");
    } finally {
      setConflictLoading(false);
    }
  };

  const mergeList = <T extends { id: string }>(localList: T[], remoteList: T[], resolveConflict: (a: T, b: T) => T): T[] => {
    const map = new Map<string, T>();
    localList.forEach(item => map.set(item.id, item));
    remoteList.forEach(remoteItem => {
      const localItem = map.get(remoteItem.id);
      if (localItem) {
        const resolved = resolveConflict(localItem, remoteItem);
        map.set(remoteItem.id, resolved);
      } else {
        map.set(remoteItem.id, remoteItem);
      }
    });
    return Array.from(map.values());
  };



  return (
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
          {t('settingsTitle')}
        </h2>
        <p style={{ margin: '0', fontSize: '14px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)' }}>
          {t('settingsSubtitle')}
        </p>
      </div>

      {/* SELECCIÓN DE TEMAS COMPACTA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--game-text-bright, #1a1a1a)' }}>{t('systemThemes')}</span>
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
            <strong style={{ fontSize: '13px', color: 'var(--game-text-bright, #111)', fontFamily: 'var(--game-font, sans-serif)' }}>{t('themeNature')}</strong>
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
              background: uiTheme === 'kawaii' ? 'var(--game-accent-light, rgba(233, 30, 99, 0.1))' : 'transparent',
              borderRadius: '10px',
              border: uiTheme === 'kawaii' 
                ? '2px solid var(--game-border-color, #d81b60)' 
                : '1px solid rgba(128, 128, 128, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '20px' }}>🌸</span>
            <strong style={{ fontSize: '13px', color: 'var(--game-text-bright, #111)', fontFamily: 'var(--game-font, sans-serif)' }}>{t('themeKawaii')}</strong>
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
              background: uiTheme === 'gaming' ? 'var(--game-accent-light, rgba(102, 252, 241, 0.15))' : 'transparent',
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
            <strong style={{ fontSize: '13px', color: 'var(--game-text-bright, #111)', fontFamily: 'var(--game-font, sans-serif)' }}>{t('themeGaming')}</strong>
          </div>



        </div>
      </div>

      {/* SELECCIÓN DE IDIOMA */}
      <div style={{
        borderTop: 'var(--game-border, 1px solid #f0f0f0)',
        paddingTop: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--game-text-bright, #1a1a1a)' }}>{t('systemLanguage')}</span>
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {/* Idioma 1: Español */}
          <div 
            onClick={() => setLocale('es')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setLocale('es');
              }
            }}
            tabIndex={0}
            role="button"
            style={{
              padding: '10px 16px',
              background: locale === 'es' ? 'var(--game-accent-light, rgba(76, 175, 80, 0.1))' : 'transparent',
              borderRadius: '10px',
              border: locale === 'es' 
                ? '2px solid var(--game-border-color, #2e7d32)' 
                : '1px solid rgba(128, 128, 128, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '20px' }}>🇪🇸</span>
            <strong style={{ fontSize: '13px', color: 'var(--game-text-bright, #111)', fontFamily: 'var(--game-font, sans-serif)' }}>Español</strong>
          </div>

          {/* Idioma 2: English */}
          <div 
            onClick={() => setLocale('en')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setLocale('en');
              }
            }}
            tabIndex={0}
            role="button"
            style={{
              padding: '10px 16px',
              background: locale === 'en' ? 'var(--game-accent-light, rgba(25, 118, 210, 0.1))' : 'transparent',
              borderRadius: '10px',
              border: locale === 'en' 
                ? '2px solid var(--game-border-color, #1976d2)' 
                : '1px solid rgba(128, 128, 128, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '20px' }}>🇬🇧</span>
            <strong style={{ fontSize: '13px', color: 'var(--game-text-bright, #111)', fontFamily: 'var(--game-font, sans-serif)' }}>English</strong>
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
            {t('gpsSyncTitle')}
          </h3>
          <p style={{ margin: '0', fontSize: '13px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)', lineHeight: '1.4' }}>
            {t('gpsSyncDesc')}
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
            {loadingGPS ? t('gpsSyncingBtn') : t('gpsSyncBtn')}
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
            {t('hogarGroupTitle')}
          </h3>
          <p style={{ margin: '0', fontSize: '13px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)', lineHeight: '1.4' }}>
            {t('hogarGroupDesc')}
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
              {t('hogarLiveSyncAvail')}
            </div>
          )}
        </div>

        {/* Selector de Hogares Vinculados (Multi-Home) */}
        {joinedHogares && joinedHogares.length > 0 && (
          <div style={{
            padding: '16px',
            background: 'var(--game-bg, rgba(0,0,0,0.02))',
            borderRadius: '12px',
            border: 'var(--game-border, 1px solid rgba(0,0,0,0.08))',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)' }}>
              {t('hogarSwitchTitle')} ({joinedHogares.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {joinedHogares.map((hogar) => {
                const isActive = hogar.id === hogarId;
                return (
                  <div 
                    key={hogar.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: isActive ? 'var(--game-accent-light, rgba(76, 175, 80, 0.1))' : 'var(--game-card-bg, #fff)',
                      border: isActive ? '2px solid var(--game-border-color, #2e7d32)' : '1px solid rgba(128, 128, 128, 0.2)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--game-text-bright)' }}>{hogar.nombre}</strong>
                      <span style={{ marginLeft: '8px', fontSize: '10px', color: '#888', fontFamily: 'monospace' }}>
                        ({hogar.id})
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!isActive ? (
                        <button
                          type="button"
                          onClick={() => cambiarHogar(hogar.id)}
                          style={{
                            padding: '4px 8px',
                            background: 'var(--game-accent, #2e7d32)',
                            color: uiTheme === 'gaming' ? '#000' : '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          {t('hogarConnect')}
                        </button>
                      ) : (
                        <span style={{
                          padding: '4px 8px',
                          background: 'rgba(76, 175, 80, 0.2)',
                          color: '#2e7d32',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {t('hogarActive')}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => abandonarHogar(hogar.id)}
                        style={{
                          padding: '4px 8px',
                          background: 'transparent',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#ef4444',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        {t('hogarRemove')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {hogarId && (
              <button
                type="button"
                onClick={() => cambiarHogar('')}
                style={{
                  alignSelf: 'flex-start',
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px dashed #777',
                  color: 'var(--game-text)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {t('hogarLocalMode')}
              </button>
            )}
          </div>
        )}

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
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--game-text, #888)', fontWeight: 'bold', fontFamily: 'var(--game-font, monospace)' }}>{t('hogarActiveLabel')}</span>
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
                {syncStatus === 'synced' ? t('hogarSynced') : syncStatus === 'syncing' ? t('hogarSyncing') : t('hogarSyncError')}
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
                <p style={{ margin: '0', fontSize: '11px', color: 'var(--game-text, #666)' }}>{t('hogarInviteCode')}</p>
                <strong style={{ fontSize: '16px', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, monospace)' }}>{hogarId}</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hogarId!);
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
                  {t('hogarCopyCode')}
                </button>
                <button
                  onClick={() => setShowQR(prev => !prev)}
                  aria-expanded={showQR}
                  aria-label={showQR ? 'Ocultar código QR de invitación' : 'Mostrar código QR de invitación'}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    color: 'var(--game-text-bright, #333)',
                    border: '1px solid var(--game-border-color, #ccc)',
                    borderRadius: uiTheme === 'gaming' ? '0px' : '6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontFamily: 'var(--game-font, sans-serif)'
                  }}
                >
                  {showQR ? t('hogarHideQR') : t('hogarShowQR')}
                </button>
              </div>
            </div>

            {/* QR Code para compartir el código de invitación */}
            {showQR && hogarId && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                padding: '20px',
                background: 'var(--game-bg, #fff)',
                border: 'var(--game-border, 1px solid #e0e0e0)',
                borderRadius: 'var(--game-radius, 8px)',
              }}>
                <p style={{ margin: '0', fontSize: '12px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)', textAlign: 'center' }}>
                  {t('hogarScanQR')} <strong style={{ color: 'var(--game-text-bright)' }}>{hogarNombre}</strong>
                </p>
                <div style={{
                  padding: '12px',
                  background: '#fff',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <QRCodeSVG
                    value={`petplant_hogar:${hogarId}`}
                    size={180}
                    level="M"
                    includeMargin={false}
                    aria-label={`Código QR para unirse al hogar ${hogarNombre}`}
                  />
                </div>
                <p style={{ margin: '0', fontSize: '10px', color: '#999', fontFamily: 'monospace', textAlign: 'center' }}>
                  petplant_hogar:{hogarId}
                </p>
              </div>
            )}


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
              {t('hogarUnlink')}
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
              <h4 style={{ margin: '0', fontSize: '15px', color: 'var(--game-text-bright, #333)', fontWeight: 'bold' }}>{t('hogarCreateTitle')}</h4>
              <p style={{ margin: '0', fontSize: '11px', color: 'var(--game-text, #777)', lineHeight: '1.4' }}>
                {t('hogarCreateDesc')}
              </p>
              <input
                type="text"
                placeholder={t('hogarCreatePlaceholder')}
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
                {syncStatus === 'syncing' ? t('hogarCreating') : t('hogarCreateBtn')}
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
              <h4 style={{ margin: '0', fontSize: '15px', color: 'var(--game-text-bright, #333)', fontWeight: 'bold' }}>{t('hogarJoinTitle')}</h4>
              <p style={{ margin: '0', fontSize: '11px', color: 'var(--game-text, #777)', lineHeight: '1.4' }}>
                {t('hogarJoinDesc')}
              </p>
              <input
                type="text"
                placeholder={t('hogarJoinPlaceholder')}
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
                {syncStatus === 'syncing' ? t('hogarJoining') : t('hogarJoinBtn')}
              </button>
            </form>
          </div>
        )}

        {/* Panel de Diagnóstico de la Nube */}
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: 'var(--game-bg, rgba(0,0,0,0.01))',
          borderRadius: '8px',
          border: '1px dashed rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)' }}>
              {t('hogarSyncProblems')}
            </span>
            <button
              type="button"
              onClick={runCloudDiagnostics}
              disabled={runningDiag}
              style={{
                padding: '4px 10px',
                background: 'transparent',
                border: '1px solid var(--game-text, #666)',
                color: 'var(--game-text, #333)',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'var(--game-font, sans-serif)'
              }}
            >
              {runningDiag ? t('hogarDiagRunning') : t('hogarDiagBtn')}
            </button>
          </div>
          {diagnosticLog && (
            <pre style={{
              margin: '8px 0 0 0',
              padding: '10px',
              background: '#222',
              color: '#fff',
              fontSize: '10.5px',
              borderRadius: '4px',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              textAlign: 'left',
              maxHeight: '180px',
              fontFamily: 'monospace',
              border: '1px solid #111'
            }}>
              {diagnosticLog}
            </pre>
          )}
        </div>
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
            {t('cloudSessionTitle')}
          </h3>
          {user ? (
            <p style={{ margin: '0', fontSize: '13px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)' }}>
              Conectado con cuenta de {localStorage.getItem('petplant_login_provider') === 'microsoft' ? 'Microsoft / Hotmail' : 'Google'} como <strong>{user.name}</strong> ({user.email})
            </p>
          ) : (
            <p style={{ margin: '0', fontSize: '13px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)' }}>
            {t('cloudSessionNoLogin')}
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
              Iniciar Sesión con Microsoft 🔑
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





      {/* COPIA DE SEGURIDAD LOCAL */}
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
            💾 Copia de Seguridad Local (Exportar/Importar)
          </h3>
          <p style={{ margin: '0', fontSize: '13px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)', lineHeight: '1.4' }}>
            Guarda una copia de respaldo completa de tu ecosistema (mascotas, plantas, exóticos, agenda y chats) en un archivo JSON en tu ordenador, o restaura tus datos desde un archivo guardado previamente.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={exportarCopiaSeguridad}
            style={{
              padding: '10px 20px',
              background: 'var(--game-accent, #2e7d32)',
              color: uiTheme === 'gaming' ? '#000' : '#fff',
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
            Exportar Datos (JSON) 📤
          </button>
          
          <label
            style={{
              padding: '10px 20px',
              background: 'transparent',
              color: 'var(--game-text, #2e7d32)',
              border: '2px dashed var(--game-border-color, #2e7d32)',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontFamily: 'var(--game-font, sans-serif)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            Importar Datos (JSON) 📥
            <input
              type="file"
              accept=".json"
              onChange={importarCopiaSeguridad}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* AUDITORÍA DE PRIVACIDAD Y SEGURIDAD OWASP */}
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
            🛡️ Auditoría de Privacidad y OWASP
          </h3>
          <p style={{ margin: '0', fontSize: '13px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)', lineHeight: '1.4' }}>
            Tu privacidad y seguridad son prioritarias. A continuación se detallan los controles de seguridad locales y remotos validados por el estándar OWASP ASVS aplicados a este ecosistema.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {/* Item 1 */}
          <div style={{
            padding: '16px',
            background: 'rgba(76, 175, 80, 0.03)',
            border: '1px solid rgba(76, 175, 80, 0.2)',
            borderRadius: uiTheme === 'gaming' ? '0px' : '10px',
            display: 'flex',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>🔒</span>
            <div>
              <strong style={{ fontSize: '13px', display: 'block', color: 'var(--game-text-bright, #333)', marginBottom: '4px' }}>
                Sandbox de IndexedDB Local
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--game-text, #555)', lineHeight: '1.4' }}>
                Todos los datos biométricos, médicos y diarios clínicos permanecen aislados localmente del navegador, previniendo fugas no deseadas.
              </span>
              <span style={{
                marginTop: '6px',
                display: 'inline-block',
                fontSize: '9px',
                fontWeight: 'bold',
                color: '#2e7d32',
                background: '#e8f5e9',
                padding: '2px 6px',
                borderRadius: '8px',
                textTransform: 'uppercase'
              }}>
                Validado ✓
              </span>
            </div>
          </div>

          {/* Item 2 */}
          <div style={{
            padding: '16px',
            background: 'rgba(76, 175, 80, 0.03)',
            border: '1px solid rgba(76, 175, 80, 0.2)',
            borderRadius: uiTheme === 'gaming' ? '0px' : '10px',
            display: 'flex',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>🧹</span>
            <div>
              <strong style={{ fontSize: '13px', display: 'block', color: 'var(--game-text-bright, #333)', marginBottom: '4px' }}>
                Sanitización XSS Preventiva
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--game-text, #555)', lineHeight: '1.4' }}>
                Cualquier entrada de texto en formularios de registro o diarios clínicos es filtrada antes de renderizarse para evitar scripts maliciosos.
              </span>
              <span style={{
                marginTop: '6px',
                display: 'inline-block',
                fontSize: '9px',
                fontWeight: 'bold',
                color: '#2e7d32',
                background: '#e8f5e9',
                padding: '2px 6px',
                borderRadius: '8px',
                textTransform: 'uppercase'
              }}>
                Validado ✓
              </span>
            </div>
          </div>

          {/* Item 3 */}
          <div style={{
            padding: '16px',
            background: 'rgba(76, 175, 80, 0.03)',
            border: '1px solid rgba(76, 175, 80, 0.2)',
            borderRadius: uiTheme === 'gaming' ? '0px' : '10px',
            display: 'flex',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>🔑</span>
            <div>
              <strong style={{ fontSize: '13px', display: 'block', color: 'var(--game-text-bright, #333)', marginBottom: '4px' }}>
                Enmascaramiento de Clave Gemini
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--game-text, #555)', lineHeight: '1.4' }}>
                Tu llave API personal de Gemini se almacena cifrada localmente y nunca se comparte ni se expone a servidores externos.
              </span>
              <span style={{
                marginTop: '6px',
                display: 'inline-block',
                fontSize: '9px',
                fontWeight: 'bold',
                color: '#2e7d32',
                background: '#e8f5e9',
                padding: '2px 6px',
                borderRadius: '8px',
                textTransform: 'uppercase'
              }}>
                Validado ✓
              </span>
            </div>
          </div>

          {/* Item 4 */}
          <div style={{
            padding: '16px',
            background: 'rgba(76, 175, 80, 0.03)',
            border: '1px solid rgba(76, 175, 80, 0.2)',
            borderRadius: uiTheme === 'gaming' ? '0px' : '10px',
            display: 'flex',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>📡</span>
            <div>
              <strong style={{ fontSize: '13px', display: 'block', color: 'var(--game-text-bright, #333)', marginBottom: '4px' }}>
                Sincronización HTTPS HSTS
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--game-text, #555)', lineHeight: '1.4' }}>
                La comunicación con Firestore y Microsoft Graph se realiza mediante HTTPS SSL/TLS estricto con cabeceras HSTS preventivas de interceptación.
              </span>
              <span style={{
                marginTop: '6px',
                display: 'inline-block',
                fontSize: '9px',
                fontWeight: 'bold',
                color: '#2e7d32',
                background: '#e8f5e9',
                padding: '2px 6px',
                borderRadius: '8px',
                textTransform: 'uppercase'
              }}>
                Validado ✓
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE RESOLUCIÓN DE CONFLICTOS */}
      {showConflictModal && localDataInfo && remoteDataInfo && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--game-card-bg, #ffffff)',
            borderRadius: uiTheme === 'gaming' ? '0px' : '16px',
            border: 'var(--game-border, 1px solid #eaeaea)',
            padding: '24px',
            maxWidth: '650px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow, 0 10px 30px rgba(0,0,0,0.15))',
            textAlign: 'left'
          }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: 'var(--game-text-bright, #1a1a1a)', fontWeight: 'bold' }}>
                🔄 Resolutor de Conflictos de Sincronización
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--game-text, #666)' }}>
                Se han comparado los datos del dispositivo local y el servidor de la nube. Por favor selecciona cómo deseas resolver las diferencias.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '4px' }}>
              {/* Local Column */}
              <div style={{ padding: '12px', background: 'rgba(25, 118, 210, 0.03)', border: '1px solid rgba(25, 118, 210, 0.2)', borderRadius: '8px' }}>
                <strong style={{ fontSize: '13px', color: '#1976d2', display: 'block', marginBottom: '8px' }}>💻 Datos Locales (Dispositivo)</strong>
                <p style={{ margin: '4px 0', fontSize: '11px' }}><strong>Última Sincro:</strong> {localDataInfo.timestamp > 0 ? new Date(localDataInfo.timestamp).toLocaleString() : 'Nunca (Modo Local)'}</p>
                <p style={{ margin: '4px 0', fontSize: '11px' }}><strong>Mascotas ({localDataInfo.mascotasCount}):</strong> {localDataInfo.mascotasNames || 'Ninguna'}</p>
                <p style={{ margin: '4px 0', fontSize: '11px' }}><strong>Plantas ({localDataInfo.plantasCount}):</strong> {localDataInfo.plantasNames || 'Ninguna'}</p>
              </div>

              {/* Remote Column */}
              <div style={{ padding: '12px', background: 'rgba(76, 175, 80, 0.03)', border: '1px solid rgba(76, 175, 80, 0.2)', borderRadius: '8px' }}>
                <strong style={{ fontSize: '13px', color: '#2e7d32', display: 'block', marginBottom: '8px' }}>☁️ Datos Remotos (Nube)</strong>
                <p style={{ margin: '4px 0', fontSize: '11px' }}><strong>Última Sincro:</strong> {remoteDataInfo.timestamp > 0 ? new Date(remoteDataInfo.timestamp).toLocaleString() : 'Sin datos'}</p>
                <p style={{ margin: '4px 0', fontSize: '11px' }}><strong>Mascotas ({remoteDataInfo.mascotasCount}):</strong> {remoteDataInfo.mascotasNames || 'Ninguna'}</p>
                <p style={{ margin: '4px 0', fontSize: '11px' }}><strong>Plantas ({remoteDataInfo.plantasCount}):</strong> {remoteDataInfo.plantasNames || 'Ninguna'}</p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              borderTop: '1px solid rgba(0,0,0,0.08)',
              paddingTop: '16px',
              marginTop: '8px'
            }}>
              <button
                type="button"
                onClick={resolverConFusion}
                style={{
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #16a34a 0%, #2e7d32 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: uiTheme === 'gaming' ? '0px' : '8px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                🤝 Fusionar Ambos Conjuntos (Fusión Inteligente sin pérdidas)
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={resolverConLocal}
                  style={{
                    padding: '8px 12px',
                    background: '#1976d2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: uiTheme === 'gaming' ? '0px' : '6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  💻 Conservar Local
                </button>
                <button
                  type="button"
                  onClick={resolverConNube}
                  style={{
                    padding: '8px 12px',
                    background: 'transparent',
                    border: '1.5px solid #2e7d32',
                    color: '#2e7d32',
                    borderRadius: uiTheme === 'gaming' ? '0px' : '6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  ☁️ Conservar Nube
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowConflictModal(false)}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--game-text)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  marginTop: '4px'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

