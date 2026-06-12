import React, { useState, useEffect } from 'react';
import type { EventoCalendario } from '../database/types';
import { LocalDatabase } from '../database/db';
import { safeUUID } from '../utils/uuid';

interface EcosystemCalendarProps {
  onUpdate: () => void;
}

export const EcosystemCalendar: React.FC<EcosystemCalendarProps> = ({ onUpdate }) => {
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

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const list = await LocalDatabase.getEventosCalendario();
      setEventos(list);
    } catch (err) {
      console.error("Error loading calendar events:", err);
    }
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

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

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
      localStorage.setItem('petplant_db_last_updated', Date.now().toString());
      await loadEvents();
      onUpdate();
    } catch (err) {
      console.error(err);
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
    switch (cat) {
      case 'riego': return 'Riego 💧';
      case 'veterinario': return 'Veterinario 🩺';
      case 'peluqueria': return 'Peluquería ✂️';
      case 'medicacion': return 'Medicación 💊';
      case 'abono': return 'Abono 🌱';
      default: return 'Otro 📝';
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
    <div style={{
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
      {/* Calendar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: 'var(--game-text-bright)' }}>
          📅 Agenda y Calendario del Ecosistema
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

      {/* Weekdays Labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
        <span>Lu</span>
        <span>Ma</span>
        <span>Mi</span>
        <span>Ju</span>
        <span>Vi</span>
        <span>Sá</span>
        <span style={{ color: '#ef4444' }}>Do</span>
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
              {dayEvents.length > 0 && (
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
                  {dayEvents.length > 3 && <span style={{ fontSize: '7px', fontWeight: 'bold', lineHeight: '1' }}>+</span>}
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
              Notas para el día: <strong style={{ color: 'var(--game-border-color, #1976d2)' }}>{selectedDayStr}</strong>
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
                Añadir Nota ➕
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
                  <option value="riego">Riego 💧</option>
                  <option value="veterinario">Veterinario 🩺</option>
                  <option value="peluqueria">Peluquería ✂️</option>
                  <option value="medicacion">Medicación 💊</option>
                  <option value="abono">Abono 🌱</option>
                  <option value="otro">Otro 📝</option>
                </select>
                <input 
                  type="text" 
                  required
                  placeholder="Escribe el recordatorio o nota..."
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
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  style={{ padding: '4px 12px', fontSize: '11px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Guardar Note 💾
                </button>
              </div>
            </form>
          )}

          {/* Day events list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {selectedDayEvents.length === 0 ? (
              <p style={{ margin: '0', fontSize: '12px', color: '#888', fontStyle: 'italic' }}>Sin recordatorios ni notas registradas.</p>
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
                    background: '#fcfcfc',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: getCategoryColor(ev.categoria), textTransform: 'uppercase' }}>
                      {getCategoryLabel(ev.categoria)}
                    </span>
                    <span style={{ color: 'var(--game-text-bright)' }}>{ev.texto}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      onClick={() => {
                        const dateObj = new Date(ev.fecha);
                        const startStr = ev.fecha.replace(/-/g, '');
                        const endDate = new Date(dateObj);
                        endDate.setDate(endDate.getDate() + 1);
                        const endYear = endDate.getFullYear();
                        const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
                        const endDay = String(endDate.getDate()).padStart(2, '0');
                        const endStr = `${endYear}${endMonth}${endDay}`;
                        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(getCategoryLabel(ev.categoria) + ': ' + ev.texto)}&dates=${startStr}/${endStr}&details=${encodeURIComponent('Recordatorio creado desde Pet & Plant Pro')}`;
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
                      title="Añadir a Google Calendar"
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
                      title="Eliminar"
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
