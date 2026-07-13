import React, { useState } from 'react';
import { GeminiAPIService } from '../services/geminiAPI';
import { TTSButton } from '../utils/useTTS';
import { renderMarkdownToHTML } from '../utils/markdown';
import { useTranslations } from '../utils/i18n';
import { PremiumManager } from '../utils/premiumManager';
import { UpgradeModal } from './UpgradeModal';
interface VacationAdviceProps {
  mode: 'plants' | 'pets' | 'travels';
  theme?: string;
  mascotas?: any[];
  plantas?: any[];
}

export const VacationAdvice: React.FC<VacationAdviceProps> = ({ 
  mode, 
  theme = 'nature',
  mascotas = [],
  plantas = [],
}) => {
  const { locale } = useTranslations();
  const isEn = locale === 'en';
  const [prevMode, setPrevMode] = useState(mode);
  const [activeTab, setActiveTab] = useState<'plants' | 'cats' | 'dogs'>(() => {
    if (mode === 'plants') return 'plants';
    if (mode === 'pets') return 'cats';
    return 'plants';
  });
  const [query, setQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ia'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUpgradeAI, setShowUpgradeAI] = useState(false);

  if (mode !== prevMode) {
    setPrevMode(mode);
    setActiveTab(mode === 'plants' ? 'plants' : mode === 'pets' ? 'cats' : 'plants');
    setChatMessages([]);
    setQuery('');
  }

  const handleAIQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // ── Límite freemium ──────────────────────────────────────────────────────
    if (!PremiumManager.canUseAI('vacaciones')) {
      setShowUpgradeAI(true);
      return;
    }

    const currentQuery = query;
    const userMsg = { sender: 'user' as const, text: currentQuery };
    const updatedMessages = [...chatMessages, userMsg];

    setChatMessages(updatedMessages);
    setQuery('');
    setLoading(true);
    try {
      // Determine appropriate advisor context
      let consultantType: 'agronomo' | 'veterinario' = 'agronomo';
      let contextLabel = 'Plantas';

      if (activeTab === 'plants') {
        consultantType = 'agronomo';
        contextLabel = locale === 'en' ? 'Plants' : 'Plantas';

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
        { mascotas, plantas },
        undefined,
        historyForAPI
      );
      const iaText = res.diagnostico + (res.tratamiento ? "\n\n" + res.tratamiento : "");
      const iaMsg = { sender: 'ia' as const, text: iaText };
      setChatMessages(prev => [...prev, iaMsg]);
      // Contabilizar respuesta IA para plan gratuito
      PremiumManager.incrementAIResponse('vacaciones');
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
    <>
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
          {isEn ? '✈️ Travel & Vacation Guide' : '✈️ Guía de Viajes y Vacaciones'}
        </h3>
        <p style={{ margin: '0', fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
          {mode === 'plants' && (isEn ? 'Find expert tips and ideas to keep your plants safe while you are away.' : 'Encuentra consejos de expertos e ideas para mantener tus plantas a salvo mientras estás fuera.')}
          {mode === 'pets' && (isEn ? 'Guidelines and checklist for caring for your dogs and cats when you go on a trip.' : 'Pautas y lista de control para cuidar de tus perros y gatos cuando sales de viaje.')}
          {mode === 'travels' && (isEn ? 'Select a category to see expert tips and ideas for your vacation absences.' : 'Selecciona una categoría para ver consejos de expertos e ideas para tus ausencias por vacaciones.')}
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
              {isEn ? '🌿 Plants' : '🌿 Plantas'}
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
            {isEn ? '🐱 Cats' : '🐱 Gatos'}
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
            {isEn ? '🐶 Dogs' : '🐶 Perros'}
          </button>

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
          {isEn ? '💬 Ask the AI Travel Advisor' : '💬 Preguntar al Asesor de Viaje IA'}
        </h4>
        <form onSubmit={handleAIQuery} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: chatMessages.length > 0 ? '16px' : 0 }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder={
                activeTab === 'plants' ? (isEn ? 'Ask about your plants...' : 'Pregunta sobre tus plantas...') : 
                activeTab === 'cats' ? (isEn ? 'Ask about your cats...' : 'Pregunta sobre tus gatos...') : (isEn ? 'Ask about your dogs...' : 'Pregunta sobre tus perros...')
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: '1 1 200px', padding: '8px 12px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '8px', background: '#fff', color: '#000', minWidth: '150px' }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: '1 0 auto',
                padding: '8px 16px',
                background: activeTab === 'plants' ? '#2e7d32' : (activeTab === 'cats' ? '#1976d2' : '#e65100'),
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              {loading ? (isEn ? 'Consulting...' : 'Consultando...') : (isEn ? 'Ask 🤖' : 'Preguntar 🤖')}
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
                  alignSelf: 'stretch',
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: msg.sender === 'user'
                    ? (theme === 'gaming'
                      ? (activeTab === 'plants' ? 'rgba(76, 175, 80, 0.15)' : (activeTab === 'cats' ? 'rgba(33, 150, 243, 0.15)' : 'rgba(255, 152, 0, 0.15)'))
                      : (activeTab === 'plants' ? '#e8f5e9' : (activeTab === 'cats' ? '#e3f2fd' : '#fff3e0')))
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
                    {msg.sender === 'user' ? (isEn ? 'You:' : 'Tú:') : (isEn ? 'AI Travel Advisor:' : 'Asesor de Viajes IA:')}
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

      {/* Recomendaciones Estáticas */}
      <div style={{
        fontSize: '13px',
        lineHeight: '1.6',
        background: 'rgba(0,0,0,0.01)',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid #f0f0f0'
      }}>
        {activeTab === 'plants' && (
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32', fontWeight: 'bold', fontSize: '14px' }}>
              {isEn ? '💧 Autonomous Watering Solutions for Absences' : '💧 Soluciones de Riego Autónomo para Ausencias'}
            </h4>
            <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong>{isEn ? 'Watering Gel (Solidified Water):' : 'Gel de Riego (Agua Solidificada):'}</strong>{' '}
                {isEn 
                  ? 'Ideal for medium-sized plants. Place a packet of hydrogel in moist soil; it will gradually release moisture for 10 to 15 days.' 
                  : 'Ideal para plantas medianas. Coloca un sobre de hidrogel en la tierra húmeda; irá liberando humedad gradualmente durante 10 a 15 días.'}
              </li>
              <li>
                <strong>{isEn ? 'Cotton Wick Self-Watering:' : 'Autorriego por Cordón de Algodón:'}</strong>{' '}
                {isEn 
                  ? 'Place a raised container filled with water next to your plants. Insert one end of a cotton or wool wick into the water and bury the other end in the potting mix of each pot.' 
                  : 'Coloca un recipiente elevado lleno de agua junto a las plantas. Introduce un extremo del cordón en el agua y entierra el otro extremo en la maceta.'}
              </li>
              <li>
                <strong>{isEn ? 'Inverted Plastic Bottles:' : 'Botellas de Plástico Invertidas:'}</strong>{' '}
                {isEn 
                  ? 'Fill a plastic bottle with water, poke a tiny hole in the cap with a pin, and push it upside down firmly into the soil of the pot.' 
                  : 'Llena una botella de plástico con agua, haz un diminuto agujero en el tapón con una aguja y clávala boca abajo firmemente en la tierra.'}
              </li>
              <li>
                <strong>{isEn ? 'Strategic Grouping:' : 'Agrupación Estratégica:'}</strong>{' '}
                {isEn 
                  ? 'Gather all your plants in the coolest room. Grouping them creates a microclimate with higher ambient humidity, reducing evaporation.' 
                  : 'Reúne todas tus plantas en la habitación más fresca. Agruparlas crea un microclima de mayor humedad ambiental y reduce la evaporación.'}
              </li>
            </ul>
          </div>
        )}

        {activeTab === 'cats' && (
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#1976d2', fontWeight: 'bold', fontSize: '14px' }}>
              {isEn ? '🐱 Guidelines for Leaving Cats Alone at Home (Max. 1 Week)' : '🐱 Pautas para Dejar Gatos Solos en Casa (Máx. 1 Semana)'}
            </h4>
            <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong>{isEn ? 'Electric Water Fountains:' : 'Fuentes de Agua Eléctricas:'}</strong>{' '}
                {isEn 
                  ? 'Place at least two filtered water fountains. Cats prefer moving water, and this prevents them from running out of clean water if one fountain fails.' 
                  : 'Coloca al menos dos fuentes de agua con filtro. Los gatos prefieren agua en movimiento y esto evita que se queden sin ella si una fuente falla.'}
              </li>
              <li>
                <strong>{isEn ? 'Automatic Feeders:' : 'Comederos Automáticos:'}</strong>{' '}
                {isEn 
                  ? 'Set up an automatic dry-food dispenser to release controlled portions several times a day.' 
                  : 'Configura un dispensador automático de comida seca para liberar porciones controladas varias veces al día.'}
              </li>
              <li>
                <strong>{isEn ? 'Multiple Litter Boxes:' : 'Múltiples Areneros:'}</strong>{' '}
                {isEn 
                  ? 'Place at least one extra litter box per cat. It is vital to ensure enough clean surface area to avoid behavioural issues.' 
                  : 'Coloca al menos un arenero extra por cada gato. Es vital asegurar espacio limpio suficiente para evitar problemas de comportamiento.'}
              </li>
              <li>
                <strong>{isEn ? 'Caretaker Visits (Mandatory):' : 'Visitas de Cuidador (Obligatorio):'}</strong>{' '}
                {isEn 
                  ? 'Even with autonomous food and water, ask a neighbour or carer to visit every 48 hours at most to clean the litter box and check their wellbeing.' 
                  : 'Aunque tengan comida y agua autónomas, pide a un vecino o cuidador que los visite cada 48 horas como máximo para limpiar la arena y revisar su estado.'}
              </li>
            </ul>
          </div>
        )}

        {activeTab === 'dogs' && (
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#e65100', fontWeight: 'bold', fontSize: '14px' }}>
              {isEn ? '🐶 Checklist & Tips for Travelling with Your Dog' : '🐶 Checklist y Consejos para Viajar con tu Perro'}
            </h4>
            <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong>{isEn ? 'Vehicle Safety:' : 'Seguridad en el Vehículo:'}</strong>{' '}
                {isEn 
                  ? 'Dogs must never travel loose. Use a certified double-anchor safety harness connected to the seat belt, or a carrier crate.' 
                  : 'Los perros nunca deben viajar sueltos. Usa un arnés de seguridad homologado de doble anclaje al cinturón, o un transportín rígido.'}
              </li>
              <li>
                <strong>{isEn ? 'Documentation & Vaccinations:' : 'Documentación y Vacunas:'}</strong>{' '}
                {isEn 
                  ? 'Bring their official vet record and make sure the Rabies vaccine and microchip are registered and up to date.' 
                  : 'Lleva su cartilla veterinaria oficial y asegúrate de que la vacuna de la Rabia y el microchip están vigentes y actualizados.'}
              </li>
              <li>
                <strong>{isEn ? 'Hydration on the Road:' : 'Hidratación en Ruta:'}</strong>{' '}
                {isEn 
                  ? 'Stop every 2 hours so they can stretch, relieve themselves, and drink fresh water. Never leave them alone in a car in the sun.' 
                  : 'Realiza paradas cada 2 horas para que estire las patas, haga sus necesidades y beba agua fresca. Nunca lo dejes solo en un coche al sol.'}
              </li>
              <li>
                <strong>{isEn ? 'Traveller\'s First-Aid Kit:' : 'Botiquín del Viajero:'}</strong>{' '}
                {isEn 
                  ? 'Prepare a small kit with gauze, antiseptic (chlorhexidine), their regular medications, and paw protectors.' 
                  : 'Prepara un pequeño neceser con gasas, desinfectante (clorhexidina), sus medicamentos habituales y protectores para las almohadillas.'}
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>

      {/* Modal upgrade IA vacaciones */}
      {showUpgradeAI && (
        <UpgradeModal
          reason="ia"
          agentName={isEn ? 'Vacation Advisor' : 'Asesor de Vacaciones'}
          onClose={() => setShowUpgradeAI(false)}
        />
      )}
    </>
  );
};



