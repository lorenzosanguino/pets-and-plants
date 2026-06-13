import React, { useState } from 'react';
import type { AnimalExotico, EventoPasado, EntradaDiarioClinico } from '../database/types';
import { LocalDatabase } from '../database/db';
import { safeUUID } from '../utils/uuid';
import { CardPhotoManager } from './CardPhotoManager';
import { IAQuotaManager } from '../utils/iaQuota';


interface ExoticCardProps {
  exotico: AnimalExotico;
  onUpdate: () => void;
  onOpenScanner?: (mode: 'registrar_mascota' | 'salud_mascota' | 'registrar_planta' | 'enfermedad_planta' | 'registrar_exotico' | 'salud_exotico', assetId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const ExoticCard: React.FC<ExoticCardProps> = ({ exotico, onUpdate, onOpenScanner, isExpanded: propExpanded, onToggleExpand }) => {
  const cuota = IAQuotaManager.obtenerEstadoCuota();
  const [localExpanded, setLocalExpanded] = useState(false);
  const isExpanded = propExpanded !== undefined ? propExpanded : localExpanded;

  const toggleExpanded = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setLocalExpanded(!localExpanded);
    }
  };



  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [iaReporteModal, setIaReporteModal] = useState<{
    fecha: string;
    diagnostico: string;
    tratamiento: string;
    advertencia: string;
    subtipo: string;
  } | null>(null);
  const [editingChip, setEditingChip] = useState(false);
  const [chipValue, setChipValue] = useState(exotico.chip || '');
  const theme = localStorage.getItem('petplant_game_theme') || 'nature';

  const [isEditing, setIsEditing] = useState(false);
  const [editNombre, setEditNombre] = useState(exotico.nombre);
  const [editEspecie, setEditEspecie] = useState<'Serpiente' | 'Rana' | 'Tarántula' | 'Escorpión' | 'Otro'>(exotico.especie);
  const [editTipoEspecifico, setEditTipoEspecifico] = useState(exotico.tipoEspecifico);

  React.useEffect(() => {
    setEditNombre(exotico.nombre);
    setEditEspecie(exotico.especie);
    setEditTipoEspecifico(exotico.tipoEspecifico);
  }, [exotico]);

  // Nuevo registro diario
  const [newNota, setNewNota] = useState('');
  const [newCategoria, setNewCategoria] = useState<'Nutrición' | 'Comportamiento' | 'Observación general'>('Observación general');

  // Nuevo evento pasado
  const [newPastDate, setNewPastDate] = useState('');
  const [newPastType, setNewPastType] = useState<'Enfermedad' | 'Parásito' | 'Muda' | 'Tratamiento' | 'Otro'>('Otro');
  const [newPastDesc, setNewPastDesc] = useState('');

  const handleDelete = async () => {
    try {
      await LocalDatabase.deleteExotico(exotico.id);
      localStorage.setItem('petplant_db_last_updated', Date.now().toString());
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveChip = async () => {
    const updated: AnimalExotico = {
      ...exotico,
      chip: chipValue.trim() || undefined
    };
    await LocalDatabase.saveExotico(updated);
    localStorage.setItem('petplant_db_last_updated', Date.now().toString());
    editingChip && setEditingChip(false);
    onUpdate();
  };

  const handleAddDiario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNota.trim()) return;

    const nuevaEntrada: EntradaDiarioClinico = {
      id: safeUUID(),
      fecha: new Date().toISOString(),
      nota: newNota.trim(),
      categoria: newCategoria
    };

    const updated: AnimalExotico = {
      ...exotico,
      diarioExotico: [nuevaEntrada, ...exotico.diarioExotico]
    };

    await LocalDatabase.saveExotico(updated);
    localStorage.setItem('petplant_db_last_updated', Date.now().toString());
    setNewNota('');
    onUpdate();
  };

