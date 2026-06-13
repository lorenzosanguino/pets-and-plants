/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState } from 'react';
import type { Mascota, EspecieMascota } from '../database/types';
import { LocalDatabase } from '../database/db';
import { safeUUID } from '../utils/uuid';
import { CardPhotoManager } from './CardPhotoManager';
import { calcularEdadMascota } from '../utils/age';
import { IAQuotaManager } from '../utils/iaQuota';


interface PetCardProps {
  mascota: Mascota;
  onUpdate: () => void;
  onOpenScanner?: (mode: 'salud_mascota', assetId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const PetCard: React.FC<PetCardProps> = ({ mascota, onUpdate, onOpenScanner, isExpanded, onToggleExpand }) => {
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

  const [nuevoPeso, setNuevoPeso] = useState('');



  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

    // Crear div temporal de impresión
    const printDiv = document.createElement('div');
    printDiv.className = 'print-container';
    document.body.appendChild(printDiv);

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

    const allVaccines = mascota.especie === 'Felino'
      ? ['Trivalente Felina', 'Leucemia Felina', 'Rabia', 'Desparasitación Interna', 'Desparasitación Externa']
      : ['Parvovirus', 'Moquillo', 'Adenovirus', 'Rabia', 'Leptospirosis', 'Desparasitación Interna', 'Desparasitación Externa'];

    const vaccineChecklistHtml = allVaccines.map(v => {
      const isChecked = (mascota.vacunasChecklist || []).includes(v);
      return `
        <div class="checklist-item ${isChecked ? 'checked' : ''}">
          <span class="checkbox">${isChecked ? '✓' : '✗'}</span>
          <span class="label">${v}</span>
        </div>
      `;
    }).join('');

    const weightsHtml = (mascota.registroPeso || []).slice(-5).reverse().map(w => `
      <tr>
        <td>${formatDate(w.fecha)}</td>
        <td><strong>${w.pesoKg} Kg</strong></td>
      </tr>
    `).join('') || '<tr><td colspan="2" style="text-align:center; color:#64748b;">Sin registros de peso</td></tr>';

    const clinicHtml = unifiedHistory.slice(0, 5).map(h => `
      <div class="timeline-item">
        <div class="timeline-meta">
          <span class="timeline-date">${formatDate(h.fecha)}</span>
          <span class="timeline-type" style="background: ${h.color}15; color: ${h.color}; border: 1px solid ${h.color}30;">${h.tipo} - ${h.subtipo}</span>
        </div>
        <div class="timeline-text">${h.texto}</div>
      </div>
    `).join('') || '<p style="font-style: italic; color: #64748b; margin: 0;">Sin notas clínicas registradas</p>';

    printDiv.innerHTML = `
      <style>
        .print-container {
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif !important;
          color: #0f172a !important;
          background: #ffffff !important;
          padding: 15px !important;
          font-size: 10px !important;
          line-height: 1.3 !important;
          width: 210mm !important;
          height: 297mm !important;
          max-height: 297mm !important; /* Limitar estrictamente al alto A4 */
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        .print-container * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box !important;
          page-break-inside: avoid !important; /* Evitar saltos de página dentro de elementos */
        }
        .print-container h1, .print-container h2, .print-container h3, .print-container h4 {
          margin: 0 !important;
          color: #1e3a8a !important;
        }
        .print-container h1 {
          font-size: 17px !important;
          font-weight: 800 !important;
          border-bottom: 2px solid #3b82f6 !important;
          padding-bottom: 4px !important;
          margin-bottom: 8px !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-end !important;
        }
        .print-container h1 span {
          font-size: 9px !important;
          font-weight: 500 !important;
          color: #64748b !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
        }
        .print-container h3 {
          font-size: 11px !important;
          font-weight: 700 !important;
          border-bottom: 1.5px solid #e2e8f0 !important;
          padding-bottom: 3px !important;
          margin-bottom: 6px !important;
          color: #1e3a8a !important;
          text-transform: uppercase !important;
          letter-spacing: 0.02em !important;
        }
        .print-container .grid-container {
          display: grid !important;
          grid-template-columns: 32% 64% !important;
          gap: 4% !important;
          width: 100% !important;
        }
        .print-container .left-col, .print-container .right-col {
          display: flex !important;
          flex-direction: column !important;
          gap: 9px !important;
        }
        .print-container .photo-container {
          width: 100% !important;
          aspect-ratio: 1 / 1 !important;
          max-height: 155px !important;
          border-radius: 8px !important;
          overflow: hidden !important;
          border: 1px solid #e2e8f0 !important;
          background: #f8fafc !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 auto !important;
        }
        .print-container .photo-container img {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain !important;
          background: #f8fafc !important;
        }
        .print-container .photo-placeholder {
          font-size: 64px !important;
        }
        .print-container .details-table {
          width: 100% !important;
          border-collapse: collapse !important;
        }
        .print-container .details-table th, .print-container .details-table td {
          text-align: left !important;
          padding: 4px 0 !important;
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .print-container .details-table th {
          font-weight: 600 !important;
          color: #64748b !important;
          width: 45% !important;
        }
        .print-container .details-table td {
          font-weight: 500 !important;
          color: #0f172a !important;
        }
        .print-container .checklist-grid {
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 4px !important;
        }
        .print-container .checklist-item {
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
          padding: 3px 5px !important;
          border-radius: 4px !important;
          background: #f8fafc !important;
          border: 1px solid #f1f5f9 !important;
        }
        .print-container .checklist-item.checked {
          background: #f0fdf4 !important;
          border-color: #bbf7d0 !important;
        }
        .print-container .checklist-item.checked .checkbox {
          color: #16a34a !important;
          font-weight: bold !important;
        }
        .print-container .checklist-item.checked .label {
          color: #14532d !important;
          font-weight: 500 !important;
        }
        .print-container .checkbox {
          font-size: 10px !important;
          color: #94a3b8 !important;
          width: 12px !important;
          text-align: center !important;
        }
        .print-container .label {
          color: #475569 !important;
        }
        .print-container .history-table {
          width: 100% !important;
          border-collapse: collapse !important;
        }
        .print-container .history-table th, .print-container .history-table td {
          padding: 4px 6px !important;
          text-align: left !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .print-container .history-table th {
          background: #f8fafc !important;
          color: #475569 !important;
          font-weight: 600 !important;
        }
        .print-container .timeline {
          display: flex !important;
          flex-direction: column !important;
          gap: 5px !important;
        }
        .print-container .timeline-item {
          padding: 6px !important;
          background: #f8fafc !important;
          border-left: 3px solid #cbd5e1 !important;
          border-radius: 0 4px 4px 0 !important;
        }
        .print-container .timeline-meta {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 4px !important;
        }
        .print-container .timeline-date {
          font-weight: 600 !important;
          color: #64748b !important;
        }
        .print-container .timeline-type {
          font-size: 8px !important;
          padding: 1px 4px !important;
          border-radius: 4px !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
        }
        .print-container .timeline-text {
          color: #334155 !important;
          white-space: pre-wrap !important;
        }
        .print-container .badge-castrado {
          font-size: 9px !important;
          font-weight: bold !important;
          padding: 1px 4px !important;
          border-radius: 4px !important;
          display: inline-block !important;
        }
      </style>
      <h1>
        <span>Ficha de Cuidados Mascota</span>
        ${mascota.nombre}
      </h1>
      <div class="grid-container">
        <div class="left-col">
          <div class="photo-container">
            ${mascota.fotoUrl ? `<img src="${mascota.fotoUrl}" alt="${mascota.nombre}" />` : `<div class="photo-placeholder">${mascota.especie === 'Felino' ? '🐱' : '🐶'}</div>`}
          </div>
          <div>
            <h3>Datos Identificativos</h3>
            <table class="details-table">
              <tr><th>Especie:</th><td>${mascota.especie}</td></tr>
              <tr><th>Raza:</th><td>${mascota.raza || 'No especificada'}</td></tr>
              <tr><th>Sexo:</th><td>${mascota.sexo || 'No especificado'}</td></tr>
              <tr><th>Nacimiento:</th><td>${formatDate(mascota.fechaNacimiento)}</td></tr>
              <tr><th>Chip N°:</th><td>${mascota.numeroChip || 'Sin microchip'}</td></tr>
              <tr><th>Castrado:</th><td><span class="badge-castrado" style="background: ${mascota.castrado ? '#e2fbe8; color: #1e7e34;' : '#fde8e8; color: #c82333;'}">${mascota.castrado ? 'Sí' : 'No'}</span></td></tr>
              <tr><th>Actividad:</th><td>${mascota.actividad}</td></tr>
              ${mascota.porcionDiariaGramos ? `<tr><th>Porción diaria:</th><td>${mascota.porcionDiariaGramos}g</td></tr>` : ''}
            </table>
          </div>
        </div>
        
        <div class="right-col">
          <div>
            <h3>Control Preventivo</h3>
            <div class="checklist-grid">
              ${vaccineChecklistHtml}
            </div>
          </div>
          
          <div>
            <h3>Curva de Peso (Últimos 5 registros)</h3>
            <table class="history-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Peso</th>
                </tr>
              </thead>
              <tbody>
                ${weightsHtml}
              </tbody>
            </table>
          </div>
          
          <div>
            <h3>Historial Clínico (Últimos 5 registros)</h3>
            <div class="timeline">
              ${clinicHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    // Esperar a que se carguen las imágenes y recursos antes de imprimir
    const images = printDiv.querySelectorAll('img');
    let loadedCount = 0;
    const totalImages = images.length;

    const triggerPrint = () => {
      const originalTitle = document.title;
      document.title = `Ficha ${mascota.nombre}`;
      document.body.classList.add('printing-active');
      window.focus();

      // Temporalmente ajustar el viewport meta para forzar maquetación de escritorio (evita responsive colapsado en impresión móvil)
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      const originalViewport = viewportMeta ? viewportMeta.getAttribute('content') : null;
      if (viewportMeta) {
        viewportMeta.setAttribute('content', 'width=800, initial-scale=1.0, maximum-scale=1.0');
      }

      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;

        // Retrasamos la limpieza real 6 segundos para que los navegadores móviles (donde afterprint se dispara prematuramente)
        // tengan suficiente tiempo para renderizar el PDF de la ficha con el diseño y título correctos.
        setTimeout(() => {
          document.body.classList.remove('printing-active');
          if (document.body.contains(printDiv)) {
            document.body.removeChild(printDiv);
          }
          // Restaurar el viewport meta original
          if (viewportMeta && originalViewport) {
            viewportMeta.setAttribute('content', originalViewport);
          }
          document.title = originalTitle;
        }, 6000);

        window.removeEventListener('afterprint', cleanup);
      };

      window.addEventListener('afterprint', cleanup);

      // Forzar la limpieza de seguridad tras 2 segundos si afterprint nunca se disparase
      setTimeout(cleanup, 2000);

      // Pequeña pausa para permitir que el navegador aplique los cambios del DOM (ocultar #root) en móviles
      setTimeout(() => {
        window.print();
      }, 250);
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



  const getEdadBadgeStyle = () => {
    if (theme === 'gaming') {
      return {
        fontSize: '10px',
        background: 'rgba(124, 58, 237, 0.15)',
        color: '#a78bfa',
        border: '1px solid rgba(167, 139, 250, 0.4)',
        padding: '1px 6px',
        borderRadius: '4px',
        fontWeight: 'bold' as const,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        textShadow: '0 0 4px rgba(167, 139, 250, 0.4)',
      };
    } else if (theme === 'kawaii') {
      return {
        fontSize: '10px',
        background: '#f5e6ff',
        color: '#7c3aed',
        border: '1.5px dashed #a78bfa',
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
        background: '#faf5ff',
        color: '#6d28d9',
        border: '1px solid #e9d5ff',
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

  const [editChip, setEditChip] = useState(false);
  const [chipVal, setChipVal] = useState(mascota.numeroChip || '');
  const [histFecha, setHistFecha] = useState('');
  const [histTipo, setHistTipo] = useState<'Enfermedad' | 'Parásito' | 'Tratamiento' | 'Otro'>('Enfermedad');
  const [histDesc, setHistDesc] = useState('');
  const [iaReporteModal, setIaReporteModal] = useState<{
    fecha: string;
    diagnostico: string;
    tratamiento: string;
    advertencia: string;
    subtipo: string;
  } | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editNombre, setEditNombre] = useState(mascota.nombre);
  const [editEspecie, setEditEspecie] = useState(mascota.especie);
  const [editRaza, setEditRaza] = useState(mascota.raza || '');
  const [editSexo, setEditSexo] = useState<'Macho' | 'Hembra'>(mascota.sexo || 'Macho');
  const [editCastrado, setEditCastrado] = useState<boolean>(mascota.castrado || false);
  const [editEsMamifero, setEditEsMamifero] = useState<boolean>(mascota.sexo !== undefined || mascota.castrado !== undefined);
  const [editFechaNacimiento, setEditFechaNacimiento] = useState(mascota.fechaNacimiento || '');

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
    setEditFechaNacimiento(mascota.fechaNacimiento || '');
  }, [mascota]);

  const guardarChip = async () => {
    const mascotaActualizada: Mascota = { ...mascota, numeroChip: chipVal.trim() };
    await LocalDatabase.saveMascota(mascotaActualizada);
    setEditChip(false);
    onUpdate();
  };

  const toggleVacunaCheck = async (vName: string) => {
    const current = mascota.vacunasChecklist || [];
    if (current.includes(vName)) {
      return;
    }
    const confirmar = window.confirm(`¿Estás seguro/a de marcar "${vName}" como colocada/realizada? Esta acción no se puede deshacer.`);
    if (!confirmar) return;

    const updated = [...current, vName];
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

    return (
      <div style={{ padding: '10px 14px', background: 'var(--game-accent-light, rgba(0,0,0,0.02))', borderRadius: '8px', border: '1px solid var(--game-border-color, #eaeaea)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--game-text, #666)' }}>
          <span>Curva Peso</span>
          <span style={{ fontWeight: 'bold', color: 'var(--game-text-bright)' }}>Min: {minPeso}kg / Max: {maxPeso}kg</span>
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
                onChange={(e) => setEditEspecie(e.target.value as EspecieMascota)}
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

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Fecha de Nacimiento:</label>
            <input 
              type="date" 
              value={editFechaNacimiento} 
              onChange={(e) => setEditFechaNacimiento(e.target.value)} 
              max={new Date().toISOString().split('T')[0]}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          {(['Felino', 'Canino', 'Hamster', 'Conejo', 'Cobaya'].includes(editEspecie) || (editEspecie === 'Otro' && editEsMamifero)) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Sexo:</label>
                <select 
                  value={editSexo} 
                  onChange={(e) => setEditSexo(e.target.value as 'Macho' | 'Hembra')}
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
                fechaNacimiento: editFechaNacimiento,
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

  const parseIAReporte = (nota: string) => {
    let diagnostico = '';
    let tratamiento = '';
    let advertencia = '';

    const diagKey = '[IA Diagnóstico de Salud]:';
    const tratKey = '| Tratamiento:';
    const advKey = '| Advertencia:';

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

  const unifiedHistory = [
    ...(mascota.historialPasado || []).map(h => ({
      id: h.id,
      fecha: h.fecha,
      tipo: 'Incidencia',
      subtipo: h.tipo,
      texto: h.descripcion,
      color: '#ff9800'
    })),
    ...(mascota.diarioClinico || []).map(d => ({
      id: d.id,
      fecha: d.fecha.includes('T') ? d.fecha.split('T')[0] : d.fecha,
      tipo: d.nota.startsWith('[IA') ? 'IA Reporte' : 'Nota',
      subtipo: d.categoria,
      texto: d.nota,
      color: d.nota.startsWith('[IA') ? '#2196f3' : '#9c27b0'
    }))
  ];

  unifiedHistory.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

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
                ) : (
                  mascota.especie === 'Felino' ? '🐱' : '🐶'
                )}
              </div>
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
              {mascota.fechaNacimiento && (
                <span style={{ ...getEdadBadgeStyle(), margin: 0, fontSize: '11px', padding: '2px 6px' }}>
                  🎂 {calcularEdadMascota(mascota.fechaNacimiento)}
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
            currentPhotoUrl={mascota.fotoUrl}
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

          {/* Fecha de Nacimiento y Edad en Detalles */}
          {mascota.fechaNacimiento && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: 'var(--game-card-bg, #fafafa)', padding: '8px 12px', borderRadius: 'var(--game-radius, 8px)', border: '1px solid var(--game-border-color, #eee)', color: 'var(--game-text-bright)' }}>
              <span style={{ fontWeight: 'bold' }}>🎂 Edad y Nacimiento:</span>
              <span>{mascota.fechaNacimiento} ({calcularEdadMascota(mascota.fechaNacimiento)})</span>
            </div>
          )}

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

          {/* Checklist de Vacunas y Desparasitaciones */}
          {(mascota.especie === 'Felino' || mascota.especie === 'Canino') && (
            <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)' }}>
                💉 Control Preventivo (Vacunación y Desparasitación):
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(mascota.especie === 'Felino' 
                  ? ['Trivalente Felina', 'Leucemia Felina', 'Rabia', 'Desparasitación Interna', 'Desparasitación Externa'] 
                  : ['Parvovirus', 'Moquillo', 'Adenovirus', 'Rabia', 'Leptospirosis', 'Desparasitación Interna', 'Desparasitación Externa']
                ).map(vName => {
                  const isChecked = (mascota.vacunasChecklist || []).includes(vName);
                  return (
                    <label key={vName} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: isChecked ? 'default' : 'pointer', fontFamily: 'var(--game-font, sans-serif)', color: isChecked ? 'var(--game-text-bright)' : 'var(--game-text)' }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        disabled={isChecked}
                        onChange={() => toggleVacunaCheck(vName)}
                        style={{ cursor: isChecked ? 'default' : 'pointer' }}
                      />
                      <span style={{ textDecoration: isChecked ? 'line-through' : 'none', opacity: isChecked ? 0.6 : 1 }}>
                        {vName}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Historial Clínico e Incidencias Unificado */}
          <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)' }}>
              🏥 Historial Clínico e Incidencias
            </p>
            
            {onOpenScanner && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', marginBottom: '10px' }} className="no-print">
                <button 
                  type="button" 
                  onClick={() => onOpenScanner('salud_mascota', mascota.id)} 
                  disabled={!cuota.esIlimitado && cuota.restantes === 0}
                  style={{ 
                    width: '100%',
                    padding: '8px', 
                    background: (!cuota.esIlimitado && cuota.restantes === 0) ? '#e0e0e0' : 'var(--game-accent-light, rgba(25, 118, 210, 0.1))', 
                    color: (!cuota.esIlimitado && cuota.restantes === 0) ? '#9e9e9e' : 'var(--game-text-bright, #1976d2)', 
                    border: '1.5px solid ' + ((!cuota.esIlimitado && cuota.restantes === 0) ? '#ccc' : 'var(--game-border-color, #1976d2)'), 
                    borderRadius: 'var(--game-radius, 6px)', 
                    fontSize: '12px', 
                    fontWeight: 'bold', 
                    cursor: (!cuota.esIlimitado && cuota.restantes === 0) ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--game-font, sans-serif)',
                    transition: 'transform 0.2s',
                    boxSizing: 'border-box'
                  }}
                >
                  Analizar Salud por IA 🩺 📷
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

            <form onSubmit={agregarIncidenciaPasada} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px' }} className="no-print">
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--game-text, #666)' }}>Registrar incidencia médica manualmente:</span>
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
                  onChange={(e) => setHistTipo(e.target.value as 'Enfermedad' | 'Parásito' | 'Tratamiento' | 'Otro')}
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
                  style={{ flex: 1, minWidth: 0, padding: '6px 8px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
                />
                <button type="submit" style={{ padding: '6px 12px', background: '#1a1a1a', color: theme === 'gaming' ? '#000' : '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Añadir
                </button>
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
              {unifiedHistory.length === 0 ? (
                <span style={{ fontSize: '11px', color: 'var(--game-text, #888)', fontStyle: 'italic', fontFamily: 'var(--game-font, sans-serif)' }}>Sin registros clínicos ni incidencias.</span>
              ) : (
                unifiedHistory.map(item => {
                  const esIAReporte = item.tipo === 'IA Reporte';
                  const textoMostrar = esIAReporte 
                    ? `${item.subtipo.toLowerCase()} - (${item.fecha})` 
                    : item.texto;
                  
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        if (esIAReporte) {
                          const parsed = parseIAReporte(item.texto);
                          setIaReporteModal({
                            fecha: item.fecha,
                            diagnostico: parsed.diagnostico,
                            tratamiento: parsed.tratamiento,
                            advertencia: parsed.advertencia,
                            subtipo: item.subtipo
                          });
                        }
                      }}
                      style={{ 
                        padding: '8px', 
                        background: 'var(--game-accent-light, #fafafa)', 
                        borderRadius: 'var(--game-radius, 4px)', 
                        borderLeft: `3px solid ${item.color}`, 
                        fontSize: '11px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        cursor: esIAReporte ? 'pointer' : 'default',
                        transition: 'background 0.2s',
                        userSelect: 'none'
                      }}
                      className={esIAReporte ? "hover-ia-report" : ""}
                    >
                      <div style={{ flex: 1, marginRight: '8px' }}>
                        <span style={{ fontSize: '9px', color: '#666', fontWeight: 'bold', display: 'block' }}>
                          {item.tipo.toUpperCase()} • {item.subtipo.toUpperCase()} • {item.fecha} {esIAReporte && '🔍 Click para ver análisis'}
                        </span>
                        <span style={{ 
                          color: 'var(--game-text-bright, #333)', 
                          fontFamily: 'var(--game-font, sans-serif)',
                          textDecoration: esIAReporte ? 'underline' : 'none',
                          fontWeight: esIAReporte ? '500' : 'normal'
                        }}>
                          {textoMostrar}
                        </span>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        {deleteConfirmId === item.id ? (
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <button 
                              type="button"
                              onClick={async () => {
                                if (item.tipo === 'Incidencia') {
                                  const filtrado = (mascota.historialPasado || []).filter(x => x.id !== item.id);
                                  await LocalDatabase.saveMascota({ ...mascota, historialPasado: filtrado });
                                } else {
                                  const filtrado = (mascota.diarioClinico || []).filter(x => x.id !== item.id);
                                  await LocalDatabase.saveMascota({ ...mascota, diarioClinico: filtrado });
                                }
                                setDeleteConfirmId(null);
                                onUpdate();
                              }}
                              style={{ background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '3px', padding: '2px 6px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Sí
                            </button>
                            <button 
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              style={{ background: '#ccc', color: '#333', border: 'none', borderRadius: '3px', padding: '2px 4px', fontSize: '9px', cursor: 'pointer' }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => setDeleteConfirmId(item.id)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
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
                      🩺 Reporte de Salud por IA
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
                      ⚠️ Advertencia / Notas
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
        </>
      )}
    </div>
  );
};
