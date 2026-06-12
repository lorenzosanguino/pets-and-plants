# Pet & Plant Care Timeline and PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the interactive weekly care timeline (CareTimeline) and print-optimized PDF clinical export inside the Pet & Plant App.

**Architecture:** Component-driven extension. Extends state handling in the dashboard, aggregates schedule data in helper functions, and applies custom CSS `@media print` rules for clean paper formatting.

**Tech Stack:** React 19, TypeScript, Native `@media print` CSS.

---

### Task 1: Componente de Línea de Tiempo de Cuidados (`CareTimeline.tsx`)

**Files:**
- Create: `src/components/CareTimeline.tsx`

- [ ] **Step 1: Escribir el componente CareTimeline**
  Crear el componente `src/components/CareTimeline.tsx` para listar las tareas del cronograma de los próximos 7 días (riego y control de vacunas/peso).

  Code:
  ```tsx
  import React from 'react';
  import { Planta, Mascota } from '../database/types';
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
      const limite = new Date(Date.now() + 7 * 24 * 3600 * 1000);

      // 1. Tareas de plantas (Riegos calculados)
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

      // 2. Tareas de mascotas (Dosis de vacunas y pesajes semanales sugeridos)
      mascotas.forEach(m => {
        // Control de peso sugerido cada 7 días si el último fue hace más de una semana
        const ultimoPeso = m.registroPeso[m.registroPeso.length - 1];
        const fechaUltimoPeso = ultimoPeso ? new Date(ultimoPeso.fecha) : new Date(0);
        const diasDesdePeso = Math.floor((hoy.getTime() - fechaUltimoPeso.getTime()) / (1000 * 60 * 60 * 24));

        if (diasSincePeso >= 7 || !ultimoPeso) {
          tareas.push({
            id: `peso-${m.id}`,
            targetId: m.id,
            type: 'peso',
            title: `Pesar a ${m.nombre}`,
            detail: "Mantener actualizada la curva de condición corporal",
            date: hoy,
            color: '#2196f3',
            emoji: '⚖️'
          });
        }
      });

      // Ordenar por fecha cronológica
      return tareas.sort((a, b) => a.date.getTime() - b.date.getTime());
    };

    const completarTarea = (tarea: TaskItem) => {
      if (tarea.type === 'riego') {
        const p = plantas.find(item => item.id === tarea.targetId);
        if (p) {
          const hoyStr = new Date().toISOString();
          const proxStr = new Date(Date.now() + p.intervaloRiegoDias * 24 * 3600 * 1000).toISOString();
          LocalDatabase.savePlanta({
            ...p,
            ultimaFechaRiego: hoyStr,
            proximaFechaRiego: proxStr
          });
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
          Agenda Semanal de Cuidados ({tareas.length})
        </h3>
        
        {tareas.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', margin: '20px 0' }}>
            🎉 Todo al día. No hay tareas programadas para esta semana.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
            {tareas.map((t, idx) => (
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
                  
                  {t.type === 'riego' && (
                    <button 
                      onClick={() => completarTarea(t)}
                      style={{ padding: '4px 8px', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Completar ✓
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
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/components/CareTimeline.tsx
  git commit -m "feat: ui: implement CareTimeline care scheduler component"
  ```

---

### Task 2: Modificación de PetCard para Exportación Clínica (`PetCard.tsx`)

**Files:**
- Modify: `src/components/PetCard.tsx`

- [ ] **Step 1: Añadir estilos de impresión y el botón de exportación**
  Modificar el archivo `src/components/PetCard.tsx` para inyectar estilos de impresión e implementar la exportación clínica.

  TargetContent:
  ```tsx
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
  ```

  ReplacementContent:
  ```tsx
  const exportarFichaClinica = () => {
    // Inyectar clase print al body temporalmente y llamar a print
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
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      const el = document.getElementById('print-clinical-record-style');
      if (el) el.remove();
    }, 1000);
  };

  return (
    <div className="printable-clinical-record" style={{
      background: '#ffffff',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      border: '1px solid #f0f0f0',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
  ```

