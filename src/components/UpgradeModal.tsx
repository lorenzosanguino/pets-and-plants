import React from 'react';
import { createPortal } from 'react-dom';

interface UpgradeModalProps {
  onClose: () => void;
  reason: 'mascotas' | 'plantas' | 'ia';
  /** Current count if reason is mascotas/plantas */
  currentCount?: number;
  /** Agent key if reason is ia */
  agentName?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  onClose,
  reason,
  currentCount,
  agentName
}) => {
  const locale = typeof window !== 'undefined'
    ? (localStorage.getItem('petplant_locale') || 'es')
    : 'es';
  const isEn = locale === 'en';

  const titles: Record<typeof reason, string> = {
    mascotas: isEn ? '🐾 Pet limit reached' : '🐾 Límite de mascotas alcanzado',
    plantas:  isEn ? '🌿 Plant limit reached' : '🌿 Límite de plantas alcanzado',
    ia:       isEn ? '🤖 AI response limit reached' : '🤖 Límite de respuestas IA alcanzado',
  };

  const descriptions: Record<typeof reason, string> = {
    mascotas: isEn
      ? `The free plan allows up to 2 pets. You currently have ${currentCount ?? 2}.`
      : `El plan gratuito permite hasta 2 mascotas. Actualmente tienes ${currentCount ?? 2}.`,
    plantas: isEn
      ? `The free plan allows up to 2 plants. You currently have ${currentCount ?? 2}.`
      : `El plan gratuito permite hasta 2 plantas. Actualmente tienes ${currentCount ?? 2}.`,
    ia: isEn
      ? `The ${agentName || 'AI agent'} has reached the 2-response limit on the free plan.`
      : `El agente ${agentName || 'IA'} ha alcanzado el límite de 2 respuestas del plan gratuito.`,
  };

  const goToSettings = () => {
    onClose();
    // Dispatch a custom event that PetPlantDashboard listens to for navigation
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('petplant_goto_settings'));
    }
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999, padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a2f 100%)',
        borderRadius: '24px',
        border: '1.5px solid rgba(255,255,255,0.12)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        width: '100%', maxWidth: '380px',
        padding: '32px 28px',
        textAlign: 'center',
        color: '#fff',
        fontFamily: 'var(--game-font, system-ui, sans-serif)',
        position: 'relative'
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'rgba(255,255,255,0.1)', border: 'none',
            color: '#fff', borderRadius: '50%', width: '32px', height: '32px',
            cursor: 'pointer', fontSize: '16px', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}
        >×</button>

        {/* Crown icon */}
        <div style={{ fontSize: '52px', marginBottom: '12px' }}>👑</div>

        <div style={{
          display: 'inline-block',
          background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
          borderRadius: '20px', padding: '3px 14px',
          fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px',
          marginBottom: '16px', textTransform: 'uppercase'
        }}>
          {isEn ? 'Premium required' : 'Requiere Premium'}
        </div>

        <h2 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: 'bold', lineHeight: 1.2 }}>
          {titles[reason]}
        </h2>

        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
          {descriptions[reason]}
        </p>

        {/* Features list */}
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          borderRadius: '14px', padding: '16px',
          marginBottom: '24px', textAlign: 'left'
        }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#a3e635' }}>
            {isEn ? '✨ PREMIUM unlocks:' : '✨ PREMIUM desbloquea:'}
          </p>
          {[
            isEn ? '🐾 Unlimited pets & plants' : '🐾 Mascotas y plantas ilimitadas',
            isEn ? '🤖 Unlimited AI agent responses' : '🤖 Respuestas IA ilimitadas',
            isEn ? '📊 Full clinical diagnostics' : '📊 Diagnósticos clínicos completos',
            isEn ? '🌿 Chef nutritional unlimited' : '🌿 Chef nutricional ilimitado',
            isEn ? '☁️ Full cloud sync' : '☁️ Sincronización en la nube completa',
          ].map((feat, i) => (
            <div key={i} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', marginBottom: '4px' }}>
              {feat}
            </div>
          ))}
        </div>

        {/* How to activate */}
        <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
          {isEn
            ? 'Add your Gemini API key in ⚙️ Settings to activate Premium instantly and for free.'
            : 'Añade tu clave API de Gemini en ⚙️ Ajustes para activar Premium al instante y de forma gratuita.'}
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={goToSettings}
            style={{
              padding: '14px',
              background: 'linear-gradient(135deg, #a3e635, #22c55e)',
              color: '#0f172a',
              border: 'none', borderRadius: '12px',
              fontWeight: 'bold', fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(163, 230, 53, 0.35)'
            }}
          >
            {isEn ? '⚙️ Go to Settings → Add API Key' : '⚙️ Ir a Ajustes → Añadir clave API'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px',
              background: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              fontSize: '13px', cursor: 'pointer'
            }}
          >
            {isEn ? 'Maybe later' : 'Quizás más tarde'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
