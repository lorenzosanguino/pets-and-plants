import React, { useState, useEffect } from 'react';
import type { Mascota } from '../database/types';
import { LocalDatabase } from '../database/db';
import { safeUUID } from '../utils/uuid';
import { CardPhotoManager } from './CardPhotoManager';


interface PetCardProps {
  mascota: Mascota;
  onUpdate: () => void;
  onOpenScanner?: (mode: 'salud_mascota', assetId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const PetCard: React.FC<PetCardProps> = ({ mascota, onUpdate, onOpenScanner, isExpanded, onToggleExpand }) => {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = isExpanded !== undefined ? isExpanded : localExpanded;

  const toggleExpanded = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setLocalExpanded(!localExpanded);
    }
  };

  const [nuevoPeso, setNuevoPeso] = useState('');

  useEffect(() => {
    if (isExpanded) {
      const element = document.getElementById(`card-${mascota.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isExpanded, mascota.id]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [nota, setNota] = useState('');
  const [categoria, setCategoria] = useState<'Nutrición' | 'Comportamiento' | 'Observación general'>('Observación general');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const theme = localStorage.getItem('petplant_game_theme') || 'nature';

  const getSexoBadgeStyle = () => {
    const isFemale = mascota.sexo === 'Hembra';
    if (theme === 'gaming') {
      return {
        fontSize: '10px',
        background: isFemale ? 'rgba(219, 39, 119, 0.15)' : 'rgba(29, 78, 216, 0.15)',
        color: isFemale ? '#ec4899' : '#3b82f6',
        border: isFemale ? '1px solid rgba(236, 72, 153, 0.4)' : '1px solid rgba(59, 130, 246, 0.4)',
        padding: '1px 6px',
        borderRadius: '4px',
        fontWeight: 'bold' as const,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        textShadow: isFemale ? '0 0 4px rgba(236, 72, 153, 0.4)' : '0 0 4px rgba(59, 130, 246, 0.4)',
      };
    } else if (theme === 'kawaii') {
      return {
        fontSize: '10px',
        background: isFemale ? '#fce7f3' : '#dbeafe',
        color: isFemale ? '#db2777' : '#1d4ed8',
        border: isFemale ? '1.5px dashed #ec4899' : '1.5px dashed #3b82f6',
        padding: '2px 8px',
        borderRadius: '12px',
        fontWeight: 'bold' as const,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        textShadow: 'none',
      };
    } else {
      return {
        fontSize: '10px',
        background: isFemale ? '#fdf2f8' : '#e0f2fe',
        color: isFemale ? '#be185d' : '#0369a1',
        border: isFemale ? '1px solid #fbcfe8' : '1px solid #bae6fd',
        padding: '1px 6px',
        borderRadius: '6px',
        fontWeight: 'bold' as const,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        textShadow: 'none',
      };
    }
  };

  const getCastradoBadgeStyle = () => {
    const isCastrado = mascota.castrado;
    if (theme === 'gaming') {
      return {
        fontSize: '10px',
        background: isCastrado ? 'rgba(6, 95, 70, 0.15)' : 'rgba(153, 27, 27, 0.15)',
        color: isCastrado ? '#10b981' : '#ef4444',
        border: isCastrado ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
        padding: '1px 6px',
        borderRadius: '4px',
        fontWeight: 'bold' as const,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        textShadow: isCastrado ? '0 0 4px rgba(16, 185, 129, 0.4)' : '0 0 4px rgba(239, 68, 68, 0.4)',
      };
    } else if (theme === 'kawaii') {
      return {
        fontSize: '10px',
        background: isCastrado ? '#d1fae5' : '#fee2e2',
        color: isCastrado ? '#065f46' : '#991b1b',
        border: isCastrado ? '1.5px dashed #10b981' : '1.5px dashed #ef4444',
        padding: '2px 8px',
        borderRadius: '12px',
        fontWeight: 'bold' as const,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        textShadow: 'none',
      };
    } else {
      return {
        fontSize: '10px',
        background: isCastrado ? '#f0fdf4' : '#fef2f2',
        color: isCastrado ? '#15803d' : '#b91c1c',
        border: isCastrado ? '1px solid #bbf7d0' : '1px solid #fecaca',
        padding: '1px 6px',
        borderRadius: '6px',
        fontWeight: 'bold' as const,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        textShadow: 'none',
      };
    }
  };

  const exportarFichaClinica = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se colapse al hacer clic en exportar
    const style = document.createElement('style');
    style.id = 'print-clinical-record-style';
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        .printable-clinical-record, .printable-clinical-record * {
          visibility: visible;
        }
        .printable-clinical-record {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .no-print {
          display: none !important;
        }
        .printable-only-qr {
          display: flex !important;
          visibility: visible !important;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      const el = document.getElementById('print-clinical-record-style');
      if (el) el.remove();
    }, 1000);
  };

  const registrarPeso = async (e: React.FormEvent) => {
    e.preventDefault();
    const pesoKg = parseFloat(nuevoPeso);
    if (isNaN(pesoKg) || pesoKg <= 0) return;

    const nuevoRegistro = {
      fecha: new Date().toISOString(),
      pesoKg
    };

    const mascotaActualizada: Mascota = {
      ...mascota,
      registroPeso: [...(mascota.registroPeso || []), nuevoRegistro]
    };

    await LocalDatabase.saveMascota(mascotaActualizada);
    setNuevoPeso('');
    onUpdate();
  };

  const handleConfirmDelete = async () => {
    await LocalDatabase.deleteMascota(mascota.id);
    onUpdate();
    setShowDeleteConfirm(false);
  };

  const agregarNotaClinica = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nota.trim()) return;

    const nuevaNota = {
      id: safeUUID(),
      fecha: new Date().toISOString(),
      nota: nota,
      categoria: categoria
    };

    const mascotaActualizada: Mascota = {
      ...mascota,
      diarioClinico: [nuevaNota, ...(mascota.diarioClinico || [])]
    };

    await LocalDatabase.saveMascota(mascotaActualizada);
    setNota('');
    onUpdate();
  };

  const eliminarNotaClinica = async (notaId: string) => {
    const diarioFiltrado = (mascota.diarioClinico || []).filter(d => d.id !== notaId);
    const mascotaActualizada: Mascota = {
      ...mascota,
      diarioClinico: diarioFiltrado
    };
    await LocalDatabase.saveMascota(mascotaActualizada);
    setDeleteConfirmId(null);
    onUpdate();
  };

  const [editChip, setEditChip] = useState(false);
  const [chipVal, setChipVal] = useState(mascota.numeroChip || '');
  const [histFecha, setHistFecha] = useState('');
  const [histTipo, setHistTipo] = useState<'Enfermedad' | 'Parásito' | 'Tratamiento' | 'Otro'>('Enfermedad');
  const [histDesc, setHistDesc] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editNombre, setEditNombre] = useState(mascota.nombre);
  const [editEspecie, setEditEspecie] = useState(mascota.especie);
  const [editRaza, setEditRaza] = useState(mascota.raza || '');
  const [editSexo, setEditSexo] = useState<'Macho' | 'Hembra'>(mascota.sexo || 'Macho');
  const [editCastrado, setEditCastrado] = useState<boolean>(mascota.castrado || false);
  const [editEsMamifero, setEditEsMamifero] = useState<boolean>(mascota.sexo !== undefined || mascota.castrado !== undefined);

  React.useEffect(() => {
    setChipVal(mascota.numeroChip || '');
  }, [mascota.numeroChip]);

  React.useEffect(() => {
    setEditNombre(mascota.nombre);
    setEditEspecie(mascota.especie);
    setEditSexo(mascota.sexo || 'Macho');
    setEditCastrado(mascota.castrado || false);
    setEditEsMamifero(mascota.sexo !== undefined || mascota.castrado !== undefined);
    setEditRaza(mascota.raza || '');
  }, [mascota]);

  const guardarChip = async () => {
    const mascotaActualizada: Mascota = { ...mascota, numeroChip: chipVal.trim() };
    await LocalDatabase.saveMascota(mascotaActualizada);
    setEditChip(false);
    onUpdate();
  };

  const toggleVacunaCheck = async (vName: string) => {
    const current = mascota.vacunasChecklist || [];
    const updated = current.includes(vName) 
      ? current.filter(x => x !== vName) 
      : [...current, vName];
    const mascotaActualizada: Mascota = { ...mascota, vacunasChecklist: updated };
    await LocalDatabase.saveMascota(mascotaActualizada);
    onUpdate();
  };

  const agregarIncidenciaPasada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!histFecha || !histDesc.trim()) return;
    
    const nuevoEvento = {
      id: safeUUID(),
      fecha: histFecha,
      tipo: histTipo,
      descripcion: histDesc.trim()
    };
    
    const mascotaActualizada: Mascota = {
      ...mascota,
      historialPasado: [...(mascota.historialPasado || []), nuevoEvento]
    };
    
    await LocalDatabase.saveMascota(mascotaActualizada);
    setHistFecha('');
    setHistDesc('');
    onUpdate();
  };

  const renderGraficaPeso = () => {
    const registros = mascota.registroPeso || [];
    if (registros.length === 0) return null;

    const pesos = registros.map(r => r.pesoKg);
    const maxPeso = Math.max(...pesos);
    const minPeso = Math.min(...pesos);
    const totalVacunas = (mascota.historialVacunas || []).length;

    return (
      <div style={{ padding: '10px 14px', background: 'var(--game-accent-light, rgba(0,0,0,0.02))', borderRadius: '8px', border: '1px solid var(--game-border-color, #eaeaea)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--game-text, #666)' }}>
          <span>Exp Clínico (Vacunas)</span>
          <span style={{ fontWeight: 'bold', color: 'var(--game-text-bright)' }}>{totalVacunas} Dosis aplicadas</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--game-text, #666)' }}>
          <span>Curva Peso</span>
          <span style={{ fontWeight: 'bold', color: 'var(--game-text-bright)' }}>Min: {minPeso}kg / Max: {maxPeso}kg</span>
        </div>
      </div>
    );
  };

  const renderCorazonesVacunas = () => {
    const total = 5;
    const alDia = (mascota.historialVacunas || []).length;
    const hearts = Math.min(total, alDia);
    return (
      <div style={{ display: 'flex', gap: '4px', fontSize: '18px' }}>
        {Array.from({ length: total }).map((_, i) => (
          <span key={i}>{i < hearts ? '❤️' : '🖤'}</span>
        ))}
      </div>
    );
  };

  const renderVacunasNormal = () => {
    const total = 5;
    const alDia = (mascota.historialVacunas || []).length;
    const percent = Math.min(100, Math.round((alDia / total) * 100));
    return (
      <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
          <span>Inmunidad preventiva</span>
          <span>{percent}%</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${percent}%`, height: '100%', background: 'var(--game-border-color, #1976d2)' }} />
        </div>
      </div>
    );
  };

