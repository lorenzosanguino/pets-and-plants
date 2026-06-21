/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity */
import React, { useState } from 'react';
import type { AnimalExotico, EventoPasado, EntradaDiarioClinico } from '../database/types';
import { LocalDatabase } from '../database/db';
import { safeUUID } from '../utils/uuid';
import { CardPhotoManager } from './CardPhotoManager';
import { IAQuotaManager } from '../utils/iaQuota';
import { ImageLightbox } from './ImageLightbox';
import { GeminiAPIService } from '../services/geminiAPI';
import { ReportGeneratorModal } from './ReportGeneratorModal';
import { BiometricChart } from './BiometricChart';
import { TTSButton } from '../utils/useTTS';
import { useTranslations } from '../utils/i18n';
import { playSoundSuccess } from '../utils/audioFeedback';

interface ExoticCardProps {
  exotico: AnimalExotico;
  onUpdate: () => void;
  onOpenScanner?: (mode: 'registrar_mascota' | 'salud_mascota' | 'registrar_planta' | 'enfermedad_planta' | 'registrar_exotico' | 'salud_exotico', assetId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const ExoticCardComponent: React.FC<ExoticCardProps> = ({ exotico, onUpdate, onOpenScanner, isExpanded: propExpanded, onToggleExpand }) => {
  const { locale } = useTranslations();
  const cuota = IAQuotaManager.obtenerEstadoCuota();
  const [localExpanded, setLocalExpanded] = useState(false);
  const isExpanded = propExpanded !== undefined ? propExpanded : localExpanded;
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);

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

  // Chef Nutricional IA para exóticos
  const [showChefModal, setShowChefModal] = useState(false);
  const [chefLoading, setChefLoading] = useState(false);
  const [chefRecipe, setChefRecipe] = useState<{ receta: string; advertencia?: string } | null>(null);

  const runChefIA = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setChefLoading(true);
    setChefRecipe(null);
    setShowChefModal(true);

    const pesoActual = exotico.registroPeso && exotico.registroPeso.length > 0
      ? exotico.registroPeso[exotico.registroPeso.length - 1].pesoKg
      : null;

    const promptText = locale === 'en'
      ? `Act as an exotic animal veterinarian and herpetology specialist. Design a detailed feeding plan for:
Name: ${exotico.nombre}
Species: ${exotico.especie}${exotico.tipoEspecifico ? ` (${exotico.tipoEspecifico})` : ''}
${pesoActual ? `Weight: ${pesoActual} kg` : ''}
Terrarium temperature: ${exotico.temperaturaTerrario || 26}°C
Terrarium humidity: ${exotico.humedadTerrario || 60}%
Explain in English which foods are suitable, how often, and what supplements are needed. Also indicate forbidden foods.
IMPORTANT: Be very brief, concise, and direct. Structure the response in short bullet points, omitting long introductions or comments to speed up the response.`
      : `Actúa como veterinario especialista en animales exóticos y herpetología. Diseña un plan de alimentación detallado para:
Nombre: ${exotico.nombre}
Especie: ${exotico.especie}${exotico.tipoEspecifico ? ` (${exotico.tipoEspecifico})` : ''}
${pesoActual ? `Peso: ${pesoActual} kg` : ''}
Temperatura del terrario: ${exotico.temperaturaTerrario || 26}°C
Humedad del terrario: ${exotico.humedadTerrario || 60}%
Explica en español qué alimentos son adecuados, con qué frecuencia, y qué suplementos necesita. Indica también alimentos prohibidos.
IMPORTANTE: Sé muy breve, conciso y directo. Estructura la respuesta en puntos cortos, omitiendo introducciones o comentarios largos para acelerar la respuesta.`;

    try {
      const res = await GeminiAPIService.analizarImagen(null, 'chef_exoticos', promptText);
      setChefRecipe({
        receta: res.diagnostico + (res.tratamiento ? (locale === 'en' ? `\n\nAdditional recommendations:\n${res.tratamiento}` : `\n\nRecomendaciones adicionales:\n${res.tratamiento}`) : ''),
        advertencia: res.advertencia
      });
    } catch {
      setChefRecipe({
        receta: locale === 'en'
          ? `[Offline Mode - Estimated Guide for ${exotico.especie}]\n\nPlease consult an exotic animal veterinarian to obtain a personalized diet.`
          : `[Modo Offline - Guía estimada para ${exotico.especie}]\n\nConsulta a un veterinario especializado en animales exóticos para obtener una dieta personalizada.`,
        advertencia: locale === 'en'
          ? 'Enable internet connection or enter your API Key in Settings to get detailed AI recommendations.'
          : 'Activa la conexión o introduce tu API Key en Ajustes para obtener recomendaciones detalladas por IA.'
      });
    } finally {
      setChefLoading(false);
    }
  };

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
  const [nuevoPeso, setNuevoPeso] = useState('');
  const [nuevoCrecimiento, setNuevoCrecimiento] = useState('');

