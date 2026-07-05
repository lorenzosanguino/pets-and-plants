import React, { useMemo } from 'react';
import type { DatosClimaticos } from '../services/weatherService';

interface WeatherFXOverlayProps {
  clima: DatosClimaticos | null;
  /** Opacidad general de los efectos. Valor entre 0 y 1. Por defecto 0.12 para tarjetas y 0.08 para dashboard. */
  opacity?: number;
  /** Si es true, el efecto ocupa todo el contenedor de forma absoluta. */
  absolute?: boolean;
}

export const WeatherFXOverlay: React.FC<WeatherFXOverlayProps> = ({
  clima,
  opacity = 0.12,
  absolute = true
}) => {
  // Determinar la condición climática a partir de los datos
  const condition = useMemo(() => {
    let temp = 22;
    let hum = 50;
    let estacion: 'Verano' | 'Invierno' | 'Primavera/Otoño' = 'Primavera/Otoño';

    if (clima) {
      temp = clima.temperatura;
      hum = clima.humedad;
      estacion = clima.estacion;
    } else {
      // Fallback estacional aproximado según el mes local actual
      const mes = new Date().getMonth();
      if (mes >= 5 && mes <= 8) {
        estacion = 'Verano';
        temp = 29;
        hum = 45;
      } else if (mes >= 10 || mes <= 1) {
        estacion = 'Invierno';
        temp = 8;
        hum = 75;
      } else {
        estacion = 'Primavera/Otoño';
        temp = 18;
        hum = 55;
      }
    }

    if (temp < 6) return 'snowy';
    if (hum > 80 && temp < 26) return 'rainy';
    if (temp > 28 || (estacion === 'Verano' && hum < 50)) return 'sunny';
    if (hum > 70 && temp >= 6 && temp <= 18) return 'foggy';
    return 'breeze';
  }, [clima]);

  const overlayStyle: React.CSSProperties = {
    position: absolute ? 'absolute' : 'relative',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
    zIndex: 1,
    opacity: opacity,
    borderRadius: 'inherit',
    transition: 'opacity 0.3s ease',
    width: '100%',
    height: '100%'
  };

  // Renderizar la animación correspondiente de forma optimizada
  const renderEffect = () => {
    switch (condition) {
      case 'sunny':
        return (
          <div className="weather-fx-sunny" style={{ width: '100%', height: '100%', position: 'absolute' }}>
            <div className="sun-glow" />
            <div className="heatwave-lines">
              <div className="hw-line l1" />
              <div className="hw-line l2" />
              <div className="hw-line l3" />
            </div>
          </div>
        );

      case 'rainy':
        return (
          <div className="weather-fx-rainy" style={{ width: '100%', height: '100%', position: 'absolute' }}>
            <div className="rain-drop d1" />
            <div className="rain-drop d2" />
            <div className="rain-drop d3" />
            <div className="rain-drop d4" />
            <div className="rain-drop d5" />
          </div>
        );

      case 'snowy':
        return (
          <div className="weather-fx-snowy" style={{ width: '100%', height: '100%', position: 'absolute' }}>
            <div className="snowflake s1">❄</div>
            <div className="snowflake s2">❄</div>
            <div className="snowflake s3">❅</div>
            <div className="snowflake s4">❅</div>
            <div className="snowflake s5">❆</div>
          </div>
        );

      case 'foggy':
        return (
          <div className="weather-fx-foggy" style={{ width: '100%', height: '100%', position: 'absolute' }}>
            <div className="fog-layer f1" />
            <div className="fog-layer f2" />
          </div>
        );

      case 'breeze':
      default:
        return (
          <div className="weather-fx-breeze" style={{ width: '100%', height: '100%', position: 'absolute' }}>
            <div className="leaf-particle lp1">🌿</div>
            <div className="leaf-particle lp2">🌱</div>
            <div className="leaf-particle lp3">🍃</div>
          </div>
        );
    }
  };

  return (
    <div style={overlayStyle} aria-hidden="true" className="weather-fx-container">
      {renderEffect()}

      <style>{`
        /* ── Estilos Comunes y GPU Acceleration ── */
        .weather-fx-container * {
          will-change: transform;
          transform: translate3d(0, 0, 0);
        }

        /* ── SUNNY FX ── */
        .sun-glow {
          position: absolute;
          top: -30px;
          right: -30px;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(253, 216, 53, 0.4) 0%, rgba(251, 192, 45, 0.1) 50%, transparent 80%);
          animation: pulseSun 8s infinite ease-in-out;
        }

        @keyframes pulseSun {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.8; }
          50% { transform: translate3d(0, 0, 0) scale(1.2); opacity: 1; }
        }

        .heatwave-lines {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40px;
          display: flex;
          justify-content: space-around;
        }

        .hw-line {
          width: 2px;
          height: 25px;
          background: linear-gradient(to top, rgba(255, 183, 77, 0.4), transparent);
          border-radius: 2px;
        }

        .hw-line.l1 { animation: floatHeat 4s infinite ease-in-out; }
        .hw-line.l2 { animation: floatHeat 4.8s infinite ease-in-out; animation-delay: 1.2s; }
        .hw-line.l3 { animation: floatHeat 3.5s infinite ease-in-out; animation-delay: 2.1s; }

        @keyframes floatHeat {
          0% { transform: translate3d(0, 15px, 0) skewX(2deg); opacity: 0.1; }
          50% { transform: translate3d(0, -10px, 0) skewX(-2deg); opacity: 0.8; }
          100% { transform: translate3d(0, -25px, 0) skewX(2deg); opacity: 0; }
        }

        /* ── RAINY FX ── */
        .rain-drop {
          position: absolute;
          width: 1px;
          height: 35px;
          background: linear-gradient(to bottom, transparent, rgba(33, 150, 243, 0.45));
          top: -40px;
        }

        .rain-drop.d1 { left: 15%; animation: fallRain 2s infinite linear; }
        .rain-drop.d2 { left: 35%; animation: fallRain 2.3s infinite linear; animation-delay: 0.4s; }
        .rain-drop.d3 { left: 55%; animation: fallRain 1.8s infinite linear; animation-delay: 0.9s; }
        .rain-drop.d4 { left: 75%; animation: fallRain 2.1s infinite linear; animation-delay: 0.2s; }
        .rain-drop.d5 { left: 90%; animation: fallRain 2.5s infinite linear; animation-delay: 0.7s; }

        @keyframes fallRain {
          0% { transform: translate3d(0, 0, 0) rotate(15deg); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: translate3d(30px, 280px, 0) rotate(15deg); opacity: 0; }
        }

        /* ── SNOWY FX ── */
        .snowflake {
          position: absolute;
          color: rgba(144, 202, 249, 0.6);
          top: -20px;
          user-select: none;
          font-family: inherit;
        }

        .snowflake.s1 { left: 10%; font-size: 11px; animation: fallSnow 8s infinite linear; }
        .snowflake.s2 { left: 32%; font-size: 14px; animation: fallSnow 11s infinite linear; animation-delay: 1.5s; }
        .snowflake.s3 { left: 50%; font-size: 10px; animation: fallSnow 9.5s infinite linear; animation-delay: 3s; }
        .snowflake.s4 { left: 72%; font-size: 13px; animation: fallSnow 10.5s infinite linear; animation-delay: 0.5s; }
        .snowflake.s5 { left: 88%; font-size: 12px; animation: fallSnow 12s infinite linear; animation-delay: 2.2s; }

        @keyframes fallSnow {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
          20% { opacity: 0.9; }
          100% { transform: translate3d(40px, 250px, 0) rotate(360deg); opacity: 0; }
        }

        /* ── FOGGY FX ── */
        .fog-layer {
          position: absolute;
          left: -50%;
          width: 200%;
          height: 60px;
          background: radial-gradient(ellipse at center, rgba(224, 224, 224, 0.25) 0%, transparent 70%);
          filter: blur(10px);
        }

        .fog-layer.f1 { top: 15%; animation: driftFog 20s infinite linear; }
        .fog-layer.f2 { bottom: 20%; animation: driftFog 28s infinite linear; animation-delay: 3s; }

        @keyframes driftFog {
          0% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(15%, 5px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        /* ── BREEZE FX ── */
        .leaf-particle {
          position: absolute;
          top: -25px;
          user-select: none;
          font-size: 12px;
        }

        .leaf-particle.lp1 { left: 20%; animation: floatBreeze 7s infinite ease-in-out; }
        .leaf-particle.lp2 { left: 55%; animation: floatBreeze 9s infinite ease-in-out; animation-delay: 2s; }
        .leaf-particle.lp3 { left: 80%; animation: floatBreeze 8s infinite ease-in-out; animation-delay: 4.5s; }

        @keyframes floatBreeze {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
          25% { opacity: 0.85; }
          100% { transform: translate3d(60px, 250px, 0) rotate(270deg); opacity: 0; }
        }

        /* ── ACCESSIBILITY: PREFERS REDUCED MOTION ── */
        @media (prefers-reduced-motion: reduce) {
          .sun-glow,
          .hw-line.l1, .hw-line.l2, .hw-line.l3,
          .rain-drop.d1, .rain-drop.d2, .rain-drop.d3, .rain-drop.d4, .rain-drop.d5,
          .snowflake.s1, .snowflake.s2, .snowflake.s3, .snowflake.s4, .snowflake.s5,
          .fog-layer.f1, .fog-layer.f2,
          .leaf-particle.lp1, .leaf-particle.lp2, .leaf-particle.lp3 {
            animation: none !important;
            transform: none !important;
          }
          /* Mantener un resplandor solar estático o niebla estática pero sutil */
          .sun-glow {
            transform: translate3d(0, 0, 0) scale(1) !important;
            opacity: 0.4 !important;
          }
          .rain-drop, .snowflake, .leaf-particle {
            display: none !important;
          }
          .fog-layer {
            transform: none !important;
            opacity: 0.15 !important;
          }
        }
      `}</style>
    </div>
  );
};
