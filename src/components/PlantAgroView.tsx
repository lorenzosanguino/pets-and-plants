/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import type { Planta, EntradaDiarioFoliar, CatalogoPlanta } from '../database/types';
import { LocalDatabase, CATALOGO_ASPCA } from '../database/db';
import { WeatherService } from '../services/weatherService';
import type { DatosClimaticos } from '../services/weatherService';
import { safeUUID } from '../utils/uuid';

const crearNuevaPlanta = (cat: CatalogoPlanta): Planta => {
  const current = Date.now();
  return {
    id: safeUUID(),
    nombreComun: cat.nombreComun,
    nombreCientifico: cat.nombreCientifico,
    ubicacionHabitacion: "Salón",
    tipoRiegoEspecifico: cat.tipoRiego,
    intervaloRiegoDias: 7,
    ultimaFechaRiego: new Date(current).toISOString(),
    proximaFechaRiego: new Date(current + 7 * 24 * 3600 * 1000).toISOString(),
    toxicidadFelina: cat.toxicidadFelina,
    toxicidadCanina: cat.toxicidadCanina,
    compuestosToxicos: cat.compuestosToxicos,
    grosorHoja: 'Normal',
    temperaturaZona: 22,
    diarioFoliar: []
  };
};

const crearEntradaDiario = (nota: string, estadoHoja: 'Excelente' | 'Normal' | 'Clorosis/Lesión'): EntradaDiarioFoliar => {
  return {
    id: safeUUID(),
    fecha: new Date().toISOString(),
    nota: nota,
    estadoGeneral: estadoHoja
  };
};

const calcularProximaFechaRiego = (nuevoIntervalo: number): string => {
  return new Date(Date.now() + nuevoIntervalo * 24 * 3600 * 1000).toISOString();
};

interface PlantAgroViewProps {
  plantas: Planta[];
  onUpdate: () => void;
  selectedPlantId?: string;
  setSelectedPlantId?: (id: string) => void;
  onOpenScanner?: () => void;
}

