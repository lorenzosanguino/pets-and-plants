import React, { useState } from 'react';
import type { Mascota, EntradaDiarioClinico } from '../database/types';
import { LocalDatabase } from '../database/db';
import { safeUUID } from '../utils/uuid';

interface PetClinicViewProps {
  mascotas: Mascota[];
  onUpdate: () => void;
  selectedPetId?: string;
  setSelectedPetId?: (id: string) => void;
  onOpenScanner?: () => void;
}

export const PetClinicView: React.FC<PetClinicViewProps> = ({ 
  mascotas, 
  onUpdate,
  selectedPetId: propSelectedPetId,
  setSelectedPetId: propSetSelectedPetId,
  onOpenScanner
}) => {
  const [localSelectedPetId, setLocalSelectedPetId] = useState<string>(mascotas[0]?.id || '');
  
  const selectedPetId = propSelectedPetId !== undefined ? propSelectedPetId : localSelectedPetId;
  const setSelectedPetId = propSetSelectedPetId !== undefined ? propSetSelectedPetId : setLocalSelectedPetId;
  const [nota, setNota] = useState('');
  const [categoria, setCategoria] = useState<'Nutrición' | 'Comportamiento' | 'Observación general'>('Observación general');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const activePet = mascotas.find(m => m.id === selectedPetId) || mascotas[0];

  if (!activePet) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
        No hay mascotas registradas. Utiliza el escáner para registrar una nueva mascota.
      </div>
    );
  }

  // Fórmulas clínicas de nutrición veterinaria (RER y DER)
  const calcularPlanesNutricionales = () => {
    const registrosPeso = activePet.registroPeso || [];
    const ultimoPeso = registrosPeso[registrosPeso.length - 1]?.pesoKg || 4.0;
    
    // Tasa Metabólica de Reposo (RER)
    const rer = Math.round(70 * Math.pow(ultimoPeso, 0.75));
    
    // Factores de Actividad (DER)
    let factor = 1.2; // Moderada por defecto
    const actividad = activePet.actividad || 'Moderada';
    if (actividad === 'Baja') factor = 1.0;
    if (actividad === 'Alta') factor = 1.4;

    const der = Math.round(rer * factor);
    // Asumiendo croquetas estándar de 360 kcal / 100g
    const gramosComida = Math.round((der / 360) * 100);

    return { rer, der, gramosComida };
  };

  const { rer, der, gramosComida } = calcularPlanesNutricionales();

  // Alerta de fluctuación brusca de peso (>10%)
  const comprobarFluctuacionPeso = () => {
    const pesos = activePet.registroPeso || [];
    if (pesos.length < 2) return null;
    const anterior = pesos[pesos.length - 2].pesoKg;
    const actual = pesos[pesos.length - 1].pesoKg;
    const porcentaje = ((actual - anterior) / anterior) * 100;

    if (Math.abs(porcentaje) >= 10) {
      return {
        porcentaje: porcentaje.toFixed(1),
        tipo: porcentaje > 0 ? 'ganancia' : 'pérdida',
        gravedad: 'alta'
      };
    }
    return null;
  };

  const alertaPeso = comprobarFluctuacionPeso();

  const eliminarNotaClinica = async (notaId: string) => {
    if (!activePet) return;
    const diarioFiltrado = (activePet.diarioClinico || []).filter(d => d.id !== notaId);
    const mascotaActualizada: Mascota = {
      ...activePet,
      diarioClinico: diarioFiltrado
    };
    await LocalDatabase.saveMascota(mascotaActualizada);
    setDeleteConfirmId(null);
    onUpdate();
  };

  const agregarNotaClinica = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nota.trim()) return;

    const nuevaNota: EntradaDiarioClinico = {
      id: safeUUID(),
      fecha: new Date().toISOString(),
      nota: nota,
      categoria: categoria
    };

    const mascotaActualizada: Mascota = {
      ...activePet,
      diarioClinico: [nuevaNota, ...(activePet.diarioClinico || [])]
    };

    await LocalDatabase.saveMascota(mascotaActualizada);
    setNota('');
    onUpdate();
  };

  const renderGraficoPercentil = () => {
    const registros = activePet.registroPeso || [];
    if (registros.length === 0) return null;

    const width = 450;
    const height = 150;
    const paddingX = 40;
    const paddingY = 20;

    // Banda saludable percentil para gatos: 3.5kg a 4.5kg
    const minPercentil = 3.5;
    const maxPercentil = 4.5;
    
    const pesos = registros.map(r => r.pesoKg);
    const minGraph = Math.min(minPercentil, ...pesos) * 0.9;
    const maxGraph = Math.max(maxPercentil, ...pesos) * 1.1;
    const rangoGraph = maxGraph - minGraph;

    // Proyecciones de coordenadas
    const getY = (val: number) => height - paddingY - ((val - minGraph) / rangoGraph) * (height - 2 * paddingY);
    const getX = (index: number) => paddingX + (registros.length > 1 ? (index / (registros.length - 1)) * (width - 2 * paddingX) : (width - 2 * paddingX) / 2);

    const puntosCurva = registros.map((r, i) => `${getX(i)},${getY(r.pesoKg)}`);

    // Coordenadas banda percentil sombreado
    const yMinBand = getY(minPercentil);
    const yMaxBand = getY(maxPercentil);
    const bandPath = `M ${paddingX} ${yMaxBand} L ${width - paddingX} ${yMaxBand} L ${width - paddingX} ${yMinBand} L ${paddingX} ${yMinBand} Z`;

    return (
      <div style={{ marginTop: '16px', background: '#fcfcfc', padding: '16px', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#555', fontWeight: 'bold' }}>Weight Percentile and Body Condition Chart</h4>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          {/* Zona Sombreada de Referencia Saludable */}
          <path d={bandPath} fill="#e3f2fd" opacity="0.5" />
          <line x1={paddingX} y1={yMaxBand} x2={width - paddingX} y2={yMaxBand} stroke="#2196f3" strokeDasharray="3" strokeWidth="1" />
          <line x1={paddingX} y1={yMinBand} x2={width - paddingX} y2={yMinBand} stroke="#2196f3" strokeDasharray="3" strokeWidth="1" />
          <text x={width - paddingX + 5} y={yMaxBand + 3} fontSize="8" fill="#1976d2" fontWeight="bold">Max 4.5kg</text>
          <text x={width - paddingX + 5} y={yMinBand + 3} fontSize="8" fill="#1976d2" fontWeight="bold">Min 3.5kg</text>

          {/* Línea del historial */}
          {registros.length > 1 && (
            <polyline fill="none" stroke="#2e7d32" strokeWidth="2.5" points={puntosCurva.join(' ')} />
          )}

          {/* Puntos y valores */}
          {registros.map((r, i) => {
            const cx = getX(i);
            const cy = getY(r.pesoKg);
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r="4" fill="#2e7d32" stroke="#fff" strokeWidth="1" />
                <text x={cx} y={cy - 8} fontSize="9" fontWeight="bold" fill="#333" textAnchor="middle">{r.pesoKg}kg</text>
                <text x={cx} y={height - 5} fontSize="8" fill="#888" textAnchor="middle">
                  {new Date(r.fecha).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
              </g>
            );
          })}
        </svg>
        <p style={{ margin: '8px 0 0 0', fontSize: '10px', color: '#666', fontStyle: 'italic', textAlign: 'center' }}>
          The blue band represents the clinical percentile of ideal weight for medium-sized breeds.
        </p>
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', width: '100%', boxSizing: 'border-box' }}>
      {/* Columna Izquierda: Perfil, Gráfico y Notificaciones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Selector de Mascota */}
        <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #f0f0f0', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#444' }}>Record:</label>
          <select 
            value={selectedPetId} 
            onChange={(e) => setSelectedPetId(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #eaeaea', borderRadius: '8px', background: '#fafafa', fontSize: '14px' }}
          >
            {mascotas.map(m => (
              <option key={m.id} value={m.id}>{m.nombre} ({m.especie})</option>
            ))}
          </select>
        </div>

        {/* Ficha Clínica y Alertas */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '36px' }}>🐾</div>
            <div>
              <h3 style={{ margin: '0', fontSize: '18px', color: '#333' }}>Record of {activePet.nombre}</h3>
              <span style={{ fontSize: '12px', color: '#888' }}>Chip: {activePet.numeroChip || 'No microchip'} • Activity: {activePet.actividad || 'Moderate'}</span>
            </div>
          </div>

          {alertaPeso && (
            <div style={{ padding: '12px', background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: '8px', color: '#c62828', fontSize: '12px' }}>
              ⚠️ <strong>Metabolic Alert:</strong> A sudden weight {alertaPeso.tipo} of <strong>{alertaPeso.porcentaje}%</strong> was detected. It is recommended to consult a veterinarian for analytical exams.
            </div>
          )}

          {renderGraficoPercentil()}
        </div>

      </div>

      {/* Columna Derecha: Calculadora Nutricional y Diario */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Calculadora Nutricional */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #f0f0f0' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#333', borderBottom: '1px solid #f0f0f0', paddingBottom: '8px' }}>
            Veterinary Nutritional Calculator
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: '#666' }}>Resting Rate (RER)</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#2196f3' }}>{rer} <span style={{ fontSize: '12px' }}>Kcal</span></p>
            </div>
            <div style={{ padding: '12px', background: '#e3f2fd', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: '#666' }}>Daily Required (DER)</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#1976d2' }}>{der} <span style={{ fontSize: '12px' }}>Kcal</span></p>
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#2e7d32', fontWeight: 'bold' }}>Suggested Daily Ration</span>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#555' }}>Calculation based on standard kibble (360 Kcal/100g)</p>
            </div>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32' }}>{gramosComida}g</span>
          </div>
        </div>

        {/* Diario Clínico */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #f0f0f0' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#333', borderBottom: '1px solid #f0f0f0', paddingBottom: '8px' }}>
            Daily Clinical Record and Logs
          </h3>

          <form onSubmit={agregarNotaClinica} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select 
                value={categoria} 
                onChange={(e) => setCategoria(e.target.value as any)}
                style={{ padding: '6px', border: '1px solid #eaeaea', borderRadius: '6px', fontSize: '12px', background: '#fafafa' }}
              >
                <option value="Observación general">Observation</option>
                <option value="Nutrición">Nutrition</option>
                <option value="Comportamiento">Behavior</option>
              </select>
              <input
                type="text"
                placeholder="Add a behavior or diet note..."
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                style={{ flex: 1, minWidth: 0, padding: '8px 12px', border: '1px solid #eaeaea', borderRadius: '6px', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button type="submit" style={{ padding: '8px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                 Save Note
              </button>
              {onOpenScanner && (
                <button 
                  type="button" 
                  onClick={onOpenScanner} 
                  style={{ 
                    padding: '8px', 
                    background: 'var(--game-accent-light, rgba(25, 118, 210, 0.1))', 
                    color: 'var(--game-text-bright, #1976d2)', 
                    border: '1.5px solid var(--game-border-color, #1976d2)', 
                    borderRadius: '6px', 
                    fontSize: '13px', 
                    fontWeight: 'bold', 
                    cursor: 'pointer',
                    fontFamily: 'var(--game-font, sans-serif)',
                    transition: 'transform 0.2s'
                  }}
                >
                  Analizar Salud por IA 🩺 📷
                </button>
              )}
            </div>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {(activePet.diarioClinico || []).map(d => (
              <div key={d.id} style={{ padding: '8px 12px', borderLeft: `3px solid ${d.categoria === 'Nutrición' ? '#4caf50' : d.categoria === 'Comportamiento' ? '#2196f3' : '#9c27b0'}`, background: '#fcfcfc', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', marginBottom: '4px', fontSize: '10px', alignItems: 'center' }}>
                  <span>{d.categoria.toUpperCase()} • {new Date(d.fecha).toLocaleDateString()}</span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {deleteConfirmId === d.id ? (
                      <>
                        <button 
                          type="button"
                          onClick={() => eliminarNotaClinica(d.id)}
                          style={{ background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '3px', padding: '1px 5px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Sure?
                        </button>
                        <button 
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          style={{ background: '#ccc', color: '#333', border: 'none', borderRadius: '3px', padding: '1px 3px', fontSize: '9px', cursor: 'pointer' }}
                        >
                          X
                        </button>
                      </>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => setDeleteConfirmId(d.id)}
                        style={{ background: 'transparent', color: '#888', border: 'none', fontSize: '11px', cursor: 'pointer', padding: '0 4px' }}
                        title="Delete note"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
                <span style={{ color: '#333' }}>{d.nota}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