  const handleAddPastEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPastDate || !newPastDesc.trim()) return;

    const nuevoEvento: EventoPasado = {
      id: safeUUID(),
      fecha: newPastDate,
      tipo: newPastType,
      descripcion: newPastDesc.trim()
    };

    const updated: AnimalExotico = {
      ...exotico,
      historialPasado: [...(exotico.historialPasado || []), nuevoEvento]
    };

    await LocalDatabase.saveExotico(updated);
    localStorage.setItem('petplant_db_last_updated', Date.now().toString());
    setNewPastDate('');
    setNewPastDesc('');
    onUpdate();
  };

  const handleAlimentar = async () => {
    const updated: AnimalExotico = {
      ...exotico,
      ultimaAlimentacion: new Date().toISOString()
    };
    await LocalDatabase.saveExotico(updated);
    localStorage.setItem('petplant_db_last_updated', Date.now().toString());
    onUpdate();
  };

  const exportarFichaExotico = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Crear iframe temporal
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      alert('No se pudo generar la previsualización de impresión.');
      return;
    }

    const formatDate = (isoString?: string) => {
      if (!isoString) return 'No especificada';
      try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return isoString.split('T')[0];
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch {
        return isoString.split('T')[0] || 'No especificada';
      }
    };

    const parseIAReporteExotico = (nota: string) => {
      let diagnostico = '';
      let tratamiento = '';
      let advertencia = '';

      const diagKey = '[IA Diagnóstico Exótico]:';
      const tratKey = '| Tratamiento:';
      const advKey = '| Alerta:';

      const diagIdx = nota.indexOf(diagKey);
      const tratIdx = nota.indexOf(tratKey);
      const advIdx = nota.indexOf(advKey);

      if (diagIdx !== -1) {
        const start = diagIdx + diagKey.length;
        const end = tratIdx !== -1 ? tratIdx : (advIdx !== -1 ? advIdx : nota.length);
        diagnostico = nota.substring(start, end).trim();
      } else {
        diagnostico = nota;
      }

      if (tratIdx !== -1) {
        const start = tratIdx + tratKey.length;
        const end = advIdx !== -1 ? advIdx : nota.length;
        tratamiento = nota.substring(start, end).trim();
      }

      if (advIdx !== -1) {
        const start = advIdx + advKey.length;
        advertencia = nota.substring(start).trim();
      }

      return {
        diagnostico: diagnostico || 'No especificado',
        tratamiento: tratamiento || 'No especificado',
        advertencia: advertencia || 'Sin advertencias particulares'
      };
    };

    const diaryHtml = (exotico.diarioExotico || []).slice(0, 5).map(d => {
      const esIAReporte = d.nota.startsWith('[IA');
      let statusColor = '#9c27b0'; // Purple for notes
      if (esIAReporte) statusColor = '#2196f3'; // Blue for IA

      let content = '';
      if (esIAReporte) {
        const parsed = parseIAReporteExotico(d.nota);
        content = `
          <div style="font-weight: 600; color: #2563eb; margin-bottom: 2px;">Diagnóstico Clínico por IA:</div>
          <div style="margin-bottom: 4px;">${parsed.diagnostico}</div>
          <div style="font-weight: 600; color: #16a34a; margin-bottom: 2px;">Tratamiento sugerido:</div>
          <div style="margin-bottom: 4px;">${parsed.tratamiento}</div>
          ${parsed.advertencia && parsed.advertencia !== 'Sin advertencias particulares' ? `
            <div style="font-weight: 600; color: #dc2626; margin-bottom: 2px;">Alerta:</div>
            <div>${parsed.advertencia}</div>
          ` : ''}
        `;
      } else {
        content = d.nota;
      }

      return `
        <div class="timeline-item" style="border-left-color: ${statusColor};">
          <div class="timeline-meta">
            <span class="timeline-date">${formatDate(d.fecha)}</span>
            <span class="timeline-type" style="background: ${statusColor}15; color: ${statusColor}; border: 1.5px solid ${statusColor}30;">${d.categoria}</span>
          </div>
          <div class="timeline-text">${content}</div>
        </div>
      `;
    }).join('') || '<p style="font-style: italic; color: #64748b; margin: 0;">Sin registros en el diario</p>';

    const incidenciasHtml = (exotico.historialPasado || []).slice(0, 5).map(h => `
      <div class="timeline-item" style="border-left-color: #d97706;">
        <div class="timeline-meta">
          <span class="timeline-date">${formatDate(h.fecha)}</span>
          <span class="timeline-type" style="background: #d9770615; color: #d97706; border: 1.5px solid #d9770630;">${h.tipo}</span>
        </div>
        <div class="timeline-text">${h.descripcion}</div>
      </div>
    `).join('') || '<p style="font-style: italic; color: #64748b; margin: 0;">Sin registros históricos</p>';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ficha de Cuidados Exóticos: ${exotico.nombre}</title>
          <style>
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            @page {
              size: A4;
              margin: 1.2cm;
            }
            body {
              font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 0;
              font-size: 11px;
              line-height: 1.4;
            }
            h1, h2, h3, h4 {
              margin: 0;
              color: #7c2d12;
            }
            h1 {
              font-size: 20px;
              font-weight: 800;
              border-bottom: 2px solid #ea580c;
              padding-bottom: 6px;
              margin-bottom: 15px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            h1 span {
              font-size: 10px;
              font-weight: 500;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            h3 {
              font-size: 12px;
              font-weight: 700;
              border-bottom: 1.5px solid #e2e8f0;
              padding-bottom: 4px;
              margin-bottom: 8px;
              color: #7c2d12;
              text-transform: uppercase;
              letter-spacing: 0.02em;
            }
            .grid-container {
              display: grid;
              grid-template-columns: 32% 64%;
              gap: 4%;
            }
            .left-col, .right-col {
              display: flex;
              flex-direction: column;
              gap: 15px;
            }
            .photo-container {
              width: 100%;
              height: 180px;
              border-radius: 8px;
              overflow: hidden;
              border: 1px solid #e2e8f0;
              background: #f8fafc;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .photo-container img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .photo-placeholder {
              font-size: 64px;
            }
            .details-table {
              width: 100%;
              border-collapse: collapse;
            }
            .details-table th, .details-table td {
              text-align: left;
              padding: 5px 0;
              border-bottom: 1px solid #f1f5f9;
            }
            .details-table th {
              font-weight: 600;
              color: #64748b;
              width: 45%;
            }
            .details-table td {
              font-weight: 500;
              color: #0f172a;
            }
            .timeline {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            .timeline-item {
              padding: 8px;
              background: #f8fafc;
              border-left: 3px solid #cbd5e1;
              border-radius: 0 4px 4px 0;
            }
            .timeline-meta {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 4px;
            }
            .timeline-date {
              font-weight: 600;
              color: #64748b;
            }
            .timeline-type {
              font-size: 8px;
              padding: 1px 4px;
              border-radius: 4px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .timeline-text {
              color: #334155;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          <h1>
            <span>Ficha de Cuidados Exóticos</span>
            ${exotico.nombre}
          </h1>
          <div class="grid-container">
            <div class="left-col">
              <div class="photo-container">
                ${exotico.fotoUrl ? `<img src="${exotico.fotoUrl}" alt="${exotico.nombre}" />` : `<div class="photo-placeholder">🦎</div>`}
              </div>
              <div>
                <h3>Parámetros Terrario</h3>
                <table class="details-table">
                  <tr><th>Especie:</th><td>${exotico.especie}</td></tr>
                  <tr><th>Tipo Específico:</th><td>${exotico.tipoEspecifico}</td></tr>
                  <tr><th>Chip/ID:</th><td>${exotico.chip || 'Sin Identificación'}</td></tr>
                  <tr><th>Temperatura Terrario:</th><td>${exotico.temperaturaTerrario}°C</td></tr>
                  <tr><th>Humedad Terrario:</th><td>${exotico.humedadTerrario}%</td></tr>
                  <tr><th>Última Alimentación:</th><td>${formatDate(exotico.ultimaAlimentacion)}</td></tr>
                  <tr><th>Frecuencia Alim.:</th><td>Cada ${exotico.intervaloAlimentacionDias} días</td></tr>
                </table>
              </div>
            </div>
            
            <div class="right-col">
              <div>
                <h3>Diario de Cuidados y Clínico (Últimos 5 registros)</h3>
                <div class="timeline">
                  ${diaryHtml}
                </div>
              </div>
              
              <div>
                <h3>Historial de Eventos (Últimos 5 registros)</h3>
                <div class="timeline">
                  ${incidenciasHtml}
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Esperar a que se carguen las imágenes y recursos antes de imprimir
    const images = doc.querySelectorAll('img');
    let loadedCount = 0;
    const totalImages = images.length;

    const triggerPrint = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    };

    if (totalImages === 0) {
      triggerPrint();
    } else {
      images.forEach(img => {
        if (img.complete) {
          loadedCount++;
          if (loadedCount === totalImages) triggerPrint();
        } else {
          img.onload = () => {
            loadedCount++;
            if (loadedCount === totalImages) triggerPrint();
          };
          img.onerror = () => {
            loadedCount++;
            if (loadedCount === totalImages) triggerPrint();
          };
        }
      });
      // Timeout de seguridad en caso de fallo de carga
      setTimeout(() => {
        if (loadedCount < totalImages) triggerPrint();
      }, 2500);
    }
  };

  // Cálculo de días desde última alimentación
  const msDiff = Date.now() - new Date(exotico.ultimaAlimentacion).getTime();
  const diasDesdeAlimentacion = Math.floor(msDiff / (1000 * 60 * 60 * 24));
  const necesitaComer = diasDesdeAlimentacion >= exotico.intervaloAlimentacionDias;

  // Emojis y decoraciones según especie exótica
  const getEspecieEmoji = (esp: string) => {
    switch (esp) {
      case 'Serpiente': return '🐍';
      case 'Rana': return '🐸';
      case 'Tarántula': return '🕷️';
      case 'Escorpión': return '🦂';
      default: return '🦎';
    }
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
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--game-text-bright, #333)', fontWeight: 'bold' }}>Editar Exótico ✏️</h3>
        
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
                <option value="Serpiente">Serpiente 🐍</option>
                <option value="Rana">Rana 🐸</option>
                <option value="Tarántula">Tarántula 🕷️</option>
                <option value="Escorpión">Escorpión 🦂</option>
                <option value="Otro">Otro 🦎</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Tipo Específico:</label>
              <input 
                type="text" 
                value={editTipoEspecifico} 
                onChange={(e) => setEditTipoEspecifico(e.target.value)} 
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
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
              if (!editNombre.trim()) return;
              const exoticoActualizado = {
                ...exotico,
                nombre: editNombre.trim(),
                especie: editEspecie,
                tipoEspecifico: editTipoEspecifico.trim() || editEspecie
              };
              await LocalDatabase.saveExotico(exoticoActualizado);
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
    <div id={`card-${exotico.id}`} style={{
      background: 'var(--game-card-bg, #ffffff)',
      borderRadius: 'var(--game-radius, 16px)',
      border: 'var(--game-border, 1.5px solid #eaeaea)',
      boxShadow: 'var(--game-shadow, 0 4px 12px rgba(0,0,0,0.03))',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%',
      boxSizing: 'border-box',
      transition: 'transform 0.2s',
      color: 'var(--game-text, #333)'
    }}>
      <div 
        onClick={toggleExpanded}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
          {!isExpanded && (
            <div style={(() => {
              if (theme === 'gaming') {
                return {
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#121212',
                  border: '2.5px solid var(--game-border-color, #ff8f00)',
                  boxShadow: '0 0 10px rgba(255, 143, 0, 0.6), inset 0 0 6px rgba(255, 143, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxSizing: 'border-box' as const
                };
              }
              if (theme === 'kawaii') {
                return {
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#fff5f7',
                  border: '3px solid #ffffff',
                  outline: '1.5px solid #ff6b8b',
                  boxShadow: '0 4px 10px rgba(255, 107, 139, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxSizing: 'border-box' as const
                };
              }
              return {
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#fff3e0',
                border: '3px solid #ffffff',
                boxShadow: '0 4px 12px rgba(239, 108, 0, 0.25), 0 2px 4px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                overflow: 'hidden',
                flexShrink: 0,
                boxSizing: 'border-box' as const
              };
            })()}>
              {exotico.fotoUrl ? (
                <img src={exotico.fotoUrl} alt={exotico.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                getEspecieEmoji(exotico.especie)
              )}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <h3 style={{ 
              margin: '0 0 2px 0', 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: 'var(--game-text-bright, #111)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              wordBreak: 'break-word',
              maxWidth: '100%',
              lineHeight: '1.2'
            }} title={exotico.nombre}>
              {exotico.nombre} {getEspecieEmoji(exotico.especie)}
            </h3>
            <div style={{ 
              fontSize: '11px', 
              color: '#888',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%'
            }} title={`${exotico.especie} - ${exotico.tipoEspecifico}`}>
              {exotico.especie} - {exotico.tipoEspecifico}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} className="no-print">
          {isExpanded && (
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
              title="Eliminar Ficha"
            >
              🗑️
            </button>
          )}
          {isExpanded && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditNombre(exotico.nombre);
                setEditEspecie(exotico.especie);
                setEditTipoEspecifico(exotico.tipoEspecifico);
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
              title="Editar Exótico"
            >
              ✏️
            </button>
          )}
          <span style={{ fontSize: '20px', padding: '10px', color: 'var(--game-text-bright)', fontFamily: 'monospace' }}>
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Parámetros Básicos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: '8px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
          <span>🌡️ Temp Terrario:</span>
          <strong style={{ display: 'block', color: '#e65100' }}>{exotico.temperaturaTerrario}°C</strong>
        </div>
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
          <span>💧 Humedad:</span>
          <strong style={{ display: 'block', color: '#0288d1' }}>{exotico.humedadTerrario}%</strong>
        </div>
      </div>

      {/* Alerta de alimentación */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        background: necesitaComer ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
        border: `1px solid ${necesitaComer ? '#ef4444' : '#10b981'}`
      }}>
        <span>🍽️ Última alimentación: <strong>Hace {diasDesdeAlimentacion} días</strong></span>
        <button 
          onClick={handleAlimentar}
          style={{
            padding: '4px 8px',
            background: necesitaComer ? '#ef4444' : '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Alimentar 🦗
        </button>
      </div>

      {/* Detalle Expandido */}
      {isExpanded && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          borderTop: '1px solid #eee',
          paddingTop: '16px',
          marginTop: '6px'
        }}>
          {/* Gestor de Fotos Múltiples */}
          <CardPhotoManager
            currentPhotoUrl={exotico.fotoUrl}
            photos={exotico.fotos || []}
            theme={theme}
            onPhotosChange={async (updatedPhotos, newPrimaryUrl) => {
              const exoticoActualizado = {
                ...exotico,
                fotos: updatedPhotos,
                fotoUrl: newPrimaryUrl
              };
              await LocalDatabase.saveExotico(exoticoActualizado);
              onUpdate();
            }}
          />

          {/* Registro del Chip */}
          <div style={{ background: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #eaeaea' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#666' }}>ID Microchip / Registro</span>
            {editingChip ? (
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <input 
                  type="text" 
                  value={chipValue}
                  onChange={(e) => setChipValue(e.target.value)}
                  style={{ flex: 1, padding: '4px 8px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', color: '#000' }}
                  placeholder="Número de registro o chip"
                />
                <button onClick={handleSaveChip} style={{ padding: '4px 8px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>✓</button>
                <button onClick={() => setEditingChip(false)} style={{ padding: '4px 8px', background: '#ccc', color: '#333', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>✗</button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <strong style={{ fontSize: '13px', fontFamily: 'monospace' }}>{exotico.chip || 'Sin registrar'}</strong>
                <button onClick={() => { setChipValue(exotico.chip || ''); setEditingChip(true); }} style={{ background: 'none', border: 'none', color: 'var(--game-accent, #1976d2)', cursor: 'pointer', fontSize: '11px', padding: 0 }}>
                  ✏️ Editar
                </button>
              </div>
            )}
          </div>

          {/* Historial Médico y de Muda */}
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: 'var(--game-text-bright)' }}>🩺 Historial del Pasado (Enfermedades / Mudas)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'auto', marginBottom: '8px' }}>
              {(!exotico.historialPasado || exotico.historialPasado.length === 0) ? (
                <p style={{ margin: '0', fontSize: '11px', color: '#888', fontStyle: 'italic' }}>Sin incidencias registradas en el pasado.</p>
              ) : (
                exotico.historialPasado.map(ev => (
                  <div key={ev.id} style={{ display: 'flex', gap: '8px', fontSize: '11px', padding: '6px', background: '#f5f5f5', borderRadius: '6px' }}>
                    <span style={{ fontWeight: 'bold', color: '#e65100', whiteSpace: 'nowrap' }}>{ev.fecha}</span>
                    <span style={{ background: '#ffebee', color: '#c62828', padding: '0 4px', borderRadius: '4px', fontSize: '10px', height: 'fit-content' }}>{ev.tipo}</span>
                    <span style={{ flex: 1 }}>{ev.descripcion}</span>
                  </div>
                ))
              )}
            </div>
            
            {/* Formulario Añadir Evento Pasado */}
            <form onSubmit={handleAddPastEvent} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', background: 'rgba(0,0,0,0.01)', padding: '10px', borderRadius: '8px', border: '1px dashed #ddd', width: '100%', boxSizing: 'border-box' }}>
              <input 
                type="date" 
                required
                value={newPastDate}
                onChange={(e) => setNewPastDate(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', fontSize: '11px', padding: '4px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', color: '#000' }}
              />
              <select 
                value={newPastType} 
                onChange={(e) => setNewPastType(e.target.value as any)}
                style={{ width: '100%', boxSizing: 'border-box', fontSize: '11px', padding: '4px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', color: '#000' }}
              >
                <option value="Enfermedad">Enfermedad</option>
                <option value="Parásito">Parásito</option>
                <option value="Muda">Muda de Piel</option>
                <option value="Tratamiento">Tratamiento</option>
                <option value="Otro">Otro</option>
              </select>
              <input 
                type="text" 
                placeholder="Incidencia o síntoma..."
                required
                value={newPastDesc}
                onChange={(e) => setNewPastDesc(e.target.value)}
                style={{ gridColumn: 'span 2', fontSize: '11px', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', color: '#000' }}
              />
              <button type="submit" style={{ gridColumn: 'span 2', padding: '4px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                Registrar Incidencia Pasada 💾
              </button>
            </form>
          </div>

          {/* Diario del Terrario */}
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: 'var(--game-text-bright)' }}>📝 Diario del Terrario</h4>
            
            {/* Formulario Añadir Nota */}
            <form onSubmit={handleAddDiario} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select 
                  value={newCategoria} 
                  onChange={(e) => setNewCategoria(e.target.value as any)}
                  style={{ fontSize: '11px', padding: '4px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', color: '#000' }}
                >
                  <option value="Observación general">General 👁️</option>
                  <option value="Nutrición">Alimentación 🦗</option>
                  <option value="Comportamiento">Muda/Comport. 🦎</option>
                </select>
                <input 
                  type="text"
                  required
                  placeholder="Añadir nota al diario..."
                  value={newNota}
                  onChange={(e) => setNewNota(e.target.value)}
                  style={{ flex: 1, minWidth: 0, padding: '4px 8px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', color: '#000' }}
                />
                <button type="submit" style={{ padding: '4px 10px', background: 'var(--game-accent, #1976d2)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>+</button>
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
              {exotico.diarioExotico.length === 0 ? (
                <p style={{ margin: '0', fontSize: '11px', color: '#888', fontStyle: 'italic' }}>El diario está vacío.</p>
              ) : (
                (() => {
                  const parseIAReporteExotico = (nota: string) => {
                    let diagnostico = '';
                    let tratamiento = '';
                    let advertencia = '';

                    const diagKey = '[IA Diagnóstico Exótico]:';
                    const tratKey = '| Tratamiento:';
                    const advKey = '| Alerta:';

                    const diagIdx = nota.indexOf(diagKey);
                    const tratIdx = nota.indexOf(tratKey);
                    const advIdx = nota.indexOf(advKey);

                    if (diagIdx !== -1) {
                      const start = diagIdx + diagKey.length;
                      const end = tratIdx !== -1 ? tratIdx : (advIdx !== -1 ? advIdx : nota.length);
                      diagnostico = nota.substring(start, end).trim();
                    } else {
                      diagnostico = nota;
                    }

                    if (tratIdx !== -1) {
                      const start = tratIdx + tratKey.length;
                      const end = advIdx !== -1 ? advIdx : nota.length;
                      tratamiento = nota.substring(start, end).trim();
                    }

                    if (advIdx !== -1) {
                      const start = advIdx + advKey.length;
                      advertencia = nota.substring(start).trim();
                    }

                    return {
                      diagnostico: diagnostico || 'No especificado',
                      tratamiento: tratamiento || 'No especificado',
                      advertencia: advertencia || 'Sin advertencias particulares'
                    };
                  };

                  return exotico.diarioExotico.map(entry => {
                    const esIAReporte = entry.nota.startsWith('[IA');
                    const fechaFmt = new Date(entry.fecha).toLocaleDateString();
                    const textoMostrar = esIAReporte 
                      ? `análisis de salud - (${fechaFmt})`
                      : entry.nota;

                    return (
                      <div 
                        key={entry.id} 
                        onClick={() => {
                          if (esIAReporte) {
                            const parsed = parseIAReporteExotico(entry.nota);
                            setIaReporteModal({
                              fecha: fechaFmt,
                              diagnostico: parsed.diagnostico,
                              tratamiento: parsed.tratamiento,
                              advertencia: parsed.advertencia,
                              subtipo: entry.categoria
                            });
                          }
                        }}
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          padding: '8px', 
                          background: '#fafafa', 
                          borderRadius: '8px', 
                          border: '1px solid #eee', 
                          fontSize: '11px',
                          cursor: esIAReporte ? 'pointer' : 'default',
                          transition: 'background 0.2s',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 'bold', color: esIAReporte ? '#1976d2' : '#e65100' }}>
                            {entry.categoria} {esIAReporte && '🔍 Click para ver análisis'}
                          </span>
                          <span style={{ color: '#888', fontSize: '10px' }}>
                            {fechaFmt}
                          </span>
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

          {/* Botones de acción inferior */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
            <button
              onClick={exportarFichaExotico}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--game-accent, #4caf50)',
                color: theme === 'gaming' ? '#000000' : '#fff',
                border: 'var(--game-border, none)',
                borderRadius: 'var(--game-radius, 6px)',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'var(--game-font, sans-serif)'
              }}
            >
              Exportar Ficha 📄
            </button>
            <button 
              onClick={() => onOpenScanner && onOpenScanner('salud_exotico', exotico.id)}
              disabled={!cuota.esIlimitado && cuota.restantes === 0}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: (!cuota.esIlimitado && cuota.restantes === 0) ? '#e0e0e0' : '#e3f2fd',
                color: (!cuota.esIlimitado && cuota.restantes === 0) ? '#9e9e9e' : '#1976d2',
                border: '1px solid ' + ((!cuota.esIlimitado && cuota.restantes === 0) ? '#ccc' : '#bbdefb'),
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: (!cuota.esIlimitado && cuota.restantes === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              Escanear Salud 🩺
            </button>
            <span style={{ fontSize: '10px', color: (!cuota.esIlimitado && cuota.restantes === 0) ? '#c62828' : 'var(--game-text, #666)', textAlign: 'center', display: 'block', fontWeight: '500' }}>
              {cuota.esIlimitado 
                ? '⚡ Modo Premium: Análisis ilimitados' 
                : cuota.restantes === 0 
                  ? '❌ Límite diario de IA alcanzado (Ingresa tu API Key en Ajustes)' 
                  : `🔑 Te quedan ${cuota.restantes} análisis de IA hoy`}
            </span>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación */}
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
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '360px',
            width: '100%',
            textAlign: 'center',
            border: '2px solid #ef4444',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            boxSizing: 'border-box',
            margin: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#c62828' }}>Confirmar Eliminación Definitiva</h4>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#555' }}>
              ¿Estás seguro de que deseas eliminar permanentemente la ficha de <strong>{exotico.nombre}</strong>? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1.5px solid #ccc',
                  borderRadius: '6px',
                  background: '#f3f4f6',
                  color: '#333333',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                  setShowDeleteConfirm(false);
                }}
                style={{ flex: 1, padding: '8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
              >
                Eliminar
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
                  🩺 Diagnóstico Exótico por IA
                </h3>
                <span style={{ fontSize: '11px', color: '#666', marginTop: '2px', fontWeight: '500' }}>
                  Categoría: {iaReporteModal.subtipo} • Fecha: {iaReporteModal.fecha}
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
              
              <div style={{ background: 'rgba(33, 150, 243, 0.06)', borderLeft: '4px solid #2196f3', padding: '12px', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#1976d2', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📋 Diagnóstico de Salud
                </h4>
                <p style={{ margin: 0, lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{iaReporteModal.diagnostico}</p>
              </div>

              <div style={{ background: 'rgba(76, 175, 80, 0.06)', borderLeft: '4px solid #4caf50', padding: '12px', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#388e3c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  💊 Tratamiento Sugerido
                </h4>
                <p style={{ margin: 0, lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{iaReporteModal.tratamiento}</p>
              </div>

              <div style={{ background: 'rgba(255, 152, 0, 0.06)', borderLeft: '4px solid #ff9800', padding: '12px', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#f57c00', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ⚠️ Alerta / Notas
                </h4>
                <p style={{ margin: 0, lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{iaReporteModal.advertencia}</p>
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
    </div>
  );
};