  const esMamifero = (esp: string) => {
    return ['Felino', 'Canino', 'Hamster', 'Conejo', 'Cobaya'].includes(esp) || (esp === 'Otro' && (mascota.sexo !== undefined || mascota.castrado !== undefined));
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
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--game-text-bright, #333)', fontWeight: 'bold' }}>Editar Mascota ✏️</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Nombre:</label>
            <input 
              type="text" 
              value={editNombre} 
              onChange={(e) => setEditNombre(e.target.value)} 
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Especie:</label>
              <select 
                value={editEspecie} 
                onChange={(e) => setEditEspecie(e.target.value as any)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px' }}
              >
                <option value="Felino">Felino 🐱</option>
                <option value="Canino">Canino 🐶</option>
                <option value="Hamster">Hámster 🐹</option>
                <option value="Conejo">Conejo 🐰</option>
                <option value="Peces">Peces 🐠</option>
                <option value="Pájaro">Pájaro 🐦</option>
                <option value="Cobaya">Cobaya 🐹</option>
                <option value="Otro">Otro 🐾</option>
              </select>
            </div>
            
            {editEspecie === 'Otro' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '18px' }}>
                <input 
                  type="checkbox" 
                  id="edit-es-mamifero"
                  checked={editEsMamifero} 
                  onChange={(e) => setEditEsMamifero(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="edit-es-mamifero" style={{ fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', userSelect: 'none' }}>Es mamífero</label>
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Raza:</label>
            <input 
              type="text" 
              value={editRaza} 
              onChange={(e) => setEditRaza(e.target.value)} 
              placeholder="Ej: Mestizo, Siamés, Golden Retriever..."
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          {(['Felino', 'Canino', 'Hamster', 'Conejo', 'Cobaya'].includes(editEspecie) || (editEspecie === 'Otro' && editEsMamifero)) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Sexo:</label>
                <select 
                  value={editSexo} 
                  onChange={(e) => setEditSexo(e.target.value as any)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px' }}
                >
                  <option value="Macho">Macho ♂</option>
                  <option value="Hembra">Hembra ♀</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>¿Castrado/a?:</label>
                <select 
                  value={editCastrado ? 'si' : 'no'} 
                  onChange={(e) => setEditCastrado(e.target.value === 'si')}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px' }}
                >
                  <option value="no">No</option>
                  <option value="si">Sí</option>
                </select>
              </div>
            </div>
          )}
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
              if (!editNombre.trim()) return;
              const esMamiferoActivo = ['Felino', 'Canino', 'Hamster', 'Conejo', 'Cobaya'].includes(editEspecie) || (editEspecie === 'Otro' && editEsMamifero);
              const mascotaActualizada: Mascota = {
                ...mascota,
                nombre: editNombre.trim(),
                especie: editEspecie,
                raza: editRaza.trim() || undefined,
                sexo: esMamiferoActivo ? editSexo : undefined,
                castrado: esMamiferoActivo ? editCastrado : undefined
              };
              await LocalDatabase.saveMascota(mascotaActualizada);
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
    <div id={`card-${mascota.id}`} className="printable-clinical-record" style={{
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
      {/* HUD de Nivel en Tema Gaming */}
      {theme === 'gaming' && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(0,0,0,0.5)',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          color: 'var(--game-accent, #ffb300)',
          fontWeight: 'bold',
          border: '1px solid var(--game-border-color)',
          zIndex: 5
        }}>
          LVL {((mascota.historialVacunas || []).length) + 1}
        </div>
      )}

      {/* Cabecera con Foto Real y Avatar Badge (Click para expandir/colapsar) */}
      <div 
        onClick={toggleExpanded}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
          {!expanded && (
            <div style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
              <div style={(() => {
                if (theme === 'gaming') {
                  return {
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#121212',
                    border: '2.5px solid var(--game-border-color, #33f3ff)',
                    boxShadow: '0 0 10px rgba(51, 243, 255, 0.6), inset 0 0 6px rgba(51, 243, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    overflow: 'hidden',
                    boxSizing: 'border-box' as const
                  };
                }
                if (theme === 'kawaii') {
                  return {
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#fff5f7',
                    border: '3px solid #ffffff',
                    outline: '1.5px solid #ff6b8b',
                    boxShadow: '0 4px 10px rgba(255, 107, 139, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    overflow: 'hidden',
                    boxSizing: 'border-box' as const
                  };
                }
                return {
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: '#e3f2fd',
                  border: '3px solid #ffffff',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2), 0 2px 4px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  overflow: 'hidden',
                  boxSizing: 'border-box' as const
                };
              })()}>
                {mascota.fotoUrl ? (
                  <img
                    src={mascota.fotoUrl}
                    alt={mascota.nombre}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : mascota.avatarUrl ? (
                  <img
                    src={mascota.avatarUrl}
                    alt={mascota.nombre}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  mascota.especie === 'Felino' ? '🐱' : '🐶'
                )}
              </div>
              {mascota.avatarUrl && mascota.fotoUrl && (
                <img 
                  src={mascota.avatarUrl} 
                  alt="Avatar retro" 
                  style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    border: '1px solid var(--game-border-color, #1976d2)',
                    background: '#fff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    zIndex: 2
                  }}
                  title="Avatar de videojuego generado"
                />
              )}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <h3 style={{ 
              margin: '0 0 4px 0', 
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
            }} title={mascota.nombre}>
              {mascota.nombre}
              {theme === 'kawaii' && ' (｡♥‿♥｡)'}
            </h3>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              flexWrap: 'wrap', 
              paddingBottom: '2px'
            }}>
              {esMamifero(mascota.especie) && mascota.sexo && (
                <span style={{ ...getSexoBadgeStyle(), margin: 0, fontSize: '11px', padding: '2px 6px' }}>
                  {mascota.sexo === 'Hembra' ? '♀ Hembra' : '♂ Macho'}
                </span>
              )}
              {esMamifero(mascota.especie) && mascota.castrado !== undefined && (
                <span style={{ ...getCastradoBadgeStyle(), margin: 0, fontSize: '11px', padding: '2px 6px' }}>
                  {mascota.castrado ? '✂️ Castrado/a' : '🥚 Sin castrar'}
                </span>
              )}
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
              title="Eliminar Mascota"
            >
              🗑️
            </button>
          )}
          {expanded && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditNombre(mascota.nombre);
                setEditEspecie(mascota.especie);
                setEditRaza(mascota.raza || '');
                setEditSexo(mascota.sexo || 'Macho');
                setEditCastrado(mascota.castrado || false);
                setEditEsMamifero(mascota.sexo !== undefined || mascota.castrado !== undefined);
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
              title="Editar Mascota"
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
            currentPhotoUrl={mascota.fotoUrl || mascota.avatarUrl}
            photos={mascota.fotos || []}
            theme={theme}
            onPhotosChange={async (updatedPhotos, newPrimaryUrl) => {
              const mascotaActualizada = {
                ...mascota,
                fotos: updatedPhotos,
                fotoUrl: newPrimaryUrl
              };
              await LocalDatabase.saveMascota(mascotaActualizada);
              onUpdate();
            }}
          />

          {/* Especie y Raza en Detalles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: 'var(--game-card-bg, #fafafa)', padding: '8px 12px', borderRadius: 'var(--game-radius, 8px)', border: '1px solid var(--game-border-color, #eee)', color: 'var(--game-text-bright)' }}>
            <span style={{ fontWeight: 'bold' }}>🐾 Especie y Raza:</span>
            <span>{mascota.especie}{mascota.raza ? ` (${mascota.raza})` : ''}</span>
          </div>

          {/* Formulario/Editor de Chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: 'var(--game-card-bg, #fafafa)', padding: '8px 12px', borderRadius: 'var(--game-radius, 8px)', border: '1px solid var(--game-border-color, #eee)', color: 'var(--game-text-bright)' }}>
            <span style={{ fontWeight: 'bold' }}>Número Microchip:</span>
            {editChip ? (
              <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                <input 
                  type="text" 
                  value={chipVal} 
                  onChange={(e) => setChipVal(e.target.value)} 
                  style={{ flex: 1, padding: '4px 8px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', color: '#000' }} 
                />
                <button type="button" onClick={guardarChip} style={{ padding: '4px 10px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>✓</button>
                <button type="button" onClick={() => setEditChip(false)} style={{ padding: '4px 10px', background: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>X</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{mascota.numeroChip || 'No registrado'}</span>
                <button type="button" onClick={() => setEditChip(true)} style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontSize: '12px', padding: 0 }}>✏️ Editar</button>
              </div>
            )}
          </div>

          {renderGraficaPeso()}

          <form onSubmit={registrarPeso} style={{ display: 'flex', gap: '8px', margin: '6px 0' }} className="no-print">
            <input
              type="number"
              step="0.1"
              placeholder="Nuevo peso (kg)"
              value={nuevoPeso}
              onChange={(e) => setNuevoPeso(e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '8px 12px',
                background: 'var(--game-bg, #ffffff)',
                color: 'var(--game-text-bright, #333)',
                border: 'var(--game-border, 1px solid #eaeaea)',
                borderRadius: 'var(--game-radius, 8px)',
                fontSize: '13px',
                fontFamily: 'var(--game-font, sans-serif)',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                background: 'var(--game-accent, #2196f3)',
                color: theme === 'gaming' ? '#000000' : 'var(--game-text-bright, #fff)',
                border: 'var(--game-border, none)',
                borderRadius: 'var(--game-radius, 8px)',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'var(--game-font, sans-serif)',
                flexShrink: 0
              }}
            >
              Pesar ⚖️
            </button>
          </form>

          {/* Control de Vacunación Temática */}
          <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 'bold', color: 'var(--game-text-bright, #555)', fontFamily: 'var(--game-font, sans-serif)' }}>
              {theme === 'gaming' ? 'HEALTH BAR (VACUNAS)' : 'CONTROL DE VACUNAS'}
            </p>
            {theme === 'gaming' ? renderCorazonesVacunas() : renderVacunasNormal()}
          </div>

