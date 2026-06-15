import React from 'react';
import type { DatosClimaticos } from '../services/weatherService';

interface ExtremeWeatherPanelProps {
  clima: DatosClimaticos | null;
  gpsSyncEnabled: 'undecided' | 'active' | 'inactive';
  handleGPSToggle: () => void;
  sincronizarTodasLasPlantasPorGPS: () => void;
  loadingGPS: boolean;
  theme?: string;
}

interface AlertaClimatica {
  tipo: 'danger' | 'warning' | 'info' | 'success';
  titulo: string;
  mensaje: string;
  riesgoMascotas: string;
  riesgoPlantas: string;
  icon: string;
}

export const ExtremeWeatherPanel: React.FC<ExtremeWeatherPanelProps> = ({
  clima,
  gpsSyncEnabled,
  handleGPSToggle,
  sincronizarTodasLasPlantasPorGPS,
  loadingGPS,
  theme = 'nature'
}) => {

  const obtenerAlertasClimaticas = (c: DatosClimaticos | null): AlertaClimatica[] => {
    if (!c) return [];
    const alerts: AlertaClimatica[] = [];
    const temp = c.temperatura;
    const hum = c.humedad;

    // 1. Calor Extremo
    if (temp > 32) {
      alerts.push({
        tipo: 'danger',
        titulo: `🔥 OLA DE CALOR EXTREMA (${Math.round(temp)}°C)`,
        icon: '🥵',
        mensaje: 'La temperatura supera los 32°C. Es fundamental tomar medidas preventivas inmediatas.',
        riesgoMascotas: 'Peligro inminente de golpe de calor. Evita pasear sobre asfalto caliente (quema almohadillas), no los dejes en vehículos y asegura agua fresca continua.',
        riesgoPlantas: 'Deshidratación y quemaduras foliares. Mueve las plantas sensibles a la sombra, riega temprano o al atardecer y pulveriza agua para elevar la humedad.'
      });
    }

    // 2. Frío Extremo
    if (temp < 10) {
      alerts.push({
        tipo: 'danger',
        titulo: `❄️ OLA DE FRÍO EXTREMO (${Math.round(temp)}°C)`,
        icon: '🥶',
        mensaje: 'La temperatura está por debajo de los 10°C. Protege del frío a tus plantas y animales.',
        riesgoMascotas: 'Riesgo de hipotermia en cachorros, ancianos o pelo corto. Mantén las camas resguardadas e introduce a las mascotas sensibles en interiores.',
        riesgoPlantas: 'Riesgo de heladas y necrosis radicular. Protege las plantas tropicales de corrientes de aire helado y traslada macetas a zonas resguardadas.'
      });
    }

    // 3. Sequedad Extrema
    if (hum < 30) {
      alerts.push({
        tipo: 'warning',
        titulo: `🏜️ SEQUEDAD EXTREMA EN EL AMBIENTE (${Math.round(hum)}% HR)`,
        icon: '🌵',
        mensaje: 'La humedad relativa es inferior al 30%. Clima extremadamente seco.',
        riesgoMascotas: 'Aumento de la transpiración y fatiga. Proporciona agua limpia y fresca constantemente, e incentiva su consumo con fuentes en movimiento.',
        riesgoPlantas: 'El compost se seca muy rápido. Agrupa las plantas para crear un microclima compartido y coloca platos con grava húmeda bajo las macetas.'
      });
    }

    // 4. Humedad Extrema
    if (hum > 85) {
      alerts.push({
        tipo: 'info',
        titulo: `🌧️ HUMEDAD AMBIENTAL SATURADA (${Math.round(hum)}% HR)`,
        icon: '🍄',
        mensaje: 'La humedad relativa supera el 85%. Riesgo fúngico y bacteriano elevado.',
        riesgoMascotas: 'Riesgo de dermatitis en el pelaje y problemas respiratorios. Mantén las zonas de descanso secas, limpias y bien ventiladas.',
        riesgoPlantas: 'Alto riesgo de hongos (mildiú, oídio) y pudrición radicular. Suspende riegos en cactus/suculentas y ventila bien el espacio de cultivo.'
      });
    }

    // 5. Confortable (Si no hay alertas extremas)
    if (alerts.length === 0) {
      alerts.push({
        tipo: 'success',
        titulo: `🌤️ CONDICIONES ÓPTIMAS (${Math.round(temp)}°C - ${Math.round(hum)}% HR)`,
        icon: '✨',
        mensaje: 'Condiciones climáticas idóneas para tu ecosistema. No hay alertas extremas activas.',
        riesgoMascotas: 'Clima ideal para paseos, actividad al aire libre y bienestar general de tus mascotas.',
        riesgoPlantas: 'Ambiente perfecto para el desarrollo de brotes, fotosíntesis eficiente y absorción de riego balanceada.'
      });
    }

    return alerts;
  };

  const alertas = obtenerAlertasClimaticas(clima);

  return (
    <div style={{
      background: 'var(--game-card-bg, #ffffff)',
      borderRadius: theme === 'gaming' ? '4px' : '16px',
      border: 'var(--game-border, 1px solid #f0f0f0)',
      padding: '20px',
      boxShadow: 'var(--game-shadow, 0 4px 20px rgba(0,0,0,0.03))',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxSizing: 'border-box',
      width: '100%'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        paddingBottom: '12px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🌡️</span>
          <h3 style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 'bold',
            color: 'var(--game-text-bright, #2c3e50)',
            fontFamily: 'var(--game-font, sans-serif)'
          }}>
            Panel de Diagnóstico Climatológico y Alertas
          </h3>
        </div>
        
        {gpsSyncEnabled === 'active' && (
          <button
            onClick={sincronizarTodasLasPlantasPorGPS}
            disabled={loadingGPS}
            style={{
              padding: '6px 12px',
              background: 'rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: theme === 'gaming' ? '0px' : '20px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              color: 'var(--game-text-bright)',
              fontFamily: 'var(--game-font, sans-serif)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {loadingGPS ? 'Sincronizando...' : 'Actualizar clima 🔄'}
          </button>
        )}
      </div>

      {/* Main Content */}
      {gpsSyncEnabled !== 'active' ? (
        // GPS Inactivo
        <div style={{
          padding: '24px 16px',
          textAlign: 'center',
          background: 'rgba(0,0,0,0.01)',
          borderRadius: '12px',
          border: '1px dashed rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '32px' }}>🛰️</span>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--game-text-bright)', fontWeight: 'bold' }}>
              Monitoreo Satelital de Clima Extremo Inactivo
            </h4>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--game-text, #666)', lineHeight: '1.4', maxWidth: '400px' }}>
              Activa la sincronización GPS para obtener mediciones de temperatura y humedad en tiempo real y recibir alertas automatizadas para tus mascotas y plantas.
            </p>
          </div>
          <button
            onClick={handleGPSToggle}
            style={{
              padding: '8px 18px',
              background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: theme === 'gaming' ? '0' : '20px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.2)',
              fontFamily: 'var(--game-font, sans-serif)'
            }}
          >
            Activar Sincronización GPS 🛰️
          </button>
        </div>
      ) : !clima ? (
        // GPS Activo pero cargando / sin datos
        <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
          Esperando lecturas del sensor satelital GPS... 🛰️
        </div>
      ) : (
        // GPS Activo con Clima cargado
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Alertas Render */}
          {alertas.map((alerta, index) => {
            const isDanger = alerta.tipo === 'danger';
            const isWarning = alerta.tipo === 'warning';

            
            // Colores adaptativos premium
            let borderCol = 'rgba(76, 175, 80, 0.4)';
            let bgCol = 'rgba(76, 175, 80, 0.04)';
            let titleCol = '#2e7d32';

            if (isDanger) {
              borderCol = 'rgba(239, 68, 68, 0.5)';
              bgCol = 'rgba(239, 68, 68, 0.05)';
              titleCol = '#c62828';
            } else if (isWarning) {
              borderCol = 'rgba(245, 158, 11, 0.5)';
              bgCol = 'rgba(245, 158, 11, 0.05)';
              titleCol = '#ef6c00';
            } else if (alerta.tipo === 'info') {
              borderCol = 'rgba(59, 130, 246, 0.5)';
              bgCol = 'rgba(59, 130, 246, 0.05)';
              titleCol = '#1565c0';
            }

            return (
              <div
                key={index}
                style={{
                  border: `1.5px solid ${borderCol}`,
                  background: bgCol,
                  borderRadius: theme === 'gaming' ? '0px' : '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'all 0.3s'
                }}
              >
                {/* Alerta Title Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>{alerta.icon}</span>
                  <strong style={{ fontSize: '13px', color: titleCol, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {alerta.titulo}
                  </strong>
                </div>

                <p style={{ margin: 0, fontSize: '12px', color: 'var(--game-text-bright, #333)', lineHeight: '1.4' }}>
                  {alerta.mensaje}
                </p>

                {/* Columnas de Diagnóstico adaptativo */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '14px',
                  borderTop: '1px solid rgba(0,0,0,0.05)',
                  paddingTop: '12px'
                }}>
                  {/* Mascotas */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    background: 'var(--game-card-bg, #ffffff)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.03)'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1565c0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🐾 Cuidado de Mascotas
                    </span>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--game-text, #555)', lineHeight: '1.4' }}>
                      {alerta.riesgoMascotas}
                    </p>
                  </div>

                  {/* Plantas */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    background: 'var(--game-card-bg, #ffffff)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.03)'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#2e7d32', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🌿 Manejo de Cultivo
                    </span>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--game-text, #555)', lineHeight: '1.4' }}>
                      {alerta.riesgoPlantas}
                    </p>
                  </div>
                </div>

              </div>
            );
          })}
          
        </div>
      )}
    </div>
  );
};
