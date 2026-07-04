/* eslint-disable react-hooks/purity */
import React from 'react';
import type { Planta, Mascota } from '../database/types';
import { LocalDatabase } from '../database/db';

interface CareTimelineProps {
  plantas: Planta[];
  mascotas: Mascota[];
  onUpdate: () => void;
}

interface TaskItem {
  id: string;
  targetId: string;
  type: 'riego' | 'peso' | 'vacuna';
  title: string;
  detail: string;
  date: Date;
  color: string;
  emoji: string;
}

export const CareTimeline: React.FC<CareTimelineProps> = ({ plantas, mascotas, onUpdate }) => {
  
  // Generar tareas para los próximos 7 días
  const obtenerTareasSemanales = (): TaskItem[] => {
    const tareas: TaskItem[] = [];
    const hoy = new Date();
    // const limite = new Date(Date.now() + 7 * 24 * 3600 * 1000);

    // 1. Tareas de plantas (Riegos calculados) - (Deshabilitado: el usuario prefiere gestionarlo a mano)
    /*
    plantas.forEach(p => {
      const fechaRiego = new Date(p.proximaFechaRiego);
      if (fechaRiego <= limite) {
        tareas.push({
          id: `riego-${p.id}-${fechaRiego.getTime()}`,
          targetId: p.id,
          type: 'riego',
          title: `Regar ${p.nombreComun}`,
          detail: `Usar: ${p.tipoRiegoEspecifico}`,
          date: fechaRiego,
          color: '#4caf50',
          emoji: '💧'
        });
      }
    });
    */

    // 2. Tareas de mascotas (Dosis de vacunas y pesajes semanales sugeridos)
    mascotas.forEach(m => {
      // Control de peso sugerido cada 7 días si el último fue hace más de una semana
      const ultimoPeso = m.registroPeso[m.registroPeso.length - 1];
      const fechaUltimoPeso = ultimoPeso ? new Date(ultimoPeso.fecha) : new Date(0);
      const diferenciaMs = hoy.getTime() - fechaUltimoPeso.getTime();
      const diasDesdePeso = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));

      if (diasDesdePeso >= 7 || !ultimoPeso) {
        tareas.push({
          id: `peso-${m.id}`,
          targetId: m.id,
          type: 'peso',
          title: `Weigh ${m.nombre}`,
          detail: "Keep the body condition curve up to date",
          date: hoy,
          color: '#2196f3',
          emoji: '⚖️'
        });
      }

      // Vacunas/Desparasitaciones pendientes - (Deshabilitado: el usuario prefiere gestionarlo a mano)
      /*
      if (m.especie === 'Felino' || m.especie === 'Canino') {
        const checklistRequerido = m.especie === 'Felino'
          ? ['Feline Trivalent', 'Feline Leukemia', 'Rabies', 'Internal Deworming', 'External Deworming']
          : ['Parvovirus', 'Distemper', 'Adenovirus', 'Rabies', 'Leptospirosis', 'Internal Deworming', 'External Deworming'];

        const marcados = m.vacunasChecklist || [];
        const pendientes = checklistRequerido.filter(v => !marcados.includes(v));

        pendientes.forEach(v => {
          tareas.push({
            id: `vacuna-pendiente-${m.id}-${v}`,
            targetId: m.id,
            type: 'vacuna',
            title: `Vaccinate ${v} for ${m.nombre}`,
            detail: `Pending in the preventive medicine plan for ${m.nombre}`,
            date: hoy,
            color: '#f59e0b',
            emoji: v.includes('Deworming') ? '💊' : '💉'
          });
        });
      }
      */
    });

    // Ordenar por fecha cronológica
    return tareas.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const completarTarea = async (tarea: TaskItem) => {
    if (tarea.type === 'riego') {
      const p = plantas.find(item => item.id === tarea.targetId);
      if (p) {
        const hoyStr = new Date().toISOString();
        const proxStr = new Date(Date.now() + p.intervaloRiegoDias * 24 * 3600 * 1000).toISOString();
        await LocalDatabase.savePlanta({
          ...p,
          ultimaFechaRiego: hoyStr,
          proximaFechaRiego: proxStr
        });
      }
    } else if (tarea.type === 'vacuna') {
      const m = mascotas.find(item => item.id === tarea.targetId);
      if (m) {
        const vName = tarea.id.replace(`vacuna-pendiente-${m.id}-`, '');
        const confirmar = window.confirm(`Are you sure you want to mark "${vName}" for ${m.nombre} as placed/done? This action cannot be undone.`);
        if (!confirmar) return;

        const current = m.vacunasChecklist || [];
        if (!current.includes(vName)) {
          const updated = [...current, vName];
          await LocalDatabase.saveMascota({
            ...m,
            vacunasChecklist: updated
          });
        }
      }
    }
    onUpdate();
  };

  const tareas = obtenerTareasSemanales();

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      border: '1px solid #f0f0f0',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#1a1a1a', borderBottom: '1px solid #f0f0f0', paddingBottom: '8px' }}>
        Weekly Care Agenda ({tareas.length})
      </h3>
      
      {tareas.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', margin: '20px 0' }}>
          🎉 All up to date. No tasks scheduled for this week.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
          {tareas.map((t) => (
            <div key={t.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: `${t.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                flexShrink: 0
              }}>
                {t.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#333' }}>{t.title}</span>
                  <span style={{ fontSize: '10px', color: '#888' }}>
                    {t.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p style={{ margin: '2px 0 6px 0', fontSize: '11px', color: '#666' }}>{t.detail}</p>
                
                {(t.type === 'riego' || t.type === 'vacuna') && (
                  <button 
                    onClick={() => completarTarea(t)}
                    style={{ padding: '4px 8px', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Complete ✓
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
