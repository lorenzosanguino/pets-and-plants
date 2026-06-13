import React, { useState, useEffect } from 'react';
import type { Planta, NivelToxicidadFelina, NivelToxicidadCanina } from '../database/types';
import { LocalDatabase } from '../database/db';
import { safeUUID } from '../utils/uuid';
import { CardPhotoManager } from './CardPhotoManager';
import { IAQuotaManager } from '../utils/iaQuota';

interface PlantCardProps {
  planta: Planta;
  onUpdate: () => void;
  onOpenScanner?: (mode: 'enfermedad_planta', assetId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const PlantCard: React.FC<PlantCardProps> = ({ planta, onUpdate, onOpenScanner, isExpanded, onToggleExpand }) => {
  const cuota = IAQuotaManager.obtenerEstadoCuota();
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = isExpanded !== undefined ? isExpanded : localExpanded;

  const toggleExpanded = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setLocalExpanded(!localExpanded);
    }
  };



  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [nota, setNota] = useState('');
  const [estadoHoja, setEstadoHoja] = useState<'Excelente' | 'Normal' | 'Clorosis/Lesión'>('Normal');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [iaReporteModal, setIaReporteModal] = useState<{
    fecha: string;
    diagnostico: string;
    tratamiento: string;
    aislamiento: string;
  } | null>(null);

