/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import type { EventoCalendario } from '../database/types';
import { LocalDatabase } from '../database/db';
import { safeUUID } from '../utils/uuid';
import { useTranslations } from '../utils/i18n';

const getNowTimestamp = (): number => Date.now();

interface EcosystemCalendarProps {
  plantas: any[];
  mascotas: any[];

  onUpdate: () => void;
}

export const EcosystemCalendar: React.FC<EcosystemCalendarProps> = ({ plantas = [], mascotas = [], onUpdate }) => {
  const { locale } = useTranslations();
  const isEn = locale === 'en';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [showEventForm, setShowEventForm] = useState(false);

  // Form states
  const [newTexto, setNewTexto] = useState('');
  const [newCategoria, setNewCategoria] = useState<EventoCalendario['categoria']>('riego');

  const obtenerTareasAutomaticas = (dateStr: string) => {
    const tareas: { type: string; title: string; detail: string; emoji: string; color: string; targetId: string }[] = [];
    
    // 1. Riegos programados de plantas (Deshabilitado por solicitud del usuario: prefiere añadir riegos a mano)
    /*
    plantas.forEach(p => {
      if (p.proximaFechaRiego) {
        const fechaRiego = p.proximaFechaRiego.split('T')[0];
        if (fechaRiego === dateStr) {
          tareas.push({
            type: 'riego',
            title: `Regar ${p.nombreComun}`,
            detail: `Usar: ${p.tipoRiegoEspecifico || 'agua'}`,
            emoji: '💧',
            color: '#2196f3',
            targetId: p.id
          });
        }
      }
    });
    */

    // 2. Tareas sugeridas de hoy (vacunas y pesajes)
    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    
    if (dateStr === hoyStr) {
      // Pesaje sugerido
      mascotas.forEach(m => {
        const ultimoPeso = m.registroPeso && m.registroPeso[m.registroPeso.length - 1];
        const fechaUltimoPeso = ultimoPeso ? new Date(ultimoPeso.fecha) : new Date(0);
        const diferenciaMs = hoy.getTime() - fechaUltimoPeso.getTime();
        const diasDesdePeso = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));

        if (diasDesdePeso >= 7 || !ultimoPeso) {
          tareas.push({
            type: 'peso',
            title: locale === 'en' ? `Weigh ${m.nombre}` : `Pesar a ${m.nombre}`,
            detail: locale === 'en' ? "Keep weight curve up to date" : "Mantener actualizada la curva de peso",
            emoji: '⚖️',
            color: '#9c27b0',
            targetId: m.id
          });
        }
      });



      // Medicación programada activa para el día seleccionado
      mascotas.forEach(m => {
        const meds = m.medicamentos || [];
        meds.forEach((med: any) => {
          if (med.activo && med.proximaDosis) {
            const medDate = med.proximaDosis.split('T')[0];
            if (medDate === dateStr) {
              const timeStr = new Date(med.proximaDosis).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              tareas.push({
                type: 'medicacion',
                title: locale === 'en' ? `${med.nombre} (${med.dosis}) for ${m.nombre}` : `${med.nombre} (${med.dosis}) para ${m.nombre}`,
                detail: locale === 'en'
                  ? `Scheduled time: ${timeStr} - Frequency: ${med.frecuencia === 'Diario' ? 'Daily' : med.frecuencia === 'Cada 12 horas' ? 'Every 12 hours' : med.frecuencia === 'Cada 8 horas' ? 'Every 8 hours' : med.frecuencia === 'Cada 6 horas' ? 'Every 6 hours' : med.frecuencia === 'Semanal' ? 'Weekly' : med.frecuencia}`
                  : `Hora programada: ${timeStr} - Frecuencia: ${med.frecuencia}`,
                emoji: '💊',
                color: '#d32f2f',
                targetId: m.id,
                medId: med.id
              } as any);
            }
          }
        });
      });

      // Vacunas / Desparasitaciones pendientes (Deshabilitado por solicitud del usuario: prefiere añadir vacunas a mano)
      /*
      mascotas.forEach(m => {
        if (m.especie === 'Felino' || m.especie === 'Canino') {
          const checklistRequerido = m.especie === 'Felino'
            ? ['Trivalente Felina (1ª dosis)', 'Trivalente Felina (2ª dosis)', 'Leucemia Felina', 'Rabia', 'Desparasitación Interna', 'Desparasitación Externa']
            : ['Parvovirus', 'Moquillo', 'Adenovirus', 'Rabia', 'Leptospirosis', 'Bordetella', 'Desparasitación Interna', 'Desparasitación Externa'];

          const marcados = m.vacunasChecklist || [];
          const pendientes = checklistRequerido.filter(v => !marcados.includes(v));

          pendientes.forEach(v => {
            tareas.push({
              type: 'vacuna',
              title: `Vacunar ${v} a ${m.nombre}`,
              detail: `Medicina preventiva pendiente para ${m.nombre}`,
              emoji: v.includes('Desparasitación') ? '💊' : '💉',
              color: '#f59e0b',
              targetId: m.id
            });
          });
        }
      });
      */
    }

    return tareas;
  };

  const loadEvents = async () => {
    try {
      const list = await LocalDatabase.getEventosCalendario();
      setEventos(list);
    } catch (err) {
      console.error("Error loading calendar events:", err);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const exportarICS = () => {
    if (eventos.length === 0) {
      alert("There are no events in the calendar to export.");
      return;
    }

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//PetPlantApp//Ecosystem Calendar//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];

    eventos.forEach(ev => {
      const dateParts = ev.fecha.split('-');
      if (dateParts.length !== 3) return;
      const dateStr = dateParts.join(''); // YYYYMMDD

      const cleanSummary = ev.texto.replace(/,/g, '\\,').replace(/;/g, '\\;');
      const categoryLabel = ev.categoria.toUpperCase();

      icsContent.push("BEGIN:VEVENT");
      icsContent.push(`UID:${ev.id}@petplantapp`);
      icsContent.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
      icsContent.push(`DTSTART;VALUE=DATE:${dateStr}`);
      
      const nextDay = new Date(ev.fecha + 'T00:00:00');
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, '0')}${String(nextDay.getDate()).padStart(2, '0')}`;
      icsContent.push(`DTEND;VALUE=DATE:${nextDayStr}`);
      icsContent.push(`SUMMARY:[${categoryLabel}] ${cleanSummary}`);
      icsContent.push(`DESCRIPTION:Categoría: ${ev.categoria}`);
      icsContent.push("END:VEVENT");
    });

    icsContent.push("END:VCALENDAR");

    const blob = new Blob([icsContent.join("\r\n")], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calendario_ecosistema_${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDayStr(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDayStr(null);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    // 0 = Sunday, 1 = Monday, etc.
    const day = new Date(year, month, 1).getDay();
    // Adjust to make Monday index 0 (European/Spanish style calendar)
    return day === 0 ? 6 : day - 1;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const monthNames = isEn
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const handleDayClick = (dayNum: number) => {
    const paddedMonth = String(month + 1).padStart(2, '0');
    const paddedDay = String(dayNum).padStart(2, '0');
    const dayStr = `${year}-${paddedMonth}-${paddedDay}`;
    setSelectedDayStr(dayStr);
    setShowEventForm(false);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayStr || !newTexto.trim()) return;

    const nuevo: EventoCalendario = {
      id: safeUUID(),
      fecha: selectedDayStr,
      categoria: newCategoria,
      texto: newTexto.trim(),
      completado: false
    };

    try {
      await LocalDatabase.saveEventoCalendario(nuevo);
      localStorage.setItem('petplant_db_last_updated', Date.now().toString());
      setNewTexto('');
      await loadEvents();
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await LocalDatabase.deleteEventoCalendario(id);
      localStorage.setItem('petplant_db_last_updated', getNowTimestamp().toString());
      await loadEvents();
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCompletado = async (ev: EventoCalendario) => {
    try {
      const updated: EventoCalendario = {
        ...ev,
        completado: !ev.completado
      };
      await LocalDatabase.saveEventoCalendario(updated);
      localStorage.setItem('petplant_db_last_updated', getNowTimestamp().toString());
      await loadEvents();
      onUpdate();
    } catch (err) {
      console.error("Error toggling event completion:", err);
    }
  };

  // Event category color mapping
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'riego': return '#00ff7f';       // Spring Green
      case 'veterinario': return '#ef4444'; // Red
      case 'peluqueria': return '#a78bfa';  // Lavender
      case 'medicacion': return '#f59e0b';  // Amber
      case 'abono': return '#10b981';       // Emerald
      default: return '#6b7280';
    }
  };

  const getCategoryLabel = (cat: string) => {
    const isEn = locale === 'en';
    switch (cat) {
      case 'riego': return isEn ? 'Watering 💧' : 'Riego 💧';
      case 'veterinario': return isEn ? 'Veterinary 🩺' : 'Veterinario 🩺';
      case 'peluqueria': return isEn ? 'Grooming ✂️' : 'Peluquería ✂️';
      case 'medicacion': return isEn ? 'Medication 💊' : 'Medicación 💊';
      case 'abono': return isEn ? 'Fertilizer 🌱' : 'Abono 🌱';
      default: return isEn ? 'Other 📝' : 'Otro 📝';
    }
  };

  // Build days grid
  const daysArray = [];
  // Empty slots for previous month padding
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  // Days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push(i);
  }

  // Selected day events
  const selectedDayEvents = eventos.filter(ev => ev.fecha === selectedDayStr);

  return (
    <div className="glass-card" style={{
      background: 'var(--game-card-bg, #ffffff)',
      borderRadius: '16px',
      border: 'var(--game-border, 1.5px solid #eaeaea)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      color: 'var(--game-text, #333)',
      boxSizing: 'border-box'
    }}>
      {/* CSS Styles */}
      <style>{`
        .calendar-header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          width: 100%;
        }
        .calendar-controls-wrapper {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        @media (max-width: 600px) {
          .calendar-header-container {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 16px;
          }
          .calendar-controls-wrapper {
            flex-direction: column-reverse;
            width: 100%;
            gap: 12px;
          }
          .calendar-nav-group {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            gap: 8px;
          }
          .calendar-export-btn {
            width: 100% !important;
            justify-content: center;
            margin-right: 0 !important;
          }
        }
      `}</style>

      {/* Calendar Header */}
      <div className="calendar-header-container">
        <h3 style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: 'var(--game-text-bright)' }}>
          {isEn ? '📅 Ecosystem Agenda & Calendar' : '📅 Agenda y Calendario del Ecosistema'}
        </h3>
        <div className="calendar-controls-wrapper">
          <button 
            type="button"
            onClick={exportarICS}
            style={{
              padding: '6px 12px',
              background: 'var(--game-accent, #2e7d32)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginRight: '4px'
            }}
            title={isEn ? "Export calendar to iCal format (.ics)" : "Exportar calendario al formato iCal (.ics)"}
            className="no-print calendar-export-btn"
          >
            {isEn ? '📅 Export iCal' : '📅 Exportar iCal'}
          </button>
          
          <div className="calendar-nav-group">
            <button 
              onClick={handlePrevMonth}
              style={{ padding: '6px 12px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#000' }}
            >
              &lt;
            </button>
            <span style={{ fontSize: '14px', fontWeight: 'bold', minWidth: '120px', textAlign: 'center' }}>
              {monthNames[month]} {year}
            </span>
            <button 
              onClick={handleNextMonth}
              style={{ padding: '6px 12px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#000' }}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Weekdays Labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
        <span>{isEn ? 'Mo' : 'Lu'}</span>
        <span>{isEn ? 'Tu' : 'Ma'}</span>
        <span>{isEn ? 'We' : 'Mi'}</span>
        <span>{isEn ? 'Th' : 'Ju'}</span>
        <span>{isEn ? 'Fr' : 'Vi'}</span>
        <span>{isEn ? 'Sa' : 'Sá'}</span>
        <span style={{ color: '#ef4444' }}>{isEn ? 'Su' : 'Do'}</span>
      </div>

      {/* Days Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
        {daysArray.map((dayNum, index) => {
          if (dayNum === null) {
            return <div key={`empty-${index}`} style={{ aspectRatio: '1', background: 'transparent' }} />;
          }

          const paddedMonth = String(month + 1).padStart(2, '0');
          const paddedDay = String(dayNum).padStart(2, '0');
          const dateStr = `${year}-${paddedMonth}-${paddedDay}`;
          const isSelected = selectedDayStr === dateStr;
          // Day events check
          const dayEvents = eventos.filter(ev => ev.fecha === dateStr);
          const autoTareas = obtenerTareasAutomaticas(dateStr);
          const totalEventosEnDia = dayEvents.length + autoTareas.length;

          const today = new Date();
          const isToday = today.getDate() === dayNum && today.getMonth() === month && today.getFullYear() === year;

          return (
            <div
              key={`day-${dayNum}`}
              onClick={() => handleDayClick(dayNum)}
              style={{
                aspectRatio: '1',
                borderRadius: '8px',
                border: isSelected 
                  ? '2.5px solid var(--game-border-color, #1976d2)' 
                  : (isToday ? '2px solid var(--game-accent, #ff9800)' : '1px solid #eaeaea'),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px',
                cursor: 'pointer',
                background: isSelected 
                  ? 'var(--game-accent-light, #e3f2fd)' 
                  : (isToday ? 'var(--game-accent-light, rgba(255, 152, 0, 0.05))' : 'rgba(0,0,0,0.01)'),
                transition: 'all 0.2s',
                boxSizing: 'border-box'
              }}
            >
              <span style={{ 
                fontSize: '12px', 
                fontWeight: (isSelected || isToday) ? 'bold' : 'normal',
                color: isToday ? '#ffffff' : 'inherit',
                background: isToday ? 'var(--game-accent, #ff9800)' : 'transparent',
                borderRadius: isToday ? '50%' : 'none',
                width: isToday ? '22px' : 'auto',
                height: isToday ? '22px' : 'auto',
                display: isToday ? 'inline-flex' : 'inline',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                lineHeight: isToday ? '1' : 'normal'
              }}>{dayNum}</span>
              
              {/* Category Dots */}
              {totalEventosEnDia > 0 && (
                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '100%' }}>
                  {dayEvents.slice(0, 3).map(ev => (
                    <span
                      key={ev.id}
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: getCategoryColor(ev.categoria),
                        display: 'inline-block'
                      }}
                      title={getCategoryLabel(ev.categoria)}
                    />
                  ))}
                  {autoTareas.slice(0, Math.max(0, 3 - dayEvents.length)).map((t, idx) => (
                    <span
                      key={`auto-${idx}`}
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: t.color,
                        display: 'inline-block',
                        border: '1.5px solid rgba(255,255,255,0.7)'
                      }}
                      title={t.title}
                    />
                  ))}
                  {totalEventosEnDia > 3 && <span style={{ fontSize: '7px', fontWeight: 'bold', lineHeight: '1' }}>+</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Day Info Drawer */}
      {selectedDayStr && (
        <div style={{
          borderTop: '1px solid #eaeaea',
          paddingTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: '0', fontSize: '14px', fontWeight: 'bold' }}>
              {isEn ? 'Notes for:' : 'Notas para:'} <strong style={{ color: 'var(--game-border-color, #1976d2)' }}>{selectedDayStr}</strong>
            </h4>
            {!showEventForm && (
              <button 
                onClick={() => setShowEventForm(true)}
                style={{
                  padding: '4px 10px',
                  background: '#2e7d32',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {locale === 'en' ? 'Add Note ➕' : 'Añadir Nota ➕'}
              </button>
            )}
          </div>

          {/* Form to add note */}
          {showEventForm && (
            <form onSubmit={handleAddEvent} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '12px',
              background: '#fafafa',
              borderRadius: '8px',
              border: '1px dashed #ccc'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  value={newCategoria} 
                  onChange={(e) => setNewCategoria(e.target.value as any)}
                  style={{ padding: '6px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000' }}
                >
                  <option value="riego">{locale === 'en' ? 'Watering 💧' : 'Riego 💧'}</option>
                  <option value="veterinario">{locale === 'en' ? 'Veterinary 🩺' : 'Veterinario 🩺'}</option>
                  <option value="peluqueria">{locale === 'en' ? 'Grooming ✂️' : 'Peluquería ✂️'}</option>
                  <option value="medicacion">{locale === 'en' ? 'Medication 💊' : 'Medicación 💊'}</option>
                  <option value="abono">{locale === 'en' ? 'Fertilizer 🌱' : 'Abono 🌱'}</option>
                  <option value="otro">{locale === 'en' ? 'Other 📝' : 'Otro 📝'}</option>
                </select>
                <input 
                  type="text" 
                  required
                  placeholder={locale === 'en' ? "Write the reminder or note..." : "Escribe el recordatorio o nota..."}
                  value={newTexto}
                  onChange={(e) => setNewTexto(e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowEventForm(false)}
                  style={{ padding: '4px 10px', fontSize: '11px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {locale === 'en' ? 'Cancel' : 'Cancelar'}
                </button>
                <button 
                  type="submit" 
                  style={{ padding: '4px 12px', fontSize: '11px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {locale === 'en' ? 'Save Note 💾' : 'Guardar Nota 💾'}
                </button>
              </div>
            </form>
          )}

          {/* Day events list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {/* Tareas Automáticas del Ecosistema */}
            {obtenerTareasAutomaticas(selectedDayStr).map((t, idx) => (
              <div
                key={`auto-task-${idx}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  borderLeft: `5px solid ${t.color}`,
                  background: 'rgba(255, 152, 0, 0.03)',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: t.color, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {t.emoji} {isEn ? 'Ecosystem Task •' : 'Tarea del Ecosistema •'} {t.type.toUpperCase()}
                  </span>
                  <span style={{ color: 'var(--game-text-bright, #333)', fontWeight: 'bold' }}>{t.title}</span>
                  <span style={{ fontSize: '10px', color: '#666' }}>{t.detail}</span>
                </div>
                
                {(t.type === 'riego' || t.type === 'vacuna' || t.type === 'peso' || t.type === 'medicacion') && (
                  <button
                    onClick={async () => {
                      if (t.type === 'riego') {
                        const p = plantas.find(item => item.id === t.targetId);
                        if (p) {
                          const hoyStr = new Date().toISOString();
                          const proxStr = new Date(Date.now() + p.intervaloRiegoDias * 24 * 3600 * 1000).toISOString();
                          await LocalDatabase.savePlanta({
                            ...p,
                            ultimaFechaRiego: hoyStr,
                            proximaFechaRiego: proxStr
                          });
                        }
                      } else if (t.type === 'vacuna') {
                        const m = mascotas.find(item => item.id === t.targetId);
                        if (m) {
                          // Extraemos la vacuna removiendo "Vacunar " y " a NombreMascota"
                          const cleanTitle = t.title.replace('Vacunar ', '');
                          const vName = cleanTitle.split(` a ${m.nombre}`)[0];
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
                      } else if (t.type === 'medicacion') {
                        const m = mascotas.find(item => item.id === t.targetId);
                        if (m) {
                          const medId = (t as any).medId;
                          const med = (m.medicamentos || []).find((item: any) => item.id === medId);
                          if (med) {
                            const confirmar = window.confirm(`Do you want to record the dose of ${med.nombre} (${med.dosis}) for ${m.nombre} now?`);
                            if (!confirmar) return;

                            const now = new Date();
                            const nowISO = now.toISOString();

                            let hoursToAdd = 24;
                            const freq = med.frecuencia.toLowerCase();
                            if (freq.includes('8 horas') || freq.includes('8h')) {
                              hoursToAdd = 8;
                            } else if (freq.includes('12 horas') || freq.includes('12h')) {
                              hoursToAdd = 12;
                            } else if (freq.includes('6 horas') || freq.includes('6h')) {
                              hoursToAdd = 6;
                            } else if (freq.includes('4 horas') || freq.includes('4h')) {
                              hoursToAdd = 4;
                            } else if (freq.includes('diario') || freq.includes('cada día') || freq.includes('24 horas') || freq.includes('24h')) {
                              hoursToAdd = 24;
                            } else if (freq.includes('semanal') || freq.includes('semana') || freq.includes('7 días') || freq.includes('7 dias')) {
                              hoursToAdd = 24 * 7;
                            } else {
                              const numMatch = freq.match(/(\d+)\s*(horas|h)/);
                              if (numMatch) {
                                hoursToAdd = parseInt(numMatch[1], 10);
                              }
                            }

                            const nextDoseDate = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
                            const updatedHistory = [...(med.historialTomas || []), nowISO];

                            let activo = med.activo;
                            if (med.fechaFin) {
                              const finDate = new Date(med.fechaFin);
                              finDate.setHours(23, 59, 59, 999);
                              if (nextDoseDate > finDate) {
                                activo = false;
                              }
                            }

                            const medActualizado = {
                              ...med,
                              activo,
                              proximaDosis: activo ? nextDoseDate.toISOString() : undefined,
                              historialTomas: updatedHistory
                            };

                            const medsActualizados = (m.medicamentos || []).map((item: any) => item.id === medId ? medActualizado : item);

                            const nuevoEvento = {
                              id: safeUUID(),
                              fecha: nowISO.split('T')[0],
                              tipo: 'Tratamiento' as const,
                              descripcion: `Administrada dosis de ${med.nombre} (${med.dosis})`
                            };

                            await LocalDatabase.saveMascota({
                              ...m,
                              medicamentos: medsActualizados,
                              historialPasado: [...(m.historialPasado || []), nuevoEvento]
                            });

                            const activeHogarId = localStorage.getItem('petplant_hogar_id');
                            if (activeHogarId) {
                              import('../utils/notificationManager').then(({ NotificationManager }) => {
                                NotificationManager.triggerCloudPushNotification(
                                  activeHogarId,
                                  `💊 Toma registrada — ${m.nombre}`,
                                  `${m.nombre} ha recibido su dosis de ${med.nombre} (${med.dosis}).`
                                );
                              }).catch(err => console.error(err));
                            }

                            alert(`Dose recorded. Next dose: ${activo ? nextDoseDate.toLocaleString() : 'Treatment completed'}`);
                          }
                        }
                      } else if (t.type === 'peso') {
                        const animal = mascotas.find(item => item.id === t.targetId);

                        if (animal) {
                          const pesoInput = window.prompt(`Introduce el nuevo peso (Kg) para ${animal.nombre}:`);
                          if (pesoInput === null) return; // User cancelled
                          const pesoNum = parseFloat(pesoInput.replace(',', '.'));
                          if (isNaN(pesoNum) || pesoNum <= 0) {
                            alert("Please enter a valid number for the weight.");
                            return;
                          }
                          const nuevoRegistro = {
                            fecha: new Date().toISOString(),
                            pesoKg: pesoNum
                          };

                          const listadoPeso = animal.registroPeso || [];
                          await LocalDatabase.saveMascota({
                            ...animal,
                            registroPeso: [...listadoPeso, nuevoRegistro]
                          });
                        }
                      }
                      onUpdate();
                      await loadEvents();
                    }}
                    style={{
                      padding: '4px 8px',
                      background: '#e8f5e9',
                      color: '#2e7d32',
                      border: '1px solid #c8e6c9',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    {isEn ? 'Complete ✓' : 'Completar ✓'}
                  </button>
                )}
              </div>
            ))}

            {selectedDayEvents.length === 0 && obtenerTareasAutomaticas(selectedDayStr).length === 0 ? (
              <p style={{ margin: '0', fontSize: '12px', color: '#888', fontStyle: 'italic', textAlign: 'center' }}>{isEn ? 'No reminders or notes recorded.' : 'No hay recordatorios ni notas registradas.'}</p>
            ) : (
              selectedDayEvents.map(ev => (
                <div
                  key={ev.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #eee',
                    borderLeft: `5px solid ${getCategoryColor(ev.categoria)}`,
                    background: ev.completado ? 'rgba(0, 0, 0, 0.02)' : '#fcfcfc',
                    fontSize: '12px',
                    opacity: ev.completado ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <input
                      type="checkbox"
                      checked={!!ev.completado}
                      onChange={() => handleToggleCompletado(ev)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                      title={ev.completado ? "Mark as pending" : "Mark as completed"}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left', minWidth: 0 }}>
                      <span style={{ fontSize: '9px', fontWeight: 'bold', color: getCategoryColor(ev.categoria), textTransform: 'uppercase' }}>
                        {getCategoryLabel(ev.categoria)}
                      </span>
                      <span style={{ 
                        color: 'var(--game-text-bright)', 
                        textDecoration: ev.completado ? 'line-through' : 'none',
                        wordBreak: 'break-word'
                      }}>{ev.texto}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      onClick={() => {
                        const dateObj = new Date(ev.fecha + 'T00:00:00');
                        const startStr = ev.fecha.replace(/-/g, '');
                        const endDate = new Date(dateObj);
                        endDate.setDate(endDate.getDate() + 1);
                        const endYear = endDate.getFullYear();
                        const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
                        const endDay = String(endDate.getDate()).padStart(2, '0');
                        const endStr = `${endYear}${endMonth}${endDay}`;
                        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(getCategoryLabel(ev.categoria) + ': ' + ev.texto)}&dates=${startStr}/${endStr}&details=${encodeURIComponent('Recordatorio creado desde Pets & Plants Oasis')}`;
                        window.open(url, '_blank');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--game-text-bright, #1976d2)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '4px'
                      }}
                      title="Add to Google Calendar"
                    >
                      📅
                    </button>
                    <button 
                      onClick={() => handleDeleteEvent(ev.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '4px'
                      }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
