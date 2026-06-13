import React from 'react';

interface LandingViewProps {
  uiTheme: 'gaming' | 'nature' | 'kawaii';
  setExperienceMode: (mode: 'landing' | 'pets' | 'plants' | 'exotics') => void;
  setActiveTab: (tab: 'dashboard' | 'consultants' | 'settings') => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  uiTheme,
  setExperienceMode,
  setActiveTab,
}) => {
  return (
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
      zIndex: 2
    }}>
      {/* Elementos decorativos */}
      <div className="landing-decorator" style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '32px' }}>🌿</div>
      <div className="landing-decorator-delay" style={{ position: 'absolute', top: '120px', left: '30px', fontSize: '28px' }}>🐾</div>
      <div className="landing-decorator" style={{ position: 'absolute', bottom: '150px', left: '20px', fontSize: '36px' }}>🍃</div>
      <div className="landing-decorator-delay" style={{ position: 'absolute', top: '5px', right: '15px', fontSize: '32px' }}>🌱</div>
      <div className="landing-decorator" style={{ position: 'absolute', top: '140px', right: '25px', fontSize: '28px' }}>🐾</div>
      <div className="landing-decorator-delay" style={{ position: 'absolute', bottom: '120px', right: '20px', fontSize: '34px' }}>🌿</div>
      <div className="landing-decorator" style={{ position: 'absolute', top: '45%', left: '10px', fontSize: '24px' }}>🌸</div>
      <div className="landing-decorator-delay" style={{ position: 'absolute', top: '65%', right: '15px', fontSize: '24px' }}>🍀</div>

      <div style={{ zIndex: 3 }}>
        <h1 style={{
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
  );
};
