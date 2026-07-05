import React, { useState } from 'react';
import { GeminiAPIService } from '../services/geminiAPI';
import { TTSButton } from '../utils/useTTS';
import { renderMarkdownToHTML } from '../utils/markdown';
import { useTranslations } from '../utils/i18n';
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
  const [prevMode, setPrevMode] = useState(mode);
  const [activeTab, setActiveTab] = useState<'plants' | 'cats' | 'dogs'>(() => {
    if (mode === 'plants') return 'plants';
    if (mode === 'pets') return 'cats';
    return 'plants';
  });
  const [query, setQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ia'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  if (mode !== prevMode) {
    setPrevMode(mode);
    setActiveTab(mode === 'plants' ? 'plants' : mode === 'pets' ? 'cats' : 'plants');
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
          ✈️ Travel & Vacation Guide
        </h3>
        <p style={{ margin: '0', fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
          {mode === 'plants' && 'Find expert tips and ideas to keep your plants safe while you are away.'}
          {mode === 'pets' && 'Guidelines and checklist for caring for your dogs and cats when you go on a trip.'}
          {mode === 'travels' && 'Select a category to see expert tips and ideas for your vacation absences.'}
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
              🌿 Plants
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
            🐱 Cats
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
            🐶 Dogs
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
          💬 Ask the AI Travel Advisor
        </h4>
        <form onSubmit={handleAIQuery} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: chatMessages.length > 0 ? '16px' : 0 }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder={
                activeTab === 'plants' ? 'Ask about your plants...' : 
                activeTab === 'cats' ? 'Ask about your cats...' : 'Ask about your dogs...'
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
              {loading ? 'Consulting...' : 'Ask 🤖'}
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
                    {msg.sender === 'user' ? 'You:' : 'AI Travel Advisor:'}
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
              💧 Autonomous Watering Solutions for Absences
            </h4>
            <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Watering Gel (Solidified Water):</strong> Ideal for medium-sized plants. Place a packet of hydrogel in moist soil; it will gradually release moisture for 10 to 15 days.</li>
              <li><strong>Cotton Wick Self-Watering:</strong> Place a raised container filled with water next to your plants. Insert one end of a cotton or wool wick into the water and bury the other end in the potting mix of each pot.</li>
              <li><strong>Inverted Plastic Bottles:</strong> Fill a plastic bottle with water, poke a tiny hole in the cap with a pin, and push it upside down firmly into the soil of the pot.</li>
              <li><strong>Strategic Grouping:</strong> Gather all your plants in the coolest room. Grouping them creates a microclimate with higher ambient humidity, reducing evaporation.</li>
            </ul>
          </div>
        )}

        {activeTab === 'cats' && (
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#1976d2', fontWeight: 'bold', fontSize: '14px' }}>
              🐱 Guidelines for Leaving Cats Alone at Home (Max. 1 Week)
            </h4>
            <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Electric Water Fountains:</strong> Place at least two filtered water fountains. Cats prefer moving water, and this prevents them from running out of clean water if one fountain fails.</li>
              <li><strong>Automatic Feeders:</strong> Set up an automatic dry-food dispenser to release controlled portions several times a day.</li>
              <li><strong>Multiple Litter Boxes:</strong> Place at least one extra litter box per cat. It is vital to ensure enough clean surface area to avoid behavioural issues.</li>
              <li><strong>Caretaker Visits (Mandatory):</strong> Even with autonomous food and water, ask a neighbour or carer to visit every 48 hours at most to clean the litter box and check their wellbeing.</li>
            </ul>
          </div>
        )}

        {activeTab === 'dogs' && (
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#e65100', fontWeight: 'bold', fontSize: '14px' }}>
              🐶 Checklist & Tips for Travelling with Your Dog
            </h4>
            <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Vehicle Safety:</strong> Dogs must never travel loose. Use a certified double-anchor safety harness connected to the seat belt, or a carrier crate.</li>
              <li><strong>Documentation & Vaccinations:</strong> Bring their official vet record and make sure the Rabies vaccine and microchip are registered and up to date.</li>
              <li><strong>Hydration on the Road:</strong> Stop every 2 hours so they can stretch, relieve themselves, and drink fresh water. Never leave them alone in a car in the sun.</li>
              <li><strong>Traveller's First-Aid Kit:</strong> Prepare a small kit with gauze, antiseptic (chlorhexidine), their regular medications, and paw protectors.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

