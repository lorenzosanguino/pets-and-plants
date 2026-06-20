/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import type { Mascota, AnimalExotico, Planta } from '../database/types';
import { calcularEdadMascota } from '../utils/age';
import { escapeHTML } from '../utils/escape';

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Mascota | AnimalExotico | Planta;
  type: 'pet' | 'exotic' | 'plant';
}

export const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
  isOpen,
  onClose,
  item,
  type
}) => {
  // Configuración de campos
  const [clinicName, setClinicName] = useState(() => {
    return localStorage.getItem('petplant_default_clinic_name') || 'Clínica de Cuidados Pet & Plant';
  });

  const getReportDefaultTitle = () => {
    if (type === 'pet') return `Informe de Salud Veterinaria - ${(item as Mascota).nombre}`;
    if (type === 'exotic') return `Informe Clínico de Exótico - ${(item as AnimalExotico).nombre}`;
    return `Ficha de Control Fitosanitario - ${(item as Planta).nombreComun}`;
  };

  const [reportTitle, setReportTitle] = useState(getReportDefaultTitle());
  const [selectedTheme, setSelectedTheme] = useState<'category' | 'grayscale'>('category');

  // Toggles de secciones
  const [includeWeightChart, setIncludeWeightChart] = useState(true);
  const [includeAIDiag, setIncludeAIDiag] = useState(true);
  const [includeHistoryLogs, setIncludeHistoryLogs] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [showFullHistory, setShowFullHistory] = useState(false);

  // Selector de diagnóstico IA si existe
  const diagsIA = item.diagnosticosIA || [];
  const [selectedDiagId, setSelectedDiagId] = useState(diagsIA.length > 0 ? diagsIA[0].id : '');

  // Notas / Observaciones veterinarias personalizadas
  const [customObservations, setCustomObservations] = useState('');

  // Persistir el nombre de la clínica
  useEffect(() => {
    localStorage.setItem('petplant_default_clinic_name', clinicName);
  }, [clinicName]);

  // Actualizar título por defecto al cambiar de item
  useEffect(() => {
    setReportTitle(getReportDefaultTitle());
  }, [item.id]);

  if (!isOpen) return null;

  // Datos clínicos según tipo
  const isPet = type === 'pet';
  const isExotic = type === 'exotic';
  const isPlant = type === 'plant';

  const petItem = item as Mascota;
  const exoticItem = item as AnimalExotico;
  const plantItem = item as Planta;

  const activeDiag = diagsIA.find(d => d.id === selectedDiagId) || (diagsIA.length > 0 ? diagsIA[0] : null);

  // Paleta de colores activa
  const isGrayscale = selectedTheme === 'grayscale';
  const colors = {
    primary: isGrayscale 
      ? '#1e293b' 
      : (isPet ? '#1e3a8a' : (isExotic ? '#7c2d12' : '#14532d')),
    secondary: isGrayscale 
      ? '#475569' 
      : (isPet ? '#3b82f6' : (isExotic ? '#ea580c' : '#16a34a')),
    bgLight: isGrayscale 
      ? '#f8fafc' 
      : (isPet ? '#f0f9ff' : (isExotic ? '#fff7ed' : '#f0fdf4')),
    border: isGrayscale
      ? '#cbd5e1'
      : (isPet ? '#bfdbfe' : (isExotic ? '#fed7aa' : '#bbf7d0')),
    textDark: '#0f172a',
    textMuted: '#64748b'
  };

  // Procesamiento de Historial Diario
  let historyItems: { fecha: string; tipo: string; subtipo: string; texto: string; color: string }[] = [];

  if (isPet) {
    historyItems = [
      ...(petItem.historialPasado || []).map(h => ({
        fecha: h.fecha,
        tipo: 'Incidencia',
        subtipo: h.tipo,
        texto: h.descripcion,
        color: '#ff9800'
      })),
      ...(petItem.diarioClinico || []).map(d => ({
        fecha: d.fecha.includes('T') ? d.fecha.split('T')[0] : d.fecha,
        tipo: d.nota.startsWith('[IA') ? 'IA Reporte' : 'Nota',
        subtipo: d.categoria,
        texto: d.nota,
        color: d.nota.startsWith('[IA') ? '#2196f3' : '#9c27b0'
      }))
    ];
  } else if (isExotic) {
    historyItems = [
      ...(exoticItem.historialPasado || []).map(h => ({
        fecha: h.fecha,
        tipo: 'Incidencia',
        subtipo: h.tipo,
        texto: h.descripcion,
        color: '#d97706'
      })),
      ...(exoticItem.diarioExotico || []).map(d => ({
        fecha: d.fecha.includes('T') ? d.fecha.split('T')[0] : d.fecha,
        tipo: d.nota.startsWith('[IA') ? 'IA Reporte' : 'Nota',
        subtipo: d.categoria,
        texto: d.nota,
        color: d.nota.startsWith('[IA') ? '#2196f3' : '#9c27b0'
      }))
    ];
  } else if (isPlant) {
    historyItems = [
      ...(plantItem.historialPasado || []).map(h => ({
        fecha: h.fecha,
        tipo: 'Incidencia',
        subtipo: h.tipo,
        texto: h.descripcion,
        color: '#d97706'
      })),
      ...(plantItem.diarioFoliar || []).map(d => ({
        fecha: d.fecha.includes('T') ? d.fecha.split('T')[0] : d.fecha,
        tipo: d.nota.startsWith('[IA') ? 'IA Reporte' : 'Nota',
        subtipo: d.estadoGeneral,
        texto: d.nota,
        color: d.nota.startsWith('[IA') ? '#2196f3' : (d.estadoGeneral === 'Excelente' ? '#16a34a' : '#ef4444')
      }))
    ];
  }

  // Ordenar historial por fecha descendente
  historyItems.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  // Limitar cantidad de items de historial
  const displayedHistory = showFullHistory ? historyItems : historyItems.slice(0, 5);

  // Formatear Fecha
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

  // Vacunas (solo mascotas)
  const petVaccines = isPet && (petItem.especie === 'Felino'
    ? ['Trivalente Felina (1ª dosis)', 'Trivalente Felina (2ª dosis)', 'Leucemia Felina', 'Rabia']
    : ['Parvovirus', 'Moquillo', 'Adenovirus', 'Rabia', 'Leptospirosis', 'Bordetella']);

  const getDewormingLastDateStr = (vName: string) => {
    if (!isPet) return null;
    const checklist = petItem.vacunasChecklist || [];
    const prefix = `${vName}_`;
    const dates = checklist
      .filter(x => x.startsWith(prefix))
      .map(x => x.slice(prefix.length))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    if (dates.length > 0) {
      const parts = dates[0].split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : dates[0];
    }
    if (checklist.includes(vName)) {
      return 'Sí';
    }
    return null;
  };

  const lastIntVal = isPet ? getDewormingLastDateStr('Desparasitación Interna') : null;
  const lastExtVal = isPet ? getDewormingLastDateStr('Desparasitación Externa') : null;

  // Renderizador SVG para la curva de peso (sólo mascotas)
  const drawWeightChartSVG = () => {
    if (!isPet || !petItem.registroPeso || petItem.registroPeso.length === 0) return null;
    
    // Tomar últimos 10 registros para la curva gráfica
    const weights = [...petItem.registroPeso]
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      .slice(-10);

    const paddingX = 40;
    const paddingY = 25;
    const width = 500;
    const height = 150;
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingY * 2;

    const weightValues = weights.map(w => w.pesoKg);
    const maxW = Math.max(...weightValues, 1);
    const minW = Math.min(...weightValues, 0);
    const rangeW = maxW - minW || 1;

    const dates = weights.map(w => new Date(w.fecha).getTime());
    const maxD = Math.max(...dates);
    const minD = Math.min(...dates);
    const rangeD = maxD - minD || 1;

    const points = weights.map((w) => {
      const x = paddingX + (weights.length > 1 
        ? ((new Date(w.fecha).getTime() - minD) / rangeD) * chartWidth
        : chartWidth / 2);
      const y = height - paddingY - ((w.pesoKg - minW) / rangeW) * chartHeight;
      return { 
        x, 
        y, 
        label: `${w.pesoKg} Kg`, 
        date: new Date(w.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) 
      };
    });

    const pathD = points.length > 0 
      ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') 
      : '';

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="weight-chart-svg">
        {/* Línea base de cuadrícula */}
        <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#e2e8f0" strokeWidth="1" />
        <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#f1f5f9" strokeWidth="1" />
        
        {/* Curva de peso */}
        {pathD && <path d={pathD} fill="none" stroke={colors.secondary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        
        {/* Puntos y etiquetas */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke={colors.secondary} strokeWidth="3" />
            <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="10" fontWeight="bold" fill={colors.primary}>
              {p.label}
            </text>
            <text x={p.x} y={height - paddingY + 16} textAnchor="middle" fontSize="9" fill="#64748b">
              {p.date}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  // Función de impresión nativa (inyectando HTML en A4 al DOM temporalmente)
  const handlePrint = () => {
    const printDiv = document.createElement('div');
    printDiv.className = 'print-container';
    document.body.appendChild(printDiv);

    // Preparar contenido de secciones condicionales en HTML puro
    let weightSectionHtml = '';
    if (isPet && includeWeightChart && petItem.registroPeso && petItem.registroPeso.length > 0) {
      // Tomamos últimos 10 de peso
      const wSorted = [...petItem.registroPeso]
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        .slice(-10);

      const paddingX = 40;
      const paddingY = 25;
      const width = 500;
      const height = 150;
      const chartWidth = width - paddingX * 2;
      const chartHeight = height - paddingY * 2;

      const weightValues = wSorted.map(w => w.pesoKg);
      const maxW = Math.max(...weightValues, 1);
      const minW = Math.min(...weightValues, 0);
      const rangeW = maxW - minW || 1;

      const dates = wSorted.map(w => new Date(w.fecha).getTime());
      const maxD = Math.max(...dates);
      const minD = Math.min(...dates);
      const rangeD = maxD - minD || 1;

      const points = wSorted.map((w) => {
        const x = paddingX + (wSorted.length > 1 
          ? ((new Date(w.fecha).getTime() - minD) / rangeD) * chartWidth
          : chartWidth / 2);
        const y = height - paddingY - ((w.pesoKg - minW) / rangeW) * chartHeight;
        return { 
          x, 
          y, 
          label: `${w.pesoKg} Kg`, 
          date: new Date(w.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) 
        };
      });

      const pathD = points.length > 0 ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : '';

      // Crear nodos SVG en string HTML
      let svgPointsHtml = '';
      points.forEach(p => {
        svgPointsHtml += `
          <circle cx="${p.x}" cy="${p.y}" r="5" fill="#ffffff" stroke="${colors.secondary}" stroke-width="3" />
          <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" font-size="10" font-weight="bold" fill="${colors.primary}">${p.label}</text>
          <text x="${p.x}" y="${height - paddingY + 16}" text-anchor="middle" font-size="9" fill="#64748b">${p.date}</text>
        `;
      });

      weightSectionHtml = `
        <div class="report-section">
          <h3>Curva de Trazado de Peso</h3>
          <div style="background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 12px; margin-top: 8px;">
            <svg viewBox="0 0 500 150" style="width: 100%; height: auto; display: block;">
              <line x1="${paddingX}" y1="${height - paddingY}" x2="${width - paddingX}" y2="${height - paddingY}" stroke="#e2e8f0" stroke-width="1" />
              <line x1="${paddingX}" y1="${paddingY}" x2="${width - paddingX}" y2="${paddingY}" stroke="#f1f5f9" stroke-width="1" />
              ${pathD ? `<path d="${pathD}" fill="none" stroke="${colors.secondary}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />` : ''}
              ${svgPointsHtml}
            </svg>
          </div>
        </div>
      `;
    } else if (isPlant && includeWeightChart && plantItem.registroCrecimiento && plantItem.registroCrecimiento.length > 0) {
      const cSorted = [...plantItem.registroCrecimiento]
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        .slice(-10);

      const paddingX = 40;
      const paddingY = 25;
      const width = 500;
      const height = 150;
      const chartWidth = width - paddingX * 2;
      const chartHeight = height - paddingY * 2;

      const values = cSorted.map(c => c.alturaCm);
      const maxW = Math.max(...values, 1);
      const minW = Math.min(...values, 0);
      const rangeW = maxW - minW || 1;

      const dates = cSorted.map(c => new Date(c.fecha).getTime());
      const maxD = Math.max(...dates);
      const minD = Math.min(...dates);
      const rangeD = maxD - minD || 1;

      const points = cSorted.map((c) => {
        const x = paddingX + (cSorted.length > 1 
          ? ((new Date(c.fecha).getTime() - minD) / rangeD) * chartWidth
          : chartWidth / 2);
        const y = height - paddingY - ((c.alturaCm - minW) / rangeW) * chartHeight;
        return { 
          x, 
          y, 
          label: `${c.alturaCm} cm`, 
          date: new Date(c.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) 
        };
      });

      const pathD = points.length > 0 ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : '';

      let svgPointsHtml = '';
      points.forEach(p => {
        svgPointsHtml += `
          <circle cx="${p.x}" cy="${p.y}" r="5" fill="#ffffff" stroke="${colors.secondary}" stroke-width="3" />
          <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" font-size="10" font-weight="bold" fill="${colors.primary}">${p.label}</text>
          <text x="${p.x}" y="${height - paddingY + 16}" text-anchor="middle" font-size="9" fill="#64748b">${p.date}</text>
        `;
      });

      weightSectionHtml = `
        <div class="report-section">
          <h3>Curva de Crecimiento (Altura)</h3>
          <div style="background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 12px; margin-top: 8px;">
            <svg viewBox="0 0 500 150" style="width: 100%; height: auto; display: block;">
              <line x1="${paddingX}" y1="${height - paddingY}" x2="${width - paddingX}" y2="${height - paddingY}" stroke="#e2e8f0" stroke-width="1" />
              <line x1="${paddingX}" y1="${paddingY}" x2="${width - paddingX}" y2="${paddingY}" stroke="#f1f5f9" stroke-width="1" />
              ${pathD ? `<path d="${pathD}" fill="none" stroke="${colors.secondary}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />` : ''}
              ${svgPointsHtml}
            </svg>
          </div>
        </div>
      `;
    } else if (isExotic && includeWeightChart && ((exoticItem.registroPeso && exoticItem.registroPeso.length > 0) || (exoticItem.registroCrecimiento && exoticItem.registroCrecimiento.length > 0))) {
      const hasLength = exoticItem.registroCrecimiento && exoticItem.registroCrecimiento.length > 0;
      const dataPoints = hasLength 
        ? [...(exoticItem.registroCrecimiento || [])].map(d => ({ fecha: d.fecha, valor: d.alturaCm, unit: 'cm' }))
        : [...(exoticItem.registroPeso || [])].map(d => ({ fecha: d.fecha, valor: d.pesoKg, unit: 'g' }));

      const sortedData = dataPoints
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        .slice(-10);

      const paddingX = 40;
      const paddingY = 25;
      const width = 500;
      const height = 150;
      const chartWidth = width - paddingX * 2;
      const chartHeight = height - paddingY * 2;

      const values = sortedData.map(c => c.valor);
      const maxW = Math.max(...values, 1);
      const minW = Math.min(...values, 0);
      const rangeW = maxW - minW || 1;

      const dates = sortedData.map(c => new Date(c.fecha).getTime());
      const maxD = Math.max(...dates);
      const minD = Math.min(...dates);
      const rangeD = maxD - minD || 1;

      const points = sortedData.map((c) => {
        const x = paddingX + (sortedData.length > 1 
          ? ((new Date(c.fecha).getTime() - minD) / rangeD) * chartWidth
          : chartWidth / 2);
        const y = height - paddingY - ((c.valor - minW) / rangeW) * chartHeight;
        return { 
          x, 
          y, 
          label: `${c.valor} ${c.unit}`, 
          date: new Date(c.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) 
        };
      });

      const pathD = points.length > 0 ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : '';

      let svgPointsHtml = '';
      points.forEach(p => {
        svgPointsHtml += `
          <circle cx="${p.x}" cy="${p.y}" r="5" fill="#ffffff" stroke="${colors.secondary}" stroke-width="3" />
          <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" font-size="10" font-weight="bold" fill="${colors.primary}">${p.label}</text>
          <text x="${p.x}" y="${height - paddingY + 16}" text-anchor="middle" font-size="9" fill="#64748b">${p.date}</text>
        `;
      });

      weightSectionHtml = `
        <div class="report-section">
          <h3>Curva de Historial Biométrico (${hasLength ? 'Longitud' : 'Peso'})</h3>
          <div style="background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 12px; margin-top: 8px;">
            <svg viewBox="0 0 500 150" style="width: 100%; height: auto; display: block;">
              <line x1="${paddingX}" y1="${height - paddingY}" x2="${width - paddingX}" y2="${height - paddingY}" stroke="#e2e8f0" stroke-width="1" />
              <line x1="${paddingX}" y1="${paddingY}" x2="${width - paddingX}" y2="${paddingY}" stroke="#f1f5f9" stroke-width="1" />
              ${pathD ? `<path d="${pathD}" fill="none" stroke="${colors.secondary}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />` : ''}
              ${svgPointsHtml}
            </svg>
          </div>
        </div>
      `;
    }

    // Diagnóstico IA
    let aiSectionHtml = '';
    if (includeAIDiag && activeDiag) {
      aiSectionHtml = `
        <div class="report-section urgent-card ${activeDiag.esUrgente ? 'urgent-border' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${colors.border}; padding-bottom: 4px; margin-bottom: 8px;">
            <h4 style="margin: 0; color: ${colors.primary}; display: flex; align-items: center; gap: 5px;">
              🩺 Diagnóstico Clínico por IA
            </h4>
            <span style="font-size: 9px; font-weight: bold; background: ${activeDiag.esUrgente ? '#fde8e8; color: #e11d48;' : `${colors.bgLight}; color: ${colors.primary};`}; padding: 2px 6px; border-radius: 4px;">
              ${activeDiag.esUrgente ? '🚨 ATENCIÓN URGENTE' : 'CONSULTA GENERAL'}
            </span>
          </div>
          <p><strong>Diagnóstico/Evaluación:</strong> ${escapeHTML(activeDiag.diagnostico)}</p>
          <p><strong>Tratamiento sugerido:</strong> ${escapeHTML(activeDiag.tratamiento)}</p>
          ${activeDiag.advertencia ? `<p><strong>Recomendaciones / Alertas:</strong> <span style="color: #c2410c; font-weight: 500;">${escapeHTML(activeDiag.advertencia)}</span></p>` : ''}
          <div style="font-size: 8.5px; color: #94a3b8; text-align: right; margin-top: 4px;">Generado el: ${formatDate(activeDiag.fecha)}</div>
        </div>
      `;
    }

    // Historial Diario
    let historySectionHtml = '';
    if (includeHistoryLogs && displayedHistory.length > 0) {
      const historyRows = displayedHistory.map(h => `
        <div class="timeline-item" style="border-left: 3px solid ${h.color};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
            <strong style="color: #334155; font-size: 10px;">${formatDate(h.fecha)}</strong>
            <span style="font-size: 8px; font-weight: bold; padding: 1px 4px; border-radius: 3px; background: ${h.color}15; color: ${h.color}; border: 1px solid ${h.color}30;">
              ${h.tipo.toUpperCase()} • ${h.subtipo.toUpperCase()}
            </span>
          </div>
          <div style="color: #475569; white-space: pre-wrap;">${escapeHTML(h.texto)}</div>
        </div>
      `).join('');

      historySectionHtml = `
        <div class="report-section">
          <h3>Historial de Diario Clínico y Eventos (${showFullHistory ? 'Todos' : 'Últimos 5'})</h3>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
            ${historyRows}
          </div>
        </div>
      `;
    }

    // Notas de Observación manuales
    let notesSectionHtml = '';
    if (customObservations.trim()) {
      notesSectionHtml = `
        <div class="report-section" style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 8px; padding: 12px; margin-top: 15px;">
          <h4 style="margin: 0 0 6px 0; color: ${colors.primary};">📝 Observaciones del Profesional</h4>
          <div style="color: #334155; white-space: pre-wrap; font-size: 10.5px; line-height: 1.4;">${escapeHTML(customObservations)}</div>
        </div>
      `;
    }

    // Datos Identificativos Tabla
    let infoTableHtml = '';
    if (isPet) {
      infoTableHtml = `
        <table class="details-table">
          <tr><th>Especie / Raza:</th><td>${escapeHTML(petItem.especie)} / ${escapeHTML(petItem.raza || 'No especificada')}</td></tr>
          <tr><th>Sexo / Castrado:</th><td>${escapeHTML(petItem.sexo || 'No especificado')} / ${petItem.castrado ? 'Sí' : 'No'}</td></tr>
          <tr><th>Fecha Nac. / Edad:</th><td>${formatDate(petItem.fechaNacimiento)} (${calcularEdadMascota(petItem.fechaNacimiento)})</td></tr>
          <tr><th>Nro. de Microchip:</th><td>${escapeHTML(petItem.numeroChip || 'Sin microchip')}</td></tr>
          <tr><th>Nivel Actividad:</th><td>${escapeHTML(petItem.actividad)}</td></tr>
          ${petItem.porcionDiariaGramos ? `<tr><th>Porción Diaria:</th><td><strong>${petItem.porcionDiariaGramos} gramos</strong></td></tr>` : ''}
        </table>
      `;
    } else if (isExotic) {
      infoTableHtml = `
        <table class="details-table">
          <tr><th>Especie / Tipo:</th><td>${escapeHTML(exoticItem.especie)} / ${escapeHTML(exoticItem.tipoEspecifico || 'No especificado')}</td></tr>
          <tr><th>Nro. de Microchip:</th><td>${escapeHTML(exoticItem.chip || 'Sin microchip')}</td></tr>
          <tr><th>Parámetros Terrario:</th><td>🌡️ ${exoticItem.temperaturaTerrario}°C | 💧 ${exoticItem.humedadTerrario}% HR</td></tr>
          <tr><th>Alimentación:</th><td>Cada ${exoticItem.intervaloAlimentacionDias} días (Última: ${formatDate(exoticItem.ultimaAlimentacion)})</td></tr>
        </table>
      `;
    } else if (isPlant) {
      infoTableHtml = `
        <table class="details-table">
          <tr><th>Nombre Científico:</th><td><em>${escapeHTML(plantItem.nombreCientifico || 'No especificado')}</em></td></tr>
          <tr><th>Ubicación / Clima:</th><td>${escapeHTML(plantItem.ubicacionHabitacion)} | 🌡️ Temp: ${plantItem.temperaturaZona}°C</td></tr>
          <tr><th>Riego Específico:</th><td>💧 ${escapeHTML(plantItem.tipoRiegoEspecifico)} (Cada ${plantItem.intervaloRiegoDias} días)</td></tr>
          <tr><th>Próximo Riego:</th><td>📅 ${formatDate(plantItem.proximaFechaRiego)}</td></tr>
          <tr><th>Grosor de Hoja:</th><td>${escapeHTML(plantItem.grosorHoja)}</td></tr>
          <tr><th>Toxicidad Felina:</th><td><span style="color: ${plantItem.toxicidadFelina === 'Segura' ? '#16a34a' : '#ef4444'}; font-weight: bold;">${escapeHTML(plantItem.toxicidadFelina)}</span></td></tr>
          ${plantItem.toxicidadCanina ? `<tr><th>Toxicidad Canina:</th><td><span style="color: ${plantItem.toxicidadCanina === 'Segura' ? '#16a34a' : '#ef4444'}; font-weight: bold;">${escapeHTML(plantItem.toxicidadCanina)}</span></td></tr>` : ''}
        </table>
      `;
    }

    // Vacunas y desparasitaciones checklist para mascotas
    let preventativeHtml = '';
    if (isPet && petVaccines) {
      const vaccineItems = petVaccines.map(v => {
        const isChecked = (petItem.vacunasChecklist || []).includes(v);
        return `
          <div class="checklist-item ${isChecked ? 'checked' : ''}">
            <span class="checkbox">${isChecked ? '✓' : '✗'}</span>
            <span class="label">${v}</span>
          </div>
        `;
      }).join('') + `
        <div class="checklist-item ${lastIntVal ? 'checked' : ''}">
          <span class="checkbox">${lastIntVal ? '✓' : '✗'}</span>
          <span class="label">Desparasitación Int. ${lastIntVal ? `(${lastIntVal})` : ''}</span>
        </div>
        <div class="checklist-item ${lastExtVal ? 'checked' : ''}">
          <span class="checkbox">${lastExtVal ? '✓' : '✗'}</span>
          <span class="label">Desparasitación Ext. ${lastExtVal ? `(${lastExtVal})` : ''}</span>
        </div>
      `;

      preventativeHtml = `
        <div class="report-section" style="margin-top: 10px;">
          <h3>Control de Medicina Preventiva</h3>
          <div class="checklist-grid">
            ${vaccineItems}
          </div>
        </div>
      `;
    }

    // Firma
    let signatureHtml = '';
    if (includeSignature) {
      signatureHtml = `
        <div class="signature-block">
          <div style="width: 45%;">
            <div class="signature-line">Firma del Profesional / Veterinario</div>
            <div style="font-size: 8px; color: #94a3b8; margin-top: 4px;">Fecha de emisión: ${new Date().toLocaleDateString('es-ES')}</div>
          </div>
          <div class="stamp-box">
            <span>Sello Clínico</span>
          </div>
        </div>
      `;
    }

    const titleLogo = isPlant ? '🌿' : (isExotic ? '🦎' : '🐾');

    printDiv.innerHTML = `
      <style>
        .print-container {
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif !important;
          color: #0f172a !important;
          background: #ffffff !important;
          padding: 20px !important;
          font-size: 11px !important;
          line-height: 1.4 !important;
          width: 210mm !important;
          height: 297mm !important;
          max-height: 297mm !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        .print-container * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box !important;
          page-break-inside: avoid !important;
        }
        .print-container h1, .print-container h2, .print-container h3, .print-container h4 {
          margin: 0 !important;
          color: ${colors.primary} !important;
        }
        .print-container h1 {
          font-size: 18px !important;
          font-weight: 800 !important;
          border-bottom: 2px solid ${colors.secondary} !important;
          padding-bottom: 6px !important;
          margin-bottom: 12px !important;
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
          font-size: 12px !important;
          font-weight: 700 !important;
          border-bottom: 1.5px solid #e2e8f0 !important;
          padding-bottom: 4px !important;
          margin-bottom: 8px !important;
          color: ${colors.primary} !important;
          text-transform: uppercase !important;
          letter-spacing: 0.02em !important;
        }
        .print-container .grid-container {
          display: grid !important;
          grid-template-columns: 35% 61% !important;
          gap: 4% !important;
          width: 100% !important;
        }
        .print-container .left-col, .print-container .right-col {
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
        }
        .print-container .photo-container {
          width: 100% !important;
          aspect-ratio: 1 / 1 !important;
          max-height: 160px !important;
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
          font-size: 56px !important;
        }
        .print-container .details-table {
          width: 100% !important;
          border-collapse: collapse !important;
        }
        .print-container .details-table th, .print-container .details-table td {
          text-align: left !important;
          padding: 5px 0 !important;
          border-bottom: 1px solid #f1f5f9 !important;
          font-size: 10px !important;
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
          gap: 5px !important;
        }
        .print-container .checklist-item {
          display: flex !important;
          align-items: center !important;
          gap: 5px !important;
          padding: 4px 6px !important;
          border-radius: 4px !important;
          background: #f8fafc !important;
          border: 1px solid #f1f5f9 !important;
          font-size: 9.5px !important;
        }
        .print-container .checklist-item.checked {
          background: ${colors.bgLight} !important;
          border-color: ${colors.border} !important;
        }
        .print-container .checklist-item.checked .checkbox {
          color: ${colors.secondary} !important;
          font-weight: bold !important;
        }
        .print-container .checklist-item.checked .label {
          color: ${colors.primary} !important;
          font-weight: 500 !important;
        }
        .print-container .checkbox {
          font-size: 9.5px !important;
          color: #94a3b8 !important;
          width: 12px !important;
          text-align: center !important;
        }
        .print-container .label {
          color: #475569 !important;
        }
        .print-container .report-section {
          margin-bottom: 10px !important;
        }
        .print-container .urgent-card {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px;
          background: #f8fafc;
          font-size: 10px;
        }
        .print-container .urgent-border {
          border-color: #fca5a5 !important;
          background: #fff5f5 !important;
        }
        .print-container .timeline-item {
          padding: 6px 8px !important;
          background: #f8fafc !important;
          border-radius: 0 4px 4px 0 !important;
          font-size: 9.5px !important;
          border-left-width: 3px !important;
          border-left-style: solid !important;
          margin-bottom: 5px !important;
        }
        .print-container .signature-block {
          margin-top: auto !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-end !important;
          padding-top: 15px !important;
          border-top: 1px solid #e2e8f0 !important;
        }
        .print-container .signature-line {
          border-top: 1.5px solid #475569 !important;
          text-align: center !important;
          font-weight: 600 !important;
          font-size: 10px !important;
          color: #475569 !important;
          padding-top: 5px !important;
          margin-top: 40px !important;
        }
        .print-container .stamp-box {
          border: 2px dashed #cbd5e1 !important;
          border-radius: 8px !important;
          width: 85px !important;
          height: 65px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 9px !important;
          color: #94a3b8 !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
        }
      </style>
      <h1>
        <span style="font-weight:bold; color:${colors.primary}">${titleLogo} ${escapeHTML(clinicName)}</span>
        <span style="font-size: 13px !important; color:#0f172a !important; font-weight:700 !important;">${escapeHTML(reportTitle)}</span>
      </h1>
      <div class="grid-container">
        <div class="left-col">
          <div class="photo-container">
            ${item.fotoUrl ? `<img src="${item.fotoUrl}" alt="${escapeHTML(isPlant ? plantItem.nombreComun : (item as Mascota).nombre)}" />` : `<div class="photo-placeholder">${isPlant ? '🌿' : (isPet && petItem.especie === 'Felino' ? '🐱' : '🐶')}</div>`}
          </div>
          <div>
            <h3>Datos del Paciente</h3>
            ${infoTableHtml}
          </div>
          ${preventativeHtml}
        </div>
        
        <div class="right-col">
          ${weightSectionHtml}
          ${aiSectionHtml}
          ${historySectionHtml}
          ${notesSectionHtml}
          ${signatureHtml}
        </div>
      </div>
    `;

    // Esperar imágenes antes de llamar window.print()
    const images = printDiv.querySelectorAll('img');
    let loadedCount = 0;
    const totalImages = images.length;

    const triggerPrint = () => {
      const originalTitle = document.title;
      document.title = reportTitle;
      document.body.classList.add('printing-active');
      window.focus();

      const viewportMeta = document.querySelector('meta[name="viewport"]');
      const originalViewport = viewportMeta ? viewportMeta.getAttribute('content') : null;
      if (viewportMeta) {
        viewportMeta.setAttribute('content', 'width=800, initial-scale=1.0, maximum-scale=1.0');
      }

      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        setTimeout(() => {
          document.body.classList.remove('printing-active');
          if (document.body.contains(printDiv)) {
            document.body.removeChild(printDiv);
          }
          if (viewportMeta && originalViewport) {
            viewportMeta.setAttribute('content', originalViewport);
          }
          document.title = originalTitle;
        }, 3000);
        window.removeEventListener('afterprint', cleanup);
      };

      window.addEventListener('afterprint', cleanup);
      setTimeout(cleanup, 6000); // Forzar limpieza tras 6 segundos

      setTimeout(() => {
        window.print();
      }, 300);
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
      setTimeout(() => {
        if (loadedCount < totalImages) triggerPrint();
      }, 2500);
    }
  };

  return (
    <div className="report-modal-overlay">
      <style>{`
        .report-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(8, 6, 13, 0.65);
          backdrop-filter: blur(8px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: modalFadeIn 0.2s ease-out;
        }

        .report-modal-card {
          background: var(--bg, #ffffff);
          border: 1px solid var(--border, #e5e4e7);
          border-radius: 16px;
          width: 100%;
          max-width: 1100px;
          height: 90vh;
          display: flex;
          flex-direction: row;
          overflow: hidden;
          box-shadow: var(--shadow);
          animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .config-pane {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          border-right: 1px solid var(--border, #e5e4e7);
          display: flex;
          flex-direction: column;
          gap: 18px;
          text-align: left;
        }

        .preview-pane {
          flex: 1.2;
          background: #e2e8f0;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          position: relative;
        }

        .config-header {
          border-bottom: 1px solid var(--border, #e5e4e7);
          padding-bottom: 12px;
          margin-bottom: 4px;
        }

        .config-title {
          font-size: 20px;
          font-weight: 800;
          color: var(--text-h, #08060d);
          margin: 0;
        }

        .config-subtitle {
          font-size: 12px;
          color: var(--text, #6b6375);
          margin: 4px 0 0 0;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-h, #08060d);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .form-input {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--border, #e5e4e7);
          background: var(--code-bg, #f4f3ec);
          color: var(--text-h, #08060d);
          font-size: 13.5px;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent, #8f20e6);
        }

        .toggle-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--accent-bg, rgba(143, 32, 230, 0.05));
          border: 1px solid var(--accent-border, rgba(143, 32, 230, 0.2));
          border-radius: 12px;
          padding: 14px;
        }

        .toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }

        .toggle-text {
          display: flex;
          flex-direction: column;
        }

        .toggle-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-h, #08060d);
        }

        .toggle-desc {
          font-size: 11px;
          color: var(--text, #6b6375);
        }

        .switch-control {
          width: 44px;
          height: 24px;
          background: #cbd5e1;
          border-radius: 12px;
          position: relative;
          transition: background 0.2s;
        }

        .switch-control.active {
          background: var(--accent, #8f20e6);
        }

        .switch-knob {
          width: 18px;
          height: 18px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 3px;
          left: 3px;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }

        .switch-control.active .switch-knob {
          transform: translateX(20px);
        }

        .button-bar {
          display: flex;
          gap: 12px;
          margin-top: auto;
          border-top: 1px solid var(--border, #e5e4e7);
          padding-top: 18px;
        }

        .btn-cancel {
          flex: 1;
          padding: 11px;
          border-radius: 8px;
          border: 1px solid var(--border, #e5e4e7);
          background: transparent;
          color: var(--text, #6b6375);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-cancel:hover {
          background: var(--code-bg, #f4f3ec);
        }

        .btn-print {
          flex: 1.5;
          padding: 11px;
          border-radius: 8px;
          border: none;
          background: var(--accent, #8f20e6);
          color: white;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: opacity 0.2s;
        }

        .btn-print:hover {
          opacity: 0.9;
        }

        /* Preview A4 styling */
        .preview-header-bar {
          display: flex;
          justify-content: space-between;
          width: 100%;
          max-width: 535px;
          margin-bottom: 10px;
          align-items: center;
        }

        .preview-badge {
          background: rgba(0, 0, 0, 0.06);
          color: #334155;
          font-size: 11px;
          font-weight: bold;
          padding: 4px 8px;
          border-radius: 20px;
        }

        .a4-page-scroller {
          width: 100%;
          display: flex;
          justify-content: center;
          overflow: hidden;
          padding-bottom: 40px;
        }

        .a4-page-body {
          width: 210mm;
          min-height: 297mm;
          background: #ffffff;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
          box-sizing: border-box;
          padding: 20mm;
          color: #0f172a;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          transform: scale(0.53);
          transform-origin: top center;
          margin-bottom: -140mm; /* collapse excess layout space */
          text-align: left;
          font-size: 11.5px;
          line-height: 1.4;
        }

        @media (max-width: 900px) {
          .report-modal-card {
            flex-direction: column;
            height: 95vh;
          }
          .config-pane {
            flex: 1.5;
          }
          .preview-pane {
            flex: 1;
            padding: 10px;
          }
          .a4-page-body {
            transform: scale(0.38);
            margin-bottom: -180mm;
          }
        }

        /* Internals of preview page */
        .a4-page-body h1 {
          font-size: 19px;
          font-weight: 800;
          color: ${colors.primary};
          border-bottom: 2px solid ${colors.secondary};
          padding-bottom: 6px;
          margin: 0 0 14px 0;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .a4-page-body h3 {
          font-size: 12.5px;
          font-weight: 700;
          color: ${colors.primary};
          border-bottom: 1.5px solid #e2e8f0;
          padding-bottom: 4px;
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .preview-grid {
          display: grid;
          grid-template-columns: 35% 61%;
          gap: 4%;
        }

        .preview-left-col, .preview-right-col {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .preview-photo {
          width: 100%;
          aspect-ratio: 1 / 1;
          max-height: 160px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview-photo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #f8fafc;
        }

        .preview-details-table {
          width: 100%;
          border-collapse: collapse;
        }

        .preview-details-table th, .preview-details-table td {
          padding: 5px 0;
          border-bottom: 1px solid #f1f5f9;
          font-size: 10px;
          text-align: left;
        }

        .preview-details-table th {
          font-weight: 600;
          color: #64748b;
          width: 45%;
        }

        .preview-details-table td {
          font-weight: 500;
          color: #0f172a;
        }

        .preview-checklist {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
        }

        .preview-chk-item {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 6px;
          border-radius: 4px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          font-size: 9.5px;
        }

        .preview-chk-item.checked {
          background: ${colors.bgLight};
          border-color: ${colors.border};
        }

        .preview-chk-item.checked .chk-box {
          color: ${colors.secondary};
          font-weight: bold;
        }

        .preview-chk-item.checked .chk-lbl {
          color: ${colors.primary};
          font-weight: 500;
        }

        .chk-box {
          font-size: 9.5px;
          color: #94a3b8;
          width: 12px;
          text-align: center;
        }

        .chk-lbl {
          color: #475569;
        }

        .preview-section {
          margin-bottom: 5px;
        }

        .preview-urgent-card {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px;
          background: #f8fafc;
          font-size: 10px;
        }

        .preview-urgent-border {
          border-color: #fca5a5;
          background: #fff5f5;
        }

        .preview-timeline-item {
          padding: 6px 8px;
          background: #f8fafc;
          border-radius: 0 4px 4px 0;
          font-size: 9.5px;
          border-left: 3px solid;
          margin-bottom: 5px;
        }

        .weight-chart-svg {
          width: 100%;
          height: auto;
          display: block;
          margin-top: 6px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          padding: 8px;
        }

        .preview-signature-block {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 15px;
          border-top: 1px solid #e2e8f0;
        }

        .preview-sig-line {
          border-top: 1.5px solid #475569;
          text-align: center;
          font-weight: 600;
          font-size: 9.5px;
          color: #475569;
          padding-top: 4px;
          margin-top: 35px;
        }

        .preview-stamp-box {
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          width: 85px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          color: #94a3b8;
          font-weight: bold;
          text-transform: uppercase;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalSlideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div className="report-modal-card">
        {/* Panel de Configuración izquierdo */}
        <div className="config-pane">
          <div className="config-header">
            <h2 className="config-title">Generador de Informes</h2>
            <p className="config-subtitle">Diseña y descarga una ficha A4 PDF profesional para tu veterinaria</p>
          </div>

          <div className="form-group">
            <label className="form-label">Nombre de Clínica / Institución</label>
            <input 
              type="text" 
              className="form-input" 
              value={clinicName} 
              onChange={(e) => setClinicName(e.target.value)} 
              placeholder="Ej. Clínica Veterinaria San Antón"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Título del Reporte</label>
            <input 
              type="text" 
              className="form-input" 
              value={reportTitle} 
              onChange={(e) => setReportTitle(e.target.value)} 
              placeholder="Ej. Informe de Salud Clínico"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Diseño Visual y Tema</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="form-input" 
                style={{ flex: 1, fontWeight: selectedTheme === 'category' ? 'bold' : 'normal', border: selectedTheme === 'category' ? '2px solid var(--accent)' : '1px solid var(--border)' }}
                onClick={() => setSelectedTheme('category')}
              >
                🎨 Categoría ({isPet ? 'Azul' : (isExotic ? 'Violeta' : 'Verde')})
              </button>
              <button 
                type="button" 
                className="form-input" 
                style={{ flex: 1, fontWeight: selectedTheme === 'grayscale' ? 'bold' : 'normal', border: selectedTheme === 'grayscale' ? '2px solid var(--accent)' : '1px solid var(--border)' }}
                onClick={() => setSelectedTheme('grayscale')}
              >
                🏁 Minimalista (Gris)
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Secciones a Incluir</label>
            <div className="toggle-group">
              {isPet && petItem.registroPeso && petItem.registroPeso.length > 0 && (
                <div className="toggle-row" onClick={() => setIncludeWeightChart(!includeWeightChart)}>
                  <div className="toggle-text">
                    <span className="toggle-title">Curva de Evolución de Peso</span>
                    <span className="toggle-desc">Dibuja un trazado SVG lineal con los pesos</span>
                  </div>
                  <div className={`switch-control ${includeWeightChart ? 'active' : ''}`}>
                    <div className="switch-knob" />
                  </div>
                </div>
              )}

              {diagsIA.length > 0 && (
                <div className="toggle-row" onClick={() => setIncludeAIDiag(!includeAIDiag)}>
                  <div className="toggle-text">
                    <span className="toggle-title">Diagnóstico Clínico por IA</span>
                    <span className="toggle-desc">Incluye las sugerencias de la IA</span>
                  </div>
                  <div className={`switch-control ${includeAIDiag ? 'active' : ''}`}>
                    <div className="switch-knob" />
                  </div>
                </div>
              )}

              {historyItems.length > 0 && (
                <div className="toggle-row" onClick={() => setIncludeHistoryLogs(!includeHistoryLogs)}>
                  <div className="toggle-text">
                    <span className="toggle-title">Historial Clínico / Diario</span>
                    <span className="toggle-desc">Incluye las notas del diario</span>
                  </div>
                  <div className={`switch-control ${includeHistoryLogs ? 'active' : ''}`}>
                    <div className="switch-knob" />
                  </div>
                </div>
              )}

              {includeHistoryLogs && historyItems.length > 5 && (
                <div className="toggle-row" onClick={() => setShowFullHistory(!showFullHistory)}>
                  <div className="toggle-text">
                    <span className="toggle-title">Mostrar Historial Completo</span>
                    <span className="toggle-desc">Si se desactiva, mostrará sólo los últimos 5</span>
                  </div>
                  <div className={`switch-control ${showFullHistory ? 'active' : ''}`}>
                    <div className="switch-knob" />
                  </div>
                </div>
              )}

              <div className="toggle-row" onClick={() => setIncludeSignature(!includeSignature)}>
                <div className="toggle-text">
                  <span className="toggle-title">Bloque de Firma y Sello</span>
                  <span className="toggle-desc">Agrega pie de validación clínica</span>
                </div>
                <div className={`switch-control ${includeSignature ? 'active' : ''}`}>
                  <div className="switch-knob" />
                </div>
              </div>
            </div>
          </div>

          {includeAIDiag && diagsIA.length > 1 && (
            <div className="form-group">
              <label className="form-label">Seleccionar Diagnóstico IA</label>
              <select 
                className="form-input" 
                value={selectedDiagId} 
                onChange={(e) => setSelectedDiagId(e.target.value)}
              >
                {diagsIA.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.esUrgente ? '🚨 Urgente' : '🩺 Consulta'}] {formatDate(d.fecha)} - {d.diagnostico.slice(0, 45)}...
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Observaciones Adicionales / Firma de Notas</label>
            <textarea 
              className="form-input" 
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={customObservations} 
              onChange={(e) => setCustomObservations(e.target.value)} 
              placeholder="Redacta anotaciones adicionales sobre tratamientos, dieta o recomendaciones que aparecerán al pie..."
            />
          </div>

          <div className="button-bar">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cerrar
            </button>
            <button type="button" className="btn-print" onClick={handlePrint}>
              💾 Imprimir / Guardar PDF
            </button>
          </div>
        </div>

        {/* Panel de Visualización A4 derecho */}
        <div className="preview-pane">
          <div className="preview-header-bar">
            <span className="preview-label" style={{ fontWeight: 'bold', fontSize: '13px', color: '#1e293b' }}>
              Vista Previa (A4 Escala)
            </span>
            <span className="preview-badge">PDF Interactivo</span>
          </div>

          <div className="a4-page-scroller">
            <div className="a4-page-body">
              {/* Encabezado */}
              <h1>
                <span style={{ fontWeight: 'bold', color: colors.primary }}>
                  {isPlant ? '🌿' : (isExotic ? '🦎' : '🐾')} {clinicName}
                </span>
                <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '700' }}>
                  {reportTitle}
                </span>
              </h1>

              {/* Contenido en cuadrícula de 2 columnas */}
              <div className="preview-grid">
                {/* Columna Izquierda */}
                <div className="preview-left-col">
                  {/* Foto */}
                  <div className="preview-photo">
                    {item.fotoUrl ? (
                      <img src={item.fotoUrl} alt="Mascota o Planta" />
                    ) : (
                      <span className="preview-photo-placeholder" style={{ fontSize: '56px' }}>
                        {isPlant ? '🌿' : (isPet && petItem.especie === 'Felino' ? '🐱' : '🐶')}
                      </span>
                    )}
                  </div>

                  {/* Tabla Identificativa */}
                  <div className="preview-section">
                    <h3>Datos del Paciente</h3>
                    {isPet && (
                      <table className="preview-details-table">
                        <tbody>
                          <tr><th>Especie:</th><td>{petItem.especie}</td></tr>
                          <tr><th>Raza:</th><td>{petItem.raza || 'No especificada'}</td></tr>
                          <tr><th>Sexo / Castrado:</th><td>{petItem.sexo || 'No especificado'} / {petItem.castrado ? 'Sí' : 'No'}</td></tr>
                          <tr><th>Fecha Nac.:</th><td>{formatDate(petItem.fechaNacimiento)}</td></tr>
                          <tr><th>Edad:</th><td>{calcularEdadMascota(petItem.fechaNacimiento)}</td></tr>
                          <tr><th>Chip N°:</th><td>{petItem.numeroChip || 'Sin microchip'}</td></tr>
                          <tr><th>Actividad:</th><td>{petItem.actividad}</td></tr>
                          {petItem.porcionDiariaGramos && <tr><th>Porción Diaria:</th><td>{petItem.porcionDiariaGramos}g</td></tr>}
                        </tbody>
                      </table>
                    )}
                    {isExotic && (
                      <table className="preview-details-table">
                        <tbody>
                          <tr><th>Especie:</th><td>{exoticItem.especie}</td></tr>
                          <tr><th>Tipo Específico:</th><td>{exoticItem.tipoEspecifico || 'No especificado'}</td></tr>
                          <tr><th>Microchip:</th><td>{exoticItem.chip || 'Sin microchip'}</td></tr>
                          <tr><th>Parámetros Terrario:</th><td>🌡️ {exoticItem.temperaturaTerrario}°C | 💧 {exoticItem.humedadTerrario}%</td></tr>
                          <tr><th>Última Alimen.:</th><td>{formatDate(exoticItem.ultimaAlimentacion)}</td></tr>
                          <tr><th>Frecuencia Riego:</th><td>Cada {exoticItem.intervaloAlimentacionDias} días</td></tr>
                        </tbody>
                      </table>
                    )}
                    {isPlant && (
                      <table className="preview-details-table">
                        <tbody>
                          <tr><th>Nombre Científico:</th><td><em>{plantItem.nombreCientifico || 'No especificado'}</em></td></tr>
                          <tr><th>Ubicación:</th><td>{plantItem.ubicacionHabitacion}</td></tr>
                          <tr><th>Temp. Zona:</th><td>🌡️ {plantItem.temperaturaZona}°C</td></tr>
                          <tr><th>Riego Específico:</th><td>💧 {plantItem.tipoRiegoEspecifico}</td></tr>
                          <tr><th>Frecuencia Riego:</th><td>Cada {plantItem.intervaloRiegoDias} días</td></tr>
                          <tr><th>Próximo Riego:</th><td>{formatDate(plantItem.proximaFechaRiego)}</td></tr>
                          <tr><th>Grosor Hoja:</th><td>{plantItem.grosorHoja}</td></tr>
                          <tr><th>Seguridad Felina:</th><td><span style={{ color: plantItem.toxicidadFelina === 'Segura' ? '#16a34a' : '#ef4444', fontWeight: 'bold' }}>{plantItem.toxicidadFelina}</span></td></tr>
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Preventative (solo mascotas) */}
                  {isPet && petVaccines && (
                    <div className="preview-section">
                      <h3>Preventiva y Vacunas</h3>
                      <div className="preview-checklist">
                        {petVaccines.map((v, idx) => {
                          const isChecked = (petItem.vacunasChecklist || []).includes(v);
                          return (
                            <div className={`preview-chk-item ${isChecked ? 'checked' : ''}`} key={idx}>
                              <span className="chk-box">{isChecked ? '✓' : '✗'}</span>
                              <span className="chk-lbl">{v}</span>
                            </div>
                          );
                        })}
                        <div className={`preview-chk-item ${lastIntVal ? 'checked' : ''}`}>
                          <span className="chk-box">{lastIntVal ? '✓' : '✗'}</span>
                          <span className="chk-lbl">Interna {lastIntVal ? `(${lastIntVal})` : ''}</span>
                        </div>
                        <div className={`preview-chk-item ${lastExtVal ? 'checked' : ''}`}>
                          <span className="chk-box">{lastExtVal ? '✓' : '✗'}</span>
                          <span className="chk-lbl">Externa {lastExtVal ? `(${lastExtVal})` : ''}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna Derecha */}
                <div className="preview-right-col">
                  {/* Gráfico de peso */}
                  {isPet && includeWeightChart && petItem.registroPeso && petItem.registroPeso.length > 0 && (
                    <div className="preview-section">
                      <h3>Curva de Trazado de Peso</h3>
                      {drawWeightChartSVG()}
                    </div>
                  )}

                  {/* Diagnóstico IA */}
                  {includeAIDiag && activeDiag && (
                    <div className={`preview-section preview-urgent-card ${activeDiag.esUrgente ? 'preview-urgent-border' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}`, paddingBottom: '3px', marginBottom: '6px' }}>
                        <h4 style={{ margin: 0, color: colors.primary, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          🩺 Diagnóstico Clínico por IA
                        </h4>
                        <span style={{ fontSize: '8.5px', fontWeight: 'bold', background: activeDiag.esUrgente ? '#fde8e8' : colors.bgLight, color: activeDiag.esUrgente ? '#e11d48' : colors.primary, padding: '1px 5px', borderRadius: '4px' }}>
                          {activeDiag.esUrgente ? '🚨 URGENTE' : 'CONSULTA'}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '10px' }}><strong>Diagnóstico:</strong> {activeDiag.diagnostico}</p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '10px' }}><strong>Tratamiento:</strong> {activeDiag.tratamiento}</p>
                      {activeDiag.advertencia && <p style={{ margin: '0 0 4px 0', fontSize: '10px' }}><strong>Alerta:</strong> <span style={{ color: '#c2410c', fontWeight: '500' }}>{activeDiag.advertencia}</span></p>}
                      <div style={{ fontSize: '8px', color: '#94a3b8', textAlign: 'right', marginTop: '2px' }}>{formatDate(activeDiag.fecha)}</div>
                    </div>
                  )}

                  {/* Historial Clínico */}
                  {includeHistoryLogs && displayedHistory.length > 0 && (
                    <div className="preview-section">
                      <h3>Historial Diario Clínico</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {displayedHistory.map((h, idx) => (
                          <div className="preview-timeline-item" style={{ borderLeftColor: h.color }} key={idx}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                              <strong style={{ fontSize: '9px', color: '#334155' }}>{formatDate(h.fecha)}</strong>
                              <span style={{ fontSize: '7.5px', fontWeight: 'bold', padding: '1px 3px', borderRadius: '3px', background: `${h.color}15`, color: h.color }}>
                                {h.tipo} • {h.subtipo}
                              </span>
                            </div>
                            <div style={{ color: '#475569', fontSize: '9px' }}>{h.texto}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observaciones manuales */}
                  {customObservations.trim() && (
                    <div className="preview-section" style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '8px', padding: '10px' }}>
                      <h4 style={{ margin: '0 0 5px 0', color: colors.primary, fontSize: '10.5px' }}>📝 Observaciones del Profesional</h4>
                      <div style={{ color: '#334155', fontSize: '9.5px', whiteSpace: 'pre-wrap' }}>{customObservations}</div>
                    </div>
                  )}

                  {/* Firmas */}
                  {includeSignature && (
                    <div className="preview-signature-block">
                      <div style={{ width: '45%' }}>
                        <div className="preview-sig-line">Firma del Profesional</div>
                        <div style={{ fontSize: '7.5px', color: '#94a3b8', marginTop: '3px' }}>Fecha: {new Date().toLocaleDateString('es-ES')}</div>
                      </div>
                      <div className="preview-stamp-box">
                        <span>Sello Clínico</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