- [ ] **Step 2: Añadir botón de impresión**
  Añadir el botón de impresión al final del componente, justo antes del cierre de la tarjeta de Mascota.

  TargetContent:
  ```tsx
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#555' }}>Control de Vacunas Preventivas</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {mascota.historialVacunas.map((v, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px 8px', background: '#f5f5f5', borderRadius: '6px' }}>
                <span>🛡️ {v.vacuna} (Lote: {v.lote})</span>
                <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>Al día</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  ```

  ReplacementContent:
  ```tsx
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#555' }}>Control de Vacunas Preventivas</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {mascota.historialVacunas.map((v, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px 8px', background: '#f5f5f5', borderRadius: '6px' }}>
                <span>🛡️ {v.vacuna} (Lote: {v.lote})</span>
                <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>Al día</span>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={exportarFichaClinica}
          className="no-print"
          style={{
            padding: '8px 12px',
            background: '#eceff1',
            color: '#37474f',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: '8px'
          }}
        >
          📄 Exportar Registro Clínico Veterinario (PDF)
        </button>
      </div>
    );
  };
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add src/components/PetCard.tsx
  git commit -m "feat: ui: add clinical print export binding to PetCard"
  ```

---

### Task 3: Integración en el Dashboard Principal (`PetPlantDashboard.tsx`)

**Files:**
- Modify: `src/pages/PetPlantDashboard.tsx`

- [ ] **Step 1: Importar e integrar CareTimeline en el Dashboard**
  Modificar el archivo `src/pages/PetPlantDashboard.tsx` para integrar el CareTimeline y estructurar el layout en tres columnas o dos columnas con la agenda.

  TargetContent:
  ```tsx
  import React, { useState, useEffect } from 'react';
  import { PetCard } from '../components/PetCard';
  import { PlantCard } from '../components/PlantCard';
  import { ScannerModal } from '../components/ScannerModal';
  import { LocalDatabase } from '../database/db';
  import { Mascota, Planta } from '../database/types';

  export const PetPlantDashboard: React.FC = () => {
  ```

  ReplacementContent:
  ```tsx
  import React, { useState, useEffect } from 'react';
  import { PetCard } from '../components/PetCard';
  import { PlantCard } from '../components/PlantCard';
  import { CareTimeline } from '../components/CareTimeline';
  import { ScannerModal } from '../components/ScannerModal';
  import { LocalDatabase } from '../database/db';
  import { Mascota, Planta } from '../database/types';

  export const PetPlantDashboard: React.FC = () => {
  ```

- [ ] **Step 2: Integrar el componente en el layout visual**
  Añadir el timeline en la columna central o lateral del layout de rejilla.

  TargetContent:
  ```tsx
          {/* Grids */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            
            {/* Mascotas */}
            <div>
              <h2 style={{ fontSize: '18px', color: '#333', marginBottom: '16px', borderBottom: '2px solid #eaeaea', paddingBottom: '8px' }}>
                Mascotas Registradas ({mascotas.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {mascotas.map(m => (
                  <PetCard key={m.id} mascota={m} onUpdate={refreshData} />
                ))}
              </div>
            </div>

            {/* Plantas */}
            <div>
              <h2 style={{ fontSize: '18px', color: '#333', marginBottom: '16px', borderBottom: '2px solid #eaeaea', paddingBottom: '8px' }}>
                Cultivos y Microclimas ({plantas.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {plantas.map(p => (
                  <PlantCard key={p.id} planta={p} onUpdate={refreshData} />
                ))}
              </div>
            </div>

          </div>
  ```

  ReplacementContent:
  ```tsx
          {/* Grids */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            
            {/* Mascotas */}
            <div>
              <h2 style={{ fontSize: '18px', color: '#333', marginBottom: '16px', borderBottom: '2px solid #eaeaea', paddingBottom: '8px' }}>
                Mascotas Registradas ({mascotas.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {mascotas.map(m => (
                  <PetCard key={m.id} mascota={m} onUpdate={refreshData} />
                ))}
              </div>
            </div>

            {/* Plantas */}
            <div>
              <h2 style={{ fontSize: '18px', color: '#333', marginBottom: '16px', borderBottom: '2px solid #eaeaea', paddingBottom: '8px' }}>
                Cultivos y Microclimas ({plantas.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {plantas.map(p => (
                  <PlantCard key={p.id} planta={p} onUpdate={refreshData} />
                ))}
              </div>
            </div>

            {/* Timeline de Cuidados Semanales */}
            <div className="no-print">
              <h2 style={{ fontSize: '18px', color: '#333', marginBottom: '16px', borderBottom: '2px solid #eaeaea', paddingBottom: '8px' }}>
                Planificación Semanal
              </h2>
              <CareTimeline plantas={plantas} mascotas={mascotas} onUpdate={refreshData} />
            </div>

          </div>
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add src/pages/PetPlantDashboard.tsx
  git commit -m "feat: pages: integrate CareTimeline into PetPlantDashboard layout"
  ```
