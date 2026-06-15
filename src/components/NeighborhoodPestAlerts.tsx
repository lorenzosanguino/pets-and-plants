import React, { useState, useEffect } from 'react';

export interface NeighborhoodAlert {
  id: string;
  tipo: string;
  categoria: 'plants' | 'pets' | 'exotics';
  distancia: number; // en metros
  fecha: string;
  detalles: string;
  gravedad: 'baja' | 'media' | 'alta';
}

interface NeighborhoodPestAlertsProps {
  experienceMode: 'landing' | 'pets' | 'plants' | 'exotics';
  theme?: string;
}

const DEFAULT_ALERTS: NeighborhoodAlert[] = [
  {
    id: 'a1',
    tipo: 'Garrapatas en zona césped',
    categoria: 'pets',
    distancia: 250,
    fecha: 'Hace 3 horas',
    detalles: 'Se han visto garrapatas en la hierba alta junto al parque canino principal. Cuidado con los perros.',
    gravedad: 'alta'
  },
  {
    id: 'a2',
    tipo: 'Foco de Trips',
    categoria: 'plants',
    distancia: 400,
    fecha: 'Hace 1 día',
    detalles: 'Varios vecinos reportan trips en las plantas de sus balcones orientados al sur.',
    gravedad: 'media'
  },
  {
    id: 'a3',
    tipo: 'Cochinilla Algodonosa',
    categoria: 'plants',
    distancia: 650,
    fecha: 'Hace 2 días',
    detalles: 'Detectada plaga en los arbustos decorativos del paseo público.',
    gravedad: 'alta'
  },
  {
    id: 'a4',
    tipo: 'Brote de Pulgas',
    categoria: 'pets',
    distancia: 800,
    fecha: 'Hace 4 días',
    detalles: 'Alerta en la zona del parque central. Recomendable desparasitar antes de ir.',
    gravedad: 'media'
  },
  {
    id: 'a5',
    tipo: 'Ácaros en terrarios húmedos',
    categoria: 'exotics',
    distancia: 1200,
    fecha: 'Hace 5 días',
    detalles: 'Posible contaminación de sustrato comercial comprado en la tienda del barrio. Revisar terrarios de anfibios.',
    gravedad: 'baja'
  }
];

