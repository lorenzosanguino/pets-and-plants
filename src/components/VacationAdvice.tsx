import React, { useState } from 'react';
import { GeminiAPIService } from '../services/geminiAPI';

interface VacationAdviceProps {
  mode: 'plants' | 'pets' | 'exotics';
}

export const VacationAdvice: React.FC<VacationAdviceProps> = ({ mode }) => {
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
    setActiveTab(mode === 'plants' ? 'plants' : mode === 'pets' ? 'cats' : 'exotics');
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
        contextLabel = 'Plantas';
      } else if (activeTab === 'exotics') {
        consultantType = 'exoticos';
        contextLabel = 'Animales Exóticos';
      } else {
        consultantType = 'veterinario';
        contextLabel = activeTab === 'cats' ? 'Gatos' : 'Perros';
      }

      const promptContext = `El usuario pregunta sobre consejos de vacaciones/viaje. Ecosistema activo: ${contextLabel}. Pregunta: ${currentQuery}`;
      
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
        undefined,
        undefined,
        historyForAPI
      );
      const iaText = res.diagnostico + (res.tratamiento ? "\n\n" + res.tratamiento : "");
      const iaMsg = { sender: 'ia' as const, text: iaText };
      setChatMessages(prev => [...prev, iaMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg = { sender: 'ia' as const, text: "Lo siento, no se pudo conectar con el consultor IA en este momento. Revisa tu conexión o vuelve a intentarlo." };
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
        </p>
      </div>

      {/* Tabs - Only show tabs if mode is pets */}
      {mode === 'pets' && (
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
          <button
            onClick={() => { setActiveTab('cats'); setChatMessages([]); }}
            style={{
              flex: 1, padding: '10px', background: activeTab === 'cats' ? '#e3f2fd' : 'transparent',
              color: activeTab === 'cats' ? '#1976d2' : '#666', border: 'none',
              borderBottom: activeTab === 'cats' ? '3px solid #1976d2' : '3px solid transparent',
              fontWeight: 'bold', cursor: 'pointer', fontSize: '13px'
            }}
          >
            🐱 Gatos (En Casa)
          </button>
          <button
            onClick={() => { setActiveTab('dogs'); setChatMessages([]); }}
            style={{
              flex: 1, padding: '10px', background: activeTab === 'dogs' ? '#fff3e0' : 'transparent',
              color: activeTab === 'dogs' ? '#e65100' : '#666', border: 'none',
              borderBottom: activeTab === 'dogs' ? '3px solid #e65100' : '3px solid transparent',
              fontWeight: 'bold', cursor: 'pointer', fontSize: '13px'
            }}
          >
            🐶 Perros (Viajan Contigo)
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ fontSize: '13px', lineHeight: '1.6', background: 'rgba(0,0,0,0.01)', padding: '16px', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
        {activeTab === 'plants' && (
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32', fontWeight: 'bold', fontSize: '14px' }}>
              💧 Soluciones de Riego Autónomo para Ausencias
            </h4>
            <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Gel de Riego (Agua Solidificada):</strong> Ideal para plantas medianas. Coloca un sobre de hidrogel en la tierra húmeda; irá liberando humedad de forma gradual durante 10 a 15 días.</li>
              <li><strong>Autorriego por Cordón de Algodón:</strong> Coloca un recipiente elevado lleno de agua junto a tus plantas. Introduce un extremo de un cordón de algodón o lana en el agua y entierra el otro extremo en el sustrato de cada maceta.</li>
              <li><strong>Botellas de Plástico Invertidas:</strong> Llena una botella de plástico con agua, hazle un micro-agujero en el tapón con un alfiler y clávala del revés firmemente en la tierra de la maceta.</li>
              <li><strong>Agrupación Estratégica:</strong> Junta todas tus plantas en la habitación menos calurosa. Al agruparlas, generan un microclima con mayor humedad ambiental, reduciendo la evaporación.</li>
            </ul>
          </div>
        )}

        {activeTab === 'cats' && (
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#1976d2', fontWeight: 'bold', fontSize: '14px' }}>
              🐱 Directrices para dejar Gatos solos en Casa (Máx. 1 Semana)
            </h4>
            <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Fuentes de Agua Eléctricas:</strong> Coloca al menos dos fuentes de agua con filtros. Los gatos prefieren el agua en movimiento y esto previene que se queden sin agua limpia si una fuente falla.</li>
              <li><strong>Comederos Automáticos:</strong> Configura un dispensador automático de comida seca para liberar raciones controladas varias veces al día.</li>
              <li><strong>Areneros Múltiples:</strong> Coloca al menos un arenero extra por cada gato que tengas. Es vital asegurar suficiente superficie limpia para evitar problemas de conducta.</li>
              <li><strong>Visita de Cuidadores (Obligatorio):</strong> Aunque tengan comida y agua autónoma, encarga a un vecino o cuidador que los visite cada 48 horas como máximo para limpiar el arenero y comprobar su bienestar.</li>
            </ul>
          </div>
        )}

        {activeTab === 'dogs' && (
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#e65100', fontWeight: 'bold', fontSize: '14px' }}>
              🐶 Checklist y Consejos para Viajar con tu Perro
            </h4>
            <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Seguridad en el Vehículo:</strong> Los perros nunca deben ir sueltos. Utiliza un arnés de seguridad homologado de doble anclaje conectado al cinturón, o un transportín.</li>
              <li><strong>Documentación y Vacunas:</strong> Lleva su cartilla veterinaria oficial y asegúrate de que la vacuna de la Rabia y el microchip estén registrados y al día.</li>
              <li><strong>Hidratación en Ruta:</strong> Realiza paradas cada 2 horas para que estire las patas, orine y beba agua fresca. Nunca lo dejes solo en el coche al sol.</li>
              <li><strong>Botiquín del Viajero:</strong> Prepara un pequeño neceser con gasas, desinfectante (clorhexidina), sus medicamentos usuales y protectores para las almohadillas.</li>
            </ul>
          </div>
        )}

        {activeTab === 'exotics' && (
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#7b1fa2', fontWeight: 'bold', fontSize: '14px' }}>
              ⚠️ Consulta Obligatoria con un Especialista en Exóticos
            </h4>
            <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: '#555', lineHeight: '1.4' }}>
              Los animales exóticos (serpientes, ranas, geckos, arañas, etc.) dependen críticamente de condiciones específicas que no son generalizables. Te recomendamos encarecidamente consultar a un profesional antes de viajar.
            </p>
            <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Parámetros Críticos del Terrario:</strong> Verifica minuciosamente los calentadores, humidificadores y lámparas UVB. Conéctalos a temporizadores digitales de confianza.</li>
              <li><strong>Alimentación Específica:</strong> Algunas especies pueden ayunar bajo supervisión, pero los anfibios o crías requieren alimentación e hidratación diarias constantes difíciles de automatizar.</li>
              <li><strong>Veterinario de Exóticos de Guardia:</strong> Localiza la clínica de exóticos 24 horas más cercana y deja sus datos visibles para el cuidador que supervise a los animales.</li>
            </ul>
          </div>
        )}
      </div>

      {/* AI Assistant query */}
      <div style={{
        borderTop: '1px solid #eaeaea',
        paddingTop: '16px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold' }}>
          💬 Consultar al Asesor de Viajes IA
        </h4>
        <form onSubmit={handleAIQuery} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            marginTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxHeight: '300px',
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
                    ? (activeTab === 'plants' ? '#e8f5e9' : (activeTab === 'exotics' ? '#f3e5f5' : (activeTab === 'cats' ? '#e3f2fd' : '#fff3e0')))
                    : 'var(--game-card-bg, #ffffff)',
                  border: '1px solid var(--game-border-color, #e0e0e0)',
                  color: 'var(--game-text-bright, #333)',
                  fontSize: '12px',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-wrap',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <strong style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '2px' }}>
                  {msg.sender === 'user' ? 'Tú:' : 'Asesor de Viajes IA:'}
                </strong>
                <span style={{ fontFamily: 'var(--game-font, sans-serif)' }}>{msg.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

