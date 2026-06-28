/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef, lazy } from 'react';
import type { Planta, NivelToxicidadFelina, NivelToxicidadCanina } from '../database/types';
import { LocalDatabase } from '../database/db';
import { safeUUID } from '../utils/uuid';
import { CardPhotoManager } from './CardPhotoManager';
import { IAQuotaManager } from '../utils/iaQuota';
import { ImageLightbox } from './ImageLightbox';
import { ReportGeneratorModal } from './ReportGeneratorModal';
const BiometricChart = lazy(() => import('./BiometricChart').then(m => ({ default: m.BiometricChart })));
import { GeminiAPIService } from '../services/geminiAPI';
import { TTSButton } from '../utils/useTTS';
import { useTranslations } from '../utils/i18n';
import { playSoundWater } from '../utils/audioFeedback';
interface PlantCardProps {
  planta: Planta;
  clima?: any;
  onUpdate: () => void;
  onOpenScanner?: (mode: 'enfermedad_planta', assetId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  theme?: string;
}

const PlantCardComponent: React.FC<PlantCardProps> = ({ planta, clima, onUpdate, onOpenScanner, isExpanded, onToggleExpand, theme: propTheme }) => {
  const { locale } = useTranslations();
  const cuota = IAQuotaManager.obtenerEstadoCuota();
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = isExpanded !== undefined ? isExpanded : localExpanded;
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, {
      rootMargin: '100px',
      threshold: 0.01
    });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // Chef Nutricional para Plantas
  const [showChefModal, setShowChefModal] = useState(false);
  const [chefLoading, setChefLoading] = useState(false);
  const [chefRecipe, setChefRecipe] = useState<{ receta: string; advertencia?: string } | null>(null);

  const runChefIA = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setChefLoading(true);
    setChefRecipe(null);
    setShowChefModal(true);

    const promptText = locale === 'en'
      ? `Act as an expert agronomist in botany and plant nutrition. Design a detailed fertilization and nutritional care plan for the following plant:
Common name: ${planta.nombreComun}
Scientific name: ${planta.nombreCientifico || 'Not specified'}
Location/Room: ${planta.ubicacionHabitacion}
Current watering interval: every ${planta.intervaloRiegoDias} days
Substrate: ${planta.grosorHoja ? `Leaves of type ${planta.grosorHoja}` : ''}
Typical temperature: ${planta.temperaturaZona || 22}°C
Water type: ${planta.tipoRiegoEspecifico || 'Rested tap water'}

Explain in English what type of fertilizer/nutrients is needed (necessary macro and micronutrients), how often depending on the season of the year, and special substrate/watering advice.
IMPORTANT: Be very brief, concise, and direct. Structure the response in short bullet points, omitting long introductions or comments to speed up the response.`
      : `Actúa como agrónomo experto en botánica y nutrición vegetal. Diseña un plan de abonado y cuidado nutricional detallado para la siguiente planta:
Nombre común: ${planta.nombreComun}
Nombre científico: ${planta.nombreCientifico || 'No especificado'}
Ubicación/Habitación: ${planta.ubicacionHabitacion}
Intervalo de riego actual: cada ${planta.intervaloRiegoDias} días
Sustrato: ${planta.grosorHoja ? `Hojas de tipo ${planta.grosorHoja}` : ''}
Temperatura típica: ${planta.temperaturaZona || 22}°C
Tipo de riego: ${planta.tipoRiegoEspecifico || 'Agua del grifo reposada'}

Explica en español qué tipo de abono/nutrientes necesita (macro y micronutrientes necesarios), con qué frecuencia según la época del año, y consejos especiales de sustrato/riego.
IMPORTANTE: Sé muy breve, conciso y directo. Estructura la respuesta en puntos cortos, omitiendo introducciones o comentarios largos para acelerar la respuesta.`;

