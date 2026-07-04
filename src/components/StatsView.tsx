import React from 'react';
import type { Mascota, Planta } from '../database/types';

interface StatsViewProps {
  mascotas: Mascota[];
  plantas: Planta[];
  clima?: any;
  uiTheme: 'gaming' | 'nature' | 'kawaii';
}

export const StatsView: React.FC<StatsViewProps> = ({
  mascotas = [],
  plantas = [],
  clima,
  uiTheme: _uiTheme
}) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Helper to calculate climate-adjusted remaining days (identical to PlantCard)
  const calcularDiasRestantesRiego = (planta: Planta) => {
    if (!planta.proximaFechaRiego) return 999;
    const proximo = new Date(planta.proximaFechaRiego).getTime();
    if (isNaN(proximo)) return 999;
    const hoyMs = new Date().getTime();
    const diferenciaMs = proximo - hoyMs;
    const diasBase = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));

    if (clima) {
      const temp = clima.temperatura;
      const hum = clima.humedad;
      
      let factor = 1.0;
      if (temp > 28) {
        const reduccion = Math.min(0.4, ((temp - 28) / 12) * 0.4);
        factor -= reduccion;
      } else if (temp < 15) {
        const incremento = Math.min(0.5, ((15 - temp) / 15) * 0.5);
        factor += incremento;
      }
      
      if (hum < 35) {
        factor -= 0.15;
      } else if (hum > 75) {
        factor += 0.20;
      }
      
      factor = Math.max(0.5, Math.min(1.7, factor));
      const baseIntervalo = planta.intervaloRiegoBase || planta.intervaloRiegoDias || 7;
      const intervaloAjustado = Math.max(2, Math.round(baseIntervalo * factor));

      if (planta.ultimaFechaRiego) {
        const ultima = new Date(planta.ultimaFechaRiego).getTime();
        const proximoAjustado = ultima + (intervaloAjustado * 24 * 3600 * 1000);
        return Math.ceil((proximoAjustado - hoyMs) / (1000 * 60 * 60 * 24));
      } else {
        const factorAjuste = baseIntervalo > 0 ? (intervaloAjustado / baseIntervalo) : 1;
        return Math.max(0, Math.round(diasBase * factorAjuste));
      }
    }
    return diasBase;
  };

  // 1. Próximos Riegos (próximos 7 días)
  const proximosRiegos = plantas
    .map(p => {
      const diffDays = calcularDiasRestantesRiego(p);
      return {
        id: p.id,
        nombre: p.nombreComun,
        tipoRiego: p.tipoRiegoEspecifico || 'Agua del grifo reposada',
        dias: diffDays,
        fecha: p.proximaFechaRiego ? p.proximaFechaRiego.split('T')[0] : ''
      };
    })
    .filter(r => r.dias !== 999 && r.dias <= 7) // Incluir todos los riegos pendientes (hoy o vencidos) y futuros hasta 7 días
    .sort((a, b) => a.dias - b.dias);

  // 2. Próximas Vacunas (próximos 30 días)
  const proximasVacunas = mascotas
    .flatMap(m => {
      const vacunas = m.historialVacunas || [];
      return vacunas
        .filter(v => {
          if (!v.proximaDosis) return false;
          const fVacuna = new Date(v.proximaDosis);
          fVacuna.setHours(0, 0, 0, 0);
          const diffTime = fVacuna.getTime() - hoy.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays >= -7 && diffDays <= 30; // Incluir vencidos recientes
        })
        .map(v => {
          const fVacuna = new Date(v.proximaDosis!);
          fVacuna.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((fVacuna.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
          return {
            mascotaId: m.id,
            mascotaNombre: m.nombre,
            vacunaNombre: v.vacuna === 'Otras' ? (v.vacunaPersonalizada || 'Vacuna Especial') : v.vacuna,
            dias: diffDays,
            fecha: v.proximaDosis!.split('T')[0]
          };
        });
    })
    .sort((a, b) => a.dias - b.dias);

  // 2.5. Medicación Pendiente Hoy / Atrasada (próximas 24 horas)
  const medicamentosAlertas = mascotas
    .flatMap(m => {
      const meds = m.medicamentos || [];
      return meds
        .filter(med => {
          if (!med.activo || !med.proximaDosis) return false;
          const fDosis = new Date(med.proximaDosis);
          const diffTime = fDosis.getTime() - new Date().getTime();
          const diffHours = diffTime / (1000 * 60 * 60);
          return diffHours <= 24; // Vencidas o próximas 24 horas
        })
        .map(med => {
          const fDosis = new Date(med.proximaDosis!);
          const diffTime = fDosis.getTime() - new Date().getTime();
          const diffMinutes = Math.round(diffTime / 60000);
          
          return {
            mascotaId: m.id,
            mascotaNombre: m.nombre,
            medId: med.id,
            nombre: med.nombre,
            dosis: med.dosis,
            frecuencia: med.frecuencia,
            minutos: diffMinutes,
            fecha: med.proximaDosis!
          };
        });
    })
    .sort((a, b) => a.minutos - b.minutos);

  // 3. Alertas de Toxicidad Cruzada
  const tieneFelino = mascotas.some(m => m.especie === 'Felino');
  const tieneCanino = mascotas.some(m => m.especie === 'Canino');
  
  const plantasToxicas = plantas.filter(p => {
    const felinoPeligro = tieneFelino && p.toxicidadFelina && p.toxicidadFelina !== 'Segura';
    const caninoPeligro = tieneCanino && p.toxicidadCanina && p.toxicidadCanina !== 'Segura';
    return felinoPeligro || caninoPeligro;
  });

  // 4. Tendencia de Peso
  const obtenerTendencia = (registro: { fecha: string; pesoKg?: number; pesoG?: number; alturaCm?: number; peso?: number }[] = []) => {
    if (registro.length < 2) return null;
    // Ordenar de más antiguo a más reciente
    const regOrdenado = [...registro].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    const ultimo = regOrdenado[regOrdenado.length - 1];
    const penultimo = regOrdenado[regOrdenado.length - 2];
    
    // Obtener valor (soportar pesoKg o pesoG o alturaCm)
    const valUltimo = 'pesoKg' in ultimo ? (ultimo as any).pesoKg : ('alturaCm' in ultimo ? (ultimo as any).alturaCm : 0);
    const valPenultimo = 'pesoKg' in penultimo ? (penultimo as any).pesoKg : ('alturaCm' in penultimo ? (penultimo as any).alturaCm : 0);
    
    if (valUltimo > valPenultimo) return { dir: 'up', emoji: '↑', texto: 'rising', color: '#4caf50' };
    if (valUltimo < valPenultimo) return { dir: 'down', emoji: '↓', texto: 'falling', color: '#ff5722' };
    return { dir: 'stable', emoji: '→', texto: 'stable', color: '#9e9e9e' };
  };

  const tendenciasMascotas = mascotas
    .map(m => {
      const tend = obtenerTendencia(m.registroPeso);
      if (!tend) return null;
      const ultimo = [...m.registroPeso].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()).pop();
      return {
        nombre: m.nombre,
        emoji: '🐾',
        tipo: 'Mascota',
        tendencia: tend,
        ultimoValor: `${ultimo?.pesoKg} kg`
      };
    })
    .filter(Boolean) as { nombre: string; emoji: string; tipo: string; tendencia: any; ultimoValor: string }[];



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', paddingBottom: '30px' }}>
      
      {/* 1. COUNTERS ROW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '16px',
        width: '100%'
      }}>
        <div style={{
          background: 'var(--game-card-bg)',
          border: 'var(--game-border)',
          borderRadius: 'var(--game-radius)',
          boxShadow: 'var(--game-shadow)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          transition: 'transform 0.2s',
        }}>
          <span style={{ fontSize: '28px' }}>🐾</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--game-accent)' }}>{mascotas.length}</span>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text)', opacity: 0.8 }}>Pets</span>
        </div>

        <div style={{
          background: 'var(--game-card-bg)',
          border: 'var(--game-border)',
          borderRadius: 'var(--game-radius)',
          boxShadow: 'var(--game-shadow)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          transition: 'transform 0.2s',
        }}>
          <span style={{ fontSize: '28px' }}>🌿</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--game-accent)' }}>{plantas.length}</span>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text)', opacity: 0.8 }}>Plants</span>
        </div>


      </div>

      {/* GRID DE ESTADÍSTICAS Y ALERTAS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        width: '100%'
      }}>

        {/* COLUMNA 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Próximos Riegos */}
          <div style={{
            background: 'var(--game-card-bg)',
            border: 'var(--game-border)',
            borderRadius: 'var(--game-radius)',
            boxShadow: 'var(--game-shadow)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--game-text-bright, #111)', borderBottom: '1px solid var(--game-border-color, #e0e0e0)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💧</span> Upcoming Waterings
            </h3>
            {proximosRiegos.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--game-text)', opacity: 0.7 }}>No waterings pending in the next 7 days.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {proximosRiegos.map(r => {
                  const isOverdue = r.dias < 0;
                  const label = r.dias === 0 ? 'Today' : r.dias === 1 ? 'Tomorrow' : isOverdue ? `${Math.abs(r.dias)} days ago` : `In ${r.dias} days`;
                  return (
                    <div key={r.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.02)',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--game-text-bright, #111)' }}>{r.nombre}</span>
                        <span style={{ fontSize: '11px', color: 'var(--game-text)', opacity: 0.7 }}>{r.tipoRiego}</span>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: isOverdue ? '#ffebee' : r.dias === 0 ? '#e3f2fd' : 'rgba(0,0,0,0.05)',
                        color: isOverdue ? '#c62828' : r.dias === 0 ? '#1565c0' : 'var(--game-text)'
                      }}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Alertas de Medicación */}
          <div style={{
            background: 'var(--game-card-bg)',
            border: 'var(--game-border)',
            borderRadius: 'var(--game-radius)',
            boxShadow: 'var(--game-shadow)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--game-text-bright, #111)', borderBottom: '1px solid var(--game-border-color, #e0e0e0)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💊</span> Pending Medication (24h)
            </h3>
            {medicamentosAlertas.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--game-text)', opacity: 0.7 }}>No doses pending for today.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {medicamentosAlertas.map((med, idx) => {
                  const isOverdue = med.minutos < 0;
                  let label = '';
                  if (isOverdue) {
                    const absMin = Math.abs(med.minutos);
                    if (absMin < 60) {
                      label = `Overdue ${absMin}m`;
                    } else {
                      label = `Overdue ${Math.round(absMin / 60)}h`;
                    }
                  } else {
                    if (med.minutos < 60) {
                      label = `In ${med.minutos}m`;
                    } else {
                      label = `In ${Math.round(med.minutos / 60)}h`;
                    }
                  }
                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.02)',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--game-text-bright, #111)' }}>{med.mascotaNombre}</span>
                        <span style={{ fontSize: '11px', color: 'var(--game-text)', opacity: 0.8 }}>{med.nombre} ({med.dosis}) - {med.frecuencia}</span>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: isOverdue ? '#ffebee' : '#e3f2fd',
                        color: isOverdue ? '#c62828' : '#1565c0'
                      }}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Próximas Vacunas/Citas */}
          <div style={{
            background: 'var(--game-card-bg)',
            border: 'var(--game-border)',
            borderRadius: 'var(--game-radius)',
            boxShadow: 'var(--game-shadow)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--game-text-bright, #111)', borderBottom: '1px solid var(--game-border-color, #e0e0e0)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💉</span> Vaccines & Checkups (30d)
            </h3>
            {proximasVacunas.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--game-text)', opacity: 0.7 }}>No vaccines or checkups pending in the next 30 days.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {proximasVacunas.map((v, idx) => {
                  const isOverdue = v.dias < 0;
                  const label = v.dias === 0 ? 'Today' : v.dias === 1 ? 'Tomorrow' : isOverdue ? `${Math.abs(v.dias)} days ago` : `In ${v.dias} days`;
                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.02)',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--game-text-bright, #111)' }}>{v.mascotaNombre}</span>
                        <span style={{ fontSize: '11px', color: 'var(--game-text)', opacity: 0.8 }}>{v.vacunaNombre}</span>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: isOverdue ? '#ffebee' : v.dias === 0 ? '#e3f2fd' : 'rgba(0,0,0,0.05)',
                        color: isOverdue ? '#c62828' : v.dias === 0 ? '#1565c0' : 'var(--game-text)'
                      }}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* COLUMNA 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Alertas de Toxicidad Cruzada */}
          <div style={{
            background: 'var(--game-card-bg)',
            border: 'var(--game-border)',
            borderRadius: 'var(--game-radius)',
            boxShadow: 'var(--game-shadow)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--game-text-bright, #111)', borderBottom: '1px solid var(--game-border-color, #e0e0e0)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span> Cohabitation & Cross-Toxicity
            </h3>
            {!tieneFelino && !tieneCanino ? (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--game-text)', opacity: 0.7 }}>Add dogs or cats to check cross-toxicity with your plants.</p>
            ) : plantasToxicas.length === 0 ? (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: '#e8f5e9',
                border: '1px solid #c8e6c9',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '18px' }}>✅</span>
                <span style={{ fontSize: '12.5px', color: '#2e7d32', fontWeight: 'bold' }}>🏡 Safe home! None of the plants in your home are toxic to your pets.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#fff3e0',
                  border: '1px solid #ffe0b2',
                  fontSize: '11px',
                  color: '#e65100',
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}>
                  ⚠️ We detected potentially dangerous plants for your animals:
                </div>
                {plantasToxicas.map(p => {
                  const esFelinoTox = tieneFelino && p.toxicidadFelina && p.toxicidadFelina !== 'Segura';
                  const esCaninoTox = tieneCanino && p.toxicidadCanina && p.toxicidadCanina !== 'Segura';
                  return (
                    <div key={p.id} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 82, 82, 0.04)',
                      border: '1px solid rgba(255, 82, 82, 0.15)'
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--game-text-bright, #111)' }}>{p.nombreComun} ({p.nombreCientifico || 'S/C'})</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                        {esFelinoTox && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: p.toxicidadFelina.includes('Altamente') ? '#ffebee' : '#fff3e0',
                            color: p.toxicidadFelina.includes('Altamente') ? '#c62828' : '#e65100'
                          }}>
                            🐱 Felinos: {p.toxicidadFelina}
                          </span>
                        )}
                        {esCaninoTox && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: p.toxicidadCanina?.includes('Altamente') ? '#ffebee' : '#fff3e0',
                            color: p.toxicidadCanina?.includes('Altamente') ? '#c62828' : '#e65100'
                          }}>
                            🐶 Caninos: {p.toxicidadCanina}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tendencia de Peso */}
          <div style={{
            background: 'var(--game-card-bg)',
            border: 'var(--game-border)',
            borderRadius: 'var(--game-radius)',
            boxShadow: 'var(--game-shadow)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--game-text-bright, #111)', borderBottom: '1px solid var(--game-border-color, #e0e0e0)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚖️</span> Weight Curves & Trends
            </h3>
            {tendenciasMascotas.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--game-text)', opacity: 0.7 }}>Add at least 2 weight records for your pets to analyze the trend.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tendenciasMascotas.map((t, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.02)',
                    border: '1px solid rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{t.emoji}</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--game-text-bright, #111)' }}>{t.nombre}</span>
                        <span style={{ fontSize: '11px', color: 'var(--game-text)', opacity: 0.7 }}>Last weight: {t.ultimoValor}</span>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: t.tendencia.dir === 'up' ? '#e8f5e9' : t.tendencia.dir === 'down' ? '#fbe9e7' : '#f5f5f5',
                      color: t.tendencia.color,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>{t.tendencia.emoji}</span> {t.tendencia.texto}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>



        </div>

      </div>
    </div>
  );
};