export const NeighborhoodPestAlerts: React.FC<NeighborhoodPestAlertsProps> = ({
  experienceMode,
  theme = 'nature'
}) => {
  const [alerts, setAlerts] = useState<NeighborhoodAlert[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'filtered'>('filtered');
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [tipoPlaga, setTipoPlaga] = useState('');
  const [otroTipo, setOtroTipo] = useState('');
  const [distanciaVal, setDistanciaVal] = useState(300);
  const [gravedadVal, setGravedadVal] = useState<'baja' | 'media' | 'alta'>('media');
  const [detallesVal, setDetallesVal] = useState('');

  // Load and save from/to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('petplant_neighborhood_alerts');
    if (saved) {
      try {
        setAlerts(JSON.parse(saved));
      } catch {
        setAlerts(DEFAULT_ALERTS);
      }
    } else {
      setAlerts(DEFAULT_ALERTS);
      localStorage.setItem('petplant_neighborhood_alerts', JSON.stringify(DEFAULT_ALERTS));
    }
  }, []);

  const getAccentColor = () => {
    if (experienceMode === 'pets') return '#1976d2';
    if (experienceMode === 'exotics') return '#ff8f00';
    return '#2e7d32'; // plants
  };

  const getPestOptions = () => {
    if (experienceMode === 'plants') {
      return ['Trips', 'Cochinilla Algodonosa', 'Pulgones', 'Araña Roja', 'Mosca Blanca', 'Oídio / Mildiu', 'Otro (Especificar)'];
    }
    if (experienceMode === 'pets') {
      return ['Garrapatas', 'Pulgas', 'Mosquito Transmisor', 'Ácaros de oído', 'Foco de Parvovirus', 'Otro (Especificar)'];
    }
    // exotics
    return ['Ácaros de reptiles', 'Hongos en piel', 'Esporas en sustrato', 'Infección respiratoria ambiental', 'Otro (Especificar)'];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTipo = tipoPlaga === 'Otro (Especificar)' ? otroTipo.trim() : tipoPlaga;
    if (!finalTipo) {
      alert('Por favor selecciona o escribe el tipo de plaga/parásito.');
      return;
    }

    const nuevaAlerta: NeighborhoodAlert = {
      id: 'user_' + Date.now(),
      tipo: finalTipo,
      categoria: experienceMode === 'landing' ? 'plants' : (experienceMode as 'plants' | 'pets' | 'exotics'),
      distancia: distanciaVal,
      fecha: 'Hace unos momentos (Reportado por ti)',
      detalles: detallesVal.trim() || 'Sin comentarios adicionales.',
      gravedad: gravedadVal
    };

    const updated = [nuevaAlerta, ...alerts];
    setAlerts(updated);
    localStorage.setItem('petplant_neighborhood_alerts', JSON.stringify(updated));

    // Reset form
    setTipoPlaga('');
    setOtroTipo('');
    setDistanciaVal(300);
    setGravedadVal('media');
    setDetallesVal('');
    setShowForm(false);

    // Show success message
    setSuccessMsg('¡Alerta enviada de forma anónima al vecindario con éxito!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Filter alerts
  const currentCategory = experienceMode === 'landing' ? 'plants' : experienceMode;
  const filteredAlerts = filterMode === 'filtered'
    ? alerts.filter(a => a.categoria === currentCategory)
    : alerts;

  const getGravedadBadgeColor = (g: 'baja' | 'media' | 'alta') => {
    switch (g) {
      case 'alta': return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
      case 'media': return { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' };
      default: return { bg: '#dcfce7', text: '#166534', border: '#86efac' };
    }
  };

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
          <span style={{ fontSize: '20px' }}>🐛</span>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 'bold',
              color: 'var(--game-text-bright, #2c3e50)',
              fontFamily: 'var(--game-font, sans-serif)'
            }}>
              Alertas Sanitarias y Plagas del Barrio
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#888' }}>
              Monitoreo colaborativo y anónimo de infecciones de plantas y parásitos animales en tu zona.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '6px 14px',
            background: showForm ? '#e2e8f0' : getAccentColor(),
            color: showForm ? '#475569' : '#fff',
            border: 'none',
            borderRadius: theme === 'gaming' ? '0px' : '20px',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontFamily: 'var(--game-font, sans-serif)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s'
          }}
        >
          {showForm ? 'Volver a la Lista 📋' : 'Reportar Foco 🚨'}
        </button>
      </div>

      {successMsg && (
        <div style={{
          padding: '12px',
          background: '#dcfce7',
          color: '#166534',
          borderRadius: theme === 'gaming' ? '0px' : '8px',
          fontSize: '12px',
          fontWeight: 'bold',
          textAlign: 'center',
          border: '1px solid #bbf7d0'
        }}>
          {successMsg}
        </div>
      )}

      {showForm ? (
        /* Report Form */
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          background: 'rgba(0,0,0,0.01)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px dashed rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--game-text-bright)', fontWeight: 'bold' }}>
            🚨 Reportar Incidencia Sanitaria (Anónimo)
          </h4>

          {/* Select Type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--game-text)' }}>
              ¿Qué plaga o parásito has detectado?
            </label>
            <select
              value={tipoPlaga}
              onChange={(e) => setTipoPlaga(e.target.value)}
              required
              style={{
                padding: '8px',
                borderRadius: theme === 'gaming' ? '0px' : '6px',
                border: '1px solid rgba(0,0,0,0.15)',
                fontSize: '12px',
                fontFamily: 'var(--game-font, sans-serif)',
                background: '#fff'
              }}
            >
              <option value="">-- Selecciona --</option>
              {getPestOptions().map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {tipoPlaga === 'Otro (Especificar)' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--game-text)' }}>
                Especifica el tipo de plaga/parásito:
              </label>
              <input
                type="text"
                value={otroTipo}
                onChange={(e) => setOtroTipo(e.target.value)}
                placeholder="Ej. Orugas, Moscas de suelo, Sarna..."
                required
                style={{
                  padding: '8px',
                  borderRadius: theme === 'gaming' ? '0px' : '6px',
                  border: '1px solid rgba(0,0,0,0.15)',
                  fontSize: '12px',
                  fontFamily: 'var(--game-font, sans-serif)'
                }}
              />
            </div>
          )}

          {/* Severity & Distance */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--game-text)' }}>
                Nivel de Gravedad:
              </label>
              <select
                value={gravedadVal}
                onChange={(e) => setGravedadVal(e.target.value as 'baja' | 'media' | 'alta')}
                style={{
                  padding: '8px',
                  borderRadius: theme === 'gaming' ? '0px' : '6px',
                  border: '1px solid rgba(0,0,0,0.15)',
                  fontSize: '12px',
                  fontFamily: 'var(--game-font, sans-serif)',
                  background: '#fff'
                }}
              >
                <option value="baja">🟢 Baja (Pocos especímenes)</option>
                <option value="media">🟠 Media (Controlable)</option>
                <option value="alta">🔴 Alta (Infestación / Peligro)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--game-text)' }}>
                Distancia aproximada: {distanciaVal}m
              </label>
              <input
                type="range"
                min="50"
                max="2000"
                step="50"
                value={distanciaVal}
                onChange={(e) => setDistanciaVal(parseInt(e.target.value, 10))}
                style={{ cursor: 'pointer', accentColor: getAccentColor() }}
              />
            </div>
          </div>

          {/* Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--game-text)' }}>
              Detalles o Recomendaciones adicionales:
            </label>
            <textarea
              value={detallesVal}
              onChange={(e) => setDetallesVal(e.target.value)}
              placeholder="Ej. Evitar el césped del fondo del parque, se concentran en las adelfas públicas..."
              maxLength={200}
              rows={2}
              style={{
                padding: '8px',
                borderRadius: theme === 'gaming' ? '0px' : '6px',
                border: '1px solid rgba(0,0,0,0.15)',
                fontSize: '12px',
                fontFamily: 'var(--game-font, sans-serif)',
                resize: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              padding: '10px',
              background: `linear-gradient(135deg, ${getAccentColor()} 0%, ${getAccentColor()}dd 100%)`,
              color: '#fff',
              border: 'none',
              borderRadius: theme === 'gaming' ? '0px' : '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontFamily: 'var(--game-font, sans-serif)',
              transition: 'all 0.2s',
              marginTop: '4px'
            }}
          >
            Reportar de forma Anónima 📢
          </button>
        </form>
      ) : (
        /* Alerts List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* List Toolbar / Filters */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: 'var(--game-text)'
          }}>
            <span>Total reportados: {filteredAlerts.length}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setFilterMode('filtered')}
                style={{
                  padding: '3px 8px',
                  background: filterMode === 'filtered' ? '#e2e8f0' : 'transparent',
                  border: `1px solid ${filterMode === 'filtered' ? 'transparent' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: filterMode === 'filtered' ? 'bold' : 'normal',
                  fontSize: '10px'
                }}
              >
                Solo de este modo
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                style={{
                  padding: '3px 8px',
                  background: filterMode === 'all' ? '#e2e8f0' : 'transparent',
                  border: `1px solid ${filterMode === 'all' ? 'transparent' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: filterMode === 'all' ? 'bold' : 'normal',
                  fontSize: '10px'
                }}
              >
                Ver todos
              </button>
            </div>
          </div>

          {filteredAlerts.length === 0 ? (
            <p style={{
              fontSize: '11px',
              color: 'var(--game-text, #888)',
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '12px',
              background: 'rgba(0,0,0,0.01)',
              borderRadius: '8px',
              margin: 0
            }}>
              No hay reportes activos registrados en esta categoría en tu zona.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredAlerts.map((alerta) => {
                const colors = getGravedadBadgeColor(alerta.gravedad);
                const isPlant = alerta.categoria === 'plants';
                const isExotic = alerta.categoria === 'exotics';
                const catEmoji = isPlant ? '🌿' : isExotic ? '🦎' : '🐾';
                
                return (
                  <div
                    key={alerta.id}
                    style={{
                      padding: '12px',
                      background: 'var(--game-card-inner-bg, rgba(0,0,0,0.02))',
                      border: '1px solid rgba(0,0,0,0.05)',
                      borderRadius: theme === 'gaming' ? '0px' : '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px' }}>{catEmoji}</span>
                        <strong style={{ fontSize: '12px', color: 'var(--game-text-bright, #333)' }}>
                          {alerta.tipo}
                        </strong>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          backgroundColor: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                          textTransform: 'uppercase'
                        }}>
                          Gravedad {alerta.gravedad}
                        </span>
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--game-text, #555)', lineHeight: '1.4' }}>
                      {alerta.detalles}
                    </p>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '10px',
                      color: '#999',
                      borderTop: '1px solid rgba(0,0,0,0.03)',
                      paddingTop: '6px',
                      marginTop: '2px'
                    }}>
                      <span>📍 Distancia: <strong>{alerta.distancia} metros</strong></span>
                      <span>{alerta.fecha}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