    try {
      const res = await GeminiAPIService.analizarImagen(null, 'agronomo', promptText);
      setChefRecipe({
        receta: res.diagnostico + (res.tratamiento ? (locale === 'en' ? `\n\nAdditional recommendations:\n${res.tratamiento}` : `\n\nRecomendaciones adicionales:\n${res.tratamiento}`) : ''),
        advertencia: res.advertencia
      });
    } catch {
      setChefRecipe({
        receta: locale === 'en'
          ? `[Offline Mode - Estimated Guide for ${planta.nombreComun}]\n\nPlease consult a specialist or add your Gemini API key in Settings to get specific recommendations by AI.`
          : `[Modo Offline - Guía estimada para ${planta.nombreComun}]\n\nPor favor, consulta a un especialista o añade tu clave API de Gemini en Ajustes para obtener recomendaciones específicas por IA.`,
        advertencia: locale === 'en'
          ? 'Enable internet connection or enter your API Key in Settings to get detailed AI recommendations.'
          : 'Activa la conexión o introduce tu API Key en Ajustes para obtener recomendaciones detalladas por IA.'
      });
    } finally {
      setChefLoading(false);
    }
  };

  // Luxometer states
  const [showLuxmeter, setShowLuxmeter] = useState(false);
  const [nuevoCrecimiento, setNuevoCrecimiento] = useState('');

  const registrarCrecimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    const alturaCm = parseFloat(nuevoCrecimiento);
    if (isNaN(alturaCm) || alturaCm <= 0) return;

    const nuevoRegistro = {
      fecha: new Date().toISOString(),
      alturaCm
    };

    const plantaActualizada = {
      ...planta,
      registroCrecimiento: [...(planta.registroCrecimiento || []), nuevoRegistro]
    };

    await LocalDatabase.savePlanta(plantaActualizada);
    setNuevoCrecimiento('');
    onUpdate();
  };
  const [luxValue, setLuxValue] = useState(3000);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const toggleExpanded = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setLocalExpanded(!localExpanded);
    }
  };



  const [localUltimaFechaRiego, setLocalUltimaFechaRiego] = useState<string | null>(null);
  const [localProximaFechaRiego, setLocalProximaFechaRiego] = useState<string | null>(null);

  useEffect(() => {
    setLocalUltimaFechaRiego(null);
    setLocalProximaFechaRiego(null);
  }, [planta.ultimaFechaRiego, planta.proximaFechaRiego]);

  const currentUltima = localUltimaFechaRiego || planta.ultimaFechaRiego;
  const currentProxima = localProximaFechaRiego || planta.proximaFechaRiego;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [nota, setNota] = useState('');
  const [estadoHoja, setEstadoHoja] = useState<'Excelente' | 'Normal' | 'Clorosis/Lesión'>('Normal');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [iaReporteModal, setIaReporteModal] = useState<{
    fecha: string;
    diagnostico: string;
    tratamiento: string;
    aislamiento: string;
  } | null>(null);

  // Collapsible sections states
  const [showRiego, setShowRiego] = useState(false);
  const [showIncidencias, setShowIncidencias] = useState(false);
  const [showCrecimiento, setShowCrecimiento] = useState(false);
  const [showDiarioFoliar, setShowDiarioFoliar] = useState(false);

  const [histFecha, setHistFecha] = useState('');
  const [histTipo, setHistTipo] = useState<'Enfermedad' | 'Parásito' | 'Poda' | 'Tratamiento' | 'Muda' | 'Otro'>('Poda');
  const [histDesc, setHistDesc] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editNombreComun, setEditNombreComun] = useState(planta.nombreComun);
  const [editNombreCientifico, setEditNombreCientifico] = useState(planta.nombreCientifico || '');
  const [editUbicacion, setEditUbicacion] = useState(planta.ubicacionHabitacion);
  const [editIntervalo, setEditIntervalo] = useState(String(planta.intervaloRiegoDias));
  const [editToxicidadFelina, setEditToxicidadFelina] = useState<NivelToxicidadFelina>(planta.toxicidadFelina);
  const [editToxicidadCanina, setEditToxicidadCanina] = useState<NivelToxicidadCanina>(planta.toxicidadCanina || 'Segura');
  const [editCompuestosToxicos, setEditCompuestosToxicos] = useState(planta.compuestosToxicos || '');

  useEffect(() => {
    setEditNombreComun(planta.nombreComun);
    setEditNombreCientifico(planta.nombreCientifico || '');
    setEditUbicacion(planta.ubicacionHabitacion);
    setEditIntervalo(String(planta.intervaloRiegoDias));
    setEditToxicidadFelina(planta.toxicidadFelina);
    setEditToxicidadCanina(planta.toxicidadCanina || 'Segura');
    setEditCompuestosToxicos(planta.compuestosToxicos || '');
  }, [planta]);

  const agregarIncidenciaPasada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!histFecha || !histDesc.trim()) return;

    const nuevoEvento = {
      id: safeUUID(),
      fecha: histFecha,
      tipo: histTipo,
      descripcion: histDesc.trim()
    };

    const plantaActualizada: Planta = {
      ...planta,
      historialPasado: [...(planta.historialPasado || []), nuevoEvento]
    };

    await LocalDatabase.savePlanta(plantaActualizada);
    setHistFecha('');
    setHistDesc('');
    onUpdate();
  };

  const theme = propTheme || localStorage.getItem('petplant_game_theme') || 'nature';

  const registrarRiego = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const confirmar = window.confirm(`¿Vas a regar la planta "${planta.nombreComun}"?`);
    if (!confirmar) return;

    const hoy = new Date().toISOString();
    const proximo = new Date(Date.now() + planta.intervaloRiegoDias * 24 * 3600 * 1000).toISOString();

    // Actualización de estado local instantánea (optimista)
    setLocalUltimaFechaRiego(hoy);
    setLocalProximaFechaRiego(proximo);

    const plantaActualizada = {
      ...planta,
      ultimaFechaRiego: hoy,
      proximaFechaRiego: proximo
    };

    try {
      await LocalDatabase.savePlanta(plantaActualizada);
      localStorage.setItem('petplant_db_last_updated', Date.now().toString());
      try { playSoundWater(); } catch { /* Ignore audio playback error */ }
      onUpdate();

      const activeHogarId = localStorage.getItem('petplant_hogar_id');
      if (activeHogarId) {
        import('../utils/notificationManager').then(({ NotificationManager }) => {
          NotificationManager.triggerCloudPushNotification(
            activeHogarId,
            `💧 Riego registrado — ${planta.nombreComun}`,
            `La planta "${planta.nombreComun}" ha sido regada.`
          );
        }).catch(err => console.error(err));
      }
    } catch (err) {
      console.error("Error al registrar riego:", err);
      // Deshacer cambios locales en caso de error
      setLocalUltimaFechaRiego(null);
      setLocalProximaFechaRiego(null);
    }
  };

  const exportarFichaBotanica = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsReportOpen(true);
  };

  // Luxometer effect for camera analysis
  useEffect(() => {
    let active = true;
    let animationId: number;

    const analyzeFrame = () => {
      if (!active || !videoRef.current || !canvasRef.current || !cameraActive) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          let sum = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            sum += 0.299 * r + 0.587 * g + 0.114 * b;
          }
          const avgBrightness = sum / (data.length / 4);
          
          // Mapear de 0-255 a Luxes (entre 100 y 12000 Luxes) con pequeño ruido dinámico
          const noise = (Math.random() - 0.5) * 50;
          const calculatedLux = Math.max(100, Math.round((avgBrightness / 255) * 10000 + 200 + noise));
          setLuxValue(calculatedLux);
        } catch {
          console.warn('Canvas reading blocked by CORS/Privacy, falling back to simulated values');
        }
      }

      if (cameraActive) {
        animationId = requestAnimationFrame(analyzeFrame);
      }
    };

    if (cameraActive) {
      animationId = requestAnimationFrame(analyzeFrame);
    }

    return () => {
      active = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [cameraActive]);

  const startLuxmeter = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLuxmeter(true);
    setCameraError(null);
    setCameraActive(false);
    setLuxValue(3000);

    // Intentar activar sensor de luz nativo si existe
    if ('AmbientLightSensor' in window) {
      try {
        // @ts-expect-error AmbientLightSensor is experimental
        const sensor = new AmbientLightSensor();
        sensor.onreading = () => {
          setLuxValue(Math.round(sensor.illuminance));
        };
        sensor.start();
      } catch (e) {
        console.warn('Failed to start AmbientLightSensor:', e);
      }
    }

    // Intentar activar cámara trasera
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 150);
    } catch (err) {
      console.warn('Camera error for Luxmeter:', err);
      setCameraError('No se pudo acceder a la cámara trasera. Puedes simular el nivel de luz ambiente usando el control deslizante.');
    }
  };

  const closeLuxmeter = () => {
    setCameraActive(false);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setShowLuxmeter(false);
  };

  const handleConfirmDelete = async () => {
    await LocalDatabase.deletePlanta(planta.id);
    onUpdate();
    setShowDeleteConfirm(false);
  };

  const calcularAjusteClimatico = () => {
    if (!clima) return { factor: 1.0, motivos: [] as string[], temp: 22, hum: 50 };
    
    const temp = clima.temperatura;
    const hum = clima.humedad;
    
    let factor = 1.0;
    const motivos: string[] = [];
    
    if (temp > 28) {
      const reduccion = Math.min(0.4, ((temp - 28) / 12) * 0.4);
      factor -= reduccion;
      motivos.push(`temperatura alta (${Math.round(temp)}°C)`);
    } else if (temp < 15) {
      const incremento = Math.min(0.5, ((15 - temp) / 15) * 0.5);
      factor += incremento;
      motivos.push(`temperatura baja (${Math.round(temp)}°C)`);
    }
    
    if (hum < 35) {
      factor -= 0.15;
      motivos.push(`baja humedad (${Math.round(hum)}%)`);
    } else if (hum > 75) {
      factor += 0.20;
      motivos.push(`alta humedad (${Math.round(hum)}%)`);
    }
    
    factor = Math.max(0.5, Math.min(1.7, factor));
    
    return { factor, motivos, temp, hum };
  };

  const { factor, motivos, temp, hum } = calcularAjusteClimatico();
  const baseIntervalo = planta.intervaloRiegoBase || planta.intervaloRiegoDias || 7;
  const intervaloAjustado = clima ? Math.max(2, Math.round(baseIntervalo * factor)) : baseIntervalo;

  const calcularDiasRestantes = () => {
    if (!currentProxima) return 0;
    const proximo = new Date(currentProxima).getTime();
    if (isNaN(proximo)) return 0;
    const hoy = new Date().getTime();
    const diferenciaMs = proximo - hoy;
    const diasBase = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
    
    if (clima) {
      if (currentUltima) {
        const ultima = new Date(currentUltima).getTime();
        const proximoAjustado = ultima + (intervaloAjustado * 24 * 3600 * 1000);
        return Math.ceil((proximoAjustado - hoy) / (1000 * 60 * 60 * 24));
      } else {
        const factorAjuste = baseIntervalo > 0 ? (intervaloAjustado / baseIntervalo) : 1;
        return Math.max(0, Math.round(diasBase * factorAjuste));
      }
    }
    return diasBase;
  };

  const diasRestantes = calcularDiasRestantes();



  const esMismoDia = (d1: Date, d2String?: string) => {
    if (!d2String) return false;
    const d2 = new Date(d2String);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const obtenerDiasRiego = () => {
    const list = [];
    const hoy = new Date();
    for (let i = -3; i <= 3; i++) {
      const d = new Date();
      d.setDate(hoy.getDate() + i);
      list.push(d);
    }
    return list;
  };

  const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const renderCalendarioRiegoSemanal = () => {
    const dias = obtenerDiasRiego();
    const hoy = new Date();

    return (
      <div style={{
        marginTop: '12px',
        background: 'rgba(0, 0, 0, 0.02)',
        borderRadius: '12px',
        padding: '12px',
        border: '1px solid var(--border, #eaeaea)',
        fontFamily: 'var(--game-font, sans-serif)',
        boxSizing: 'border-box',
        width: '100%'
      }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          💧 Calendario de Riego Semanal
        </p>
        <div style={{
          display: 'flex',
          gap: '6px',
          justifyContent: 'space-between',
          width: '100%',
          overflowX: 'auto',
          boxSizing: 'border-box'
        }}>
          {dias.map((d, index) => {
            const esHoy = d.toDateString() === hoy.toDateString();
            const esPasado = d.getTime() < hoy.getTime() && !esHoy;
            
            // Determinar estado
            let status: string;
            let icon: string;
            let label: string;
            let color: string;

            if (esMismoDia(d, currentUltima)) {
              status = esHoy ? 'watered-today' : 'watered';
              icon = '💧';
              label = esHoy ? 'Regada hoy' : 'Regada';
              color = '#1976d2';
            } else if (esHoy) {
              const proxTime = new Date(currentProxima).getTime();
              const hoyTime = new Date().getTime();
              if (proxTime <= hoyTime || esMismoDia(d, currentProxima)) {
                status = 'due';
                icon = '⚠️';
                label = 'Toca regar';
                color = '#e53935';
              } else {
                status = 'safe';
                icon = '🍃';
                label = 'Hidratada';
                color = '#4caf50';
              }
            } else if (esPasado) {
              status = 'none';
              icon = '•';
              label = '-';
              color = '#bbb';
            } else { // Futuro
              if (esMismoDia(d, currentProxima)) {
                status = 'scheduled';
                icon = '📅';
                label = 'Toca regar';
                color = '#ff9800';
              } else {
                status = 'none';
                icon = '•';
                label = '-';
                color = '#bbb';
              }
            }

            return (
              <div 
                key={index} 
                style={{
                  flex: 1,
                  minWidth: '48px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '6px 4px',
                  borderRadius: '8px',
                  background: esHoy ? 'var(--game-accent-light, rgba(76, 175, 80, 0.15))' : 'rgba(255,255,255,0.6)',
                  border: esHoy ? '1.5px solid var(--game-accent, #4caf50)' : '1px solid rgba(0,0,0,0.05)',
                  boxShadow: esHoy ? '0 2px 6px rgba(76,175,80,0.15)' : 'none',
                  boxSizing: 'border-box'
                }}
              >
                <span style={{ fontSize: '9px', fontWeight: esHoy ? 'bold' : 'normal', color: esHoy ? 'var(--game-text-bright)' : '#666' }}>
                  {nombresDias[d.getDay()]}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', margin: '2px 0', color: esHoy ? 'var(--game-text-bright)' : '#333' }}>
                  {d.getDate()}
                </span>
                
                {status === 'due' ? (
                  <button
                    onClick={(e) => registrarRiego(e)}
                    style={{
                      padding: '2px 4px',
                      background: '#1976d2',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginTop: '2px',
                      fontFamily: 'var(--game-font, sans-serif)'
                    }}
                    title="Regar ahora"
                  >
                    REGAR
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '14px' }}>{icon}</span>
                    <span style={{ fontSize: '7.5px', color: color, textAlign: 'center', whiteSpace: 'nowrap' }}>{label}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const agregarNotaFoliar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nota.trim()) return;

    const nuevaEntrada = {
      id: safeUUID(),
      fecha: new Date().toISOString(),
      nota: nota,
      estadoGeneral: estadoHoja
    };

    const plantaActualizada: Planta = {
      ...planta,
      diarioFoliar: [nuevaEntrada, ...(planta.diarioFoliar || [])]
    };

    await LocalDatabase.savePlanta(plantaActualizada);
    setNota('');
    onUpdate();
  };

  const eliminarNotaFoliar = async (notaId: string) => {
    const diarioFiltrado = (planta.diarioFoliar || []).filter(d => d.id !== notaId);
    const plantaActualizada: Planta = {
      ...planta,
      diarioFoliar: diarioFiltrado
    };
    await LocalDatabase.savePlanta(plantaActualizada);
    setDeleteConfirmId(null);
    onUpdate();
  };

  const renderMedidorHidratacion = () => {
    const divisor = clima ? intervaloAjustado : (planta.intervaloRiegoDias || 7);
    if (theme === 'gaming') {
      const totalHearts = 5;
      const filled = Math.max(0, Math.min(5, Math.ceil((diasRestantes / divisor) * 5)));
      return (
        <div style={{ display: 'flex', gap: '4px', fontSize: '18px' }}>
          {Array.from({ length: totalHearts }).map((_, i) => (
            <span key={i}>{i < filled ? '💙' : '🖤'}</span>
          ))}
        </div>
      );
    }

    const percent = Math.max(0, Math.min(100, Math.round((diasRestantes / divisor) * 100)));
    const isKawaii = theme === 'kawaii';
    
    const barColor = isKawaii
      ? (percent > 50 ? '#a3e635' : percent > 20 ? '#fde047' : '#fda4af')
      : (percent > 50 ? '#4caf50' : percent > 20 ? '#ffeb3b' : '#f44336');

    const containerBg = isKawaii 
      ? 'rgba(255, 182, 193, 0.15)' 
      : 'rgba(0, 0, 0, 0.05)';
      
    const containerBorder = isKawaii 
      ? '2px dashed var(--game-border-color, #ffb6c1)' 
      : '1px solid var(--game-border-color, #c8e6c9)';
      
    const containerRadius = 'var(--game-radius, 8px)';
    
    return (
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '11px', 
          fontWeight: 'bold', 
          fontFamily: 'var(--game-font, sans-serif)', 
          color: 'var(--game-text-bright, #2e7d32)',
          marginBottom: '4px'
        }}>
          <span>Nivel de Hidratación</span>
          <span>{percent}%</span>
        </div>
        <div style={{ 
          width: '100%', 
          height: '14px', 
          background: containerBg, 
          border: containerBorder, 
          borderRadius: containerRadius, 
          padding: '2px',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <div className="liquid-progress-bar" style={{ 
            width: `${percent}%`, 
            height: '100%', 
            background: barColor,
            borderRadius: 'calc(var(--game-radius, 8px) - 2px)',
            transition: 'width 0.5s ease-out'
          }} />
        </div>
      </div>
    );
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
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--game-text-bright, #333)', fontWeight: 'bold' }}>Editar Planta ✏️</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Nombre Común:</label>
            <input 
              type="text" 
              value={editNombreComun} 
              onChange={(e) => setEditNombreComun(e.target.value)} 
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Nombre Científico:</label>
            <input 
              type="text" 
              value={editNombreCientifico} 
              onChange={(e) => setEditNombreCientifico(e.target.value)} 
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div className="responsive-form-grid-2" style={{ gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Ubicación:</label>
              <input 
                type="text" 
                value={editUbicacion} 
                onChange={(e) => setEditUbicacion(e.target.value)} 
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Riego (días):</label>
              <input 
                type="number" 
                value={editIntervalo} 
                onChange={(e) => setEditIntervalo(e.target.value)} 
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div className="responsive-form-grid-2" style={{ gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Toxicidad Felina:</label>
              <select 
                value={editToxicidadFelina} 
                onChange={(e) => setEditToxicidadFelina(e.target.value as any)} 
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
              >
                <option value="Segura">Segura 🐈</option>
                <option value="Tóxica leve (irritante)">Tóxica Leve ⚠️</option>
                <option value="Altamente tóxica (urgencia)">Muy Tóxica 🚨</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Toxicidad Canina:</label>
              <select 
                value={editToxicidadCanina} 
                onChange={(e) => setEditToxicidadCanina(e.target.value as any)} 
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
              >
                <option value="Segura">Segura 🐕</option>
                <option value="Tóxica leve (irritante)">Tóxica Leve ⚠️</option>
                <option value="Altamente tóxica (urgencia)">Muy Tóxica 🚨</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Compuestos:</label>
            <input 
              type="text" 
              placeholder="Ej: Oxalatos" 
              value={editCompuestosToxicos} 
              onChange={(e) => setEditCompuestosToxicos(e.target.value)} 
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
            />
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
              if (!editNombreComun.trim()) return;
              const intVal = parseInt(editIntervalo) || 7;
              const proxima = new Date(Date.now() + intVal * 24 * 3600 * 1000).toISOString();
              const plantaActualizada = {
                ...planta,
                nombreComun: editNombreComun.trim(),
                nombreCientifico: editNombreCientifico.trim() || undefined,
                ubicacionHabitacion: editUbicacion.trim(),
                intervaloRiegoDias: intVal,
                intervaloRiegoBase: intVal,
                proximaFechaRiego: proxima,
                toxicidadFelina: editToxicidadFelina,
                toxicidadCanina: editToxicidadCanina,
                compuestosToxicos: editCompuestosToxicos.trim() || undefined
              };
              await LocalDatabase.savePlanta(plantaActualizada);
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

  const renderMicroClimaBackground = () => {
    const backgroundStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
      borderRadius: 'inherit',
      transition: 'background 0.5s ease'
    };

    // Moisture-Adaptive Gradients
    if (diasRestantes <= 0) {
      backgroundStyle.background = 'radial-gradient(circle at 80% 80%, rgba(141, 110, 99, 0.16) 0%, rgba(109, 76, 65, 0.04) 50%, transparent 100%)';
    } else {
      backgroundStyle.background = 'radial-gradient(circle at 80% 80%, rgba(165, 214, 167, 0.16) 0%, rgba(129, 199, 132, 0.04) 50%, transparent 100%)';
    }

    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const showAnimations = expanded && isIntersecting && !prefersReducedMotion;

    // Geometric Greenhouse/Terrarium glass frame watermark
    const renderGreenhouseFrame = () => {
      const frameStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '-12px',
        right: '-12px',
        width: '135px',
        height: '135px',
        opacity: 0.12,
        color: 'var(--game-text, currentColor)',
        transition: 'all 0.5s ease',
        transformOrigin: 'bottom right',
      };

      return (
        <svg viewBox="0 0 100 100" style={frameStyle} className="greenhouse-frame">
          {showAnimations && (
            <style>{`
              @keyframes floatGreenhouse {
                0% { transform: translateY(0px) rotate(-3deg); }
                50% { transform: translateY(-4px) rotate(-1deg); }
                100% { transform: translateY(0px) rotate(-3deg); }
              }
              .greenhouse-frame { animation: floatGreenhouse 8s infinite ease-in-out; }
            `}</style>
          )}
          {/* Outer glass terrarium frame */}
          <path d="M50 15 L25 40 L25 75 L50 90 L75 75 L75 40 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Internal facets */}
          <line x1="50" y1="15" x2="50" y2="90" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" />
          <line x1="25" y1="40" x2="75" y2="40" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" />
          <line x1="25" y1="75" x2="75" y2="75" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" />
          <line x1="50" y1="15" x2="25" y2="75" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
          <line x1="50" y1="15" x2="75" y2="75" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
          <line x1="25" y1="40" x2="50" y2="90" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
          <line x1="75" y1="40" x2="50" y2="90" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
        </svg>
      );
    };

    return (
      <div style={backgroundStyle}>
        {renderGreenhouseFrame()}

        {showAnimations && (
          <>
            {diasRestantes <= 0 ? (
              <svg width="100%" height="100%" style={{ opacity: 0.18, position: 'absolute', top: 0, left: 0 }}>
                <style>{`
                  @keyframes floatDust {
                    0% { transform: translateY(110%) translateX(0); opacity: 0; }
                    50% { opacity: 0.8; }
                    100% { transform: translateY(-10%) translateX(15px); opacity: 0; }
                  }
                  .dust1 { animation: floatDust 6s infinite ease-in-out; }
                  .dust2 { animation: floatDust 8s infinite ease-in-out; animation-delay: 2s; }
                  .dust3 { animation: floatDust 7s infinite ease-in-out; animation-delay: 4s; }
                  @keyframes heatwaveDry {
                    0% { transform: translateY(10px) skewX(3deg); opacity: 0.2; }
                    50% { transform: translateY(0px) skewX(-3deg); opacity: 0.6; }
                    100% { transform: translateY(-10px) skewX(3deg); opacity: 0.2; }
                  }
                  .hwd1 { animation: heatwaveDry 4s infinite ease-in-out; }
                  .hwd2 { animation: heatwaveDry 5s infinite ease-in-out; animation-delay: 2s; }
                `}</style>
                <circle className="dust1" cx="20%" cy="80%" r="3" fill="#8d6e63" />
                <circle className="dust2" cx="50%" cy="90%" r="4.5" fill="#a1887f" />
                <circle className="dust3" cx="80%" cy="85%" r="2.5" fill="#8d6e63" />
                <path className="hwd1" d="M15,120 Q35,70 55,120 T95,120 T135,120" fill="none" stroke="#ffb74d" strokeWidth="1.5" />
                <path className="hwd2" d="M105,120 Q125,70 145,120 T185,120 T225,120" fill="none" stroke="#ffa726" strokeWidth="1.5" />
              </svg>
            ) : (
              <svg width="100%" height="100%" style={{ opacity: 0.18, position: 'absolute', top: 0, left: 0 }}>
                <style>{`
                  @keyframes ripple {
                    0% { r: 5; opacity: 0.8; stroke-width: 2; }
                    100% { r: 70; opacity: 0; stroke-width: 0.5; }
                  }
                  .rip1 { animation: ripple 6s infinite cubic-bezier(0.1, 0.8, 0.3, 1); }
                  .rip2 { animation: ripple 6s infinite cubic-bezier(0.1, 0.8, 0.3, 1); animation-delay: 3s; }
                  @keyframes floatDew {
                    0% { transform: translateY(110%) scale(0.8); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(-10%) scale(1.2); opacity: 0; }
                  }
                  .dew1 { animation: floatDew 5s infinite ease-in-out; }
                  .dew2 { animation: floatDew 6.5s infinite ease-in-out; animation-delay: 1.5s; }
                  .dew3 { animation: floatDew 5.8s infinite ease-in-out; animation-delay: 3s; }
                `}</style>
                <circle className="rip1" cx="80%" cy="80%" r="5" fill="none" stroke="#4db6ac" />
                <circle className="rip2" cx="80%" cy="80%" r="5" fill="none" stroke="#80deea" />
                <circle className="dew1" cx="20%" cy="90%" r="3.5" fill="#80deea" />
                <circle className="dew2" cx="70%" cy="90%" r="2.5" fill="#a5d6a7" />
                <circle className="dew3" cx="45%" cy="85%" r="4.5" fill="#81c784" />
              </svg>
            )}

            {clima && temp > 28 && (
              <svg width="100%" height="100%" style={{ opacity: 0.08, position: 'absolute', top: 0, left: 0 }}>
                <style>{`
                  @keyframes heatwave {
                    0% { transform: translateY(10px) skewX(2deg); opacity: 0.3; }
                    50% { transform: translateY(0px) skewX(-2deg); opacity: 0.7; }
                    100% { transform: translateY(-10px) skewX(2deg); opacity: 0.3; }
                  }
                  .hw1 { animation: heatwave 3.5s infinite ease-in-out; }
                  .hw2 { animation: heatwave 4.5s infinite ease-in-out; animation-delay: 1.5s; }
                `}</style>
                <path className="hw1" d="M10,120 Q30,70 50,120 T90,120 T130,120" fill="none" stroke="#ffb74d" strokeWidth="2" />
                <path className="hw2" d="M110,120 Q130,70 150,120 T190,120 T230,120" fill="none" stroke="#ffa726" strokeWidth="2" />
              </svg>
            )}

            {clima && temp < 15 && (
              <svg width="100%" height="100%" style={{ opacity: 0.12, position: 'absolute', top: 0, left: 0 }}>
                <style>{`
                  @keyframes driftSnow {
                    0% { transform: translateY(-10px) rotate(0deg); opacity: 0; }
                    50% { opacity: 0.8; }
                    100% { transform: translateY(110%) rotate(360deg); opacity: 0; }
                  }
                  .sn1 { animation: driftSnow 9s infinite linear; }
                  .sn2 { animation: driftSnow 12s infinite linear; animation-delay: 3s; }
                  .sn3 { animation: driftSnow 10s infinite linear; animation-delay: 6s; }
                `}</style>
                <text className="sn1" x="15%" y="-10" fontSize="10" fill="#90caf9">❄</text>
                <text className="sn2" x="55%" y="-10" fontSize="12" fill="#bbdefb">❄</text>
                <text className="sn3" x="85%" y="-10" fontSize="9" fill="#90caf9">❄</text>
              </svg>
            )}

            {clima && hum > 75 && (
              <svg width="100%" height="100%" style={{ opacity: 0.12, position: 'absolute', top: 0, left: 0 }}>
                <style>{`
                  @keyframes fallRain {
                    0% { transform: translateY(-20px) translateX(-5px); opacity: 0; }
                    30% { opacity: 0.8; }
                    100% { transform: translateY(110%) translateX(25px); opacity: 0; }
                  }
                  .rn1 { animation: fallRain 2.2s infinite linear; }
                  .rn2 { animation: fallRain 2.8s infinite linear; animation-delay: 0.8s; }
                  .rn3 { animation: fallRain 2.4s infinite linear; animation-delay: 1.6s; }
                `}</style>
                <line className="rn1" x1="20%" y1="-10" x2="25%" y2="15" stroke="#90caf9" strokeWidth="1.5" />
                <line className="rn2" x1="60%" y1="-10" x2="65%" y2="15" stroke="#90caf9" strokeWidth="1.5" />
                <line className="rn3" x1="85%" y1="-10" x2="90%" y2="15" stroke="#90caf9" strokeWidth="1.5" />
              </svg>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div ref={cardRef} id={`card-${planta.id}`} className={`glass-card ${diasRestantes <= 0 ? 'has-critical-alert' : ''}`} style={{
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
      {renderMicroClimaBackground()}
      {/* Cabecera (Click para expandir/colapsar) */}
      <div 
        onClick={toggleExpanded}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
          {!expanded && (
            <div style={(() => {
              const radius = theme === 'gaming' ? '4px' : (theme === 'kawaii' ? '12px' : '8px');
              if (theme === 'gaming') {
                return {
                  width: '60px',
                  height: '60px',
                  borderRadius: radius,
                  background: '#121212',
                  border: '2.5px solid var(--game-border-color, #33f3ff)',
                  boxShadow: '0 0 10px rgba(51, 243, 255, 0.6), inset 0 0 6px rgba(51, 243, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxSizing: 'border-box' as const
                };
              }
              if (theme === 'kawaii') {
                return {
                  width: '60px',
                  height: '60px',
                  borderRadius: radius,
                  background: '#fff5f7',
                  border: '3px solid #ffffff',
                  outline: '1.5px solid #ff6b8b',
                  boxShadow: '0 4px 10px rgba(255, 107, 139, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxSizing: 'border-box' as const
                };
              }
              return {
                width: '60px',
                height: '60px',
                borderRadius: radius,
                background: '#e8f5e9',
                border: '3px solid #ffffff',
                boxShadow: '0 4px 12px rgba(46, 125, 50, 0.25), 0 2px 4px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                overflow: 'hidden',
                flexShrink: 0,
                boxSizing: 'border-box' as const
              };
            })()}>
              {planta.fotoUrl ? (
                <img
                  src={planta.fotoUrl}
                  alt={planta.nombreComun}
                  loading="lazy"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAvatarLightbox(true);
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    cursor: 'zoom-in'
                  }}
                />
              ) : (
                '🌿'
              )}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <h3 style={{ 
              margin: '0 0 2px 0', 
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
            }} title={planta.nombreComun}>
              {planta.nombreComun}
              {theme === 'kawaii' && ' (◕‿◕✿)'}
            </h3>
            {expanded && (
              <div style={{ 
                fontSize: '11px', 
                color: 'var(--game-text, #888)', 
                fontStyle: 'italic', 
                fontFamily: 'var(--game-font, sans-serif)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
              }} title={planta.nombreCientifico || ''}>
                {planta.nombreCientifico || 'Sin Taxonomía Científica'}
              </div>
            )}
            
            {/* Badge de Riego Rápido */}
            {(() => {
              const regadaHoy = esMismoDia(new Date(), currentUltima);
              let textoRiego: string;
              let colorRiego: string;
              let bgRiego: string;

              if (regadaHoy) {
                textoRiego = 'Riego: regada hoy 💧';
                colorRiego = '#2e7d32';
                bgRiego = 'rgba(46, 125, 80, 0.08)';
              } else if (diasRestantes > 0) {
                textoRiego = `Riego: quedan ${diasRestantes} días 📅`;
                colorRiego = '#1976d2';
                bgRiego = 'rgba(25, 118, 210, 0.08)';
              } else {
                textoRiego = 'Riego: ¡toca regar hoy! ⚠️';
                colorRiego = '#d32f2f';
                bgRiego = 'rgba(211, 47, 47, 0.08)';
              }

              return (
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '10px',
                    background: bgRiego,
                    color: colorRiego,
                    border: `1.5px solid ${colorRiego}`,
                    padding: '2px 8px',
                    borderRadius: theme === 'kawaii' ? '12px' : '6px',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily: 'var(--game-font, sans-serif)'
                  }}>
                    {textoRiego}
                  </span>
                  {expanded && clima && (
                    <span style={{
                      fontSize: '10px',
                      background: 'rgba(2, 136, 209, 0.08)',
                      color: '#0288d1',
                      border: '1.5px solid #0288d1',
                      padding: '2px 8px',
                      borderRadius: theme === 'kawaii' ? '12px' : '6px',
                      fontWeight: 'bold',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontFamily: 'var(--game-font, sans-serif)'
                    }} title={`Ajuste por clima activo: ${factor.toFixed(2)}x`}>
                      ⛅ Clima: {intervaloAjustado}d ({factor.toFixed(2)}x)
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} className="no-print">
          <span style={{ fontSize: '20px', padding: '10px', color: 'var(--game-text-bright)', fontFamily: 'monospace' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {expanded && (
        <>
          {/* Gestor de Fotos Múltiples */}
          <CardPhotoManager
            currentPhotoUrl={planta.fotoUrl}
            photos={planta.fotos || []}
            theme={theme}
            onPhotosChange={async (updatedPhotos, newPrimaryUrl) => {
              const plantaActualizada = {
                ...planta,
                fotos: updatedPhotos,
                fotoUrl: newPrimaryUrl
              };
              await LocalDatabase.savePlanta(plantaActualizada);
              onUpdate();
            }}
            onEditCard={() => {
              setEditNombreComun(planta.nombreComun);
              setEditNombreCientifico(planta.nombreCientifico || '');
              setEditUbicacion(planta.ubicacionHabitacion);
              setEditIntervalo(String(planta.intervaloRiegoDias));
              setEditToxicidadFelina(planta.toxicidadFelina);
              setEditToxicidadCanina(planta.toxicidadCanina || 'Segura');
              setEditCompuestosToxicos(planta.compuestosToxicos || '');
              setIsEditing(true);
            }}
            onDeleteCard={() => {
              setShowDeleteConfirm(true);
            }}
          />

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
              borderRadius: 'var(--game-radius, 8px)',
              background: theme === 'gaming' ? 'transparent' : (planta.toxicidadFelina === 'Segura' ? 'rgba(76, 175, 80, 0.12)' : 'rgba(244, 67, 54, 0.12)'),
              border: `1.5px solid ${planta.toxicidadFelina === 'Segura' ? '#4caf50' : '#f44336'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxSizing: 'border-box'
            }}>
              <p style={{ margin: 0, fontWeight: 'bold', color: planta.toxicidadFelina === 'Segura' ? '#4caf50' : '#f44336', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🐈 Felinos: {planta.toxicidadFelina === 'Segura' ? 'Segura' : planta.toxicidadFelina === 'Tóxica leve (irritante)' ? 'Tóxica Leve' : 'Muy Tóxica'}
              </p>
              <span style={{ color: 'var(--game-text, #555)', fontSize: '10.5px', lineHeight: '1.3' }}>
                {planta.toxicidadFelina === 'Segura' 
                  ? 'Planta inocua para gatos domésticos.' 
                  : `Compuesto: ${planta.compuestosToxicos || 'Irritante foliar'}.`}
              </span>
            </div>

            {/* Seguridad Canina */}
            {(() => {
              const toxCanina = planta.toxicidadCanina ?? 'Segura';
              return (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--game-radius, 8px)',
                  background: theme === 'gaming' ? 'transparent' : (toxCanina === 'Segura' ? 'rgba(76, 175, 80, 0.12)' : 'rgba(244, 67, 54, 0.12)'),
                  border: `1.5px solid ${toxCanina === 'Segura' ? '#4caf50' : '#f44336'}`,
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
                      ? 'Planta inocua para perros domésticos.' 
                      : `Compuesto: ${planta.compuestosToxicos || 'Irritante foliar'}.`}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Barra de Riego Dinámica */}
          <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--game-text, #666)', marginBottom: '8px', fontFamily: 'var(--game-font, sans-serif)' }}>
              <span>Riego ({planta.tipoRiegoEspecifico})</span>
              <span style={{ color: 'var(--game-text-bright)' }}>
                {diasRestantes > 0 ? `Quedan ${diasRestantes} días` : '¡Requiere agua hoy!'}
              </span>
            </div>
            {renderMedidorHidratacion()}
            {clima && (
              <div style={{
                marginTop: '10px',
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'rgba(2, 136, 209, 0.08)',
                border: '1px solid rgba(2, 136, 209, 0.2)',
                fontSize: '11px',
                color: '#0288d1',
                fontFamily: 'var(--game-font, sans-serif)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>⛅ Ajuste Climático Dinámico</span>
                  <span>Factor: {factor.toFixed(2)}x</span>
                </div>
                <div>
                  Riego ajustado a <strong>{intervaloAjustado} días</strong> (base: {baseIntervalo} días) debido a {motivos.length > 0 ? motivos.join(' y ') : 'clima templado'}.
                </div>
                <div style={{ fontSize: '10px', opacity: 0.8, fontStyle: 'italic' }}>
                  Sensor GPS: {Math.round(temp)}°C | {Math.round(hum)}% HR
                </div>
              </div>
            )}
          </div>

          {/* Botón de Regar Planta (Ubicado entre Nivel de Hidratación y Algoritmo Climático) */}
          <div style={{ marginTop: '10px', display: 'flex' }}>
            <button 
              onClick={(e) => registrarRiego(e)}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: 'var(--game-accent, #4caf50)',
                color: theme === 'gaming' ? '#000000' : '#fff',
                border: 'var(--game-border, 1px solid #f0f0f0)',
                borderRadius: 'var(--game-radius, 8px)',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'var(--game-font, sans-serif)',
                boxShadow: '0 2px 4px rgba(76,175,80,0.2)'
              }}
            >
              {theme === 'gaming' ? 'WATER STRIKE' : 'Regar Planta 💧'}
            </button>
          </div>

          {/* Calendario de Riego Semanal Interactivo */}
          {renderCalendarioRiegoSemanal()}
          {/* Historial de Incidencias Pasadas Colapsable */}
          <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px' }}>
            <div style={{ background: 'var(--game-card-bg, #fafafa)', padding: '12px', borderRadius: 'var(--game-radius, 8px)', border: '1px solid var(--game-border-color, #eee)' }}>
              <div 
                onClick={() => setShowIncidencias(!showIncidencias)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📋 Historial de Podas e Incidencias
                </p>
                <span style={{ fontSize: '11px', color: 'var(--game-text, #888)', fontWeight: 'bold' }}>
                  {showIncidencias ? '▲' : '▼'}
                </span>
              </div>

              {showIncidencias && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', borderTop: '1px dashed var(--game-border-color, #eee)', paddingTop: '10px' }}>
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
                        <option value="Poda">Poda</option>
                        <option value="Tratamiento">Tratamiento</option>
                        <option value="Enfermedad">Enfermedad</option>
                        <option value="Parásito">Parásito</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input 
                        type="text" 
                        placeholder="Descripción (ej: Poda severa, trasplante, ácaros...)" 
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
                    {(planta.historialPasado || []).length === 0 ? (
                      <span style={{ fontSize: '11px', color: 'var(--game-text, #888)', fontStyle: 'italic', fontFamily: 'var(--game-font, sans-serif)' }}>Sin incidencias registradas.</span>
                    ) : (
                      (planta.historialPasado || []).map(h => (
                        <div key={h.id} style={{ padding: '6px 8px', background: 'var(--game-accent-light, #fafafa)', borderRadius: '4px', borderLeft: '3px solid #4caf50', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '9px', color: '#666', fontWeight: 'bold', display: 'block' }}>{h.tipo.toUpperCase()} • {h.fecha}</span>
                            <span style={{ color: 'var(--game-text-bright)' }}>{h.descripcion}</span>
                          </div>
                          <button 
                            type="button"
                            onClick={async () => {
                              const filtrado = (planta.historialPasado || []).filter(x => x.id !== h.id);
                              const plantaAct = { ...planta, historialPasado: filtrado };
                              await LocalDatabase.savePlanta(plantaAct);
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
              )}
            </div>
          </div>

          {/* Historial de Crecimiento Colapsable */}
          <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ background: 'var(--game-card-bg, #fafafa)', padding: '12px', borderRadius: 'var(--game-radius, 8px)', border: '1px solid var(--game-border-color, #eee)', width: '100%', boxSizing: 'border-box' }}>
              <div 
                onClick={() => setShowCrecimiento(!showCrecimiento)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📈 Historial de Crecimiento (Altura)
                </p>
                <span style={{ fontSize: '11px', color: 'var(--game-text, #888)', fontWeight: 'bold' }}>
                  {showCrecimiento ? '▲' : '▼'}
                </span>
              </div>

              {showCrecimiento && (
                <div style={{ marginTop: '12px', borderTop: '1px dashed var(--game-border-color, #eee)', paddingTop: '10px' }}>
                  {(() => {
                    const chartData = (planta.registroCrecimiento || []).map(r => ({
                      fecha: r.fecha,
                      valor: r.alturaCm
                    }));

                    let accentColor = '#2e7d32'; // nature
                    if (theme === 'kawaii') accentColor = '#ff6b8b';
                    else if (theme === 'gaming') accentColor = '#66fcf1';

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <BiometricChart
                          data={chartData}
                          yLabel="Altura (cm)"
                          color={accentColor}
                          theme={theme as any}
                        />
                        <form onSubmit={registrarCrecimiento} style={{ display: 'flex', gap: '8px', margin: '4px 0' }} className="no-print">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Nueva altura (cm)"
                            value={nuevoCrecimiento}
                            onChange={(e) => setNuevoCrecimiento(e.target.value)}
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
                              background: 'var(--game-accent, #2e7d32)',
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
                            Medir 📏
                          </button>
                        </form>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Diario Foliar Colapsable */}
          <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'var(--game-card-bg, #fafafa)', padding: '12px', borderRadius: 'var(--game-radius, 8px)', border: '1px solid var(--game-border-color, #eee)', width: '100%', boxSizing: 'border-box' }}>
              <div 
                onClick={() => setShowDiarioFoliar(!showDiarioFoliar)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📓 Diario Foliar y Diagnóstico
                </p>
                <span style={{ fontSize: '11px', color: 'var(--game-text, #888)', fontWeight: 'bold' }}>
                  {showDiarioFoliar ? '▲' : '▼'}
                </span>
              </div>

              {showDiarioFoliar && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', borderTop: '1px dashed var(--game-border-color, #eee)', paddingTop: '10px' }}>
                  <form onSubmit={agregarNotaFoliar} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className="no-print">
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <select 
                        value={estadoHoja} 
                        onChange={(e) => setEstadoHoja(e.target.value as any)}
                        style={{ padding: '6px', border: 'var(--game-border, 1px solid #eaeaea)', borderRadius: 'var(--game-radius, 6px)', fontSize: '12px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
                      >
                        <option value="Excelente">Excelente</option>
                        <option value="Normal">Normal</option>
                        <option value="Clorosis/Lesión">Clorosis/Lesión</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Nueva nota agrónoma..."
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                          <button 
                            type="button" 
                            onClick={() => onOpenScanner('enfermedad_planta', planta.id)} 
                            disabled={!cuota.esIlimitado && cuota.restantes === 0}
                            style={{ 
                              width: '100%',
                              padding: '8px', 
                              background: (!cuota.esIlimitado && cuota.restantes === 0) ? '#e0e0e0' : 'var(--game-accent-light, rgba(46, 125, 50, 0.1))', 
                              color: (!cuota.esIlimitado && cuota.restantes === 0) ? '#9e9e9e' : 'var(--game-text-bright, #2e7d32)', 
                              border: '1.5px solid ' + ((!cuota.esIlimitado && cuota.restantes === 0) ? '#ccc' : 'var(--game-border-color, #2e7d32)'), 
                              borderRadius: 'var(--game-radius, 6px)', 
                              fontSize: '13px', 
                              fontWeight: 'bold', 
                              cursor: (!cuota.esIlimitado && cuota.restantes === 0) ? 'not-allowed' : 'pointer',
                              fontFamily: 'var(--game-font, sans-serif)',
                              transition: 'transform 0.2s'
                            }}
                          >
                            Analizar Enfermedad Foliar por IA 🍂 📷
                          </button>
                          <span style={{ fontSize: '10px', color: (!cuota.esIlimitado && cuota.restantes === 0) ? '#c62828' : 'var(--game-text, #666)', textAlign: 'center', display: 'block', fontWeight: '500' }}>
                            {cuota.esIlimitado 
                              ? '⚡ Modo Premium: Análisis ilimitados' 
                              : cuota.restantes === 0 
                                ? `❌ Límite diario alcanzado (Espera ${IAQuotaManager.obtenerMensajeTiempoRestante()} o añade tu API Key en Ajustes ⚙️)` 
                                : `🔑 Te quedan ${cuota.restantes} análisis de IA hoy`}
                          </span>
                        </div>
                      )}
                    </div>
                  </form>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                    {(planta.diarioFoliar || []).length === 0 ? (
                      <span style={{ fontSize: '11px', color: 'var(--game-text, #888)', fontStyle: 'italic', fontFamily: 'var(--game-font, sans-serif)' }}>Sin notas en el diario foliar.</span>
                    ) : (
                      (() => {
                        const parseIAReportePlanta = (nota: string) => {
                          let diagnostico = '';
                          let tratamiento = '';
                          let aislamiento = '';

                          const diagKey = '[IA Diagnóstico Fitosanitario]:';
                          const tratKey = '| Tratamiento:';
                          const aisKey = '| Aislamiento sugerido:';

                          const diagIdx = nota.indexOf(diagKey);
                          const tratIdx = nota.indexOf(tratKey);
                          const aisIdx = nota.indexOf(aisKey);

                          if (diagIdx !== -1) {
                            const start = diagIdx + diagKey.length;
                            const end = tratIdx !== -1 ? tratIdx : (aisIdx !== -1 ? aisIdx : nota.length);
                            diagnostico = nota.substring(start, end).trim();
                          } else {
                            diagnostico = nota;
                          }

                          if (tratIdx !== -1) {
                            const start = tratIdx + tratKey.length;
                            const end = aisIdx !== -1 ? aisIdx : nota.length;
                            tratamiento = nota.substring(start, end).trim();
                          }

                          if (aisIdx !== -1) {
                            const start = aisIdx + aisKey.length;
                            aislamiento = nota.substring(start).trim();
                          }

                          return {
                            diagnostico: diagnostico || 'No especificado',
                            tratamiento: tratamiento || 'No especificado',
                            aislamiento: aislamiento || 'No sugerido'
                          };
                        };

                        return (planta.diarioFoliar || []).map(d => {
                          const esIAReporte = d.nota.startsWith('[IA');
                          const fechaFmt = new Date(d.fecha).toLocaleDateString();
                          const textoMostrar = esIAReporte 
                            ? `análisis fitosanitario - (${fechaFmt})`
                            : d.nota;

                          return (
                            <div 
                              key={d.id} 
                              onClick={() => {
                                if (esIAReporte) {
                                  const parsed = parseIAReportePlanta(d.nota);
                                  setIaReporteModal({
                                    fecha: fechaFmt,
                                    diagnostico: parsed.diagnostico,
                                    tratamiento: parsed.tratamiento,
                                    aislamiento: parsed.aislamiento
                                  });
                                }
                              }}
                              style={{ 
                                padding: '8px', 
                                borderLeft: `3px solid ${d.estadoGeneral === 'Excelente' ? '#4caf50' : d.estadoGeneral === 'Normal' ? '#2196f3' : '#ff9800'}`, 
                                background: 'var(--game-accent-light, #fafafa)', 
                                fontSize: '11px', 
                                borderRadius: 'var(--game-radius, 4px)',
                                cursor: esIAReporte ? 'pointer' : 'default',
                                transition: 'background 0.2s',
                                userSelect: 'none'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--game-text, #888)', marginBottom: '2px', fontSize: '9px', alignItems: 'center' }}>
                                <span>
                                  ESTADO: {d.estadoGeneral.toUpperCase()} • {fechaFmt} {esIAReporte && '🔍 Click para ver análisis'}
                                </span>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                                  {deleteConfirmId === d.id ? (
                                    <>
                                      <button 
                                        type="button"
                                        onClick={() => eliminarNotaFoliar(d.id)}
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
              )}
            </div>
          </div>



          {/* Botones de Acción */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px' }}>
            <button
              onClick={exportarFichaBotanica}
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
            <button
              onClick={startLuxmeter}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'var(--game-accent-light, rgba(76, 175, 80, 0.1))',
                color: 'var(--game-text-bright, #4caf50)',
                border: '1.5px solid var(--game-border-color, #4caf50)',
                borderRadius: 'var(--game-radius, 8px)',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'var(--game-font, sans-serif)'
              }}
            >
              Medir Luz ☀️
            </button>
            <button
              onClick={runChefIA}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'var(--game-accent-light, rgba(76, 175, 80, 0.1))',
                color: 'var(--game-text-bright, #4caf50)',
                border: '1.5px solid var(--game-border-color, #4caf50)',
                borderRadius: 'var(--game-radius, 8px)',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'var(--game-font, sans-serif)'
              }}
            >
              Chef Nutricional 🌱
            </button>
          </div>

          {/* MODAL DE DOBLE CONFIRMACIÓN DE BORRADO */}
          {showDeleteConfirm && (
            <div className="modal-backdrop" style={{
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
              <div className="confirm-modal-content" style={{
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
                <h4 style={{ margin: '0 0 12px 0', color: '#c62828', fontSize: '18px', fontFamily: 'var(--game-font, sans-serif)' }}>⚠️ ¿Eliminar Planta?</h4>
                <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--game-text, #555)', fontFamily: 'var(--game-font, sans-serif)', lineHeight: '1.4' }}>
                  ¿Estás seguro de que deseas eliminar permanentemente el registro de <strong>{planta.nombreComun}</strong>? Esta acción no se puede deshacer.
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
            <div className="modal-backdrop" style={{
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
              <div className="report-modal-content" style={{
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
                      🍂 Diagnóstico Fitosanitario por IA
                    </h3>
                    <span style={{ fontSize: '11px', color: '#666', marginTop: '2px', fontWeight: '500' }}>
                      Fecha: {iaReporteModal.fecha}
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
                  
                  <div style={{ background: 'rgba(76, 175, 80, 0.06)', borderLeft: '4px solid #4caf50', padding: '12px', borderRadius: '4px' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#388e3c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📋 Diagnóstico Fitosanitario
                    </h4>
                    <p style={{ margin: 0, lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{iaReporteModal.diagnostico}</p>
                  </div>

                  <div style={{ background: 'rgba(33, 150, 243, 0.06)', borderLeft: '4px solid #2196f3', padding: '12px', borderRadius: '4px' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#1976d2', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      💊 Tratamiento Sugerido
                    </h4>
                    <p style={{ margin: 0, lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{iaReporteModal.tratamiento}</p>
                  </div>

                  <div style={{ background: 'rgba(255, 152, 0, 0.06)', borderLeft: '4px solid #ff9800', padding: '12px', borderRadius: '4px' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#f57c00', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🛡️ Aislamiento Sugerido
                    </h4>
                    <p style={{ margin: 0, lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{iaReporteModal.aislamiento}</p>
                  </div>

                </div>

                {/* Botón inferior de cerrar y TTS */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', width: '100%' }}>
                  <TTSButton
                    text={`Diagnóstico: ${iaReporteModal.diagnostico}. Tratamiento sugerido: ${iaReporteModal.tratamiento}. ${iaReporteModal.aislamiento ? `Aislamiento sugerido: ${iaReporteModal.aislamiento}` : ''}`}
                    theme={theme}
                    size="normal"
                  />
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
                      fontFamily: 'var(--game-font, sans-serif)'
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <ReportGeneratorModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        item={planta}
        type="plant"
      />

      {/* MODAL CHEF NUTRICIONAL IA — PLANTAS */}
      {showChefModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setShowChefModal(false)}>
          <div className="chef-modal-content" style={{ background: 'var(--game-card-bg, #fff)', borderRadius: theme === 'gaming' ? '0px' : '16px', padding: '24px', maxWidth: '480px', width: '90%', maxHeight: '80vh', overflowY: 'auto', border: 'var(--game-border, none)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <strong style={{ fontSize: '15px', color: 'var(--game-text-bright)', fontFamily: 'var(--game-font, sans-serif)' }}>🍽️ Chef Nutricional IA — {planta.nombreComun}</strong>
              <button type="button" onClick={() => setShowChefModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--game-text)' }}>✕</button>
            </div>
            {chefLoading ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--game-text)', fontSize: '13px', fontStyle: 'italic' }}>⏳ Consultando con el agrónomo especialista...</div>
            ) : chefRecipe ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <TTSButton text={chefRecipe.receta} theme={theme} />
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', lineHeight: '1.6', color: 'var(--game-text-bright)', fontFamily: 'var(--game-font, sans-serif)', margin: 0 }}>{chefRecipe.receta}</pre>
                {chefRecipe.advertencia && (
                  <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', borderRadius: '6px', fontSize: '11px', color: '#92400e' }}>
                    ⚠️ {chefRecipe.advertencia}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL DEL LUXÓMETRO DOMÉSTICO */}
      {showLuxmeter && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(8,6,13,0.7)', backdropFilter: 'blur(8px)',
          zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', boxSizing: 'border-box'
        }} className="modal-backdrop no-print">
          <div className="luxometer-modal-content" style={{
            background: 'var(--bg, #fff)',
            border: '1px solid var(--border, #e5e4e7)',
            borderRadius: '16px',
            width: '100%', maxWidth: '420px',
            padding: '24px', boxSizing: 'border-box',
            textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px',
            boxShadow: 'var(--shadow)'
          }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: 'var(--text-h, #08060d)', fontWeight: 800 }}>
                Luxómetro Doméstico ☀️
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text, #6b6375)' }}>
                Mide la radiación solar para optimizar la ubicación de la planta.
              </p>
            </div>

            {/* Video stream rendering if active */}
            {cameraActive && !cameraError ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '120px', height: '120px', borderRadius: '50%',
                  overflow: 'hidden', border: '3px solid var(--accent, #8f20e6)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)', background: '#000'
                }}>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </div>
                <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🟢 Cámara Activa (Analizando Luz)
                </span>
                <canvas ref={canvasRef} width="20" height="20" style={{ display: 'none' }} />
              </div>
            ) : (
              <div style={{ 
                padding: '16px', borderRadius: '12px', 
                background: 'var(--accent-bg, rgba(143,32,230,0.05))', 
                border: '1px solid var(--accent-border, rgba(143,32,230,0.2))',
                fontSize: '11.5px', color: 'var(--text, #6b6375)' 
              }}>
                {cameraError ? (
                  <p style={{ margin: '0 0 10px 0', color: '#b91c1c', fontWeight: '500' }}>⚠️ {cameraError}</p>
                ) : (
                  <p style={{ margin: '0 0 10px 0' }}>Iniciando cámara...</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-h)' }}>Simulación manual de Luxes:</label>
                  <input 
                    type="range" 
                    min="200" 
                    max="12000" 
                    value={luxValue} 
                    onChange={(e) => setLuxValue(parseInt(e.target.value))} 
                    style={{ width: '100%', accentColor: 'var(--accent, #8f20e6)' }}
                  />
                </div>
              </div>
            )}

            {/* Dial del luxómetro */}
            <div style={{
              background: 'var(--code-bg, #f4f3ec)',
              borderRadius: '12px', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent, #8f20e6)' }}>
                {luxValue.toLocaleString('es-ES')} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text)' }}>Lux</span>
              </div>
              
              <div style={{
                fontSize: '12px', fontWeight: 'bold',
                padding: '4px 10px', borderRadius: '20px', display: 'inline-block', margin: '0 auto',
                background: luxValue < 1500 ? '#f1f5f9' : (luxValue < 5000 ? '#fff7ed' : '#f0fdf4'),
                color: luxValue < 1500 ? '#475569' : (luxValue < 5000 ? '#c2410c' : '#16a34a'),
                border: '1px solid ' + (luxValue < 1500 ? '#cbd5e1' : (luxValue < 5000 ? '#fed7aa' : '#bbf7d0'))
              }}>
                {luxValue < 1500 ? '🌑 Sombra' : (luxValue < 5000 ? '⛅ Semisombra' : '☀️ Sol Directo')}
              </div>

              <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: 'var(--text, #6b6375)', lineHeight: 1.4 }}>
                {luxValue < 1500 
                  ? 'Intensidad baja. Apto para plantas de sombra (Helechos, Calatheas, Potos). Evita colocar aquí plantas de sol.'
                  : luxValue < 5000 
                    ? 'Luz filtrada/brillante. Ideal para la mayoría de plantas tropicales de interior (Monstera, Ficus, Pilea).'
                    : 'Luz solar intensa. Óptimo para Suculentas, Cactus, plantas aromáticas y huerto doméstico.'
                }
              </p>
            </div>

            <button 
              type="button" 
              onClick={closeLuxmeter}
              style={{
                width: '100%', padding: '10px',
                background: 'var(--accent, #8f20e6)', color: 'white',
                border: 'none', borderRadius: '8px',
                fontWeight: 'bold', fontSize: '13.5px', cursor: 'pointer'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showAvatarLightbox && planta.fotoUrl && (
        <ImageLightbox
          imageUrl={planta.fotoUrl}
          onClose={() => setShowAvatarLightbox(false)}
          title={planta.nombreComun}
          theme={theme}
        />
      )}
    </div>
  );
};

export const PlantCard = React.memo(PlantCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.theme === nextProps.theme &&
    JSON.stringify(prevProps.planta) === JSON.stringify(nextProps.planta) &&
    JSON.stringify(prevProps.clima) === JSON.stringify(nextProps.clima)
  );
});