  const [histFecha, setHistFecha] = useState('');
  const [histTipo, setHistTipo] = useState<'Enfermedad' | 'Parásito' | 'Poda' | 'Tratamiento' | 'Muda' | 'Otro'>('Poda');
  const [histDesc, setHistDesc] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editNombreComun, setEditNombreComun] = useState(planta.nombreComun);
  const [editNombreCientifico, setEditNombreCientifico] = useState(planta.nombreCientifico || '');
  const [editUbicacion, setEditUbicacion] = useState(planta.ubicacionHabitacion);
  const [editIntervalo, setEditIntervalo] = useState(String(planta.intervaloRiegoDias));
  const [editToxicidadFelina, setEditToxicidadFelina] = useState<NivelToxicidadFelina>(planta.toxicidadFelina);
  const [editToxicidadCanina, setEditToxicidadCanina] = useState<NivelToxicidadCanina>(planta.toxicidadCanina || 'Segura');
  const [editCompuestosToxicos, setEditCompuestosToxicos] = useState(planta.compuestosToxicos || '');

  useEffect(() => {
    setEditNombreComun(planta.nombreComun);
    setEditNombreCientifico(planta.nombreCientifico || '');
    setEditUbicacion(planta.ubicacionHabitacion);
    setEditIntervalo(String(planta.intervaloRiegoDias));
    setEditToxicidadFelina(planta.toxicidadFelina);
    setEditToxicidadCanina(planta.toxicidadCanina || 'Segura');
    setEditCompuestosToxicos(planta.compuestosToxicos || '');
  }, [planta]);

  const agregarIncidenciaPasada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!histFecha || !histDesc.trim()) return;

    const nuevoEvento = {
      id: safeUUID(),
      fecha: histFecha,
      tipo: histTipo,
      descripcion: histDesc.trim()
    };

    const plantaActualizada: Planta = {
      ...planta,
      historialPasado: [...(planta.historialPasado || []), nuevoEvento]
    };

    await LocalDatabase.savePlanta(plantaActualizada);
    setHistFecha('');
    setHistDesc('');
    onUpdate();
  };

  const theme = localStorage.getItem('petplant_game_theme') || 'nature';

  const registrarRiego = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const hoy = new Date().toISOString();
    const proximo = new Date(Date.now() + planta.intervaloRiegoDias * 24 * 3600 * 1000).toISOString();

    const plantaActualizada = {
      ...planta,
      ultimaFechaRiego: hoy,
      proximaFechaRiego: proximo
    };

    await LocalDatabase.savePlanta(plantaActualizada);
    onUpdate();
  };

  const handleConfirmDelete = async () => {
    await LocalDatabase.deletePlanta(planta.id);
    onUpdate();
    setShowDeleteConfirm(false);
  };

  const calcularDiasRestantes = () => {
    if (!planta.proximaFechaRiego) return 0;
    const proximo = new Date(planta.proximaFechaRiego).getTime();
    if (isNaN(proximo)) return 0;
    const hoy = new Date().getTime();
    const diferenciaMs = proximo - hoy;
    return Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
  };

  const diasRestantes = calcularDiasRestantes();



  const esMismoDia = (d1: Date, d2String?: string) => {
    if (!d2String) return false;
    const d2 = new Date(d2String);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const obtenerDiasRiego = () => {
    const list = [];
    const hoy = new Date();
    for (let i = -3; i <= 3; i++) {
      const d = new Date();
      d.setDate(hoy.getDate() + i);
      list.push(d);
    }
    return list;
  };

  const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const renderCalendarioRiegoSemanal = () => {
    const dias = obtenerDiasRiego();
    const hoy = new Date();

    return (
      <div style={{
        marginTop: '12px',
        background: 'rgba(0, 0, 0, 0.02)',
        borderRadius: '12px',
        padding: '12px',
        border: '1px solid var(--border, #eaeaea)',
        fontFamily: 'var(--game-font, sans-serif)',
        boxSizing: 'border-box',
        width: '100%'
      }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          💧 Calendario de Riego Semanal
        </p>
        <div style={{
          display: 'flex',
          gap: '6px',
          justifyContent: 'space-between',
          width: '100%',
          overflowX: 'auto',
          boxSizing: 'border-box'
        }}>
          {dias.map((d, index) => {
            const esHoy = d.toDateString() === hoy.toDateString();
            const esPasado = d.getTime() < hoy.getTime() && !esHoy;
            
            // Determinar estado
            let status = 'none';
            let icon = '•';
            let label = '-';
            let color = '#888';

            if (esMismoDia(d, planta.ultimaFechaRiego)) {
              status = esHoy ? 'watered-today' : 'watered';
              icon = '💧';
              label = esHoy ? 'Regada hoy' : 'Regada';
              color = '#1976d2';
            } else if (esHoy) {
              const proxTime = new Date(planta.proximaFechaRiego).getTime();
              const hoyTime = new Date().getTime();
              if (proxTime <= hoyTime || esMismoDia(d, planta.proximaFechaRiego)) {
                status = 'due';
                icon = '⚠️';
                label = 'Toca regar';
                color = '#e53935';
              } else {
                status = 'safe';
                icon = '🍃';
                label = 'Hidratada';
                color = '#4caf50';
              }
            } else if (esPasado) {
              status = 'none';
              icon = '•';
              label = '-';
              color = '#bbb';
            } else { // Futuro
              if (esMismoDia(d, planta.proximaFechaRiego)) {
                status = 'scheduled';
                icon = '📅';
                label = 'Toca regar';
                color = '#ff9800';
              } else {
                status = 'none';
                icon = '•';
                label = '-';
                color = '#bbb';
              }
            }

            return (
              <div 
                key={index} 
                style={{
                  flex: 1,
                  minWidth: '48px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '6px 4px',
                  borderRadius: '8px',
                  background: esHoy ? 'var(--game-accent-light, rgba(76, 175, 80, 0.15))' : 'rgba(255,255,255,0.6)',
                  border: esHoy ? '1.5px solid var(--game-accent, #4caf50)' : '1px solid rgba(0,0,0,0.05)',
                  boxShadow: esHoy ? '0 2px 6px rgba(76,175,80,0.15)' : 'none',
                  boxSizing: 'border-box'
                }}
              >
                <span style={{ fontSize: '9px', fontWeight: esHoy ? 'bold' : 'normal', color: esHoy ? 'var(--game-text-bright)' : '#666' }}>
                  {nombresDias[d.getDay()]}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', margin: '2px 0', color: esHoy ? 'var(--game-text-bright)' : '#333' }}>
                  {d.getDate()}
                </span>
                
                {status === 'due' ? (
                  <button
                    onClick={(e) => registrarRiego(e)}
                    style={{
                      padding: '2px 4px',
                      background: '#1976d2',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginTop: '2px',
                      fontFamily: 'var(--game-font, sans-serif)'
                    }}
                    title="Regar ahora"
                  >
                    REGAR
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '14px' }}>{icon}</span>
                    <span style={{ fontSize: '7.5px', color: color, textAlign: 'center', whiteSpace: 'nowrap' }}>{label}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const agregarNotaFoliar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nota.trim()) return;

    const nuevaEntrada = {
      id: safeUUID(),
      fecha: new Date().toISOString(),
      nota: nota,
      estadoGeneral: estadoHoja
    };

    const plantaActualizada: Planta = {
      ...planta,
      diarioFoliar: [nuevaEntrada, ...(planta.diarioFoliar || [])]
    };

    await LocalDatabase.savePlanta(plantaActualizada);
    setNota('');
    onUpdate();
  };

  const eliminarNotaFoliar = async (notaId: string) => {
    const diarioFiltrado = (planta.diarioFoliar || []).filter(d => d.id !== notaId);
    const plantaActualizada: Planta = {
      ...planta,
      diarioFoliar: diarioFiltrado
    };
    await LocalDatabase.savePlanta(plantaActualizada);
    setDeleteConfirmId(null);
    onUpdate();
  };

  const renderMedidorHidratacion = () => {
    if (theme === 'gaming') {
      const totalHearts = 5;
      const filled = Math.max(0, Math.min(5, Math.ceil((diasRestantes / planta.intervaloRiegoDias) * 5)));
      return (
        <div style={{ display: 'flex', gap: '4px', fontSize: '18px' }}>
          {Array.from({ length: totalHearts }).map((_, i) => (
            <span key={i}>{i < filled ? '💙' : '🖤'}</span>
          ))}
        </div>
      );
    }

    const percent = Math.max(0, Math.min(100, Math.round((diasRestantes / planta.intervaloRiegoDias) * 100)));
    const isKawaii = theme === 'kawaii';
    
    const barColor = isKawaii
      ? (percent > 50 ? '#a3e635' : percent > 20 ? '#fde047' : '#fda4af')
      : (percent > 50 ? '#4caf50' : percent > 20 ? '#ffeb3b' : '#f44336');

    const containerBg = isKawaii 
      ? 'rgba(255, 182, 193, 0.15)' 
      : 'rgba(0, 0, 0, 0.05)';
      
    const containerBorder = isKawaii 
      ? '2px dashed var(--game-border-color, #ffb6c1)' 
      : '1px solid var(--game-border-color, #c8e6c9)';
      
    const containerRadius = 'var(--game-radius, 8px)';
    
    return (
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '11px', 
          fontWeight: 'bold', 
          fontFamily: 'var(--game-font, sans-serif)', 
          color: 'var(--game-text-bright, #2e7d32)',
          marginBottom: '4px'
        }}>
          <span>Nivel de Hidratación</span>
          <span>{percent}%</span>
        </div>
        <div style={{ 
          width: '100%', 
          height: '14px', 
          background: containerBg, 
          border: containerBorder, 
          borderRadius: containerRadius, 
          padding: '2px',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <div style={{ 
            width: `${percent}%`, 
            height: '100%', 
            background: barColor,
            borderRadius: 'calc(var(--game-radius, 8px) - 2px)',
            transition: 'width 0.5s ease-out'
          }} />
        </div>
      </div>
    );
  };

  if (isEditing) {
    return (
      <div style={{
        background: 'var(--game-card-bg, #ffffff)',
        borderRadius: 'var(--game-radius, 16px)',
        padding: '20px',
        boxShadow: 'var(--game-shadow, 0 4px 20px rgba(0,0,0,0.05))',
        border: 'var(--game-border, 1px solid #f0f0f0)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        fontFamily: 'var(--game-font, sans-serif)',
        color: 'var(--game-text, #333)',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%'
      }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--game-text-bright, #333)', fontWeight: 'bold' }}>Editar Planta ✏️</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Nombre Común:</label>
            <input 
              type="text" 
              value={editNombreComun} 
              onChange={(e) => setEditNombreComun(e.target.value)} 
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Nombre Científico:</label>
            <input 
              type="text" 
              value={editNombreCientifico} 
              onChange={(e) => setEditNombreCientifico(e.target.value)} 
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Ubicación:</label>
              <input 
                type="text" 
                value={editUbicacion} 
                onChange={(e) => setEditUbicacion(e.target.value)} 
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Riego (días):</label>
              <input 
                type="number" 
                value={editIntervalo} 
                onChange={(e) => setEditIntervalo(e.target.value)} 
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Toxicidad Felina:</label>
              <select 
                value={editToxicidadFelina} 
                onChange={(e) => setEditToxicidadFelina(e.target.value as any)} 
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
              >
                <option value="Segura">Segura 🐈</option>
                <option value="Tóxica leve (irritante)">Tóxica Leve ⚠️</option>
                <option value="Altamente tóxica (urgencia)">Muy Tóxica 🚨</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Toxicidad Canina:</label>
              <select 
                value={editToxicidadCanina} 
                onChange={(e) => setEditToxicidadCanina(e.target.value as any)} 
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
              >
                <option value="Segura">Segura 🐕</option>
                <option value="Tóxica leve (irritante)">Tóxica Leve ⚠️</option>
                <option value="Altamente tóxica (urgencia)">Muy Tóxica 🚨</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Compuestos:</label>
            <input 
              type="text" 
              placeholder="Ej: Oxalatos" 
              value={editCompuestosToxicos} 
              onChange={(e) => setEditCompuestosToxicos(e.target.value)} 
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button 
            type="button" 
            onClick={() => setIsEditing(false)}
            style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '8px', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: 'var(--game-text)' }}
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={async () => {
              if (!editNombreComun.trim()) return;
              const intVal = parseInt(editIntervalo) || 7;
              const proxima = new Date(Date.now() + intVal * 24 * 3600 * 1000).toISOString();
              const plantaActualizada = {
                ...planta,
                nombreComun: editNombreComun.trim(),
                nombreCientifico: editNombreCientifico.trim() || undefined,
                ubicacionHabitacion: editUbicacion.trim(),
                intervaloRiegoDias: intVal,
                proximaFechaRiego: proxima,
                toxicidadFelina: editToxicidadFelina,
                toxicidadCanina: editToxicidadCanina,
                compuestosToxicos: editCompuestosToxicos.trim() || undefined
              };
              await LocalDatabase.savePlanta(plantaActualizada);
              setIsEditing(false);
              onUpdate();
            }}
            style={{ flex: 1, padding: '10px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            Guardar 💾
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id={`card-${planta.id}`} style={{
      background: 'var(--game-card-bg, #ffffff)',
      borderRadius: 'var(--game-radius, 16px)',
      padding: '20px',
      boxShadow: 'var(--game-shadow, 0 4px 20px rgba(0,0,0,0.05))',
      border: 'var(--game-border, 1px solid #f0f0f0)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      fontFamily: 'var(--game-font, sans-serif)',
      color: 'var(--game-text, #333)',
      position: 'relative',
      boxSizing: 'border-box',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
      maxWidth: '100%'
    }}>
      {/* Cabecera (Click para expandir/colapsar) */}
      <div 
        onClick={toggleExpanded}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
          {!expanded && (
            <div style={(() => {
              const radius = theme === 'gaming' ? '4px' : (theme === 'kawaii' ? '12px' : '8px');
              if (theme === 'gaming') {
                return {
                  width: '60px',
                  height: '60px',
                  borderRadius: radius,
                  background: '#121212',
                  border: '2.5px solid var(--game-border-color, #33f3ff)',
                  boxShadow: '0 0 10px rgba(51, 243, 255, 0.6), inset 0 0 6px rgba(51, 243, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxSizing: 'border-box' as const
                };
              }
              if (theme === 'kawaii') {
                return {
                  width: '60px',
                  height: '60px',
                  borderRadius: radius,
                  background: '#fff5f7',
                  border: '3px solid #ffffff',
                  outline: '1.5px solid #ff6b8b',
                  boxShadow: '0 4px 10px rgba(255, 107, 139, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxSizing: 'border-box' as const
                };
              }
              return {
                width: '60px',
                height: '60px',
                borderRadius: radius,
                background: '#e8f5e9',
                border: '3px solid #ffffff',
                boxShadow: '0 4px 12px rgba(46, 125, 50, 0.25), 0 2px 4px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                overflow: 'hidden',
                flexShrink: 0,
                boxSizing: 'border-box' as const
              };
            })()}>
              {planta.fotoUrl ? (
                <img
                  src={planta.fotoUrl}
                  alt={planta.nombreComun}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                '🌿'
              )}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <h3 style={{ 
              margin: '0 0 2px 0', 
              fontSize: '18px', 
              color: 'var(--game-text-bright, #333)', 
              fontFamily: 'var(--game-font, sans-serif)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              wordBreak: 'break-word',
              maxWidth: '100%',
              lineHeight: '1.2'
            }} title={planta.nombreComun}>
              {planta.nombreComun}
              {theme === 'kawaii' && ' (◕‿◕✿)'}
            </h3>
            <div style={{ 
              fontSize: '11px', 
              color: 'var(--game-text, #888)', 
              fontStyle: 'italic', 
              fontFamily: 'var(--game-font, sans-serif)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%'
            }} title={planta.nombreCientifico || ''}>
              {planta.nombreCientifico || 'Sin Taxonomía Científica'}
            </div>
            
            {/* Badges de Hidratación y Riego rápidos */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={(() => {
                const color = diasRestantes > 0 ? '#1976d2' : '#d32f2f';
                const bg = diasRestantes > 0 ? 'rgba(25, 118, 210, 0.08)' : 'rgba(211, 47, 47, 0.08)';
                return {
                  fontSize: '10px',
                  background: bg,
                  color: color,
                  border: `1.5px solid ${color}`,
                  padding: '2px 8px',
                  borderRadius: theme === 'kawaii' ? '12px' : '6px',
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: 'var(--game-font, sans-serif)'
                };
              })()}>
                📅 {diasRestantes > 0 ? `Quedan ${diasRestantes} días` : '¡Toca regar hoy!'}
              </span>

              <span style={(() => {
                const percent = Math.max(0, Math.min(100, Math.round((diasRestantes / planta.intervaloRiegoDias) * 100)));
                const color = percent > 50 ? '#2e7d32' : (percent > 20 ? '#ef6c00' : '#c62828');
                const bg = percent > 50 ? 'rgba(46, 125, 80, 0.08)' : (percent > 20 ? 'rgba(239, 108, 0, 0.08)' : 'rgba(198, 40, 40, 0.08)');
                return {
                  fontSize: '10px',
                  background: bg,
                  color: color,
                  border: `1.5px solid ${color}`,
                  padding: '2px 8px',
                  borderRadius: theme === 'kawaii' ? '12px' : '6px',
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: 'var(--game-font, sans-serif)'
                };
              })()}>
                💧 Hidratación: {Math.max(0, Math.min(100, Math.round((diasRestantes / planta.intervaloRiegoDias) * 100)))}%
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} className="no-print">
          {expanded && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c62828'
              }}
              title="Eliminar Planta"
            >
              🗑️
            </button>
          )}
          {expanded && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditNombreComun(planta.nombreComun);
                setEditNombreCientifico(planta.nombreCientifico || '');
                setEditUbicacion(planta.ubicacionHabitacion);
                setEditIntervalo(String(planta.intervaloRiegoDias));
                setEditToxicidadFelina(planta.toxicidadFelina);
                setEditToxicidadCanina(planta.toxicidadCanina || 'Segura');
                setEditCompuestosToxicos(planta.compuestosToxicos || '');
                setIsEditing(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--game-text-bright)'
              }}
              title="Editar Planta"
            >
              ✏️
            </button>
          )}
          <span style={{ fontSize: '20px', padding: '10px', color: 'var(--game-text-bright)', fontFamily: 'monospace' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {expanded && (
        <>
          {/* Gestor de Fotos Múltiples */}
          <CardPhotoManager
            currentPhotoUrl={planta.fotoUrl}
            photos={planta.fotos || []}
            theme={theme}
            onPhotosChange={async (updatedPhotos, newPrimaryUrl) => {
              const plantaActualizada = {
                ...planta,
                fotos: updatedPhotos,
                fotoUrl: newPrimaryUrl
              };
              await LocalDatabase.savePlanta(plantaActualizada);
              onUpdate();
            }}
          />

          {/* Nivel de Seguridad de Mascotas (Felina y Canina) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            fontFamily: 'var(--game-font, sans-serif)',
            fontSize: '12px'
          }}>
            {/* Seguridad Felina */}
            <div style={{
              padding: '10px 12px',
              borderRadius: 'var(--game-radius, 8px)',
              background: theme === 'gaming' ? 'transparent' : (planta.toxicidadFelina === 'Segura' ? 'rgba(76, 175, 80, 0.12)' : 'rgba(244, 67, 54, 0.12)'),
              border: `1.5px solid ${planta.toxicidadFelina === 'Segura' ? '#4caf50' : '#f44336'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxSizing: 'border-box'
            }}>
              <p style={{ margin: 0, fontWeight: 'bold', color: planta.toxicidadFelina === 'Segura' ? '#4caf50' : '#f44336', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🐈 Felinos: {planta.toxicidadFelina === 'Segura' ? 'Segura' : planta.toxicidadFelina === 'Tóxica leve (irritante)' ? 'Tóxica Leve' : 'Muy Tóxica'}
              </p>
              <span style={{ color: 'var(--game-text, #555)', fontSize: '10.5px', lineHeight: '1.3' }}>
                {planta.toxicidadFelina === 'Segura' 
                  ? 'Planta inocua para gatos domésticos.' 
                  : `Compuesto: ${planta.compuestosToxicos || 'Irritante foliar'}.`}
              </span>
            </div>

            {/* Seguridad Canina */}
            {(() => {
              const toxCanina = planta.toxicidadCanina ?? 'Segura';
              return (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--game-radius, 8px)',
                  background: theme === 'gaming' ? 'transparent' : (toxCanina === 'Segura' ? 'rgba(76, 175, 80, 0.12)' : 'rgba(244, 67, 54, 0.12)'),
                  border: `1.5px solid ${toxCanina === 'Segura' ? '#4caf50' : '#f44336'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  boxSizing: 'border-box'
                }}>
                  <p style={{ margin: 0, fontWeight: 'bold', color: toxCanina === 'Segura' ? '#4caf50' : '#f44336', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🐕 Caninos: {toxCanina === 'Segura' ? 'Segura' : toxCanina === 'Tóxica leve (irritante)' ? 'Tóxica Leve' : 'Muy Tóxica'}
                  </p>
                  <span style={{ color: 'var(--game-text, #555)', fontSize: '10.5px', lineHeight: '1.3' }}>
                    {toxCanina === 'Segura' 
                      ? 'Planta inocua para perros domésticos.' 
                      : `Compuesto: ${planta.compuestosToxicos || 'Irritante foliar'}.`}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Barra de Riego Dinámica */}
          <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--game-text, #666)', marginBottom: '8px', fontFamily: 'var(--game-font, sans-serif)' }}>
              <span>Riego ({planta.tipoRiegoEspecifico})</span>
              <span style={{ color: 'var(--game-text-bright)' }}>
                {diasRestantes > 0 ? `Quedan ${diasRestantes} días` : '¡Requiere agua hoy!'}
              </span>
            </div>
            {renderMedidorHidratacion()}
          </div>

          {/* Botón de Regar Planta (Ubicado entre Nivel de Hidratación y Algoritmo Climático) */}
          <div style={{ marginTop: '10px', display: 'flex' }}>
            <button 
              onClick={(e) => registrarRiego(e)}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: 'var(--game-accent, #4caf50)',
                color: theme === 'gaming' ? '#000000' : '#fff',
                border: 'var(--game-border, 1px solid #f0f0f0)',
                borderRadius: 'var(--game-radius, 8px)',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'var(--game-font, sans-serif)',
                boxShadow: '0 2px 4px rgba(76,175,80,0.2)'
              }}
            >
              {theme === 'gaming' ? 'WATER STRIKE' : 'Regar Planta 💧'}
            </button>
          </div>

          {/* Calendario de Riego Semanal Interactivo */}
          {renderCalendarioRiegoSemanal()}
          {/* Historial de Incidencias Pasadas (Podas, plagas, trasplantes) */}
          <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)' }}>
              📋 Historial de Podas e Incidencias Pasadas
            </p>
            
            <form onSubmit={agregarIncidenciaPasada} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }} className="no-print">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                <input 
                  type="date" 
                  value={histFecha} 
                  onChange={(e) => setHistFecha(e.target.value)} 
                  required
                  style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }} 
                />
                <select 
                  value={histTipo} 
                  onChange={(e) => setHistTipo(e.target.value as any)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
                >
                  <option value="Poda">Poda</option>
                  <option value="Tratamiento">Tratamiento</option>
                  <option value="Enfermedad">Enfermedad</option>
                  <option value="Parásito">Parásito</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input 
                  type="text" 
                  placeholder="Descripción (ej: Poda severa, trasplante, ácaros...)" 
                  value={histDesc} 
                  onChange={(e) => setHistDesc(e.target.value)} 
                  required
                  style={{ flex: 1, padding: '6px 8px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
                />
                <button type="submit" style={{ padding: '6px 12px', background: '#1a1a1a', color: theme === 'gaming' ? '#000' : '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Añadir
                </button>
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
              {(planta.historialPasado || []).length === 0 ? (
                <span style={{ fontSize: '11px', color: 'var(--game-text, #888)', fontStyle: 'italic', fontFamily: 'var(--game-font, sans-serif)' }}>Sin incidencias registradas.</span>
              ) : (
                (planta.historialPasado || []).map(h => (
                  <div key={h.id} style={{ padding: '6px 8px', background: 'var(--game-accent-light, #fafafa)', borderRadius: '4px', borderLeft: '3px solid #4caf50', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '9px', color: '#666', fontWeight: 'bold', display: 'block' }}>{h.tipo.toUpperCase()} • {h.fecha}</span>
                      <span style={{ color: 'var(--game-text-bright)' }}>{h.descripcion}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={async () => {
                        const filtrado = (planta.historialPasado || []).filter(x => x.id !== h.id);
                        const plantaAct = { ...planta, historialPasado: filtrado };
                        await LocalDatabase.savePlanta(plantaAct);
                        onUpdate();
                      }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Diario Foliar de la Planta */}
          <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: '0', fontSize: '13px', color: 'var(--game-text-bright, #333)', fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)' }}>
              📓 Diario Foliar y Diagnóstico
            </h4>
            <form onSubmit={agregarNotaFoliar} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className="no-print">
              <div style={{ display: 'flex', gap: '6px' }}>
                <select 
                  value={estadoHoja} 
                  onChange={(e) => setEstadoHoja(e.target.value as any)}
                  style={{ padding: '6px', border: 'var(--game-border, 1px solid #eaeaea)', borderRadius: 'var(--game-radius, 6px)', fontSize: '12px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
                >
                  <option value="Excelente">Excelente</option>
                  <option value="Normal">Normal</option>
                  <option value="Clorosis/Lesión">Clorosis/Lesión</option>
                </select>
                <input
                  type="text"
                  placeholder="Nueva nota agrónoma..."
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  style={{ flex: 1, minWidth: 0, padding: '8px 12px', border: 'var(--game-border, 1px solid #eaeaea)', borderRadius: 'var(--game-radius, 6px)', fontSize: '13px', background: 'var(--game-bg)', color: 'var(--game-text-bright)', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button type="submit" style={{ padding: '8px', background: 'var(--game-accent, #1a1a1a)', color: theme === 'gaming' ? '#000' : '#fff', border: 'none', borderRadius: 'var(--game-radius, 6px)', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'var(--game-font, sans-serif)' }}>
                  Registrar Nota
                </button>
                {onOpenScanner && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    <button 
                      type="button" 
                      onClick={() => onOpenScanner('enfermedad_planta', planta.id)} 
                      disabled={!cuota.esIlimitado && cuota.restantes === 0}
                      style={{ 
                        width: '100%',
                        padding: '8px', 
                        background: (!cuota.esIlimitado && cuota.restantes === 0) ? '#e0e0e0' : 'var(--game-accent-light, rgba(46, 125, 50, 0.1))', 
                        color: (!cuota.esIlimitado && cuota.restantes === 0) ? '#9e9e9e' : 'var(--game-text-bright, #2e7d32)', 
                        border: '1.5px solid ' + ((!cuota.esIlimitado && cuota.restantes === 0) ? '#ccc' : 'var(--game-border-color, #2e7d32)'), 
                        borderRadius: 'var(--game-radius, 6px)', 
                        fontSize: '13px', 
                        fontWeight: 'bold', 
                        cursor: (!cuota.esIlimitado && cuota.restantes === 0) ? 'not-allowed' : 'pointer',
                        fontFamily: 'var(--game-font, sans-serif)',
                        transition: 'transform 0.2s'
                      }}
                    >
                      Analizar Enfermedad Foliar por IA 🍂 📷
                    </button>
                    <span style={{ fontSize: '10px', color: (!cuota.esIlimitado && cuota.restantes === 0) ? '#c62828' : 'var(--game-text, #666)', textAlign: 'center', display: 'block', fontWeight: '500' }}>
                      {cuota.esIlimitado 
                        ? '⚡ Modo Premium: Análisis ilimitados' 
                        : cuota.restantes === 0 
                          ? '❌ Límite diario de IA alcanzado (Ingresa tu API Key en Ajustes)' 
                          : `🔑 Te quedan ${cuota.restantes} análisis de IA hoy`}
                    </span>
                  </div>
                )}
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
              {(planta.diarioFoliar || []).length === 0 ? (
                <span style={{ fontSize: '11px', color: 'var(--game-text, #888)', fontStyle: 'italic', fontFamily: 'var(--game-font, sans-serif)' }}>Sin notas en el diario foliar.</span>
              ) : (
                (() => {
                  const parseIAReportePlanta = (nota: string) => {
                    let diagnostico = '';
                    let tratamiento = '';
                    let aislamiento = '';

                    const diagKey = '[IA Diagnóstico Fitosanitario]:';
                    const tratKey = '| Tratamiento:';
                    const aisKey = '| Aislamiento sugerido:';

                    const diagIdx = nota.indexOf(diagKey);
                    const tratIdx = nota.indexOf(tratKey);
                    const aisIdx = nota.indexOf(aisKey);

                    if (diagIdx !== -1) {
                      const start = diagIdx + diagKey.length;
                      const end = tratIdx !== -1 ? tratIdx : (aisIdx !== -1 ? aisIdx : nota.length);
                      diagnostico = nota.substring(start, end).trim();
                    } else {
                      diagnostico = nota;
                    }

                    if (tratIdx !== -1) {
                      const start = tratIdx + tratKey.length;
                      const end = aisIdx !== -1 ? aisIdx : nota.length;
                      tratamiento = nota.substring(start, end).trim();
                    }

                    if (aisIdx !== -1) {
                      const start = aisIdx + aisKey.length;
                      aislamiento = nota.substring(start).trim();
                    }

                    return {
                      diagnostico: diagnostico || 'No especificado',
                      tratamiento: tratamiento || 'No especificado',
                      aislamiento: aislamiento || 'No sugerido'
                    };
                  };

                  return (planta.diarioFoliar || []).map(d => {
                    const esIAReporte = d.nota.startsWith('[IA');
                    const fechaFmt = new Date(d.fecha).toLocaleDateString();
                    const textoMostrar = esIAReporte 
                      ? `análisis fitosanitario - (${fechaFmt})`
                      : d.nota;

                    return (
                      <div 
                        key={d.id} 
                        onClick={() => {
                          if (esIAReporte) {
                            const parsed = parseIAReportePlanta(d.nota);
                            setIaReporteModal({
                              fecha: fechaFmt,
                              diagnostico: parsed.diagnostico,
                              tratamiento: parsed.tratamiento,
                              aislamiento: parsed.aislamiento
                            });
                          }
                        }}
                        style={{ 
                          padding: '8px', 
                          borderLeft: `3px solid ${d.estadoGeneral === 'Excelente' ? '#4caf50' : d.estadoGeneral === 'Normal' ? '#2196f3' : '#ff9800'}`, 
                          background: 'var(--game-accent-light, #fafafa)', 
                          fontSize: '11px', 
                          borderRadius: 'var(--game-radius, 4px)',
                          cursor: esIAReporte ? 'pointer' : 'default',
                          transition: 'background 0.2s',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--game-text, #888)', marginBottom: '2px', fontSize: '9px', alignItems: 'center' }}>
                          <span>
                            ESTADO: {d.estadoGeneral.toUpperCase()} • {fechaFmt} {esIAReporte && '🔍 Click para ver análisis'}
                          </span>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                            {deleteConfirmId === d.id ? (
                              <>
                                <button 
                                  type="button"
                                  onClick={() => eliminarNotaFoliar(d.id)}
                                  style={{ background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '3px', padding: '1px 4px', fontSize: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                  Sí
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  style={{ background: '#ccc', color: '#333', border: 'none', borderRadius: '3px', padding: '1px 3px', fontSize: '8px', cursor: 'pointer' }}
                                >
                                  No
                                </button>
                              </>
                            ) : (
                              <button 
                                type="button"
                                onClick={() => setDeleteConfirmId(d.id)}
                                style={{ background: 'transparent', color: 'var(--game-text, #888)', border: 'none', fontSize: '10px', cursor: 'pointer', padding: '0 4px' }}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                        <span style={{ 
                          color: 'var(--game-text-bright, #333)', 
                          fontFamily: 'var(--game-font, sans-serif)',
                          textDecoration: esIAReporte ? 'underline' : 'none',
                          fontWeight: esIAReporte ? '500' : 'normal'
                        }}>
                          {textoMostrar}
                        </span>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>

          {/* MODAL DE DOBLE CONFIRMACIÓN DE BORRADO */}
          {showDeleteConfirm && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px',
              overflowY: 'auto'
            }} onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}>
              <div style={{
                background: 'var(--game-card-bg, #ffffff)',
                borderRadius: 'var(--game-radius, 16px)',
                border: 'var(--game-border, 1px solid #f0f0f0)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '24px',
                textAlign: 'center',
                maxWidth: '400px',
                width: '100%',
                boxShadow: 'var(--game-shadow, 0 10px 25px rgba(0,0,0,0.2))',
                boxSizing: 'border-box',
                margin: 'auto'
              }} onClick={(e) => e.stopPropagation()}>
                <h4 style={{ margin: '0 0 12px 0', color: '#c62828', fontSize: '18px', fontFamily: 'var(--game-font, sans-serif)' }}>⚠️ ¿Eliminar Planta?</h4>
                <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--game-text, #555)', fontFamily: 'var(--game-font, sans-serif)', lineHeight: '1.4' }}>
                  ¿Estás seguro de que deseas eliminar permanentemente el registro de <strong>{planta.nombreComun}</strong>? Esta acción no se puede deshacer.
                </p>
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(false);
                    }} 
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      border: '1.5px solid #ccc',
                      borderRadius: 'var(--game-radius, 8px)',
                      background: '#f3f4f6',
                      color: '#333333',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontFamily: 'var(--game-font, sans-serif)'
                    }}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmDelete();
                    }} 
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#c62828',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--game-radius, 8px)',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontFamily: 'var(--game-font, sans-serif)'
                    }}
                  >
                    Sí, eliminar 🗑️
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VENTANA EMERGENTE (MODAL) PARA REPORTE DE IA */}
          {iaReporteModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
              boxSizing: 'border-box'
            }} onClick={() => setIaReporteModal(null)}>
              <div style={{
                background: 'var(--game-card-bg, #ffffff)',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '85vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                border: '1px solid var(--game-border-color, #eaeaea)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }} onClick={(e) => e.stopPropagation()}>
                
                {/* Cabecera */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--game-border-color, #f0f0f0)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🍂 Diagnóstico Fitosanitario por IA
                    </h3>
                    <span style={{ fontSize: '11px', color: '#666', marginTop: '2px', fontWeight: '500' }}>
                      Fecha: {iaReporteModal.fecha}
                    </span>
                  </div>
                  <button 
                    onClick={() => setIaReporteModal(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '20px',
                      cursor: 'pointer',
                      color: 'var(--game-text, #999)',
                      padding: '4px',
                      lineHeight: '1'
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Contenido */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px', color: 'var(--game-text-bright, #333)', textAlign: 'left' }}>
                  
                  <div style={{ background: 'rgba(76, 175, 80, 0.06)', borderLeft: '4px solid #4caf50', padding: '12px', borderRadius: '4px' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#388e3c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📋 Diagnóstico Fitosanitario
                    </h4>
                    <p style={{ margin: 0, lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{iaReporteModal.diagnostico}</p>
                  </div>

                  <div style={{ background: 'rgba(33, 150, 243, 0.06)', borderLeft: '4px solid #2196f3', padding: '12px', borderRadius: '4px' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#1976d2', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      💊 Tratamiento Sugerido
                    </h4>
                    <p style={{ margin: 0, lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{iaReporteModal.tratamiento}</p>
                  </div>

                  <div style={{ background: 'rgba(255, 152, 0, 0.06)', borderLeft: '4px solid #ff9800', padding: '12px', borderRadius: '4px' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#f57c00', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🛡️ Aislamiento Sugerido
                    </h4>
                    <p style={{ margin: 0, lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{iaReporteModal.aislamiento}</p>
                  </div>

                </div>

                {/* Botón inferior de cerrar */}
                <button
                  onClick={() => setIaReporteModal(null)}
                  style={{
                    padding: '10px 16px',
                    background: 'var(--game-accent, #1a1a1a)',
                    color: theme === 'gaming' ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    alignSelf: 'flex-end',
                    marginTop: '8px',
                    fontFamily: 'var(--game-font, sans-serif)'
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
