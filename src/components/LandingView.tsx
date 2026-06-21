import React, { useState } from 'react';
import type { DatosClimaticos } from '../services/weatherService';
import type { Mascota, Planta } from '../database/types';

interface LandingViewProps {
  uiTheme: 'gaming' | 'nature' | 'kawaii' | 'vintage';
  clima?: DatosClimaticos | null;
  onNavigate: (
    mode: 'landing' | 'pets' | 'plants' | 'exotics' | 'travels' | 'consultants',
    tab: 'dashboard' | 'consultants' | 'settings',
    e: React.MouseEvent
  ) => void;
  mascotas?: Mascota[];
  plantas?: Planta[];
}

export const LandingWeatherBackground: React.FC<{
  uiTheme: 'gaming' | 'nature' | 'kawaii' | 'vintage';
  clima?: DatosClimaticos | null;
}> = ({ uiTheme, clima }) => {
  const temp = clima?.temperatura ?? 20;
  const hum = clima?.humedad ?? 50;

  let weatherType: 'rain' | 'snow' | 'sun' | 'dust' | 'clear' = 'clear';
  if (hum > 70) weatherType = 'rain';
  else if (temp < 15) weatherType = 'snow';
  else if (temp > 28) weatherType = 'sun';
  else if (hum < 38) weatherType = 'dust';

  const particleCount = 20;
  const particles = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 5}s`,
    duration: `${3 + Math.random() * 4}s`,
    scale: 0.5 + Math.random() * 0.8,
  }));

  const getParticleContent = (index: number) => {
    if (uiTheme === 'gaming') {
      if (weatherType === 'rain') return <div className="weather-particle cyber-rain" />;
      if (weatherType === 'snow') return <div className="weather-particle cyber-snow" />;
      if (weatherType === 'sun') return <div className="weather-particle cyber-sun" />;
      if (weatherType === 'dust') return <div className="weather-particle cyber-dust" />;
      return <div className="weather-particle cyber-clear" />;
    }
    if (uiTheme === 'kawaii') {
      const kawaiiParticles = {
        rain: ['💧', '🌈', '🌸', '🌦️'],
        snow: ['❄️', '☁️', '🤍', '⭐'],
        sun: ['☀️', '✨', '💖', '🍭'],
        dust: ['✨', '🍃', '🧸', '🎈'],
        clear: ['🌸', '⭐', '🎈', '🍀'],
      };
      const list = kawaiiParticles[weatherType];
      return <span style={{ fontSize: '20px' }}>{list[index % list.length]}</span>;
    }
    if (uiTheme === 'vintage') {
      if (weatherType === 'rain') return <div className="weather-particle vintage-rain" />;
      if (weatherType === 'snow') return <div className="weather-particle vintage-snow" />;
      if (weatherType === 'sun') return <div className="weather-particle vintage-sun" />;
      if (weatherType === 'dust') return <div className="weather-particle vintage-dust" />;
      const vintagePetals = ['🌸', '🍂', '🌾', '🌼'];
      return <span style={{ opacity: 0.6, fontSize: '18px' }}>{vintagePetals[index % vintagePetals.length]}</span>;
    }
    if (weatherType === 'rain') {
      return (
        <svg width="8" height="24" viewBox="0 0 8 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 0C4.5 4 8 16 8 20C8 22.2091 6.20914 24 4 24C1.79086 24 0 22.2091 0 20C0 16 3.5 4 4 0Z" fill="rgba(46, 125, 50, 0.4)" />
        </svg>
      );
    }
    if (weatherType === 'snow') {
      return <span style={{ fontSize: '16px', color: '#81c784', opacity: 0.8 }}>❄️</span>;
    }
    if (weatherType === 'sun') {
      return <div className="weather-particle nature-sun-spark" />;
    }
    if (weatherType === 'dust') {
      return <div className="weather-particle nature-pollen" />;
    }
    const natureLeaves = ['🍃', '🍂', '🍁', '🍀'];
    return <span style={{ fontSize: '18px', opacity: 0.7 }}>{natureLeaves[index % natureLeaves.length]}</span>;
  };

  return (
    <div className="landing-weather-background">
      <div className={`weather-ambient-gradient theme-${uiTheme} weather-${weatherType}`} />
      <div className="weather-particles-container">
        {particles.map((p, idx) => (
          <div
            key={p.id}
            className={`weather-particle-wrapper weather-${weatherType} theme-${uiTheme}`}
            style={{
              left: p.left,
              animationDelay: p.delay,
              animationDuration: p.duration,
              transform: `scale(${p.scale})`,
            }}
          >
            {getParticleContent(idx)}
          </div>
        ))}
      </div>

      <style>{`
        .landing-weather-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 1;
          border-radius: inherit;
        }

        .weather-ambient-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          transition: background 1.5s ease-in-out;
          opacity: 0.18;
        }

        .weather-ambient-gradient.theme-nature.weather-clear {
          background: radial-gradient(circle at 80% 20%, rgba(129, 199, 132, 0.4) 0%, transparent 70%);
        }
        .weather-ambient-gradient.theme-nature.weather-sun {
          background: radial-gradient(circle at 80% 20%, rgba(255, 235, 59, 0.5) 0%, transparent 60%);
        }
        .weather-ambient-gradient.theme-nature.weather-rain {
          background: linear-gradient(180deg, rgba(76, 175, 80, 0.15) 0%, rgba(33, 150, 243, 0.25) 100%);
        }
        .weather-ambient-gradient.theme-nature.weather-snow {
          background: linear-gradient(180deg, rgba(224, 242, 241, 0.3) 0%, rgba(128, 203, 196, 0.2) 100%);
        }
        .weather-ambient-gradient.theme-nature.weather-dust {
          background: radial-gradient(circle at 50% 50%, rgba(244, 243, 236, 0.4) 0%, rgba(215, 204, 200, 0.2) 100%);
        }

        .weather-ambient-gradient.theme-gaming {
          opacity: 0.12;
        }
        .weather-ambient-gradient.theme-gaming.weather-clear {
          background: radial-gradient(circle at 80% 20%, rgba(102, 252, 241, 0.3) 0%, transparent 60%);
        }
        .weather-ambient-gradient.theme-gaming.weather-sun {
          background: radial-gradient(circle at 80% 20%, rgba(255, 0, 127, 0.35) 0%, transparent 60%);
        }
        .weather-ambient-gradient.theme-gaming.weather-rain {
          background: linear-gradient(180deg, rgba(10, 25, 47, 0.8) 0%, rgba(102, 252, 241, 0.2) 100%);
        }
        .weather-ambient-gradient.theme-gaming.weather-snow {
          background: linear-gradient(180deg, rgba(13, 13, 26, 0.9) 0%, rgba(255, 255, 255, 0.1) 100%);
        }
        .weather-ambient-gradient.theme-gaming.weather-dust {
          background: radial-gradient(circle at 50% 50%, rgba(255, 143, 0, 0.1) 0%, rgba(15, 22, 36, 0.9) 100%);
        }

        .weather-ambient-gradient.theme-kawaii.weather-clear {
          background: radial-gradient(circle at 80% 20%, rgba(255, 224, 230, 0.6) 0%, transparent 70%);
        }
        .weather-ambient-gradient.theme-kawaii.weather-sun {
          background: radial-gradient(circle at 80% 20%, rgba(255, 249, 196, 0.8) 0%, transparent 60%);
        }
        .weather-ambient-gradient.theme-kawaii.weather-rain {
          background: linear-gradient(180deg, rgba(243, 229, 245, 0.4) 0%, rgba(179, 229, 252, 0.4) 100%);
        }
        .weather-ambient-gradient.theme-kawaii.weather-snow {
          background: linear-gradient(180deg, rgba(236, 239, 241, 0.5) 0%, rgba(248, 187, 208, 0.3) 100%);
        }
        .weather-ambient-gradient.theme-kawaii.weather-dust {
          background: radial-gradient(circle at 50% 50%, rgba(255, 243, 224, 0.5) 0%, transparent 100%);
        }

        .weather-ambient-gradient.theme-vintage.weather-clear {
          background: radial-gradient(circle at 80% 20%, rgba(212, 175, 55, 0.25) 0%, transparent 70%);
        }
        .weather-ambient-gradient.theme-vintage.weather-sun {
          background: radial-gradient(circle at 80% 20%, rgba(255, 179, 0, 0.2) 0%, transparent 60%);
        }
        .weather-ambient-gradient.theme-vintage.weather-rain {
          background: linear-gradient(180deg, rgba(220, 215, 201, 0.3) 0%, rgba(109, 139, 116, 0.2) 100%);
        }
        .weather-ambient-gradient.theme-vintage.weather-snow {
          background: linear-gradient(180deg, rgba(245, 245, 238, 0.4) 0%, rgba(200, 190, 170, 0.2) 100%);
        }
        .weather-ambient-gradient.theme-vintage.weather-dust {
          background: radial-gradient(circle at 50% 50%, rgba(206, 179, 133, 0.2) 0%, transparent 100%);
        }

        .weather-particles-container {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }

        .weather-particle-wrapper {
          position: absolute;
          top: -30px;
          opacity: 0;
          will-change: transform, opacity;
        }

        .weather-particle-wrapper.weather-rain {
          animation: weatherFallRain linear infinite;
        }

        @keyframes weatherFallRain {
          0% {
            transform: translateY(-20px) rotate(15deg);
            opacity: 0;
          }
          10% {
            opacity: 0.7;
          }
          90% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(105vh) rotate(15deg);
            opacity: 0;
          }
        }

        .weather-particle.cyber-rain {
          width: 2px;
          height: 35px;
          background: linear-gradient(180deg, rgba(102, 252, 241, 0.8), transparent);
          box-shadow: 0 0 8px rgba(102, 252, 241, 0.7);
        }

        .weather-particle.vintage-rain {
          width: 1.5px;
          height: 25px;
          background: linear-gradient(180deg, rgba(139, 128, 107, 0.5), transparent);
        }

        .weather-particle-wrapper.weather-snow {
          animation: weatherFallSnow linear infinite;
        }

        @keyframes weatherFallSnow {
          0% {
            transform: translateY(-20px) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          50% {
            transform: translateY(50vh) translateX(25px) rotate(180deg);
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(105vh) translateX(-15px) rotate(360deg);
            opacity: 0;
          }
        }

        .weather-particle.cyber-snow {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 0 10px #66fcf1, 0 0 20px #66fcf1;
        }

        .weather-particle.vintage-snow {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(220, 215, 201, 0.8);
        }

        .weather-particle-wrapper.weather-sun {
          animation: weatherRiseSun linear infinite;
          top: auto;
          bottom: -30px;
        }

        @keyframes weatherRiseSun {
          0% {
            transform: translateY(0) scale(0.6) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 0.6;
          }
          85% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-105vh) scale(1.2) rotate(90deg);
            opacity: 0;
          }
        }

        .weather-particle.nature-sun-spark {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 235, 59, 0.8) 0%, rgba(255, 193, 7, 0) 70%);
          filter: blur(1px);
        }

        .weather-particle.cyber-sun {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          background: #ff007f;
          box-shadow: 0 0 10px #ff007f, 0 0 20px rgba(255, 0, 127, 0.5);
        }

        .weather-particle.vintage-sun {
          width: 10px;
          height: 10px;
          background: rgba(212, 175, 55, 0.5);
          clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
        }

        .weather-particle-wrapper.weather-dust {
          animation: weatherDriftDust linear infinite;
        }

        @keyframes weatherDriftDust {
          0% {
            transform: translateY(-20px) translateX(0) scale(0.7);
            opacity: 0;
          }
          20% {
            opacity: 0.5;
          }
          80% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(105vh) translateX(60px) scale(1.1);
            opacity: 0;
          }
        }

        .weather-particle.nature-pollen {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(139, 195, 74, 0.6);
          filter: blur(0.5px);
        }

        .weather-particle.cyber-dust {
          width: 6px;
          height: 6px;
          background: #ff8f00;
          box-shadow: 0 0 8px #ff8f00;
        }

        .weather-particle.vintage-dust {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(206, 179, 133, 0.6);
        }

        .weather-particle-wrapper.weather-clear {
          animation: weatherRiseClear linear infinite;
          top: auto;
          bottom: -30px;
        }

        @keyframes weatherRiseClear {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-105vh) translateX(30px) rotate(180deg);
            opacity: 0;
          }
        }

        .weather-particle.cyber-clear {
          width: 8px;
          height: 2px;
          background: #66fcf1;
          box-shadow: 0 0 6px #66fcf1;
        }
      `}</style>
    </div>
  );
};

export const LandingView: React.FC<LandingViewProps> = ({
  uiTheme,
  clima,
  onNavigate,
  mascotas = [],
  plantas = []
}) => {
  const [showCoexistenceModal, setShowCoexistenceModal] = useState(false);

  const getThemeAccentColor = () => {
    if (uiTheme === 'gaming') return '#66fcf1';
    if (uiTheme === 'kawaii') return '#ff6b8b';
    if (uiTheme === 'vintage') return '#b8860b';
    return '#2e7d32';
  };

  const calcCoexistence = () => {
    const listPets = mascotas || [];
    const listPlants = plantas || [];

    if (listPets.length === 0 || listPlants.length === 0) {
      return { score: 100, conflicts: [], statusText: 'No hay datos', statusColor: '#888', status: 'no_data' };
    }

    const tieneGato = listPets.some(m => m.especie === 'Felino');
    const tienePerro = listPets.some(m => m.especie === 'Canino');

    const conflicts: any[] = [];
    let deduction = 0;

    listPlants.forEach(planta => {
      // Felinos
      if (tieneGato) {
        const tox = planta.toxicidadFelina;
        if (tox === 'Altamente tóxica (urgencia)') {
          const cats = listPets.filter(m => m.especie === 'Felino');
          cats.forEach(cat => {
            conflicts.push({
              planta: planta,
              mascota: cat,
              gravedad: 'alta',
              detalles: `${planta.nombreComun} es altamente tóxica para tu gato ${cat.nombre}.${planta.compuestosToxicos ? ` Contiene ${planta.compuestosToxicos}.` : ''}`
            });
            deduction += 25;
          });
        } else if (tox === 'Tóxica leve (irritante)') {
          const cats = listPets.filter(m => m.especie === 'Felino');
          cats.forEach(cat => {
            conflicts.push({
              planta: planta,
              mascota: cat,
              gravedad: 'media',
              detalles: `${planta.nombreComun} es levemente irritante para tu gato ${cat.nombre}.`
            });
            deduction += 10;
          });
        }
      }

      // Caninos
      if (tienePerro) {
        const tox = planta.toxicidadCanina || 'Segura';
        if (tox === 'Altamente tóxica (urgencia)') {
          const dogs = listPets.filter(m => m.especie === 'Canino');
          dogs.forEach(dog => {
            conflicts.push({
              planta: planta,
              mascota: dog,
              gravedad: 'alta',
              detalles: `${planta.nombreComun} es altamente tóxica para tu perro ${dog.nombre}.${planta.compuestosToxicos ? ` Contiene ${planta.compuestosToxicos}.` : ''}`
            });
            deduction += 25;
          });
        } else if (tox === 'Tóxica leve (irritante)') {
          const dogs = listPets.filter(m => m.especie === 'Canino');
          dogs.forEach(dog => {
            conflicts.push({
              planta: planta,
              mascota: dog,
              gravedad: 'media',
              detalles: `${planta.nombreComun} es levemente irritante para tu perro ${dog.nombre}.`
            });
            deduction += 10;
          });
        }
      }
    });

    const score = Math.max(0, 100 - deduction);
    
    let statusText = 'Excelente convivencia';
    let statusColor = '#4caf50'; // green
    if (score < 50) {
      statusText = 'Alta toxicidad';
      statusColor = '#ef5350'; // red
    } else if (score < 80) {
      statusText = 'Toxicidad moderada';
      statusColor = '#ffb74d'; // orange
    } else if (score < 100) {
      statusText = 'Precauciones leves';
      statusColor = '#ffb74d';
    }

    return { score, conflicts, statusText, statusColor, status: 'calculated' };
  };

  const { score, conflicts, statusText, statusColor, status } = calcCoexistence();
  const radius = 22;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="landing-view-wrapper" style={{
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
      zIndex: 2
    }}>
      {/* Ambiente Meteorológico de Fondo */}
      <LandingWeatherBackground uiTheme={uiTheme} clima={clima} />
      {/* Elementos decorativos */}
      <div className="landing-decorator" style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '32px' }}>🌿</div>
      <div className="landing-decorator-delay" style={{ position: 'absolute', top: '120px', left: '30px', fontSize: '28px' }}>🐾</div>
      <div className="landing-decorator" style={{ position: 'absolute', bottom: '150px', left: '20px', fontSize: '36px' }}>🍃</div>
      <div className="landing-decorator-delay" style={{ position: 'absolute', top: '5px', right: '15px', fontSize: '32px' }}>🌱</div>
      <div className="landing-decorator" style={{ position: 'absolute', top: '140px', right: '25px', fontSize: '28px' }}>🐾</div>
      <div className="landing-decorator-delay" style={{ position: 'absolute', bottom: '120px', right: '20px', fontSize: '34px' }}>🌿</div>
      <div className="landing-decorator" style={{ position: 'absolute', top: '45%', left: '10px', fontSize: '24px' }}>🌸</div>
      <div className="landing-decorator-delay" style={{ position: 'absolute', top: '65%', right: '15px', fontSize: '24px' }}>🍀</div>

      <div className="landing-title-block" style={{ zIndex: 3 }}>
        <h1 className="landing-title" style={{
          margin: '0 0 8px 0',
          fontSize: '38px',
          fontWeight: '900',
          color: uiTheme === 'gaming' ? 'var(--game-text-bright, #66fcf1)' : 'var(--game-text-bright, #1b5e20)',
          letterSpacing: '0.5px',
          fontFamily: 'var(--game-font, sans-serif)',
          textShadow: uiTheme === 'gaming' ? '0 0 8px rgba(102,252,241,0.6)' : 'none'
        }}>
          🐾 PET & PLANT PRO 🌿
        </h1>
        <p className="landing-subtitle" style={{ margin: '0', fontSize: '13px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)', fontWeight: '500' }}>
          Bienvenido al centro integrado seguro. Selecciona el ecosistema que deseas gestionar:
        </p>
      </div>

      <div className="landing-container">
        {/* Panel de Entrada Mascotas */}
        <div 
          className="landing-card landing-card-animation"
          style={{
            border: 'var(--game-border, 1px solid #e3f2fd)',
            boxShadow: 'var(--game-shadow, 0 8px 30px rgba(33, 150, 243, 0.05))',
          }}
          onClick={(e) => onNavigate('pets', 'dashboard', e)}
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
          className="landing-card landing-card-animation"
          style={{
            border: 'var(--game-border, 1px solid #e8f5e9)',
            boxShadow: 'var(--game-shadow, 0 8px 30px rgba(76, 175, 80, 0.05))',
          }}
          onClick={(e) => onNavigate('plants', 'dashboard', e)}
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
          className="landing-card landing-card-animation"
          style={{
            border: 'var(--game-border, 1px solid #fff8e1)',
            boxShadow: 'var(--game-shadow, 0 8px 30px rgba(255, 143, 0, 0.05))',
          }}
          onClick={(e) => onNavigate('exotics', 'dashboard', e)}
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

      {/* Panel Coexistencia Segura */}
      <div 
        className="coexistence-banner"
        onClick={() => setShowCoexistenceModal(true)}
        style={{
          width: '100%',
          maxWidth: '850px',
          background: 'var(--game-card-bg, rgba(255, 255, 255, 0.7))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: uiTheme === 'gaming' 
            ? '2px solid rgba(102, 252, 241, 0.4)' 
            : (uiTheme === 'kawaii' ? '2px dashed #ff6b8b' : '1px solid rgba(255, 255, 255, 0.4)'),
          borderRadius: uiTheme === 'gaming' ? '8px' : (uiTheme === 'kawaii' ? '24px' : '16px'),
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          cursor: 'pointer',
          boxSizing: 'border-box',
          marginTop: '16px',
          zIndex: 3,
          boxShadow: uiTheme === 'gaming' 
            ? '0 0 15px rgba(102, 252, 241, 0.1)' 
            : '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseEnter={(e) => {
          if (window.innerWidth > 600) {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = uiTheme === 'gaming'
              ? '0 0 25px rgba(102, 252, 241, 0.3)'
              : '0 12px 40px rgba(0, 0, 0, 0.08)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = uiTheme === 'gaming'
            ? '0 0 15px rgba(102, 252, 241, 0.1)'
            : '0 8px 32px 0 rgba(31, 38, 135, 0.04)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
          {status !== 'no_data' ? (
            <div style={{ position: 'relative', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="50" height="50" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  stroke="rgba(0,0,0,0.06)"
                  fill="transparent"
                  strokeWidth={stroke}
                  r={normalizedRadius}
                  cx="25"
                  cy="25"
                />
                <circle
                  stroke={statusColor}
                  fill="transparent"
                  strokeWidth={stroke}
                  strokeDasharray={circumference + ' ' + circumference}
                  style={{ strokeDashoffset }}
                  r={normalizedRadius}
                  cx="25"
                  cy="25"
                />
              </svg>
              <span style={{ position: 'absolute', fontSize: '11px', fontWeight: 'bold', color: 'var(--game-text-bright, #222)', fontFamily: 'monospace' }}>
                {score}%
              </span>
            </div>
          ) : (
            <div style={{ fontSize: '28px', flexShrink: 0 }}>🛡️</div>
          )}
          
          <div style={{ textAlign: 'left', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--game-text-bright, #1a1a1a)', fontFamily: 'var(--game-font, sans-serif)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🛡️ Índice de Coexistencia Segura
              {status !== 'no_data' && (
                <span style={{
                  fontSize: '9.5px',
                  fontWeight: 'bold',
                  background: statusColor + '15',
                  color: statusColor,
                  border: `1px solid ${statusColor}30`,
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  {statusText}
                </span>
              )}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--game-text, #666)', fontFamily: 'var(--game-font, sans-serif)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
              {status === 'no_data' 
                ? 'Registra al menos una mascota (Perro/Gato) y una planta para calcular la compatibilidad en tiempo real.'
                : (conflicts.length === 0 
                  ? '¡Excelente! No hay conflictos de toxicidad detectados entre tus mascotas y plantas.'
                  : `Se han detectado ${conflicts.length} conflicto(s) de toxicidad. Pulsa para ver recomendaciones.`)}
            </span>
          </div>
        </div>

        <button 
          type="button"
          style={{
            padding: '6px 14px',
            background: uiTheme === 'gaming' ? 'rgba(102, 252, 241, 0.15)' : '#e8f5e9',
            color: uiTheme === 'gaming' ? '#66fcf1' : '#2e7d32',
            border: uiTheme === 'gaming' ? '1px solid #66fcf1' : '1px solid #2e7d32',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            fontFamily: 'var(--game-font, sans-serif)',
            whiteSpace: 'nowrap'
          }}
        >
          {status === 'no_data' ? 'Comenzar 📋' : 'Ver Diagnóstico 📊'}
        </button>
      </div>

      {showCoexistenceModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
          overflowY: 'auto',
          overflowX: 'hidden',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
        onClick={() => setShowCoexistenceModal(false)}
        >
          <div 
            className="glass-card page-transition-enter"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--game-card-bg, rgba(255, 255, 255, 0.95))',
              border: uiTheme === 'gaming' ? '2.5px solid #66fcf1' : '1px solid #e2e8f0',
              borderRadius: uiTheme === 'gaming' ? '8px' : '20px',
              padding: '24px',
              maxWidth: '550px',
              width: '100%',
              boxSizing: 'border-box',
              position: 'relative',
              boxShadow: uiTheme === 'gaming' ? '0 0 25px rgba(102, 252, 241, 0.4)' : '0 10px 25px rgba(0,0,0,0.1)',
              fontFamily: 'var(--game-font, sans-serif)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eaeaea', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: 'var(--game-text-bright, #1a1a1a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🛡️ Diagnóstico de Coexistencia Segura
              </h3>
              <button 
                type="button"
                onClick={() => setShowCoexistenceModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                ✖
              </button>
            </div>

            {/* Score circle & explanation */}
            {status !== 'no_data' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                      stroke="rgba(0,0,0,0.06)"
                      fill="transparent"
                      strokeWidth={6}
                      r={normalizedRadius * 1.6}
                      cx="40"
                      cy="40"
                    />
                    <circle
                      stroke={statusColor}
                      fill="transparent"
                      strokeWidth={6}
                      strokeDasharray={(normalizedRadius * 1.6 * 2 * Math.PI) + ' ' + (normalizedRadius * 1.6 * 2 * Math.PI)}
                      style={{ strokeDashoffset: (normalizedRadius * 1.6 * 2 * Math.PI) - (score / 100) * (normalizedRadius * 1.6 * 2 * Math.PI) }}
                      r={normalizedRadius * 1.6}
                      cx="40"
                      cy="40"
                    />
                  </svg>
                  <span style={{ position: 'absolute', fontSize: '18px', fontWeight: 'bold', color: 'var(--game-text-bright, #222)', fontFamily: 'monospace' }}>
                    {score}%
                  </span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <strong style={{ fontSize: '14px', color: statusColor, display: 'block', marginBottom: '4px' }}>
                    {statusText.toUpperCase()}
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--game-text, #666)', textAlign: 'center' }}>
                    {conflicts.length === 0 
                      ? 'No hay toxinas o alérgenos de riesgo detectados entre tu flora y fauna registradas.'
                      : `Hemos encontrado ${conflicts.length} conflicto(s) de seguridad que requieren tu atención.`}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>📋</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <strong style={{ fontSize: '14px', color: 'var(--game-text-bright, #222)' }}>Faltan Datos para el Análisis</strong>
                  <span style={{ fontSize: '12px', color: 'var(--game-text, #666)' }}>
                    El algoritmo de coexistencia inteligente necesita tener registradas tanto mascotas (perros/gatos) como plantas para cruzar los datos de seguridad.
                  </span>
                </div>
              </div>
            )}

            {/* List of conflicts */}
            {status !== 'no_data' && conflicts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                <strong style={{ fontSize: '12px', color: 'var(--game-text-bright, #222)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>
                  ⚠️ Conflictos de Toxicidad Activos:
                </strong>
                {conflicts.map((c, i) => (
                  <div 
                    key={i} 
                    style={{
                      border: `1px solid ${c.gravedad === 'alta' ? '#ef5350' : '#ffb74d'}`,
                      background: c.gravedad === 'alta' ? 'rgba(239, 83, 80, 0.05)' : 'rgba(255, 183, 77, 0.05)',
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--game-text-bright, #222)' }}>
                        🌿 {c.planta.nombreComun} + 🐾 {c.mascota.nombre}
                      </strong>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 'bold',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: c.gravedad === 'alta' ? '#ef5350' : '#f57c00',
                        color: '#fff'
                      }}>
                        {c.gravedad === 'alta' ? 'Alta Toxicidad' : 'Tóxica Leve'}
                      </span>
                    </div>
                    <span style={{ color: 'var(--game-text, #444)', lineHeight: '1.4' }}>{c.detalles}</span>
                    <div style={{ marginTop: '4px', borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: '4px', color: '#1b5e20', fontWeight: 'bold' }}>
                      💡 Recomendación: Ubicar en {c.planta.ubicacionHabitacion || 'zona segura'} a más de 1.5 metros de altura (fuera de la zona de salto) o reubicar en habitación inaccesible.
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* General Advice */}
            <div style={{ fontSize: '11px', color: '#666', background: 'rgba(0,0,0,0.01)', border: '1px solid #eee', padding: '10px', borderRadius: '8px', lineHeight: '1.4', textAlign: 'left' }}>
              ℹ️ <strong>Consejo General de Seguridad:</strong> Si tienes mascotas muy curiosas o cachorros, prefiere siempre plantas clasificadas como <strong>Segura</strong>. Para plantas con toxicidad leve o alta, colócalas en alturas inaccesibles, repisas colgantes o habitaciones cerradas.
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setShowCoexistenceModal(false)}
                style={{
                  padding: '8px 16px',
                  background: getThemeAccentColor(),
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
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
          .landing-view-wrapper {
            min-height: 100vh !important;
            height: 100vh !important;
            padding: 12px 10px !important;
            gap: 8px !important;
            justify-content: space-between !important;
            overflow: hidden !important;
          }
          .landing-decorator, .landing-decorator-delay {
            display: none !important;
          }
          .landing-title-block {
            margin-bottom: 2px !important;
          }
          .landing-title {
            font-size: min(7vw, 26px) !important;
            margin: 0 0 4px 0 !important;
          }
          .landing-subtitle {
            font-size: 11px !important;
            line-height: 1.25 !important;
            max-width: 90% !important;
            margin: 0 auto !important;
          }
          .landing-container {
            flex-direction: column !important;
            gap: 10px !important;
            margin-top: 0px !important;
            width: 100% !important;
            flex: 1 !important;
            max-height: calc(100vh - 120px) !important;
            justify-content: space-evenly !important;
          }
          .landing-card {
            flex-direction: row !important;
            text-align: left !important;
            align-items: center !important;
            padding: 14px 16px !important;
            max-width: 100% !important;
            min-width: 100% !important;
            gap: 16px !important;
            border-radius: 12px !important;
            flex: 1 !important;
            min-height: 0 !important;
          }
          .landing-card .premium-logo-cat,
          .landing-card .premium-logo-fern,
          .landing-card .premium-logo-exotic {
            width: 58px !important;
            height: 58px !important;
            font-size: 30px !important;
            border-width: 3px !important;
            flex-shrink: 0 !important;
          }
          .landing-card-title {
            font-size: 15px !important;
            margin-bottom: 2px !important;
          }
          .landing-card-desc {
            font-size: 10.5px !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            line-height: 1.3 !important;
          }
          .landing-card-button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
