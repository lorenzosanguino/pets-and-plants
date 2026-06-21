import React, { useState } from 'react';
import { GeminiAPIService } from '../services/geminiAPI';
import { TTSButton } from '../utils/useTTS';
import { renderMarkdownToHTML } from '../utils/markdown';
import { useTranslations } from '../utils/i18n';
interface VacationAdviceProps {
  mode: 'plants' | 'pets' | 'exotics' | 'travels';
  theme?: string;
  mascotas?: any[];
  plantas?: any[];
  exoticos?: any[];
}

export const VacationAdvice: React.FC<VacationAdviceProps> = ({ 
  mode, 
  theme = 'nature',
  mascotas = [],
  plantas = [],
  exoticos = []
}) => {
  const { locale } = useTranslations();
  const [prevMode, setPrevMode] = useState(mode);
  const [activeTab, setActiveTab] = useState<'plants' | 'cats' | 'dogs' | 'exotics'>(() => {
    if (mode === 'plants') return 'plants';
    if (mode === 'pets') return 'cats';
    if (mode === 'exotics') return 'exotics';
    return 'plants';
  });
  const [query, setQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ia'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  if (mode !== prevMode) {
    setPrevMode(mode);
    setActiveTab(mode === 'plants' ? 'plants' : mode === 'pets' ? 'cats' : mode === 'exotics' ? 'exotics' : 'plants');
    setChatMessages([]);
    setQuery('');
  }

  const handleAIQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const currentQuery = query;
    const userMsg = { sender: 'user' as const, text: currentQuery };
    const updatedMessages = [...chatMessages, userMsg];

    setChatMessages(updatedMessages);
    setQuery('');
    setLoading(true);
    try {
      // Determine appropriate advisor context
      let consultantType: 'agronomo' | 'veterinario' | 'exoticos' = 'agronomo';
      let contextLabel = 'Plantas';

      if (activeTab === 'plants') {
        consultantType = 'agronomo';
        contextLabel = locale === 'en' ? 'Plants' : 'Plantas';
      } else if (activeTab === 'exotics') {
        consultantType = 'exoticos';
        contextLabel = locale === 'en' ? 'Exotic Animals' : 'Animales Exóticos';
      } else {
        consultantType = 'veterinario';
        contextLabel = activeTab === 'cats' 
          ? (locale === 'en' ? 'Cats' : 'Gatos') 
          : (locale === 'en' ? 'Dogs' : 'Perros');
      }

      const promptContext = locale === 'en'
        ? `The user is asking about vacation/travel advice. Active ecosystem: ${contextLabel}. Check the registered items' data of the user to provide specific advice for their particular pets or plants if applicable. Question: ${currentQuery}`
        : `El usuario pregunta sobre consejos de vacaciones/viaje. Ecosistema activo: ${contextLabel}. Revisa los datos de los elementos registrados por el usuario para darle consejos específicos para sus animales o plantas particulares si aplica. Pregunta: ${currentQuery}`;
      
      // Map all current messages as history
      const historyForAPI = chatMessages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await GeminiAPIService.analizarImagen(
        null, 
        consultantType, 
        promptContext,
        undefined,
        { mascotas, plantas, exoticos },
        undefined,
        historyForAPI
      );
      const iaText = res.diagnostico + (res.tratamiento ? "\n\n" + res.tratamiento : "");
      const iaMsg = { sender: 'ia' as const, text: iaText };
      setChatMessages(prev => [...prev, iaMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg = { 
        sender: 'ia' as const, 
        text: locale === 'en' 
          ? "Sorry, could not connect with the AI advisor at this time. Please check your connection or try again." 
          : "Lo siento, no se pudo conectar con el consultor IA en este momento. Revisa tu conexión o vuelve a intentarlo." 
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'var(--game-card-bg, #ffffff)',
      borderRadius: '16px',
      border: 'var(--game-border, 1.5px solid #eaeaea)',
      padding: '24px',
      color: 'var(--game-text, #333)',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      boxSizing: 'border-box'
    }}>
      <div>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 'bold', color: 'var(--game-text-bright)' }}>
          ✈️ Guía de Viajes y Vacaciones
        </h3>
        <p style={{ margin: '0', fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
          {mode === 'plants' && 'Encuentra consejos expertos e ideas para mantener tus plantas seguras durante tus ausencias.'}
          {mode === 'pets' && 'Directrices y checklist para el cuidado de tus perros y gatos cuando te vas de viaje.'}
          {mode === 'exotics' && 'Información crítica sobre soporte vital y cuidado de animales exóticos durante tus vacaciones.'}
          {mode === 'travels' && 'Selecciona una categoría para ver consejos expertos e ideas para tus ausencias de vacaciones.'}
        </p>
      </div>

      {/* Tabs - Only show tabs if mode is pets or travels */}
      {(mode === 'pets' || mode === 'travels') && (
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #eee', paddingBottom: '8px', flexWrap: 'wrap' }}>
          {mode === 'travels' && (
            <button
              onClick={() => { setActiveTab('plants'); setChatMessages([]); }}
              style={{
                flex: 1, padding: '10px', background: activeTab === 'plants' ? 'var(--game-accent-light, #e8f5e9)' : 'transparent',
                color: activeTab === 'plants' ? '#2e7d32' : '#666', border: 'none',
                borderBottom: activeTab === 'plants' ? '3px solid #2e7d32' : '3px solid transparent',
                fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap'
              }}
            >
              🌿 Plantas
            </button>
          )}
          <button
            onClick={() => { setActiveTab('cats'); setChatMessages([]); }}
            style={{
              flex: 1, padding: '10px', background: activeTab === 'cats' ? 'var(--game-accent-light, #e3f2fd)' : 'transparent',
              color: activeTab === 'cats' ? '#1976d2' : '#666', border: 'none',
              borderBottom: activeTab === 'cats' ? '3px solid #1976d2' : '3px solid transparent',
              fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap'
            }}
          >
            🐱 Gatos
          </button>
          <button
            onClick={() => { setActiveTab('dogs'); setChatMessages([]); }}
            style={{
              flex: 1, padding: '10px', background: activeTab === 'dogs' ? 'var(--game-accent-light, #fff3e0)' : 'transparent',
              color: activeTab === 'dogs' ? '#e65100' : '#666', border: 'none',
              borderBottom: activeTab === 'dogs' ? '3px solid #e65100' : '3px solid transparent',
              fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap'
            }}
          >
            🐶 Perros
          </button>
          {mode === 'travels' && (
            <button
              onClick={() => { setActiveTab('exotics'); setChatMessages([]); }}
              style={{
                flex: 1, padding: '10px', background: activeTab === 'exotics' ? 'var(--game-accent-light, #f3e5f5)' : 'transparent',
                color: activeTab === 'exotics' ? '#7b1fa2' : '#666', border: 'none',
                borderBottom: activeTab === 'exotics' ? '3px solid #7b1fa2' : '3px solid transparent',
                fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap'
              }}
            >
              🦎 Exóticos
            </button>
          )}
        </div>
      )}

      {/* Content - AI Travel Advisor Chat (Replaces static checklists) */}
      <div style={{
        fontSize: '13px',
        lineHeight: '1.6',
        background: 'rgba(0,0,0,0.01)',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid #f0f0f0'
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
          💬 Consultar al Asesor de Viajes IA
        </h4>
        <form onSubmit={handleAIQuery} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: chatMessages.length > 0 ? '16px' : 0 }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder={
                activeTab === 'plants' ? 'Pregunta sobre tus plantas...' : 
                activeTab === 'exotics' ? 'Pregunta sobre tu animal exótico...' :
                activeTab === 'cats' ? 'Pregunta sobre tus gatos...' : 'Pregunta sobre tus perros...'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '8px', background: '#fff', color: '#000' }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: activeTab === 'plants' ? '#2e7d32' : (activeTab === 'exotics' ? '#7b1fa2' : (activeTab === 'cats' ? '#1976d2' : '#e65100')),
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Consultando...' : 'Preguntar 🤖'}
            </button>
          </div>
        </form>

        {chatMessages.length > 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxHeight: '350px',
            overflowY: 'auto',
            padding: '12px',
            background: 'var(--game-bg, rgba(0,0,0,0.02))',
            borderRadius: '12px',
            border: '1px solid var(--game-border-color, #eaeaea)'
          }}>
            {chatMessages.map((msg, index) => (
              <div 
                key={index}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: msg.sender === 'user'
                    ? (theme === 'gaming'
                      ? (activeTab === 'plants' ? 'rgba(76, 175, 80, 0.15)' : (activeTab === 'exotics' ? 'rgba(156, 39, 176, 0.15)' : (activeTab === 'cats' ? 'rgba(33, 150, 243, 0.15)' : 'rgba(255, 152, 0, 0.15)')))
                      : (activeTab === 'plants' ? '#e8f5e9' : (activeTab === 'exotics' ? '#f3e5f5' : (activeTab === 'cats' ? '#e3f2fd' : '#fff3e0'))))
                    : 'var(--game-card-bg, #ffffff)',
                  border: '1px solid var(--game-border-color, #e0e0e0)',
                  color: msg.sender === 'user'
                    ? (theme === 'gaming' ? 'var(--game-text-bright, #66fcf1)' : '#1f2937')
                    : 'var(--game-text-bright, #333)',
                  fontSize: '12px',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-wrap',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
                  <strong style={{ fontSize: '10px', color: msg.sender === 'user' ? (theme === 'gaming' ? '#8892b0' : '#555555') : '#666' }}>
                    {msg.sender === 'user' ? 'Tú:' : 'Asesor de Viajes IA:'}
                  </strong>
                </div>
                <div dangerouslySetInnerHTML={{ __html: renderMarkdownToHTML(msg.text) }} style={{ fontFamily: 'var(--game-font, sans-serif)' }} />
                {msg.sender === 'ia' && (
                  <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'flex-start' }}>
                    <TTSButton text={msg.text} theme={theme} size="small" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