  const registrarPeso = async (e: React.FormEvent) => {
    e.preventDefault();
    const pesoKg = parseFloat(nuevoPeso); // Representa gramos para exóticos
    if (isNaN(pesoKg) || pesoKg <= 0) return;

    const nuevoRegistro = {
      fecha: new Date().toISOString(),
      pesoKg
    };

    const exoticoActualizado = {
      ...exotico,
      registroPeso: [...(exotico.registroPeso || []), nuevoRegistro]
    };

    await LocalDatabase.saveExotico(exoticoActualizado);
    try { playSoundSuccess(); } catch {}
    setNuevoPeso('');
    onUpdate();
  };

  const registrarCrecimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    const alturaCm = parseFloat(nuevoCrecimiento);
    if (isNaN(alturaCm) || alturaCm <= 0) return;

    const nuevoRegistro = {
      fecha: new Date().toISOString(),
      alturaCm
    };

    const exoticoActualizado = {
      ...exotico,
      registroCrecimiento: [...(exotico.registroCrecimiento || []), nuevoRegistro]
    };

    await LocalDatabase.saveExotico(exoticoActualizado);
    try { playSoundSuccess(); } catch {}
    setNuevoCrecimiento('');
    onUpdate();
  };

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
    if (editingChip) setEditingChip(false);
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
    setIsReportOpen(true);
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

  const renderExoticMicroClimaBackground = () => {
    const temp = exotico.temperaturaTerrario;
    const hum = exotico.humedadTerrario;

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

    if (temp > 28) {
      backgroundStyle.background = 'linear-gradient(135deg, rgba(244, 81, 30, 0.05) 0%, transparent 80%)';
    } else if (hum > 70) {
      backgroundStyle.background = 'linear-gradient(135deg, rgba(38, 166, 154, 0.04) 0%, transparent 80%)';
    } else if (hum < 40) {
      backgroundStyle.background = 'linear-gradient(135deg, rgba(161, 136, 127, 0.05) 0%, transparent 80%)';
    }

    return (
      <div style={backgroundStyle}>
        {temp > 28 && (
          <svg width="100%" height="100%" style={{ opacity: 0.08 }}>
            <style>{`
              @keyframes heatwave {
                0% { transform: translateY(10px) skewX(2deg); opacity: 0.3; }
                50% { transform: translateY(0px) skewX(-2deg); opacity: 0.7; }
                100% { transform: translateY(-10px) skewX(2deg); opacity: 0.3; }
              }
              .hw1 { animation: heatwave 3.5s infinite ease-in-out; }
              .hw2 { animation: heatwave 4.5s infinite ease-in-out; animation-delay: 1.5s; }
            `}</style>
            <path className="hw1" d="M10,120 Q30,70 50,120 T90,120 T130,120" fill="none" stroke="#ff8f00" strokeWidth="2" />
            <path className="hw2" d="M110,120 Q130,70 150,120 T190,120 T230,120" fill="none" stroke="#ff6f00" strokeWidth="2" />
          </svg>
        )}
        {hum > 70 && (
          <svg width="100%" height="100%" style={{ opacity: 0.12 }}>
            <style>{`
              @keyframes floatMist {
                0% { transform: translateY(110%) scale(0.8); opacity: 0; }
                50% { opacity: 0.8; }
                100% { transform: translateY(-10%) scale(1.4); opacity: 0; }
              }
              .m1 { animation: floatMist 5s infinite ease-in-out; }
              .m2 { animation: floatMist 6s infinite ease-in-out; animation-delay: 2s; }
            `}</style>
            <circle className="m1" cx="30%" cy="90%" r="8" fill="#80cbc4" />
            <circle className="m2" cx="70%" cy="90%" r="10" fill="#b2dfdb" />
          </svg>
        )}
        {hum < 40 && (
          <svg width="100%" height="100%" style={{ opacity: 0.12 }}>
            <style>{`
              @keyframes floatDust {
                0% { transform: translateY(110%) translateX(0); opacity: 0; }
                50% { opacity: 0.8; }
                100% { transform: translateY(-10%) translateX(10px); opacity: 0; }
              }
              .d1 { animation: floatDust 6s infinite ease-in-out; }
              .d2 { animation: floatDust 8s infinite ease-in-out; animation-delay: 2.5s; }
            `}</style>
            <circle className="d1" cx="25%" cy="85%" r="3" fill="#a1887f" />
            <circle className="d2" cx="75%" cy="85%" r="2" fill="#8d6e63" />
          </svg>
        )}
      </div>
    );
  };

  return (
    <div id={`card-${exotico.id}`} className={`glass-card ${exotico.temperaturaTerrario > 28 || exotico.humedadTerrario < 40 ? 'has-critical-alert' : ''}`} style={{
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
      color: 'var(--game-text, #333)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {renderExoticMicroClimaBackground()}
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
                <img
                  src={exotico.fotoUrl}
                  alt={exotico.nombre}
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
            onEditCard={() => {
              setEditNombre(exotico.nombre);
              setEditEspecie(exotico.especie);
              setEditTipoEspecifico(exotico.tipoEspecifico);
              setIsEditing(true);
            }}
            onDeleteCard={() => {
              setShowDeleteConfirm(true);
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

          {/* Evolución Biométrica (Peso y Longitud) */}
          <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: '0', fontSize: '13px', color: 'var(--game-text-bright, #333)', fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)' }}>
              📈 Evolución Biométrica (Peso y Longitud)
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {/* Weight chart & form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--game-text)' }}>Historial de Peso (g)</span>
                {(() => {
                  const chartData = (exotico.registroPeso || []).map(r => ({
                    fecha: r.fecha,
                    valor: r.pesoKg
                  }));
                  let accentColor = '#ff8f00'; // exotics orange
                  if (theme === 'kawaii') accentColor = '#ff6b8b';
                  else if (theme === 'gaming') accentColor = '#66fcf1';
                  else if (theme === 'vintage') accentColor = '#b8860b';
                  return (
                    <>
                      <BiometricChart data={chartData} yLabel="Peso (g)" color={accentColor} theme={theme as any} />
                      <form onSubmit={registrarPeso} style={{ display: 'flex', gap: '6px', margin: '4px 0' }} className="no-print">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Peso (g)"
                          value={nuevoPeso}
                          onChange={(e) => setNuevoPeso(e.target.value)}
                          style={{ flex: 1, minWidth: 0, padding: '6px 10px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '12px', background: '#fff', color: '#000' }}
                        />
                        <button type="submit" style={{ padding: '6px 12px', background: 'var(--game-accent, #ff8f00)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>✓</button>
                      </form>
                    </>
                  );
                })()}
              </div>

              {/* Length chart & form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--game-text)' }}>Historial de Longitud (cm)</span>
                {(() => {
                  const chartData = (exotico.registroCrecimiento || []).map(r => ({
                    fecha: r.fecha,
                    valor: r.alturaCm
                  }));
                  let accentColor = '#ff8f00';
                  if (theme === 'kawaii') accentColor = '#ff6b8b';
                  else if (theme === 'gaming') accentColor = '#66fcf1';
                  else if (theme === 'vintage') accentColor = '#b8860b';
                  return (
                    <>
                      <BiometricChart data={chartData} yLabel="Longitud (cm)" color={accentColor} theme={theme as any} />
                      <form onSubmit={registrarCrecimiento} style={{ display: 'flex', gap: '6px', margin: '4px 0' }} className="no-print">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Longitud (cm)"
                          value={nuevoCrecimiento}
                          onChange={(e) => setNuevoCrecimiento(e.target.value)}
                          style={{ flex: 1, minWidth: 0, padding: '6px 10px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '12px', background: '#fff', color: '#000' }}
                        />
                        <button type="submit" style={{ padding: '6px 12px', background: 'var(--game-accent, #ff8f00)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>✓</button>
                      </form>
                    </>
                  );
                })()}
              </div>
            </div>
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
                    let diagnostico: string;
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
              onClick={runChefIA}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--game-accent-light, rgba(25,118,210,0.1))',
                color: 'var(--game-text-bright, #1976d2)',
                border: '1.5px solid var(--game-border-color, #1976d2)',
                borderRadius: 'var(--game-radius, 6px)',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'var(--game-font, sans-serif)'
              }}
            >
              Chef Nutricional 🍽️
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
                  ? `❌ Límite diario alcanzado (Espera ${IAQuotaManager.obtenerMensajeTiempoRestante()} o añade tu API Key en Ajustes ⚙️)` 
                  : `🔑 Te quedan ${cuota.restantes} análisis de IA hoy`}
            </span>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación */}
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

            {/* Botón inferior de cerrar y TTS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', width: '100%' }}>
              <TTSButton
                text={`Diagnóstico: ${iaReporteModal.diagnostico}. Tratamiento sugerido: ${iaReporteModal.tratamiento}. ${iaReporteModal.advertencia ? `Advertencia: ${iaReporteModal.advertencia}` : ''}`}
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
      <ReportGeneratorModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        item={exotico}
        type="exotic"
      />

      {/* MODAL CHEF NUTRICIONAL IA — EXÓTICOS */}
      {showChefModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setShowChefModal(false)}>
          <div className="chef-modal-content" style={{ background: 'var(--game-card-bg, #fff)', borderRadius: theme === 'gaming' ? '0px' : '16px', padding: '24px', maxWidth: '480px', width: '90%', maxHeight: '80vh', overflowY: 'auto', border: 'var(--game-border, none)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <strong style={{ fontSize: '15px', color: 'var(--game-text-bright)', fontFamily: 'var(--game-font, sans-serif)' }}>🍽️ Chef Nutricional IA — {exotico.nombre}</strong>
              <button type="button" onClick={() => setShowChefModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--game-text)' }}>✕</button>
            </div>
            {chefLoading ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--game-text)', fontSize: '13px', fontStyle: 'italic' }}>⏳ Consultando con el especialista en exóticos...</div>
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

      {showAvatarLightbox && exotico.fotoUrl && (
        <ImageLightbox
          imageUrl={exotico.fotoUrl}
          onClose={() => setShowAvatarLightbox(false)}
          title={exotico.nombre}
          theme={theme}
        />
      )}
    </div>
  );
};

export const ExoticCard = React.memo(ExoticCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.exotico.id === nextProps.exotico.id &&
    prevProps.exotico.nombre === nextProps.exotico.nombre &&
    prevProps.exotico.especie === nextProps.exotico.especie &&
    prevProps.exotico.tipoEspecifico === nextProps.exotico.tipoEspecifico &&
    prevProps.exotico.temperaturaTerrario === nextProps.exotico.temperaturaTerrario &&
    prevProps.exotico.humedadTerrario === nextProps.exotico.humedadTerrario &&
    prevProps.exotico.ultimaAlimentacion === nextProps.exotico.ultimaAlimentacion &&
    prevProps.exotico.intervaloAlimentacionDias === nextProps.exotico.intervaloAlimentacionDias &&
    prevProps.exotico.fotoUrl === nextProps.exotico.fotoUrl &&
    JSON.stringify(prevProps.exotico.fotos) === JSON.stringify(nextProps.exotico.fotos) &&
    JSON.stringify(prevProps.exotico.diarioExotico) === JSON.stringify(nextProps.exotico.diarioExotico) &&
    JSON.stringify(prevProps.exotico.diagnosticosIA) === JSON.stringify(nextProps.exotico.diagnosticosIA)
  );
});
