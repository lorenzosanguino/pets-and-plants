import React from 'react';

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
  forzarSubidaNube: () => void;
  forzarDescargaNube: () => void;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deferredPrompt: any;
  handleInstallPWA: () => void;
  exportarCopiaSeguridad: () => void;
  importarCopiaSeguridad: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  forzarSubidaNube,
  forzarDescargaNube,
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
  importarCopiaSeguridad
}) => {
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
            <strong style={{ fontSize: '13px', color: 'var(--game-text-bright, #111)', fontFamily: 'var(--game-font, sans-serif)' }}>Naturaleza</strong>
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
            <strong style={{ fontSize: '13px', color: 'var(--game-text-bright, #111)', fontFamily: 'var(--game-font, sans-serif)' }}>Kawaii</strong>
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

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '12px',
              background: 'rgba(25, 118, 210, 0.05)',
              border: '1px dashed rgba(25, 118, 210, 0.3)',
              borderRadius: 'var(--game-radius, 8px)'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--game-accent, #1976d2)', fontFamily: 'var(--game-font, monospace)' }}>
                Sincronización Manual Forzada
              </span>
              <p style={{ margin: '0', fontSize: '11px', color: 'var(--game-text, #666)' }}>
                Si la sincronización automática tarda o quieres resolver conflictos, usa estos botones:
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                <button
                  onClick={forzarSubidaNube}
                  style={{
                    padding: '8px 14px',
                    background: '#1976d2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: uiTheme === 'gaming' ? '0px' : '6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontFamily: 'var(--game-font, sans-serif)'
                  }}
                >
                  Subir Datos a la Cuenta ⬆️
                </button>
                <button
                  onClick={forzarDescargaNube}
                  style={{
                    padding: '8px 14px',
                    background: '#2e7d32',
                    color: '#fff',
                    border: 'none',
                    borderRadius: uiTheme === 'gaming' ? '0px' : '6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontFamily: 'var(--game-font, sans-serif)'
                  }}
                >
                  Descargar Datos de la Cuenta ⬇️
                </button>
              </div>
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

    </div>
  );
};
