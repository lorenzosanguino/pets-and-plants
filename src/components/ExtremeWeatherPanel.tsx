import React from 'react';
import type { DatosClimaticos } from '../services/weatherService';
import { useTranslations } from '../utils/i18n';
import { WeatherFXOverlay } from './WeatherFXOverlay';

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
  const { t, locale } = useTranslations();
  const isEn = locale === 'en';

  const obtenerAlertasClimaticas = (c: DatosClimaticos | null): AlertaClimatica[] => {
    if (!c) return [];
    const alerts: AlertaClimatica[] = [];
    const temp = c.temperatura;
    const hum = c.humedad;

    // 1. Extreme Heat
    if (temp > 32) {
      alerts.push({
        tipo: 'danger',
        titulo: isEn
          ? `🔥 EXTREME HEATWAVE (${Math.round(temp)}°C)`
          : `🔥 OLA DE CALOR EXTREMA (${Math.round(temp)}°C)`,
        icon: '🥵',
        mensaje: isEn
          ? 'Temperature exceeds 32°C. Taking immediate preventive measures is essential.'
          : 'La temperatura supera los 32°C. Es fundamental tomar medidas preventivas inmediatas.',
        riesgoMascotas: isEn
          ? 'Imminent danger of heat stroke. Avoid walking on hot asphalt (burns pads), do not leave them in vehicles, and ensure continuous fresh water.'
          : 'Peligro inminente de golpe de calor. Evita pasear sobre asfalto caliente (quema almohadillas), no los dejes en vehículos y asegura agua fresca continua.',
        riesgoPlantas: isEn
          ? 'Dehydration and leaf burns. Move sensitive plants to shade, water early or at dusk, and spray water to raise humidity.'
          : 'Deshidratación y quemaduras foliares. Mueve las plantas sensibles a la sombra, riega temprano o al atardecer y pulveriza agua para elevar la humedad.'
      });
    }

    // 2. Extreme Cold
    if (temp < 10) {
      alerts.push({
        tipo: 'danger',
        titulo: isEn
          ? `❄️ EXTREME COLD WAVE (${Math.round(temp)}°C)`
          : `❄️ OLA DE FRÍO EXTREMO (${Math.round(temp)}°C)`,
        icon: '🥶',
        mensaje: isEn
          ? 'Temperature is below 10°C. Protect your plants and animals from the cold.'
          : 'La temperatura está por debajo de los 10°C. Protege del frío a tus plantas y animales.',
        riesgoMascotas: isEn
          ? 'Risk of hypothermia in puppies, seniors, or short-haired pets. Keep beds sheltered and bring sensitive pets indoors.'
          : 'Riesgo de hipotermia en cachorros, ancianos o pelo corto. Mantén las camas resguardadas e introduce a las mascotas sensibles en interiores.',
        riesgoPlantas: isEn
          ? 'Risk of frost and root necrosis. Protect tropical plants from freezing drafts and move pots to sheltered areas.'
          : 'Riesgo de heladas y necrosis radicular. Protege las plantas tropicales de corrientes de aire helado y traslada macetas a zonas resguardadas.'
      });
    }

    // 3. Extreme Dryness
    if (hum < 30) {
      alerts.push({
        tipo: 'warning',
        titulo: isEn
          ? `🏜️ EXTREME DRYNESS IN THE AIR (${Math.round(hum)}% RH)`
          : `🏜️ SEQUEDAD EXTREMA EN EL AMBIENTE (${Math.round(hum)}% HR)`,
        icon: '🌵',
        mensaje: isEn
          ? 'Relative humidity is below 30%. Extremely dry weather.'
          : 'La humedad relativa es inferior al 30%. Clima extremadamente seco.',
        riesgoMascotas: isEn
          ? 'Increased perspiration and fatigue. Provide clean, fresh water constantly, and encourage drinking with moving fountains.'
          : 'Aumento de la transpiración y fatiga. Proporciona agua limpia y fresca constantemente, e incentiva su consumo con fuentes en movimiento.',
        riesgoPlantas: isEn
          ? 'Compost dries very fast. Group plants to create a shared microclimate and place saucers with wet gravel under the pots.'
          : 'El compost se seca muy rápido. Agrupa las plantas para crear un microclima compartido y coloca platos con grava húmeda bajo las macetas.'
      });
    }

    // 4. Extreme Humidity
    if (hum > 85) {
      alerts.push({
        tipo: 'info',
        titulo: isEn
          ? `🌧️ SATURATED AIR HUMIDITY (${Math.round(hum)}% RH)`
          : `🌧️ HUMEDAD AMBIENTAL SATURADA (${Math.round(hum)}% HR)`,
        icon: '🍄',
        mensaje: isEn
          ? 'Relative humidity exceeds 85%. High fungal and bacterial risk.'
          : 'La humedad relativa supera el 85%. Riesgo fúngico y bacteriano elevado.',
        riesgoMascotas: isEn
          ? 'Risk of coat dermatitis and respiratory problems. Keep sleeping areas dry, clean, and well ventilated.'
          : 'Riesgo de dermatitis en el pelaje y problemas respiratorios. Mantén las zonas de descanso secas, limpias y bien ventiladas.',
        riesgoPlantas: isEn
          ? 'High risk of fungi (mildew, powdery mildew) and root rot. Suspend watering for cacti/succulents and ventilate the growing space well.'
          : 'Alto riesgo de hongos (mildiú, oídio) y pudrición radicular. Suspende riegos en cactus/suculentas y ventila bien el espacio de cultivo.'
      });
    }

    // 5. Comfortable (no extreme alerts)
    if (alerts.length === 0) {
      alerts.push({
        tipo: 'success',
        titulo: isEn
          ? `🌤️ OPTIMAL CONDITIONS (${Math.round(temp)}°C - ${Math.round(hum)}% RH)`
          : `🌤️ CONDICIONES ÓPTIMAS (${Math.round(temp)}°C - ${Math.round(hum)}% HR)`,
        icon: '✨',
        mensaje: isEn
          ? 'Ideal weather conditions for your ecosystem. No active extreme alerts.'
          : 'Condiciones climáticas idóneas para tu ecosistema. No hay alertas extremas activas.',
        riesgoMascotas: isEn
          ? 'Ideal weather for walks, outdoor activity, and general pet well-being.'
          : 'Clima ideal para paseos, actividad al aire libre y bienestar general de tus mascotas.',
        riesgoPlantas: isEn
          ? 'Perfect environment for shoot development, efficient photosynthesis, and balanced watering absorption.'
          : 'Ambiente perfecto para el desarrollo de brotes, fotosíntesis eficiente y absorción de riego balanceada.'
      });
    }

    return alerts;
  };

  const alertas = obtenerAlertasClimaticas(clima);

  const tiposAlerta = alertas.map(a => a.tipo);
  let tipoMaximo: 'danger' | 'warning' | 'info' | 'success' = 'success';
  if (tiposAlerta.includes('danger')) {
    tipoMaximo = 'danger';
  } else if (tiposAlerta.includes('warning')) {
    tipoMaximo = 'warning';
  } else if (tiposAlerta.includes('info')) {
    tipoMaximo = 'info';
  }

  let borderCol = 'rgba(76, 175, 80, 0.4)';
  let bgCol = 'rgba(76, 175, 80, 0.04)';

  if (tipoMaximo === 'danger') {
    borderCol = 'rgba(239, 68, 68, 0.5)';
    bgCol = 'rgba(239, 68, 68, 0.05)';
  } else if (tipoMaximo === 'warning') {
    borderCol = 'rgba(245, 158, 11, 0.5)';
    bgCol = 'rgba(245, 158, 11, 0.05)';
  } else if (tipoMaximo === 'info') {
    borderCol = 'rgba(59, 130, 246, 0.5)';
    bgCol = 'rgba(59, 130, 246, 0.05)';
  }

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
      width: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <WeatherFXOverlay clima={clima} opacity={0.08} />
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
            {t('weatherPanelTitle')}
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
            {loadingGPS ? t('weatherUpdating') : t('weatherUpdateBtn')}
          </button>
        )}
      </div>

      {/* Main Content */}
      {gpsSyncEnabled !== 'active' ? (
        // GPS Inactive
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
              {t('weatherInactiveTitle')}
            </h4>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--game-text, #666)', lineHeight: '1.4', maxWidth: '400px' }}>
              {t('weatherInactiveDesc')}
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
            {t('weatherActiveGpsBtn')}
          </button>
        </div>
      ) : !clima ? (
        // GPS Active but loading / no data
        <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
          {t('weatherWaitingGps')}
        </div>
      ) : (
        // GPS Active with climate data loaded
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Unified Alerts Render */}
          <div
            style={{
              border: `1.5px solid ${borderCol}`,
              background: bgCol,
              borderRadius: theme === 'gaming' ? '0px' : '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              transition: 'all 0.3s'
            }}
          >
            {/* Active Alerts List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {alertas.map((alerta, idx) => {
                let alertaTitleCol = '#2e7d32';
                if (alerta.tipo === 'danger') alertaTitleCol = '#c62828';
                else if (alerta.tipo === 'warning') alertaTitleCol = '#ef6c00';
                else if (alerta.tipo === 'info') alertaTitleCol = '#1565c0';

                return (
                  <div key={idx} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    borderBottom: idx < alertas.length - 1 ? '1px dashed rgba(0,0,0,0.06)' : 'none',
                    paddingBottom: idx < alertas.length - 1 ? '10px' : '0px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{alerta.icon}</span>
                      <strong style={{ fontSize: '13px', color: alertaTitleCol, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {alerta.titulo}
                      </strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--game-text-bright, #333)', lineHeight: '1.4' }}>
                      {alerta.mensaje}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Adaptive Diagnosis Columns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              borderTop: '1px solid rgba(0,0,0,0.05)',
              paddingTop: '12px'
            }}>
              {/* Pets */}
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
                  {t('weatherPetCareTitle')}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {alertas.map((alerta, idx) => (
                    <div key={idx} style={{ fontSize: '11px', color: 'var(--game-text, #555)', lineHeight: '1.4', display: 'flex', gap: '4px' }}>
                      {alertas.length > 1 && <span>•</span>}
                      <span>{alerta.riesgoMascotas}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plants */}
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
                  {t('weatherPlantCareTitle')}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {alertas.map((alerta, idx) => (
                    <div key={idx} style={{ fontSize: '11px', color: 'var(--game-text, #555)', lineHeight: '1.4', display: 'flex', gap: '4px' }}>
                      {alertas.length > 1 && <span>•</span>}
                      <span>{alerta.riesgoPlantas}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