          {/* Checklist de Vacunas Colocadas */}
          <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)' }}>
              💉 Checklist de Vacunación Específica:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px' }}>
              {['Rabia', 'Parvovirus', 'Moquillo', 'Trivalente', 'Leucemia', 'Otras'].map(vName => {
                const isChecked = (mascota.vacunasChecklist || []).includes(vName);
                return (
                  <label key={vName} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--game-font, sans-serif)', color: 'var(--game-text)' }}>
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => toggleVacunaCheck(vName)}
                      style={{ cursor: 'pointer' }}
                    />
                    {vName}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Historial de Enfermedades e Incidencias Pasadas */}
          <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)' }}>
              🏥 Historial de Incidencias / Afecciones Pasadas
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
                  <option value="Enfermedad">Enfermedad</option>
                  <option value="Parásito">Parásito</option>
                  <option value="Tratamiento">Tratamiento</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input 
                  type="text" 
                  placeholder="Descripción de la dolencia o tratamiento..." 
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
              {(mascota.historialPasado || []).length === 0 ? (
                <span style={{ fontSize: '11px', color: 'var(--game-text, #888)', fontStyle: 'italic', fontFamily: 'var(--game-font, sans-serif)' }}>Sin incidencias pasadas registradas.</span>
              ) : (
                (mascota.historialPasado || []).map(h => (
                  <div key={h.id} style={{ padding: '6px 8px', background: 'var(--game-accent-light, #fafafa)', borderRadius: '4px', borderLeft: '3px solid #ff9800', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '9px', color: '#666', fontWeight: 'bold', display: 'block' }}>{h.tipo.toUpperCase()} • {h.fecha}</span>
                      <span style={{ color: 'var(--game-text-bright)' }}>{h.descripcion}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={async () => {
                        const filtrado = (mascota.historialPasado || []).filter(x => x.id !== h.id);
                        const mascotaAct = { ...mascota, historialPasado: filtrado };
                        await LocalDatabase.saveMascota(mascotaAct);
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

          {/* Diario Clínico de la Mascota */}
          <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: '0', fontSize: '13px', color: 'var(--game-text-bright, #333)', fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)' }}>
              📓 Diario Clínico y Notas
            </h4>
            <form onSubmit={agregarNotaClinica} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className="no-print">
              <div style={{ display: 'flex', gap: '6px' }}>
                <select 
                  value={categoria} 
                  onChange={(e) => setCategoria(e.target.value as any)}
                  style={{ padding: '6px', border: 'var(--game-border, 1px solid #eaeaea)', borderRadius: 'var(--game-radius, 6px)', fontSize: '12px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
                >
                  <option value="Observación general">Observación</option>
                  <option value="Nutrición">Nutrición</option>
                  <option value="Comportamiento">Comportamiento</option>
                </select>
                <input
                  type="text"
                  placeholder="Nueva nota de salud/dieta..."
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
                  <button 
                    type="button" 
                    onClick={() => onOpenScanner('salud_mascota', mascota.id)} 
                    style={{ 
                      padding: '8px', 
                      background: 'var(--game-accent-light, rgba(25, 118, 210, 0.1))', 
                      color: 'var(--game-text-bright, #1976d2)', 
                      border: '1.5px solid var(--game-border-color, #1976d2)', 
                      borderRadius: 'var(--game-radius, 6px)', 
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
              {(mascota.diarioClinico || []).length === 0 ? (
                <span style={{ fontSize: '11px', color: 'var(--game-text, #888)', fontStyle: 'italic', fontFamily: 'var(--game-font, sans-serif)' }}>Sin notas en el historial.</span>
              ) : (
                (mascota.diarioClinico || []).map(d => (
                  <div key={d.id} style={{ padding: '8px', borderLeft: `3px solid ${d.categoria === 'Nutrición' ? '#4caf50' : d.categoria === 'Comportamiento' ? '#2196f3' : '#9c27b0'}`, background: 'var(--game-accent-light, #fafafa)', fontSize: '11px', borderRadius: 'var(--game-radius, 4px)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--game-text, #888)', marginBottom: '2px', fontSize: '9px', alignItems: 'center' }}>
                      <span>{d.categoria.toUpperCase()} • {new Date(d.fecha).toLocaleDateString()}</span>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {deleteConfirmId === d.id ? (
                          <>
                            <button 
                              type="button"
                              onClick={() => eliminarNotaClinica(d.id)}
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
                    <span style={{ color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)' }}>{d.nota}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Código QR Ficticio Clínico */}
          <div className="printable-only-qr" style={{ display: 'none', flexDirection: 'column', alignItems: 'center', marginTop: '16px', borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px' }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '10px', color: 'var(--game-text, #666)', fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)' }}>EXPEDIENTE CLÍNICO DIGITAL</p>
            <svg width="60" height="60" viewBox="0 0 29 29" style={{ border: '1px solid #ddd', padding: '4px', background: '#fff' }}>
              <path d="M0 0h9v9H0zm1 1v7h7V1zm10 0h9v9h-9zm1 1v7h7V1zm-11 10h9v9H0zm1 1v7h7V12zm18-11h9v9h-9zm1 1v7h7V12zm-8 10h3v3h-3zm3 3h3v3h-3zm-3 3h3v3h-3zm11-11h3v3h-3zm-3 3h3v3h-3zm3 3h3v3h-3zm-11 2h3v3h-3zm3 3h3v3h-3zm-6-6h3v3H8zm3 3h3v3h-3zm6-6h3v3h-3zm3 3h3v3h-3z" fill="#000"/>
            </svg>
            <span style={{ fontSize: '8px', color: 'var(--game-text, #888)', marginTop: '4px', fontFamily: 'var(--game-font, sans-serif)' }}>Escanea para descargar historial clínico</span>
          </div>

          {/* Botones de Acción: Exportar */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px' }} className="no-print">
            <button
              onClick={exportarFichaClinica}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'var(--game-accent, #4caf50)',
                color: theme === 'gaming' ? '#000000' : '#fff',
                border: 'var(--game-border, none)',
                borderRadius: 'var(--game-radius, 8px)',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'var(--game-font, sans-serif)'
              }}
            >
              Exportar Ficha 📄
            </button>
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
                <h4 style={{ margin: '0 0 12px 0', color: '#c62828', fontSize: '18px', fontFamily: 'var(--game-font, sans-serif)' }}>⚠️ ¿Eliminar Mascota?</h4>
                <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--game-text, #555)', fontFamily: 'var(--game-font, sans-serif)', lineHeight: '1.4' }}>
                  ¿Estás seguro de que deseas eliminar permanentemente el expediente de <strong>{mascota.nombre}</strong>? Esta acción no se puede deshacer.
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
        </>
      )}
    </div>
  );
};