export const PlantAgroView: React.FC<PlantAgroViewProps> = ({ 
  plantas, 
  onUpdate,
  selectedPlantId: propSelectedPlantId,
  setSelectedPlantId: propSetSelectedPlantId,
  onOpenScanner
}) => {
  const theme = localStorage.getItem('petplant_game_theme') || 'adventure';

  const [localSelectedPlantId, setLocalSelectedPlantId] = useState<string>(plantas[0]?.id || '');

  const selectedPlantId = propSelectedPlantId !== undefined ? propSelectedPlantId : localSelectedPlantId;
  const setSelectedPlantId = propSetSelectedPlantId !== undefined ? propSetSelectedPlantId : setLocalSelectedPlantId;
  const [nota, setNota] = useState('');
  const [estadoHoja, setEstadoHoja] = useState<'Excelente' | 'Normal' | 'Clorosis/Lesión'>('Normal');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [temp, setTemp] = useState<number>(22);
  const [grosor, setGrosor] = useState<'Crasa' | 'Normal' | 'Delgada'>('Normal');

  const [climaGPS, setClimaGPS] = useState<DatosClimaticos | null>(null);
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [errorGPS, setErrorGPS] = useState<string | null>(null);

  const activePlant = plantas.find(p => p.id === selectedPlantId) || plantas[0];

  useEffect(() => {
    if (activePlant) {
      setTemp(activePlant.temperaturaZona || 22);
      setGrosor(activePlant.grosorHoja || 'Normal');
    }
  }, [activePlant]);

  const sincronizarRiegoPorGPS = async () => {
    if (!activePlant) return;
    setLoadingGPS(true);
    setErrorGPS(null);
    try {
      const coords = await WeatherService.getCoordenadasGPS();
      const clima = await WeatherService.obtenerClimaEnVivo(coords.latitude, coords.longitude);
      setClimaGPS(clima);

      const baseIntervalo = activePlant.intervaloRiegoBase || activePlant.intervaloRiegoDias || 7;
      const nuevoIntervalo = WeatherService.calcularIntervaloRiegoClimatico(
        baseIntervalo,
        activePlant.grosorHoja || 'Normal',
        clima
      );

      const proximaFecha = new Date(Date.now() + nuevoIntervalo * 24 * 3600 * 1000).toISOString();
      const plantaActualizada: Planta = {
        ...activePlant,
        intervaloRiegoDias: nuevoIntervalo,
        intervaloRiegoBase: baseIntervalo,
        proximaFechaRiego: proximaFecha,
        temperaturaZona: Math.round(clima.temperatura)
      };

      await LocalDatabase.savePlanta(plantaActualizada);
      onUpdate();

      // Trigger achievement
      window.dispatchEvent(new CustomEvent('petplant_achievement', {
        detail: {
          texto: `¡PLANTA SINCRONIZADA POR GPS: ${activePlant.nombreComun.toUpperCase()}!`,
          subtitulo: `Clima: ${clima.temperatura.toFixed(1)}°C, Riego: cada ${nuevoIntervalo} días.`,
          tipo: theme === 'arcade' ? 'victory' : 'lvl_up'
        }
      }));
    } catch (err: any) {
      setErrorGPS(err.message || "Fallo en la sincronización climática satelital.");
      
      const climaSimulado = await WeatherService.obtenerClimaEnVivo(40.4167, -3.7037);
      setClimaGPS(climaSimulado);
      
      const baseIntervalo = activePlant.intervaloRiegoBase || activePlant.intervaloRiegoDias || 7;
      const nuevoIntervalo = WeatherService.calcularIntervaloRiegoClimatico(
        baseIntervalo,
        activePlant.grosorHoja || 'Normal',
        climaSimulado
      );
      const proximaFecha = new Date(Date.now() + nuevoIntervalo * 24 * 3600 * 1000).toISOString();
      const plantaActualizada: Planta = {
        ...activePlant,
        intervaloRiegoDias: nuevoIntervalo,
        intervaloRiegoBase: baseIntervalo,
        proximaFechaRiego: proximaFecha,
        temperaturaZona: Math.round(climaSimulado.temperatura)
      };
      await LocalDatabase.savePlanta(plantaActualizada);
      onUpdate();
    } finally {
      setLoadingGPS(false);
    }
  };

  if (!activePlant) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--game-text, #888)',
        background: 'var(--game-card-bg, #ffffff)',
        border: 'var(--game-border, 1px solid #f0f0f0)',
        fontFamily: 'var(--game-font, sans-serif)'
      }}>
        No hay plantas registradas. Utiliza el escáner para registrar una nueva planta.
      </div>
    );
  }

  const calcularIntervaloRiego = () => {
    let base = 7; 

    if (grosor === 'Crasa') base += 5; 
    if (grosor === 'Delgada') base -= 3; 

    if (temp > 26) base -= 2; 
    if (temp < 16) base += 3; 

    return Math.max(2, base);
  };

  const nuevoIntervalo = calcularIntervaloRiego();

  const guardarAjusteEvapo = async () => {
    const proxFecha = calcularProximaFechaRiego(nuevoIntervalo);
    const plantaActualizada: Planta = {
      ...activePlant,
      grosorHoja: grosor,
      temperaturaZona: temp,
      intervaloRiegoDias: nuevoIntervalo,
      proximaFechaRiego: proxFecha
    };
    await LocalDatabase.savePlanta(plantaActualizada);
    onUpdate();

    // Trigger achievement
    window.dispatchEvent(new CustomEvent('petplant_achievement', {
      detail: {
        texto: `¡MICROCLIMA CONFIGURADO PARA ${activePlant.nombreComun.toUpperCase()}!`,
        subtitulo: `Nueva frecuencia: cada ${nuevoIntervalo} días.`,
        tipo: theme === 'arcade' ? 'victory' : 'lvl_up'
      }
    }));
  };

  const eliminarNotaFoliar = async (notaId: string) => {
    if (!activePlant) return;
    const diarioFiltrado = (activePlant.diarioFoliar || []).filter(d => d.id !== notaId);
    const plantaActualizada: Planta = {
      ...activePlant,
      diarioFoliar: diarioFiltrado
    };
    await LocalDatabase.savePlanta(plantaActualizada);
    setDeleteConfirmId(null);
    onUpdate();
  };

  const agregarNotaFoliar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nota.trim()) return;

    const nuevaEntrada = crearEntradaDiario(nota, estadoHoja);

    const plantaActualizada: Planta = {
      ...activePlant,
      diarioFoliar: [nuevaEntrada, ...activePlant.diarioFoliar]
    };

    await LocalDatabase.savePlanta(plantaActualizada);
    setNota('');
    onUpdate();

    // Trigger achievement
    window.dispatchEvent(new CustomEvent('petplant_achievement', {
      detail: {
        texto: `¡ENTRADA EN DIARIO REGISTRADA: ${activePlant.nombreComun.toUpperCase()}!`,
        subtitulo: `Estado reportado: ${estadoHoja}.`,
        tipo: theme === 'arcade' ? 'victory' : 'lvl_up'
      }
    }));
  };

  const agregarPlantaDesdeCatalogo = async (cat: CatalogoPlanta) => {
    const nuevaPlanta = crearNuevaPlanta(cat);

    await LocalDatabase.savePlanta(nuevaPlanta);
    setSelectedPlantId(nuevaPlanta.id);
    onUpdate();

    // Trigger achievement
    window.dispatchEvent(new CustomEvent('petplant_achievement', {
      detail: {
        texto: `¡NUEVO CULTIVO BOTÁNICO: ${cat.nombreComun.toUpperCase()}!`,
        subtitulo: `Se ha añadido al jardín correctamente.`,
        tipo: theme === 'arcade' ? 'victory' : 'lvl_up'
      }
    }));
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '24px',
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: 'var(--game-font, sans-serif)',
      color: 'var(--game-text, #333)'
    }}>
      {/* Columna Izquierda: Ficha, Calculadora e Historial */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Selector de Planta */}
        <div style={{
          background: 'var(--game-card-bg, #fff)',
          padding: '16px',
          borderRadius: theme === 'arcade' ? '0px' : '16px',
          border: 'var(--game-border, 1px solid #f0f0f0)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--game-text-bright, #444)' }}>Planta Activa:</label>
          <select 
            value={selectedPlantId} 
            onChange={(e) => setSelectedPlantId(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'var(--game-border, 1px solid #eaeaea)',
              borderRadius: theme === 'arcade' ? '0px' : '8px',
              background: 'var(--game-bg, #fafafa)',
              color: 'var(--game-text-bright, #333)',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'var(--game-font, sans-serif)'
            }}
          >
            {plantas.map(p => (
              <option key={p.id} value={p.id} style={{ background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
                {p.nombreComun} ({p.ubicacionHabitacion})
              </option>
            ))}
          </select>
        </div>

        {/* Ficha Agronómica */}
        <div style={{
          background: 'var(--game-card-bg, #fff)',
          padding: '20px',
          borderRadius: theme === 'arcade' ? '0px' : '16px',
          border: 'var(--game-border, 1px solid #f0f0f0)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: theme === 'arcade' ? '0px' : '50%',
              background: theme === 'terminal' ? 'transparent' : 'var(--game-accent-light, #e8f5e9)',
              border: theme === 'terminal' ? '1px solid #33ff33' : 'var(--game-border, none)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px'
            }}>
              🌿
            </div>
            <div>
              <h3 style={{ margin: '0', fontSize: '18px', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)' }}>{activePlant.nombreComun}</h3>
              <span style={{ fontSize: '12px', color: 'var(--game-text, #888)', fontStyle: 'italic', fontFamily: 'var(--game-font, sans-serif)' }}>
                {activePlant.nombreCientifico || 'No taxonomy registered'}
              </span>
            </div>
          </div>

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
              borderRadius: theme === 'arcade' ? '0px' : '8px',
              background: theme === 'terminal' ? 'transparent' : (activePlant.toxicidadFelina === 'Segura' ? 'rgba(76, 175, 80, 0.12)' : 'rgba(244, 67, 54, 0.12)'),
              border: theme === 'terminal' 
                ? '1px solid #33ff33' 
                : `1.5px solid ${activePlant.toxicidadFelina === 'Segura' ? '#4caf50' : '#f44336'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxSizing: 'border-box'
            }}>
              <p style={{ margin: 0, fontWeight: 'bold', color: activePlant.toxicidadFelina === 'Segura' ? '#4caf50' : '#f44336', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🐈 Felinos: {activePlant.toxicidadFelina === 'Segura' ? 'Segura' : activePlant.toxicidadFelina === 'Tóxica leve (irritante)' ? 'Tóxica Leve' : 'Muy Tóxica'}
              </p>
              <span style={{ color: 'var(--game-text, #555)', fontSize: '10.5px', lineHeight: '1.3' }}>
                {activePlant.toxicidadFelina === 'Segura' 
                  ? 'Plant safe for domestic cats.' 
                  : `Compuesto: ${activePlant.compuestosToxicos || 'Oxalatos insolubles'}.`}
              </span>
            </div>

            {/* Seguridad Canina */}
            {(() => {
              const toxCanina = activePlant.toxicidadCanina || activePlant.toxicidadFelina || 'Segura';
              return (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: theme === 'arcade' ? '0px' : '8px',
                  background: theme === 'terminal' ? 'transparent' : (toxCanina === 'Segura' ? 'rgba(76, 175, 80, 0.12)' : 'rgba(244, 67, 54, 0.12)'),
                  border: theme === 'terminal' 
                    ? '1px solid #33ff33' 
                    : `1.5px solid ${toxCanina === 'Segura' ? '#4caf50' : '#f44336'}`,
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
                      ? 'Plant safe for domestic dogs.' 
                      : `Compuesto: ${activePlant.compuestosToxicos || 'Oxalatos insolubles'}.`}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Calculadora Agronómica de Evapotranspiración */}
          <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--game-text-bright, #333)', fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)' }}>
              Evapotranspiration and Irrigation Calculator
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--game-text, #666)' }}>Tipo de Hoja:</span>
                <select 
                  value={grosor} 
                  onChange={(e) => setGrosor(e.target.value as 'Crasa' | 'Normal' | 'Delgada')}
                  style={{
                    padding: '4px 8px',
                    border: 'var(--game-border, 1px solid #eaeaea)',
                    borderRadius: theme === 'arcade' ? '0px' : '4px',
                    fontSize: '12px',
                    background: 'var(--game-bg, #fafafa)',
                    color: 'var(--game-text-bright, #333)',
                    fontFamily: 'var(--game-font, sans-serif)',
                    outline: 'none'
                  }}
                >
                  <option value="Crasa" style={{ background: 'var(--game-card-bg)' }}>Crasa (Suculenta)</option>
                  <option value="Normal" style={{ background: 'var(--game-card-bg)' }}>Normal</option>
                  <option value="Delgada" style={{ background: 'var(--game-card-bg)' }}>Delgada (Fina)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--game-text, #666)' }}>Temperatura Ambiente:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="range" 
                    min="10" 
                    max="35" 
                    value={temp} 
                    onChange={(e) => setTemp(parseInt(e.target.value))}
                    style={{ width: '80px', accentColor: 'var(--game-accent-color)' }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text-bright)' }}>{temp}°C</span>
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--game-bg, #f5f5f5)',
              border: 'var(--game-border, none)',
              padding: '10px 14px',
              borderRadius: theme === 'arcade' ? '0px' : '8px',
              marginBottom: '10px'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--game-text, #555)' }}>Frecuencia de Riego Proyectada</span>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--game-text, #888)' }}>Evapotranspiration by leaf physics</p>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--game-text-bright, #4caf50)' }}>Every {nuevoIntervalo} days</span>
            </div>

            <button 
              onClick={guardarAjusteEvapo}
              style={{
                width: '100%',
                padding: '10px',
                background: theme === 'terminal' ? 'transparent' : 'var(--game-accent, #4caf50)',
                color: theme === 'terminal' ? '#33ff33' : theme === 'adventure' ? '#000000' : '#fff',
                border: 'var(--game-border, none)',
                borderRadius: theme === 'arcade' ? '0px' : '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'var(--game-font, sans-serif)'
              }}
            >
              {theme === 'terminal' ? 'APLICAR CÁLCULOS >' : theme === 'arcade' ? 'APPLY STATS' : 'Apply Dynamic Watering Frequency'}
            </button>
          </div>

          {/* Panel de Geolocalización y Climatología Satelital en Vivo */}
          <div style={{
            marginTop: '12px',
            borderTop: 'var(--game-border, 1px solid #f0f0f0)',
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: '0', fontSize: '13px', color: 'var(--game-text-bright, #2e7d32)', fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)' }}>
                🌍 Satellite Climatology and GPS Irrigation
              </h4>
              <span style={{
                fontSize: '10px',
                background: 'var(--game-accent-light, #e8f5e9)',
                color: 'var(--game-text-bright, #2e7d32)',
                border: 'var(--game-border, none)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontFamily: 'var(--game-font, sans-serif)'
              }}>
                Auto
              </span>
            </div>
            <p style={{ margin: '0', fontSize: '11px', color: 'var(--game-text, #666)', lineHeight: '1.4', fontFamily: 'var(--game-font, sans-serif)' }}>
              Calculate the optimal watering frequency using your exact location and live Open-Meteo satellite sensors.
            </p>

            {climaGPS && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                background: 'var(--game-bg, #f9f9f9)',
                borderRadius: theme === 'arcade' ? '0px' : '8px',
                padding: '10px',
                border: 'var(--game-border, 1px solid #eaeaea)',
                fontSize: '11px',
                color: 'var(--game-text-bright, #333)',
                fontFamily: 'var(--game-font, monospace)'
              }}>
                <div>📍 <strong>GPS:</strong> {climaGPS.latitud.toFixed(2)}, {climaGPS.longitud.toFixed(2)}</div>
                <div>🌡️ <strong>Temp:</strong> {climaGPS.temperatura.toFixed(1)}°C</div>
                <div>💧 <strong>Humidity:</strong> {climaGPS.humedad}% RH</div>
                <div>📅 <strong>Season:</strong> {climaGPS.estacion === 'Verano' ? 'Summer' : climaGPS.estacion === 'Invierno' ? 'Winter' : 'Spring/Autumn'}</div>
              </div>
            )}

            {errorGPS && (
              <div style={{
                fontSize: '11px',
                color: '#c62828',
                background: 'var(--game-accent-light, #ffebee)',
                padding: '8px',
                borderRadius: theme === 'arcade' ? '0px' : '8px',
                border: 'var(--game-border, 1px solid #ffcdd2)',
                fontFamily: 'var(--game-font, sans-serif)'
              }}>
                ⚠️ Fallback Active: {errorGPS} (Seasonal simulation)
              </div>
            )}

            <button
              type="button"
              onClick={sincronizarRiegoPorGPS}
              disabled={loadingGPS}
              style={{
                width: '100%',
                padding: '10px',
                background: theme === 'terminal' ? 'transparent' : 'var(--game-accent, #2e7d32)',
                color: theme === 'terminal' ? '#33ff33' : theme === 'adventure' ? '#000000' : '#ffffff',
                border: 'var(--game-border, none)',
                borderRadius: theme === 'arcade' ? '0px' : '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: theme === 'terminal' ? 'none' : '0 4px 10px rgba(46, 125, 50, 0.15)',
                opacity: loadingGPS ? 0.6 : 1,
                transition: 'transform 0.2s, background-color 0.2s',
                fontFamily: 'var(--game-font, sans-serif)'
              }}
            >
              {loadingGPS ? 'Consulting Climate Satellites...' : 'Sync and Adjust by GPS 🛰️'}
            </button>
          </div>

        </div>

      </div>

      {/* Columna Derecha: Diario Foliar y Catálogo ASPCA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Diario de Crecimiento Foliar */}
        <div style={{
          background: 'var(--game-card-bg, #fff)',
          padding: '20px',
          borderRadius: theme === 'arcade' ? '0px' : '16px',
          border: 'var(--game-border, 1px solid #f0f0f0)'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            color: 'var(--game-text-bright, #333)',
            borderBottom: 'var(--game-border, 1px solid #f0f0f0)',
            paddingBottom: '8px',
            fontFamily: 'var(--game-font, sans-serif)'
          }}>
            Diario de Crecimiento y Estado Foliar
          </h3>

          <form onSubmit={agregarNotaFoliar} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select 
                value={estadoHoja} 
                onChange={(e) => setEstadoHoja(e.target.value as 'Excelente' | 'Normal' | 'Clorosis/Lesión')}
                style={{
                  padding: '6px',
                  border: 'var(--game-border, 1px solid #eaeaea)',
                  borderRadius: theme === 'arcade' ? '0px' : '6px',
                  fontSize: '12px',
                  background: 'var(--game-bg, #fafafa)',
                  color: 'var(--game-text-bright, #333)',
                  fontFamily: 'var(--game-font, sans-serif)',
                  outline: 'none'
                }}
              >
                <option value="Excelente" style={{ background: 'var(--game-card-bg)' }}>Excelente</option>
                <option value="Normal" style={{ background: 'var(--game-card-bg)' }}>Normal</option>
                <option value="Clorosis/Lesión" style={{ background: 'var(--game-card-bg)' }}>Chlorosis/Lesion</option>
              </select>
              <input
                type="text"
                placeholder="Add pruning, fertilizer, sprout note..."
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '8px 12px',
                  background: 'var(--game-bg, #ffffff)',
                  color: 'var(--game-text-bright, #333)',
                  border: 'var(--game-border, 1px solid #eaeaea)',
                  borderRadius: theme === 'arcade' ? '0px' : '6px',
                  fontSize: '13px',
                  fontFamily: 'var(--game-font, sans-serif)',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                type="submit"
                style={{
                  padding: '8px',
                  width: '100%',
                  background: theme === 'terminal' ? 'transparent' : 'var(--game-accent, #1a1a1a)',
                  color: theme === 'terminal' ? '#33ff33' : theme === 'adventure' ? '#000000' : '#fff',
                  border: 'var(--game-border, none)',
                  borderRadius: theme === 'arcade' ? '0px' : '6px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: 'var(--game-font, sans-serif)'
                }}
              >
                {theme === 'terminal' ? 'GUARDAR ENTRADA >' : theme === 'arcade' ? 'SAVE DIARY' : 'Guardar Entrada de Diario'}
              </button>
              {onOpenScanner && (
                <button
                  type="button"
                  onClick={onOpenScanner}
                  style={{
                    padding: '8px',
                    background: 'var(--game-accent-light, rgba(46, 125, 50, 0.1))',
                    color: 'var(--game-text-bright, #2e7d32)',
                    border: '1.5px solid var(--game-border-color, #2e7d32)',
                    borderRadius: theme === 'arcade' ? '0px' : '6px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontFamily: 'var(--game-font, sans-serif)',
                    transition: 'transform 0.2s'
                  }}
                >
                  Analizar Enfermedad Foliar por IA 🍂 📷
                </button>
              )}
            </div>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
            {(activePlant.diarioFoliar || []).map(d => (
              <div key={d.id} style={{
                padding: '8px 12px',
                borderLeft: `4px solid ${d.estadoGeneral === 'Excelente' ? '#4caf50' : d.estadoGeneral === 'Normal' ? '#2196f3' : '#f44336'}`,
                background: 'var(--game-accent-light, #fcfcfc)',
                borderBottom: theme === 'terminal' ? '1px dashed rgba(51, 255, 51, 0.3)' : 'none',
                fontSize: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--game-text, #888)', marginBottom: '4px', fontSize: '10px', fontFamily: 'var(--game-font, monospace)', alignItems: 'center' }}>
                  <span>ESTADO: {d.estadoGeneral.toUpperCase()} • {new Date(d.fecha).toLocaleDateString()}</span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {deleteConfirmId === d.id ? (
                      <>
                        <button 
                          type="button"
                          onClick={() => eliminarNotaFoliar(d.id)}
                          style={{ background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '3px', padding: '1px 5px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'var(--game-font, sans-serif)' }}
                        >
                          Sure?
                        </button>
                        <button 
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          style={{ background: '#ccc', color: '#333', border: 'none', borderRadius: '3px', padding: '1px 3px', fontSize: '9px', cursor: 'pointer', fontFamily: 'var(--game-font, sans-serif)' }}
                        >
                          X
                        </button>
                      </>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => setDeleteConfirmId(d.id)}
                        style={{ background: 'transparent', color: 'var(--game-text, #888)', border: 'none', fontSize: '11px', cursor: 'pointer', padding: '0 4px' }}
                        title="Eliminar entrada"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
                <span style={{ color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)' }}>{d.nota}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Catálogo Offline ASPCA */}
        <div style={{
          background: 'var(--game-card-bg, #fff)',
          padding: '20px',
          borderRadius: theme === 'arcade' ? '0px' : '16px',
          border: 'var(--game-border, 1px solid #f0f0f0)'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            color: 'var(--game-text-bright, #333)',
            borderBottom: 'var(--game-border, 1px solid #f0f0f0)',
            paddingBottom: '8px',
            fontFamily: 'var(--game-font, sans-serif)'
          }}>
            ASPCA Plant Catalog and Adoptions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
            {CATALOGO_ASPCA.map(cat => (
              <div key={cat.id} style={{
                padding: '10px',
                border: 'var(--game-border, 1px solid #f0f0f0)',
                borderRadius: theme === 'arcade' ? '0px' : '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ maxWidth: '75%' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)' }}>{cat.nombreComun}</span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: 'var(--game-text, #888)', fontStyle: 'italic', fontFamily: 'var(--game-font, sans-serif)' }}>{cat.nombreCientifico}</p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: cat.toxicidadFelina === 'Segura' ? '#4caf50' : '#f44336', fontFamily: 'var(--game-font, sans-serif)' }}>
                      🐈 {cat.toxicidadFelina === 'Segura' ? 'SAFE' : 'TOXIC'}
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: cat.toxicidadCanina === 'Segura' ? '#4caf50' : '#f44336', fontFamily: 'var(--game-font, sans-serif)' }}>
                      🐕 {cat.toxicidadCanina === 'Segura' ? 'SAFE' : 'TOXIC'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => agregarPlantaDesdeCatalogo(cat)}
                  style={{
                    padding: '6px 10px',
                    background: cat.toxicidadFelina === 'Segura' 
                      ? (theme === 'terminal' ? 'transparent' : 'var(--game-accent, #4caf50)') 
                      : (theme === 'terminal' ? 'transparent' : 'var(--game-accent-light, #eceff1)'),
                    color: cat.toxicidadFelina === 'Segura' 
                      ? (theme === 'terminal' ? '#33ff33' : theme === 'adventure' ? '#000000' : '#fff') 
                      : 'var(--game-text, #37474f)',
                    border: 'var(--game-border, none)',
                    borderRadius: theme === 'arcade' ? '0px' : '6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontFamily: 'var(--game-font, sans-serif)'
                  }}
                >
                  {theme === 'terminal' ? 'ADOPT >' : theme === 'arcade' ? 'ADD LVL' : 'Adoptar'}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
