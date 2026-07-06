/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity */
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import type { Mascota, EspecieMascota } from '../database/types';
import { LocalDatabase } from '../database/db';
import { safeUUID } from '../utils/uuid';
import { GeminiAPIService } from '../services/geminiAPI';
import { CardPhotoManager } from './CardPhotoManager';
import { calcularEdadMascota } from '../utils/age';
import { ImageLightbox } from './ImageLightbox';
import { IAQuotaManager } from '../utils/iaQuota';
import { ReportGeneratorModal } from './ReportGeneratorModal';
const BiometricChart = lazy(() => import('./BiometricChart').then(m => ({ default: m.BiometricChart })));
import { TTSButton } from '../utils/useTTS';
import { useTranslations } from '../utils/i18n';
import { playSoundSuccess } from '../utils/audioFeedback';

interface PetCardProps {
  mascota: Mascota;
  onUpdate: () => void;
  onOpenScanner?: (mode: 'salud_mascota', assetId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  theme?: string;
}

const PetCardComponent: React.FC<PetCardProps> = ({ mascota, onUpdate, onOpenScanner, isExpanded, onToggleExpand, theme: propTheme }) => {
  const { locale } = useTranslations();
  const traducirNombreVacuna = (name: string) => {
    if (locale !== 'en') return name;
    if (name === 'Trivalente Felina (1ª dosis)') return 'Feline Trivalent (1st dose)';
    if (name === 'Trivalente Felina (2ª dosis)') return 'Feline Trivalent (2nd dose)';
    if (name === 'Leucemia Felina') return 'Feline Leukemia';
    if (name === 'Rabia') return 'Rabies';
    if (name === 'Parvovirus') return 'Parvovirus';
    if (name === 'Moquillo') return 'Distemper';
    if (name === 'Adenovirus') return 'Adenovirus';
    if (name === 'Leptospirosis') return 'Leptospirosis';
    if (name === 'Bordetella') return 'Bordetella';
    return name;
  };
  const cuota = IAQuotaManager.obtenerEstadoCuota();
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = isExpanded !== undefined ? isExpanded : localExpanded;
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);
  const [heartSpeed, setHeartSpeed] = useState<'normal' | 'fast'>('normal');
  const acelerarLatido = () => {
    setHeartSpeed('fast');
    setTimeout(() => {
      setHeartSpeed('normal');
    }, 1200);
  };

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

  // Innovation features states
  const [activeTrainingTrick, setActiveTrainingTrick] = useState<string | null>(null);
  const [trainingTimer, setTrainingTimer] = useState<number>(0);
  const [showConfettiTrick, setShowConfettiTrick] = useState<string | null>(null);
  const [showChefModal, setShowChefModal] = useState(false);
  const [chefLoading, setChefLoading] = useState(false);
  const [chefRecipe, setChefRecipe] = useState<{ receta: string; advertencia?: string } | null>(null);
  // Estado local para deparasitación — refleja cambios inmediatamente sin esperar al padre
  const [localVacunasChecklist, setLocalVacunasChecklist] = useState<string[]>(() => mascota.vacunasChecklist || []);

  useEffect(() => {
    setLocalVacunasChecklist(mascota.vacunasChecklist || []);
  }, [mascota.vacunasChecklist]);

  const toggleExpanded = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setLocalExpanded(!localExpanded);
    }
  };

  const [nuevoPeso, setNuevoPeso] = useState('');

  // States for Vaccine Form (P4)
  const [vacunaTipo, setVacunaTipo] = useState<string>('Trivalente');
  const [vacunaPersonalizada, setVacunaPersonalizada] = useState('');
  const [vacunaLote, setVacunaLote] = useState('');
  const [vacunaFecha, setVacunaFecha] = useState('');
  const [vacunaProxima, setVacunaProxima] = useState('');

  // States for Medication Form
  const [medNombre, setMedNombre] = useState('');
  const [medDosis, setMedDosis] = useState('');
  const [medFrecuencia, setMedFrecuencia] = useState('Diario');
  const [medFrecuenciaPersonalizada, setMedFrecuenciaPersonalizada] = useState('');
  const [medFechaInicio, setMedFechaInicio] = useState(() => new Date().toISOString().split('T')[0]);
  const [medFechaFin, setMedFechaFin] = useState('');
  const [medHoraProxima, setMedHoraProxima] = useState(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Collapsible sections states
  const [showVacunas, setShowVacunas] = useState(false);
  const [showDesparasitacion, setShowDesparasitacion] = useState(false);
  const [showMedicacion, setShowMedicacion] = useState(false);
  const [showHistorialClinico, setShowHistorialClinico] = useState(false);
  
  const theme = propTheme || localStorage.getItem('petplant_game_theme') || 'nature';

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
    setIsReportOpen(true);
  };

  // Training timer countdown
  useEffect(() => {
    let intervalId: any;
    if (activeTrainingTrick && trainingTimer > 0) {
      intervalId = setInterval(() => {
        setTrainingTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [activeTrainingTrick, trainingTimer]);

  const runChefIA = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setChefLoading(true);
    setChefRecipe(null);
    setShowChefModal(true);

    const pesoActual = mascota.registroPeso && mascota.registroPeso.length > 0
      ? mascota.registroPeso[mascota.registroPeso.length - 1].pesoKg
      : 5;

    const especieTexto = mascota.especie === 'Felino' ? 'Gato (felino)' : mascota.especie === 'Canino' ? 'Perro (canino)' : mascota.especie;
    const promptText = locale === 'en'
      ? `Act as an expert veterinary animal nutritionist. Design a detailed homemade recipe (cooked or BARF) in grams and indicate the recommended daily calories (kcal) for:
Name: ${mascota.nombre}
Species: ${especieTexto === 'Gato (felino)' ? 'Cat (feline)' : especieTexto === 'Perro (canino)' ? 'Dog (canine)' : especieTexto}
Weight: ${pesoActual} kg
Activity: ${mascota.actividad || 'Moderate'}
Explain the recipe clearly in English, detailing the proportions in grams of proteins, vegetables, and supplements. If it is a cat, take into account its taurine needs.
IMPORTANT: Be very brief, concise, and direct. Structure the response in short bullet points, omitting long introductions or comments to speed up the response.`
      : `Actúa como veterinario experto en nutrición animal. Diseña una receta casera (cocinada o BARF) detallada en gramos e indica las calorías diarias recomendadas (kcal) para:
Nombre: ${mascota.nombre}
Especie: ${especieTexto}
Peso: ${pesoActual} kg
Actividad: ${mascota.actividad || 'Moderada'}
Explica la receta de forma clara en español, detallando las proporciones en gramos de proteínas, vegetales y complementos. Si es un gato, ten en cuenta sus necesidades de taurina.
IMPORTANTE: Sé muy breve, conciso y directo. Estructura la respuesta en puntos cortos, omitiendo introducciones o comentarios largos para acelerar la respuesta.`;

    try {
      const res = await GeminiAPIService.analizarImagen(
        null,
        'chef',
        promptText
      );
      setChefRecipe({
        receta: res.diagnostico + (res.tratamiento ? (locale === 'en' ? `\n\nPreparation Instructions:\n${res.tratamiento}` : `\n\nInstrucciones de Preparación:\n${res.tratamiento}`) : ''),
        advertencia: res.advertencia
      });
    } catch (err: any) {
      console.warn("Chef IA error, using offline builder:", err);
      const activityVal = mascota.actividad || 'Moderada';
      const kcal = Math.round(70 * Math.pow(pesoActual, 0.75) * (activityVal === 'Alta' ? 1.6 : activityVal === 'Baja' ? 1.2 : 1.4));
      const proteina = Math.round(pesoActual * 12);
      const verduras = Math.round(pesoActual * 4);
      const carbohidratos = Math.round(pesoActual * 3);
      setChefRecipe({
        receta: locale === 'en'
          ? `[Offline Mode - Estimated Recipe]
Estimated daily energy requirement: ${kcal} Kcal/day.

Daily recommended ingredients:
🍗 Lean chicken or turkey: ${proteina}g
🥕 Steamed vegetables (Carrot, Pumpkin): ${verduras}g
🍚 Rice or cooked potato: ${carbohidratos}g
🦴 Salmon oil / Calcium: 1 teaspoon.

Instructions: Cook proteins and vegetables without salt, garlic, or onion. Mix and serve lukewarm.`
          : `[Modo Offline - Receta Estimada]
Requerimiento energético estimado: ${kcal} Kcal/día.

Ingredientes recomendados diariamente:
🍗 Carne de pollo o pavo magra: ${proteina}g
🥕 Verduras al vapor (Zanahoria, Calabaza): ${verduras}g
🍚 Arroz o patata cocida: ${carbohidratos}g
🦴 Aceite de salmón / Calcio: 1 cucharadita.

Instrucciones: Cocinar las proteínas y verduras sin sal, ajos o cebolla. Mezclar y servir templado.`,
        advertencia: locale === 'en'
          ? 'This recipe is an offline approximation. Enable internet or enter your API key in Settings to get detailed AI suggestions.'
          : 'Esta receta es una aproximación sin conexión. Activa el internet o ingresa tu clave API para obtener sugerencias detalladas por IA.'
      });
    } finally {
      setChefLoading(false);
    }
  };

  const iniciarEntrenamiento = (e: React.MouseEvent, truco: string) => {
    e.stopPropagation();
    setActiveTrainingTrick(truco);
    setTrainingTimer(10);
  };

  const registrarResultadoEntrenamiento = async (delta: number) => {
    if (!activeTrainingTrick) return;
    
    const progresoActual = mascota.adiestramientoProgress?.[activeTrainingTrick] || 0;
    const nuevoProgreso = Math.min(100, Math.max(0, progresoActual + delta));

    const mascotaActualizada: Mascota = {
      ...mascota,
      adiestramientoProgress: {
        ...(mascota.adiestramientoProgress || {}),
        [activeTrainingTrick]: nuevoProgreso
      }
    };

    await LocalDatabase.saveMascota(mascotaActualizada);
    localStorage.setItem('petplant_db_last_updated', Date.now().toString());
    try { playSoundSuccess(); } catch { /* Ignore audio playback error */ }
    onUpdate();

    if (nuevoProgreso === 100 && progresoActual < 100) {
      setShowConfettiTrick(activeTrainingTrick);
      setTimeout(() => setShowConfettiTrick(null), 4000);
    }

    setActiveTrainingTrick(null);
  };

  const trucosEntrenamiento = ['Sienta / Sentarse', 'Quieto', 'Ven aquí', 'Dar la pata', 'Caminar al lado'];

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
    try { playSoundSuccess(); } catch { /* Ignore audio playback error */ }
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

  const getVaccineRecordForChecklist = (vName: string) => {
    const historial = mascota.historialVacunas || [];
    
    if (vName === 'Trivalente Felina (1ª dosis)') {
      return historial.filter(v => v.vacuna.toLowerCase() === 'trivalente' || v.vacuna.toLowerCase().includes('trivalente felina (1ª dosis)'))[0];
    }
    if (vName === 'Trivalente Felina (2ª dosis)') {
      return historial.filter(v => v.vacuna.toLowerCase() === 'trivalente' || v.vacuna.toLowerCase().includes('trivalente felina (2ª dosis)'))[1];
    }
    if (vName === 'Leucemia Felina') {
      return historial.find(v => v.vacuna.toLowerCase() === 'leucemia' || v.vacuna.toLowerCase().includes('leucemia felina'));
    }
    if (vName === 'Rabia') {
      return historial.find(v => v.vacuna.toLowerCase() === 'rabia');
    }
    
    // Canino (Parvovirus, Moquillo, Adenovirus, Rabia, Leptospirosis, Bordetella)
    if (vName === 'Parvovirus') {
      return historial.find(v => v.vacuna.toLowerCase() === 'parvovirus' || (v.vacuna === 'Otras' && v.vacunaPersonalizada?.toLowerCase().includes('parvovirus')));
    }
    if (vName === 'Moquillo') {
      return historial.find(v => v.vacuna.toLowerCase() === 'moquillo' || (v.vacuna === 'Otras' && v.vacunaPersonalizada?.toLowerCase().includes('moquillo')));
    }
    if (vName === 'Adenovirus') {
      return historial.find(v => v.vacuna.toLowerCase() === 'adenovirus' || (v.vacuna === 'Otras' && v.vacunaPersonalizada?.toLowerCase().includes('adenovirus')));
    }
    if (vName === 'Leptospirosis') {
      return historial.find(v => v.vacuna.toLowerCase() === 'leptospirosis' || (v.vacuna === 'Otras' && v.vacunaPersonalizada?.toLowerCase().includes('leptospirosis')));
    }
    if (vName === 'Bordetella') {
      return historial.find(v => v.vacuna.toLowerCase() === 'bordetella' || (v.vacuna === 'Otras' && v.vacunaPersonalizada?.toLowerCase().includes('bordetella')));
    }
    
    return undefined;
  };

  const prellenarFormularioVacuna = (vName: string) => {
    let tipo = 'Otras';
    let personalizada = '';
    
    if (vName === 'Trivalente Felina (1ª dosis)' || vName === 'Trivalente Felina (2ª dosis)') {
      tipo = 'Trivalente';
    } else if (vName === 'Leucemia Felina') {
      tipo = 'Leucemia';
    } else if (vName === 'Rabia') {
      tipo = 'Rabia';
    } else {
      const standardCanine = ['Parvovirus', 'Moquillo', 'Adenovirus', 'Leptospirosis', 'Bordetella'];
      if (standardCanine.includes(vName)) {
        tipo = vName;
      } else {
        personalizada = vName;
      }
    }
    
    setVacunaTipo(tipo);
    setVacunaPersonalizada(personalizada);
    setVacunaFecha(new Date().toISOString().split('T')[0]); // hoy
    setVacunaLote('');
    setVacunaProxima('');
    
    setTimeout(() => {
      const loteInput = document.getElementById(`vacuna-lote-${mascota.id}`);
      if (loteInput) {
        loteInput.focus();
        loteInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const toggleVacunaCheck = async (vName: string) => {
    const isAlreadyChecked = (mascota.vacunasChecklist || []).includes(vName) || !!getVaccineRecordForChecklist(vName);
    if (isAlreadyChecked) return;

    const confirmar = window.confirm(`¿Estás seguro/a de marcar "${vName}" como colocada? Se creará un registro rápido en el historial clínico.`);
    if (!confirmar) return;

    let tipo = 'Otras';
    let personalizada = undefined;
    if (vName === 'Trivalente Felina (1ª dosis)' || vName === 'Trivalente Felina (2ª dosis)') {
      tipo = 'Trivalente';
    } else if (vName === 'Leucemia Felina') {
      tipo = 'Leucemia';
    } else if (vName === 'Rabia') {
      tipo = 'Rabia';
    } else {
      const standardCanine = ['Parvovirus', 'Moquillo', 'Adenovirus', 'Leptospirosis', 'Bordetella'];
      if (standardCanine.includes(vName)) {
        tipo = vName;
      } else {
        personalizada = vName;
      }
    }

    const nuevaVacuna = {
      fecha: new Date().toISOString(),
      vacuna: tipo,
      lote: 'Rápido',
      vacunaPersonalizada: personalizada
    };

    const currentChecklist = mascota.vacunasChecklist || [];
    const updatedChecklist = currentChecklist.includes(vName) ? currentChecklist : [...currentChecklist, vName];
    const updatedHistorial = [...(mascota.historialVacunas || []), nuevaVacuna];

    const mascotaActualizada: Mascota = {
      ...mascota,
      vacunasChecklist: updatedChecklist,
      historialVacunas: updatedHistorial
    };

    await LocalDatabase.saveMascota(mascotaActualizada);
    onUpdate();
  };

  const agregarRegistroVacuna = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vacunaLote.trim() || !vacunaFecha) {
      alert("Por favor rellena la fecha y el número de lote.");
      return;
    }
    if (vacunaTipo === 'Otras' && !vacunaPersonalizada.trim()) {
      alert("Por favor especifica el nombre de la vacuna.");
      return;
    }

    const nuevaVacuna = {
      fecha: new Date(vacunaFecha).toISOString(),
      vacuna: vacunaTipo,
      lote: vacunaLote,
      proximaDosis: vacunaProxima ? new Date(vacunaProxima).toISOString() : undefined,
      vacunaPersonalizada: vacunaTipo === 'Otras' ? vacunaPersonalizada : undefined
    };

    const historialActualizado = [...(mascota.historialVacunas || []), nuevaVacuna];
    
    // Determinar nombre del checklist correspondiente
    let nameForChecklist = vacunaTipo;
    if (vacunaTipo === 'Otras') {
      nameForChecklist = vacunaPersonalizada;
    } else if (vacunaTipo === 'Trivalente') {
      const countTrivalente = (mascota.historialVacunas || []).filter(v => v.vacuna === 'Trivalente').length;
      nameForChecklist = countTrivalente === 0 ? 'Trivalente Felina (1ª dosis)' : 'Trivalente Felina (2ª dosis)';
    } else if (vacunaTipo === 'Leucemia') {
      nameForChecklist = 'Leucemia Felina';
    }

    const currentChecklist = mascota.vacunasChecklist || [];
    const updatedChecklist = currentChecklist.includes(nameForChecklist)
      ? currentChecklist
      : [...currentChecklist, nameForChecklist];

    const mascotaActualizada: Mascota = {
      ...mascota,
      historialVacunas: historialActualizado,
      vacunasChecklist: updatedChecklist
    };

    await LocalDatabase.saveMascota(mascotaActualizada);
    
    // Reset form states
    setVacunaPersonalizada('');
    setVacunaLote('');
    setVacunaFecha('');
    setVacunaProxima('');
    
    // Reset default select value
    if (mascota.especie === 'Felino') setVacunaTipo('Trivalente');
    else if (mascota.especie === 'Canino') setVacunaTipo('Parvovirus');
    else setVacunaTipo('Otras');

    onUpdate();
    alert("Vacuna registrada con éxito en el historial.");
  };

  const eliminarRegistroVacuna = async (index: number) => {
    const confirmar = window.confirm("¿Estás seguro de que deseas eliminar esta vacuna del historial clínico?");
    if (!confirmar) return;

    const historial = mascota.historialVacunas || [];
    const vacunaAEliminar = historial[index];
    const nuevoHistorial = historial.filter((_, idx) => idx !== index);

    let nuevosChecklist = mascota.vacunasChecklist || [];
    if (vacunaAEliminar) {
      let vName = '';
      if (vacunaAEliminar.vacuna === 'Trivalente') {
        const trivalentesRestantes = nuevoHistorial.filter(v => v.vacuna === 'Trivalente').length;
        if (trivalentesRestantes === 1) {
          vName = 'Trivalente Felina (2ª dosis)';
        } else if (trivalentesRestantes === 0) {
          nuevosChecklist = nuevosChecklist.filter(v => v !== 'Trivalente Felina (1ª dosis)' && v !== 'Trivalente Felina (2ª dosis)');
        }
      } else if (vacunaAEliminar.vacuna === 'Leucemia') {
        vName = 'Leucemia Felina';
      } else if (vacunaAEliminar.vacuna === 'Rabia') {
        vName = 'Rabia';
      } else if (vacunaAEliminar.vacuna === 'Otras') {
        vName = vacunaAEliminar.vacunaPersonalizada || '';
      } else {
        vName = vacunaAEliminar.vacuna;
      }

      if (vName) {
        nuevosChecklist = nuevosChecklist.filter(v => v !== vName);
      }
    }

    const mascotaActualizada = {
      ...mascota,
      historialVacunas: nuevoHistorial,
      vacunasChecklist: nuevosChecklist
    };

    await LocalDatabase.saveMascota(mascotaActualizada);
    onUpdate();
  };

  const eliminarChecklistVacuna = async (vName: string) => {
    const confirmar = window.confirm(`¿Quieres desmarcar "${vName}"?`);
    if (!confirmar) return;

    const nuevosChecklist = (mascota.vacunasChecklist || []).filter(v => v !== vName);
    const mascotaActualizada = {
      ...mascota,
      vacunasChecklist: nuevosChecklist
    };

    await LocalDatabase.saveMascota(mascotaActualizada);
    onUpdate();
  };

  const getDewormingInfo = (vName: 'Desparasitación Interna' | 'Desparasitación Externa') => {
    // Usa localVacunasChecklist para reflejar cambios inmediatamente tras Registrar Toma
    const checklist = localVacunasChecklist;
    const prefix = `${vName}_`;
    const dates = checklist
      .filter(item => item.startsWith(prefix))
      .map(item => item.slice(prefix.length)) // slice más robusto que split
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    const intervalMonths = vName === 'Desparasitación Interna' ? 3 : 1;
    
    if (dates.length > 0) {
      const lastDateStr = dates[0];
      const lastDate = new Date(lastDateStr);
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + intervalMonths);
      
      const nextDateStr = nextDate.toISOString().split('T')[0];
      
      const todayStr = new Date().toISOString().split('T')[0];
      const isOverdue = todayStr > nextDateStr;
      
      return {
        hasDoses: true,
        lastDate: lastDateStr,
        nextDate: nextDateStr,
        isOverdue,
        status: isOverdue ? 'Vencida' : 'Al día',
        allDoses: dates
      };
    }
    
    if (checklist.includes(vName)) {
      return {
        hasDoses: true,
        lastDate: 'Registro legacy',
        nextDate: 'Pendiente',
        isOverdue: true,
        status: 'Vencida',
        allDoses: []
      };
    }
    
    return {
      hasDoses: false,
      lastDate: null,
      nextDate: 'Pendiente',
      isOverdue: true,
      status: 'Pendiente',
      allDoses: []
    };
  };

  const formatearFechaSimple = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    if (dateStr === 'Registro legacy') return 'Sí (fecha desconocida)';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const registrarTomaDeworming = async (vName: 'Desparasitación Interna' | 'Desparasitación Externa') => {
    const todayStr = new Date().toISOString().split('T')[0];
    const hoyFormateado = formatearFechaSimple(todayStr);
    const confirmar = window.confirm(`¿Quieres registrar una nueva toma de ${vName} hoy (${hoyFormateado})?`);
    if (!confirmar) return;

    const current = localVacunasChecklist;
    const prefix = `${vName}_`;
    const cleanCurrent = current.filter(item => item !== vName && !item.startsWith(prefix));
    const updated = [...cleanCurrent, `${vName}_${todayStr}`];

    // Actualizar estado local inmediatamente para refrescar la UI sin esperar al padre
    setLocalVacunasChecklist(updated);

    const nuevoEvento = {
      id: safeUUID(),
      fecha: todayStr,
      tipo: 'Tratamiento' as const,
      descripcion: `Administrada ${vName}`
    };

    const mascotaActualizada: Mascota = {
      ...mascota,
      vacunasChecklist: updated,
      historialPasado: [...(mascota.historialPasado || []), nuevoEvento]
    };

    await LocalDatabase.saveMascota(mascotaActualizada);
    try { playSoundSuccess(); } catch { /* Ignore audio playback error */ }
    onUpdate();
  };

  const agregarMedicacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medNombre.trim() || !medDosis.trim()) {
      alert("Por favor introduce el nombre y la dosis del medicamento.");
      return;
    }

    const freqStr = medFrecuencia === 'Otras' ? medFrecuenciaPersonalizada : medFrecuencia;
    if (!freqStr.trim()) {
      alert("Por favor especifica la frecuencia.");
      return;
    }

    const nuevoMedicamento = {
      id: safeUUID(),
      nombre: medNombre.trim(),
      dosis: medDosis.trim(),
      frecuencia: freqStr.trim(),
      fechaInicio: medFechaInicio,
      fechaFin: medFechaFin ? medFechaFin : undefined,
      activo: true,
      proximaDosis: medHoraProxima ? new Date(medHoraProxima).toISOString() : new Date().toISOString(),
      historialTomas: []
    };

    const medicamentosActualizados = [...(mascota.medicamentos || []), nuevoMedicamento];
    const mascotaActualizada: Mascota = {
      ...mascota,
      medicamentos: medicamentosActualizados
    };

    await LocalDatabase.saveMascota(mascotaActualizada);

    // Reset form
    setMedNombre('');
    setMedDosis('');
    setMedFrecuencia('Diario');
    setMedFrecuenciaPersonalizada('');
    setMedFechaInicio(new Date().toISOString().split('T')[0]);
    setMedFechaFin('');
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    setMedHoraProxima((new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16));

    onUpdate();
    alert("Medicamento registrado correctamente.");
  };

  const registrarTomaMedicamento = async (medId: string) => {
    const meds = mascota.medicamentos || [];
    const medIdx = meds.findIndex(m => m.id === medId);
    if (medIdx === -1) return;

    const med = meds[medIdx];
    const confirmar = window.confirm(`¿Quieres registrar la toma de ${med.nombre} (${med.dosis}) ahora?`);
    if (!confirmar) return;

    const now = new Date();
    const nowISO = now.toISOString();

    // Parse frequency to determine next dose
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

    // Verificar si se ha superado la fecha fin
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

    const medsActualizados = [...meds];
    medsActualizados[medIdx] = medActualizado;

    const nuevoEvento = {
      id: safeUUID(),
      fecha: nowISO.split('T')[0],
      tipo: 'Tratamiento' as const,
      descripcion: `Administrada dosis de ${med.nombre} (${med.dosis})`
    };

    const mascotaActualizada: Mascota = {
      ...mascota,
      medicamentos: medsActualizados,
      historialPasado: [...(mascota.historialPasado || []), nuevoEvento]
    };

    await LocalDatabase.saveMascota(mascotaActualizada);
    try { playSoundSuccess(); } catch { /* Ignore audio playback error */ }
    onUpdate();

    const activeHogarId = localStorage.getItem('petplant_hogar_id');
    if (activeHogarId) {
      import('../utils/notificationManager').then(({ NotificationManager }) => {
        NotificationManager.triggerCloudPushNotification(
          activeHogarId,
          `💊 Toma registrada — ${mascota.nombre}`,
          `${mascota.nombre} ha recibido su dosis de ${med.nombre} (${med.dosis}).`
        );
      }).catch(err => console.error(err));
    }

    alert(`Toma registrada. Próxima dosis calculada: ${activo ? nextDoseDate.toLocaleString() : 'Tratamiento finalizado'}`);
  };

  const desactivarMedicamento = async (medId: string) => {
    const meds = mascota.medicamentos || [];
    const medIdx = meds.findIndex(m => m.id === medId);
    if (medIdx === -1) return;

    const med = meds[medIdx];
    const confirmar = window.confirm(`¿Estás seguro/a de dar de baja / archivar el tratamiento de ${med.nombre}?`);
    if (!confirmar) return;

    const medsActualizados = [...meds];
    medsActualizados[medIdx] = {
      ...med,
      activo: false,
      proximaDosis: undefined
    };

    const mascotaActualizada: Mascota = {
      ...mascota,
      medicamentos: medsActualizados
    };

    await LocalDatabase.saveMascota(mascotaActualizada);
    onUpdate();
  };

  const eliminarMedicamento = async (medId: string) => {
    const meds = mascota.medicamentos || [];
    const confirmar = window.confirm(`¿Estás seguro/a de ELIMINAR por completo el registro de este medicamento? Se perderá todo su historial.`);
    if (!confirmar) return;

    const medsActualizados = meds.filter(m => m.id !== medId);
    const mascotaActualizada: Mascota = {
      ...mascota,
      medicamentos: medsActualizados
    };

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
    const chartData = (mascota.registroPeso || []).map(r => ({
      fecha: r.fecha,
      valor: r.pesoKg
    }));

    let accentColor = '#1976d2';
    if (theme === 'nature') accentColor = '#2e7d32';
    else if (theme === 'kawaii') accentColor = '#ff6b8b';
    else if (theme === 'gaming') accentColor = '#66fcf1';

    return (
      <Suspense fallback={<div style={{ height: '140px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#888' }}>Cargando gráfico...</div>}>
        <BiometricChart
          data={chartData}
          yLabel="Peso (kg)"
          color={accentColor}
          theme={theme as any}
        />
      </Suspense>
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

          <div className="responsive-form-grid-2" style={{ gap: '10px' }}>
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
            <div className="responsive-form-grid-2" style={{ gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{locale === 'en' ? 'Sex:' : 'Sexo:'}</label>
                <select 
                  value={editSexo} 
                  onChange={(e) => setEditSexo(e.target.value as 'Macho' | 'Hembra')}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px' }}
                >
                  <option value="Macho">{locale === 'en' ? 'Male ♂' : 'Macho ♂'}</option>
                  <option value="Hembra">{locale === 'en' ? 'Female ♀' : 'Hembra ♀'}</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{locale === 'en' ? 'Neutered/Spayed?:' : '¿Castrado/a?:'}</label>
                <select 
                  value={editCastrado ? 'si' : 'no'} 
                  onChange={(e) => setEditCastrado(e.target.value === 'si')}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', color: '#000', fontSize: '13px' }}
                >
                  <option value="no">{locale === 'en' ? 'No' : 'No'}</option>
                  <option value="si">{locale === 'en' ? 'Yes' : 'Sí'}</option>
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
            {locale === 'en' ? 'Cancel' : 'Cancelar'}
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
            {locale === 'en' ? 'Save 💾' : 'Guardar 💾'}
          </button>
        </div>
      </div>
    );
  }

  const parseIAReporte = (nota: string) => {
    let diagnostico: string;
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

  const renderPetMoodBackground = () => {
    const act = mascota.actividad;
    const esp = mascota.especie;
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const showAnimations = expanded && isIntersecting && !prefersReducedMotion;
    
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

    // Set theme-adaptive, rich radial gradient configurations
    if (act === 'Alta') {
      backgroundStyle.background = 'radial-gradient(circle at 80% 80%, rgba(255, 213, 79, 0.15) 0%, rgba(255, 179, 0, 0.04) 50%, transparent 100%)';
    } else if (act === 'Baja') {
      backgroundStyle.background = 'radial-gradient(circle at 80% 80%, rgba(159, 168, 218, 0.15) 0%, rgba(63, 81, 181, 0.04) 50%, transparent 100%)';
    } else {
      backgroundStyle.background = 'radial-gradient(circle at 80% 80%, rgba(244, 143, 177, 0.12) 0%, rgba(233, 30, 99, 0.03) 50%, transparent 100%)';
    }

    // Determine the species silhouette to render
    const renderSilhouette = () => {
      const silhouetteStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '-10px',
        right: '-10px',
        width: '140px',
        height: '140px',
        opacity: 0.14,
        color: 'var(--game-text, currentColor)',
        transition: 'all 0.5s ease',
        transform: 'rotate(-5deg)',
      };

      if (esp === 'Felino') {
        return (
          <svg viewBox="0 0 100 100" style={silhouetteStyle}>
            <path 
              d="M30 80 C30 55 45 45 45 25 C40 25 35 15 35 10 C45 15 50 22 55 22 C60 22 65 15 75 10 C75 15 70 25 65 25 C65 45 80 55 80 80 Z" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </svg>
        );
      } else if (esp === 'Canino') {
        return (
          <svg viewBox="0 0 100 100" style={silhouetteStyle}>
            <path 
              d="M25 80 C25 60 30 55 30 45 C25 45 20 50 20 60 C20 70 25 70 28 65 C28 55 35 40 40 35 C45 32 55 32 60 35 C65 40 72 55 72 65 C75 70 80 70 80 60 C80 50 75 45 70 45 C70 55 75 60 75 80 Z" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </svg>
        );
      } else {
        // Floating/static paw silhouette
        return (
          <svg viewBox="0 0 100 100" style={silhouetteStyle}>
            <path d="M35 65 C30 55 40 45 50 45 C60 45 70 55 65 65 C62 70 58 72 50 72 C42 72 38 70 35 65 Z" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="28" cy="40" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="42" cy="28" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="58" cy="28" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="72" cy="40" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
      }
    };

    return (
      <div style={backgroundStyle}>
        {renderSilhouette()}
        
        {showAnimations && act === 'Alta' && (
          <svg width="100%" height="100%" style={{ opacity: 0.18, position: 'absolute', top: 0, left: 0 }}>
            <style>{`
              @keyframes floatEnergy {
                0% { transform: translateY(110%) scale(0.6); opacity: 0; }
                50% { opacity: 0.8; }
                100% { transform: translateY(-10%) scale(1.2); opacity: 0; }
              }
              .en1 { animation: floatEnergy 4s infinite ease-in-out; }
              .en2 { animation: floatEnergy 5s infinite ease-in-out; animation-delay: 1.2s; }
              .en3 { animation: floatEnergy 4.5s infinite ease-in-out; animation-delay: 2.5s; }
              .en4 { animation: floatEnergy 6s infinite ease-in-out; animation-delay: 0.5s; }
            `}</style>
            <circle className="en1" cx="15%" cy="90%" r="5" fill="#ffd54f" />
            <circle className="en2" cx="45%" cy="90%" r="4" fill="#ffb300" />
            <circle className="en3" cx="75%" cy="90%" r="6" fill="#ffe082" />
            <circle className="en4" cx="90%" cy="90%" r="3.5" fill="#ffd54f" />
          </svg>
        )}
        {showAnimations && act === 'Baja' && (
          <svg width="100%" height="100%" style={{ opacity: 0.18, position: 'absolute', top: 0, left: 0 }}>
            <style>{`
              @keyframes floatSleep {
                0% { transform: translateY(20px) rotate(-12deg); opacity: 0; }
                50% { opacity: 0.8; }
                100% { transform: translateY(-70px) rotate(12deg); opacity: 0; }
              }
              .sl1 { animation: floatSleep 8s infinite ease-in-out; }
              .sl2 { animation: floatSleep 10s infinite ease-in-out; animation-delay: 3s; }
              .sl3 { animation: floatSleep 9s infinite ease-in-out; animation-delay: 5.5s; }
            `}</style>
            <text className="sl1" x="20%" y="90%" fontSize="12" fill="#7986cb" fontWeight="bold">Zzz</text>
            <text className="sl2" x="50%" y="95%" fontSize="9" fill="#9fa8da" fontWeight="bold">Zzz</text>
            <text className="sl3" x="80%" y="90%" fontSize="11" fill="#7986cb" fontWeight="bold">Zzz</text>
          </svg>
        )}
        {showAnimations && act !== 'Alta' && act !== 'Baja' && (
          <svg width="100%" height="100%" style={{ opacity: 0.15, position: 'absolute', top: 0, left: 0 }}>
            <style>{`
              @keyframes floatPaws {
                0% { transform: translateY(110%) scale(0.8); opacity: 0; }
                50% { opacity: 0.7; }
                100% { transform: translateY(-30px) scale(1.1); opacity: 0; }
              }
              .pw1 { animation: floatPaws 7s infinite ease-in-out; }
              .pw2 { animation: floatPaws 9s infinite ease-in-out; animation-delay: 2.5s; }
              .pw3 { animation: floatPaws 8s infinite ease-in-out; animation-delay: 4.5s; }
            `}</style>
            <text className="pw1" x="15%" y="90%" fontSize="13" fill="#f06292">🐾</text>
            <text className="pw2" x="55%" y="90%" fontSize="11" fill="#f06292">♥</text>
            <text className="pw3" x="85%" y="90%" fontSize="12" fill="#e57373">🐾</text>
          </svg>
        )}
      </div>
    );
  };

  const checkPesoAlert = () => {
    const list = mascota.registroPeso || [];
    if (list.length >= 2) {
      const prev = list[list.length - 2].pesoKg;
      const curr = list[list.length - 1].pesoKg;
      return curr < prev * 0.9;
    }
    return false;
  };

  return (
    <div ref={cardRef} id={`card-${mascota.id}`} className={`printable-clinical-record glass-card ${checkPesoAlert() ? 'has-critical-alert' : ''}`} style={{
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
      {renderPetMoodBackground()}
      {/* HUD de Nivel en Tema Gaming */}


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
              {mascota.nombre}{' '}
              <span 
                className={heartSpeed === 'fast' ? 'heartbeat-fast' : 'heartbeat-anim'} 
                onClick={(e) => { e.stopPropagation(); acelerarLatido(); }}
                title={locale === 'en' ? 'Healthy vital sign! (Tap to speed up ❤️)' : '¡Constante vital saludable! (Pulsa para acelerar ❤️)'}
                style={{ fontSize: '15px', verticalAlign: 'middle', userSelect: 'none' }}
              >
                ❤️
              </span>
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
                  {mascota.sexo === 'Hembra' ? (locale === 'en' ? '♀ Female' : '♀ Hembra') : (locale === 'en' ? '♂ Male' : '♂ Macho')}
                </span>
              )}
              {mascota.fechaNacimiento && (
                <span style={{ ...getEdadBadgeStyle(), margin: 0, fontSize: '11px', padding: '2px 6px' }}>
                  🎂 {calcularEdadMascota(mascota.fechaNacimiento)}
                </span>
              )}
              {expanded && esMamifero(mascota.especie) && mascota.castrado !== undefined && (
                <span style={{ ...getCastradoBadgeStyle(), margin: 0, fontSize: '11px', padding: '2px 6px' }}>
                  {mascota.castrado ? (locale === 'en' ? '✂️ Neutered/Spayed' : '✂️ Castrado/a') : (locale === 'en' ? '🥚 Intact' : '🥚 Sin castrar')}
                </span>
              )}
            </div>
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
            onEditCard={() => {
              setEditNombre(mascota.nombre);
              setEditEspecie(mascota.especie);
              setEditRaza(mascota.raza || '');
              setEditSexo(mascota.sexo || 'Macho');
              setEditCastrado(mascota.castrado || false);
              setEditEsMamifero(mascota.sexo !== undefined || mascota.castrado !== undefined);
              setIsEditing(true);
            }}
            onDeleteCard={() => {
              setShowDeleteConfirm(true);
            }}
          />

          {/* Raza en Detalles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: 'var(--game-card-bg, #fafafa)', padding: '8px 12px', borderRadius: 'var(--game-radius, 8px)', border: '1px solid var(--game-border-color, #eee)', color: 'var(--game-text-bright)' }}>
            <span style={{ fontWeight: 'bold' }}>🐾 {locale === 'en' ? 'Breed:' : 'Raza:'}</span>
            <span>{mascota.raza || (locale === 'en' ? 'Unspecified' : 'Sin especificar')}</span>
          </div>

          {/* Fecha de Nacimiento y Edad en Detalles */}
          {mascota.fechaNacimiento && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: 'var(--game-card-bg, #fafafa)', padding: '8px 12px', borderRadius: 'var(--game-radius, 8px)', border: '1px solid var(--game-border-color, #eee)', color: 'var(--game-text-bright)' }}>
              <span style={{ fontWeight: 'bold' }}>🎂 {locale === 'en' ? 'Age:' : 'Edad:'}</span>
              <span>
                {(() => {
                  const parts = mascota.fechaNacimiento.split('-');
                  const fechaFormateada = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : mascota.fechaNacimiento;
                  return `${fechaFormateada} (${calcularEdadMascota(mascota.fechaNacimiento)})`;
                })()}
              </span>
            </div>
          )}

          {/* Formulario/Editor de Chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: 'var(--game-card-bg, #fafafa)', padding: '8px 12px', borderRadius: 'var(--game-radius, 8px)', border: '1px solid var(--game-border-color, #eee)', color: 'var(--game-text-bright)' }}>
            <span style={{ fontWeight: 'bold' }}>{locale === 'en' ? 'Microchip Number:' : 'Número Microchip:'}</span>
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
                <span>{mascota.numeroChip || (locale === 'en' ? 'Not registered' : 'No registrado')}</span>
                <button type="button" onClick={() => setEditChip(true)} style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontSize: '12px', padding: 0 }}>✏️ {locale === 'en' ? 'Edit' : 'Editar'}</button>
              </div>
            )}
          </div>

          {renderGraficaPeso()}

          <form onSubmit={registrarPeso} style={{ display: 'flex', gap: '8px', margin: '6px 0' }} className="no-print">
            <input
              type="number"
              step="0.1"
              placeholder={locale === 'en' ? "New weight (kg)" : "Nuevo peso (kg)"}
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
              {locale === 'en' ? 'Weigh ⚖️' : 'Pesar ⚖️'}
            </button>
          </form>

          {/* Checklist de Vacunas y Desparasitaciones */}
          {(mascota.especie === 'Felino' || mascota.especie === 'Canino') && (
            <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px' }}>
              {/* Sección de Vacunación Colapsable */}
              <div style={{ marginBottom: '16px', background: 'var(--game-card-bg, #fafafa)', padding: '12px', borderRadius: 'var(--game-radius, 8px)', border: '1px solid var(--game-border-color, #eee)' }}>
                <div 
                  onClick={() => setShowVacunas(!showVacunas)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    💉 {locale === 'en' ? 'Vaccination: Preventive Plan & History' : 'Vacunación: Plan Preventivo e Historial'}
                  </p>
                  <span style={{ fontSize: '11px', color: 'var(--game-text, #888)', fontWeight: 'bold' }}>
                    {showVacunas ? '▲' : '▼'}
                  </span>
                </div>
                
                {showVacunas && (
                  <div style={{ marginTop: '12px', borderTop: '1px dashed var(--game-border-color, #eee)', paddingTop: '10px' }}>
                    {/* Lista de vacunas del plan de salud */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                      {(mascota.especie === 'Felino' 
                        ? ['Trivalente Felina (1ª dosis)', 'Trivalente Felina (2ª dosis)', 'Leucemia Felina', 'Rabia'] 
                        : ['Parvovirus', 'Moquillo', 'Adenovirus', 'Rabia', 'Leptospirosis', 'Bordetella']
                      ).map(vName => {
                        const record = getVaccineRecordForChecklist(vName);
                        const isChecked = (mascota.vacunasChecklist || []).includes(vName) || !!record;
                        
                        return (
                          <div key={vName} style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: '4px',
                            padding: '8px',
                            background: 'var(--game-bg, #ffffff)',
                            border: '1px solid var(--game-border-color, #eaeaea)',
                            borderRadius: '6px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input 
                                  type="checkbox" 
                                  checked={isChecked} 
                                  disabled={isChecked}
                                  onChange={() => toggleVacunaCheck(vName)}
                                  style={{ cursor: isChecked ? 'default' : 'pointer' }}
                                />
                                <span style={{ 
                                  fontSize: '12px', 
                                  fontWeight: 'bold',
                                  color: 'var(--game-text-bright, #333)',
                                  textDecoration: isChecked ? 'line-through' : 'none', 
                                  opacity: isChecked ? 0.7 : 1 
                                }}>
                                  {traducirNombreVacuna(vName)}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {isChecked ? (
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: '#e2fbe8',
                                    color: '#1e7e34'
                                  }}>
                                    ✓ {locale === 'en' ? 'Applied' : 'Aplicada'}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      prellenarFormularioVacuna(vName);
                                    }}
                                    style={{
                                      padding: '2px 6px',
                                      background: 'var(--game-accent-light, rgba(33, 150, 243, 0.1))',
                                      color: 'var(--game-accent, #2196f3)',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    ➕ {locale === 'en' ? 'Register' : 'Registrar'}
                                  </button>
                                )}
                                {isChecked && (
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (record) {
                                        const idx = (mascota.historialVacunas || []).indexOf(record);
                                        if (idx !== -1) await eliminarRegistroVacuna(idx);
                                      } else {
                                        await eliminarChecklistVacuna(vName);
                                      }
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#c82333',
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                      padding: '2px'
                                    }}
                                    title={locale === 'en' ? 'Delete record' : 'Eliminar registro'}
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            </div>

                            {record && (
                              <div style={{ 
                                fontSize: '10px', 
                                color: 'var(--game-text, #666)', 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: '8px', 
                                paddingLeft: '20px',
                                opacity: 0.8
                              }}>
                                <span><strong>{locale === 'en' ? 'Date:' : 'Fecha:'}</strong> {record.fecha ? record.fecha.split('T')[0] : 'S/F'}</span>
                                <span><strong>{locale === 'en' ? 'Batch/Lot:' : 'Lote:'}</strong> {record.lote}</span>
                                {record.proximaDosis && (
                                  <span style={{ color: 'var(--game-accent)' }}>
                                    <strong>{locale === 'en' ? 'Next Dose:' : 'Próxima:'}</strong> {record.proximaDosis.split('T')[0]}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Vacunas adicionales / personalizadas que no están en el checklist */}
                    {(() => {
                      const checklistStandard = mascota.especie === 'Felino'
                        ? ['Trivalente Felina (1ª dosis)', 'Trivalente Felina (2ª dosis)', 'Leucemia Felina', 'Rabia']
                        : ['Parvovirus', 'Moquillo', 'Adenovirus', 'Rabia', 'Leptospirosis', 'Bordetella'];

                      const recomendadosMatheados = checklistStandard.map(vName => getVaccineRecordForChecklist(vName)).filter(Boolean);
                      const adicionales = (mascota.historialVacunas || []).filter(v => !recomendadosMatheados.includes(v));

                      if (adicionales.length === 0) return null;

                      return (
                        <div style={{ marginTop: '10px', borderTop: '1px dashed var(--game-border-color, #eee)', paddingTop: '10px' }}>
                          <p style={{ margin: '0 0 6px 0', fontSize: '11px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)' }}>
                            {locale === 'en' ? 'Other vaccines administered:' : 'Otras vacunas administradas:'}
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {adicionales.map((v, keyIdx) => {
                              const vName = v.vacuna === 'Otras' ? (v.vacunaPersonalizada || 'Otras') : v.vacuna;
                              const realIdxInHistorial = (mascota.historialVacunas || []).indexOf(v);
                              return (
                                <div key={keyIdx} style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  padding: '6px 8px',
                                  background: 'var(--game-bg, #ffffff)',
                                  border: '1px solid var(--game-border-color, #eaeaea)',
                                  borderRadius: '6px'
                                }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--game-text-bright)' }}>{vName}</span>
                                    <div style={{ fontSize: '10px', color: 'var(--game-text)', display: 'flex', gap: '8px', opacity: 0.8 }}>
                                      <span>{locale === 'en' ? 'Date:' : 'Fecha:'} {v.fecha ? v.fecha.split('T')[0] : 'S/F'}</span>
                                      <span>{locale === 'en' ? 'Batch/Lot:' : 'Lote:'} {v.lote}</span>
                                      {v.proximaDosis && <span style={{ color: 'var(--game-accent)' }}>{locale === 'en' ? 'Next:' : 'Próxima:'} {v.proximaDosis.split('T')[0]}</span>}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (realIdxInHistorial !== -1) eliminarRegistroVacuna(realIdxInHistorial);
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#c82333',
                                      cursor: 'pointer',
                                      fontSize: '11px'
                                    }}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Formulario Registrar Nueva Vacuna integrado */}
                    <form onSubmit={agregarRegistroVacuna} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: '10px', marginTop: '12px' }} className="no-print">
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--game-text-bright)' }}>{locale === 'en' ? 'Record new dose:' : 'Registrar nueva dosis:'}</span>
                      <div className="responsive-form-grid-2">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--game-text)' }}>{locale === 'en' ? 'Type:' : 'Tipo:'}</label>
                          <select 
                            value={vacunaTipo} 
                            onChange={(e) => {
                              setVacunaTipo(e.target.value);
                              if (e.target.value !== 'Otras') {
                                setVacunaPersonalizada('');
                              }
                            }}
                            style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', color: '#000' }}
                          >
                            {mascota.especie === 'Felino' && (
                              <>
                                <option value="Trivalente">{locale === 'en' ? 'Trivalent' : 'Trivalente'}</option>
                                <option value="Leucemia">{locale === 'en' ? 'Leukemia' : 'Leucemia'}</option>
                                <option value="Rabia">{locale === 'en' ? 'Rabies' : 'Rabia'}</option>
                                <option value="Otras">{locale === 'en' ? 'Others' : 'Otras'}</option>
                              </>
                            )}
                            {mascota.especie === 'Canino' && (
                              <>
                                <option value="Parvovirus">Parvovirus</option>
                                <option value="Moquillo">{locale === 'en' ? 'Distemper' : 'Moquillo'}</option>
                                <option value="Adenovirus">Adenovirus</option>
                                <option value="Rabia">{locale === 'en' ? 'Rabies' : 'Rabia'}</option>
                                <option value="Leptospirosis">Leptospirosis</option>
                                <option value="Bordetella">Bordetella</option>
                                <option value="Otras">{locale === 'en' ? 'Others' : 'Otras'}</option>
                              </>
                            )}
                            {mascota.especie !== 'Felino' && mascota.especie !== 'Canino' && (
                              <option value="Otras">{locale === 'en' ? 'Others' : 'Otras'}</option>
                            )}
                          </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--game-text)' }}>{locale === 'en' ? 'Batch/Lot:' : 'Lote:'}</label>
                          <input 
                            id={`vacuna-lote-${mascota.id}`}
                            type="text" 
                            value={vacunaLote}
                            onChange={(e) => setVacunaLote(e.target.value)}
                            placeholder={locale === 'en' ? "E.g.: LT-4819" : "Ej: LT-4819"}
                            style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', color: '#000' }}
                          />
                        </div>
                      </div>

                      {(vacunaTipo === 'Otras' || (mascota.especie !== 'Felino' && mascota.especie !== 'Canino')) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--game-text)' }}>{locale === 'en' ? 'Specify Vaccine:' : 'Especificar Vacuna:'}</label>
                          <input 
                            type="text" 
                            value={vacunaPersonalizada}
                            onChange={(e) => setVacunaPersonalizada(e.target.value)}
                            placeholder={locale === 'en' ? "E.g.: Nobivac KC, Kennel Cough..." : "Ej: Nobivac KC, Tos de las Perreras..."}
                            style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', color: '#000' }}
                          />
                        </div>
                      )}

                      <div className="responsive-form-grid-2">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--game-text)' }}>{locale === 'en' ? 'Date Administered:' : 'Fecha colocación:'}</label>
                          <input 
                            type="date" 
                            value={vacunaFecha}
                            onChange={(e) => setVacunaFecha(e.target.value)}
                            style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', color: '#000' }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--game-text)' }}>{locale === 'en' ? 'Next Dose (Optional):' : 'Próxima dosis (Opcional):'}</label>
                          <input 
                            type="date" 
                            value={vacunaProxima}
                            onChange={(e) => setVacunaProxima(e.target.value)}
                            style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', color: '#000' }}
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        style={{
                          padding: '6px 10px',
                          background: 'var(--game-accent, #1976d2)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          marginTop: '4px',
                          alignSelf: 'flex-start'
                        }}
                      >
                        {locale === 'en' ? 'Register Vaccine' : 'Registrar Vacuna'}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Desparasitación Periódica Colapsable */}
              <div style={{ marginBottom: '16px', background: 'var(--game-card-bg, #fafafa)', padding: '12px', borderRadius: 'var(--game-radius, 8px)', border: '1px solid var(--game-border-color, #eee)' }}>
                <div 
                  onClick={() => setShowDesparasitacion(!showDesparasitacion)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🛡️ {locale === 'en' ? 'Regular Deworming' : 'Desparasitación Periódica'}
                  </p>
                  <span style={{ fontSize: '11px', color: 'var(--game-text, #888)', fontWeight: 'bold' }}>
                    {showDesparasitacion ? '▲' : '▼'}
                  </span>
                </div>

                {showDesparasitacion && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', borderTop: '1px dashed var(--game-border-color, #eee)', paddingTop: '10px' }}>
                    {(['Desparasitación Interna', 'Desparasitación Externa'] as const).map(vName => {
                      const info = getDewormingInfo(vName);
                      return (
                        <div key={vName} style={{
                          background: 'var(--game-card-bg, #fafafa)',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid var(--game-border-color, #eee)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--game-text-bright)' }}>
                              {vName === 'Desparasitación Interna' 
                                ? (locale === 'en' ? '💊 Internal (every 3 months)' : '💊 Interna (cada 3 meses)') 
                                : (locale === 'en' ? '🛡️ External (every month)' : '🛡️ Externa (cada mes)')}
                            </span>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 'bold',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: info.status === 'Al día' ? '#e2fbe8' : '#fde8e8',
                              color: info.status === 'Al día' ? '#1e7e34' : '#c82333'
                            }}>
                              {locale === 'en' ? (info.status === 'Al día' ? 'Up to date' : info.status === 'Vencida' ? 'Overdue' : 'Pending') : info.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--game-text)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div><strong>{locale === 'en' ? 'Last Dose:' : 'Última toma:'}</strong> {formatearFechaSimple(info.lastDate)}</div>
                            <div><strong>{locale === 'en' ? 'Next Dose:' : 'Próxima toma:'}</strong> {formatearFechaSimple(info.nextDate)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              registrarTomaDeworming(vName);
                            }}
                            style={{
                              alignSelf: 'flex-start',
                              padding: '4px 8px',
                              background: 'var(--game-accent, #1976d2)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              marginTop: '2px'
                            }}
                          >
                            {locale === 'en' ? 'Record Dose' : 'Registrar Toma'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Medicación Crónica y Tratamientos Colapsable */}
              <div style={{ marginBottom: '16px', background: 'var(--game-card-bg, #fafafa)', padding: '12px', borderRadius: 'var(--game-radius, 8px)', border: '1px solid var(--game-border-color, #eee)' }}>
                <div 
                  onClick={() => setShowMedicacion(!showMedicacion)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    💊 {locale === 'en' ? 'Chronic Medication and Treatments' : 'Medicación Crónica y Tratamientos'}
                  </p>
                  <span style={{ fontSize: '11px', color: 'var(--game-text, #888)', fontWeight: 'bold' }}>
                    {showMedicacion ? '▲' : '▼'}
                  </span>
                </div>

                {showMedicacion && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', borderTop: '1px dashed var(--game-border-color, #eee)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                      {(!mascota.medicamentos || mascota.medicamentos.length === 0) ? (
                        <p style={{ margin: '0', fontSize: '11px', color: 'var(--game-text)', opacity: 0.7 }}>
                          {locale === 'en' ? 'No treatments registered.' : 'No hay tratamientos registrados.'}
                        </p>
                      ) : (
                        mascota.medicamentos.map(med => {
                          const isOverdue = med.activo && med.proximaDosis && (new Date() > new Date(med.proximaDosis));
                          const proximaDosisFormateada = med.proximaDosis 
                            ? new Date(med.proximaDosis).toLocaleString() 
                            : (locale === 'en' ? 'Treatment inactive/completed' : 'Tratamiento inactivo/finalizado');
                          return (
                            <div key={med.id} style={{
                              background: 'var(--game-card-bg, #fafafa)',
                              padding: '10px',
                              borderRadius: '8px',
                              border: '1px solid var(--game-border-color, #eee)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              opacity: med.activo ? 1 : 0.6
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--game-text-bright)' }}>
                                  {med.nombre} ({med.dosis})
                                </span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: med.activo ? (isOverdue ? '#fde8e8' : '#e2fbe8') : '#e9ecef',
                                    color: med.activo ? (isOverdue ? '#c82333' : '#1e7e34') : '#6c757d'
                                  }}>
                                    {med.activo ? (isOverdue ? (locale === 'en' ? 'Overdue' : 'Atrasada') : (locale === 'en' ? 'Active' : 'Activo')) : (locale === 'en' ? 'Inactive' : 'Inactivo')}
                                  </span>
                                </div>
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--game-text)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div><strong>{locale === 'en' ? 'Frequency:' : 'Frecuencia:'}</strong> {med.frecuencia === 'Diario' ? (locale === 'en' ? 'Daily' : 'Diario') : med.frecuencia}</div>
                                <div><strong>{locale === 'en' ? 'Range:' : 'Rango:'}</strong> {locale === 'en' ? 'From' : 'Desde'} {med.fechaInicio}{med.fechaFin ? ` ${locale === 'en' ? 'to' : 'hasta'} ${med.fechaFin}` : ''}</div>
                                {med.activo && (
                                  <div style={{ color: isOverdue ? 'var(--game-accent, #d32f2f)' : 'inherit', fontWeight: isOverdue ? 'bold' : 'normal' }}>
                                    <strong>{locale === 'en' ? 'Next dose:' : 'Próxima dosis:'}</strong> {proximaDosisFormateada}
                                  </div>
                                )}
                                {med.historialTomas && med.historialTomas.length > 0 && (
                                  <div>
                                    <strong>{locale === 'en' ? 'Doses registered:' : 'Tomas registradas:'}</strong> {med.historialTomas.length} ({locale === 'en' ? 'Last:' : 'Última:'} {new Date(med.historialTomas[med.historialTomas.length - 1]).toLocaleString()})
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                {med.activo && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      registrarTomaMedicamento(med.id);
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      background: 'var(--game-accent, #1976d2)',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    💊 {locale === 'en' ? 'Record Dose' : 'Registrar Toma'}
                                  </button>
                                )}
                                {med.activo && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      desactivarMedicamento(med.id);
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      background: '#f0f0f0',
                                      color: '#333',
                                      border: '1px solid #ccc',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {locale === 'en' ? 'Deactivate' : 'Dar de baja'}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    eliminarMedicamento(med.id);
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    background: '#fff',
                                    color: '#c82333',
                                    border: '1px solid #f8d7da',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {locale === 'en' ? 'Delete' : 'Eliminar'}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Formulario Registrar Nuevo Medicamento */}
                    <form onSubmit={agregarMedicacion} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: '10px' }} className="no-print">
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--game-text-bright)' }}>{locale === 'en' ? 'Add new treatment:' : 'Añadir nuevo tratamiento:'}</span>
                      <div className="responsive-form-grid-2">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--game-text)' }}>{locale === 'en' ? 'Name:' : 'Nombre:'}</label>
                          <input 
                            type="text" 
                            value={medNombre}
                            onChange={(e) => setMedNombre(e.target.value)}
                            placeholder={locale === 'en' ? "E.g.: Insulin, Metacam..." : "Ej: Insulina, Metacam..."}
                            style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', color: '#000' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--game-text)' }}>{locale === 'en' ? 'Dose:' : 'Dosis:'}</label>
                          <input 
                            type="text" 
                            value={medDosis}
                            onChange={(e) => setMedDosis(e.target.value)}
                            placeholder={locale === 'en' ? "E.g.: 2 UI, 1 pill, 0.5ml..." : "Ej: 2 UI, 1 pastilla, 0.5ml..."}
                            style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', color: '#000' }}
                          />
                        </div>
                      </div>

                      <div className="responsive-form-grid-2">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--game-text)' }}>{locale === 'en' ? 'Frequency:' : 'Frecuencia:'}</label>
                          <select 
                            value={medFrecuencia} 
                            onChange={(e) => setMedFrecuencia(e.target.value)}
                            style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', color: '#000' }}
                          >
                            <option value="Diario">{locale === 'en' ? 'Daily (Every 24h)' : 'Diario (Cada 24h)'}</option>
                            <option value="Cada 12 horas">{locale === 'en' ? 'Every 12 hours' : 'Cada 12 horas'}</option>
                            <option value="Cada 8 horas">{locale === 'en' ? 'Every 8 hours' : 'Cada 8 horas'}</option>
                            <option value="Cada 6 horas">{locale === 'en' ? 'Every 6 hours' : 'Cada 6 horas'}</option>
                            <option value="Semanal">{locale === 'en' ? 'Weekly' : 'Semanal'}</option>
                            <option value="Otras">{locale === 'en' ? 'Other' : 'Otras'}</option>
                          </select>
                        </div>
                        {medFrecuencia === 'Otras' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <label style={{ fontSize: '10px', color: 'var(--game-text)' }}>{locale === 'en' ? 'Specify Frequency:' : 'Especificar Frecuencia:'}</label>
                            <input 
                              type="text" 
                              value={medFrecuenciaPersonalizada}
                              onChange={(e) => setMedFrecuenciaPersonalizada(e.target.value)}
                              placeholder={locale === 'en' ? "E.g.: Every 48 hours" : "Ej: Cada 48 horas"}
                              style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', color: '#000' }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="responsive-form-grid-3">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--game-text)' }}>{locale === 'en' ? 'Start Date:' : 'Fecha inicio:'}</label>
                          <input 
                            type="date" 
                            value={medFechaInicio}
                            onChange={(e) => setMedFechaInicio(e.target.value)}
                            style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', color: '#000' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--game-text)' }}>{locale === 'en' ? 'End Date (optional):' : 'Fecha fin (opcional):'}</label>
                          <input 
                            type="date" 
                            value={medFechaFin}
                            onChange={(e) => setMedFechaFin(e.target.value)}
                            style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', color: '#000' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--game-text)' }}>{locale === 'en' ? 'Next Dose / Start Date:' : 'Próxima toma/Inicio:'}</label>
                          <input 
                            type="datetime-local" 
                            value={medHoraProxima}
                            onChange={(e) => setMedHoraProxima(e.target.value)}
                            style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', color: '#000' }}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        style={{
                          marginTop: '4px',
                          padding: '6px',
                          background: 'var(--game-accent, #1976d2)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        {locale === 'en' ? '+ Add Medication' : '+ Añadir Medicación'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Historial Clínico e Incidencias Unificado */}
          {/* Historial Clínico e Incidencias Unificado Colapsable */}
          <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: 'var(--game-card-bg, #fafafa)', padding: '12px', borderRadius: 'var(--game-radius, 8px)', border: '1px solid var(--game-border-color, #eee)' }}>
              <div 
                onClick={() => setShowHistorialClinico(!showHistorialClinico)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {locale === 'en' ? '🏥 Clinical History and Incidents' : '🏥 Historial Clínico e Incidencias'}
                </p>
                <span style={{ fontSize: '11px', color: 'var(--game-text, #888)', fontWeight: 'bold' }}>
                  {showHistorialClinico ? '▲' : '▼'}
                </span>
              </div>

              {showHistorialClinico && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', borderTop: '1px dashed var(--game-border-color, #eee)', paddingTop: '10px' }}>
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
                        {locale === 'en' ? 'Analyze Health with AI 🩺 📷' : 'Analizar Salud por IA 🩺 📷'}
                      </button>
                      <span style={{ fontSize: '10px', color: (!cuota.esIlimitado && cuota.restantes === 0) ? '#c62828' : 'var(--game-text, #666)', textAlign: 'center', display: 'block', fontWeight: '500' }}>
                        {cuota.esIlimitado 
                          ? (locale === 'en' ? '✅ Premium Mode: Unlimited analyses' : '✅ Modo Premium: Análisis ilimitados') 
                          : cuota.restantes === 0 
                            ? (locale === 'en' 
                                ? `⚠️ Daily limit reached (Wait ${IAQuotaManager.obtenerMensajeTiempoRestante()} or add your API Key in Settings 🔑)` 
                                : `⚠️ Límite diario alcanzado (Espera ${IAQuotaManager.obtenerMensajeTiempoRestante()} o añade tu API Key en Ajustes 🔑)`) 
                            : (locale === 'en' 
                                ? `🔬 You have ${cuota.restantes} AI analyses left today` 
                                : `🔬 Te quedan ${cuota.restantes} análisis de IA hoy`)}
                      </span>
                    </div>
                  )}

                  <form onSubmit={agregarIncidenciaPasada} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px' }} className="no-print">
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--game-text, #666)' }}>{locale === 'en' ? 'Register medical incident manually:' : 'Registrar incidencia médica manualmente:'}</span>
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
                        <option value="Enfermedad">{locale === 'en' ? 'Disease' : 'Enfermedad'}</option>
                        <option value="Parásito">{locale === 'en' ? 'Parasite' : 'Parásito'}</option>
                        <option value="Tratamiento">{locale === 'en' ? 'Treatment' : 'Tratamiento'}</option>
                        <option value="Otro">{locale === 'en' ? 'Other' : 'Otro'}</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input 
                        type="text" 
                        placeholder={locale === 'en' ? 'Description of the condition or treatment...' : 'Descripción de la dolencia o tratamiento...'} 
                        value={histDesc} 
                        onChange={(e) => setHistDesc(e.target.value)} 
                        required
                        style={{ flex: 1, minWidth: 0, padding: '6px 8px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
                      />
                      <button type="submit" style={{ padding: '6px 12px', background: '#1a1a1a', color: theme === 'gaming' ? '#000' : '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                        {locale === 'en' ? 'Add' : 'Añadir'}
                      </button>
                    </div>
                  </form>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                    {unifiedHistory.length === 0 ? (
                      <span style={{ fontSize: '11px', color: 'var(--game-text, #888)', fontStyle: 'italic', fontFamily: 'var(--game-font, sans-serif)' }}>{locale === 'en' ? 'No clinical records or incidents.' : 'Sin registros clínicos ni incidencias.'}</span>
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
                                {item.tipo.toUpperCase()} • {item.subtipo.toUpperCase()} • {item.fecha} {esIAReporte && '📊 Click to view analysis'}
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
                                    Yes
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
              )}
            </div>
          </div>



          {/* Código QR Ficticio Clínico */}
          <div className="printable-only-qr" style={{ display: 'none', flexDirection: 'column', alignItems: 'center', marginTop: '16px', borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px' }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '10px', color: 'var(--game-text, #666)', fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)' }}>DIGITAL CLINICAL RECORD</p>
            <svg width="60" height="60" viewBox="0 0 29 29" style={{ border: '1px solid #ddd', padding: '4px', background: '#fff' }}>
              <path d="M0 0h9v9H0zm1 1v7h7V1zm10 0h9v9h-9zm1 1v7h7V1zm-11 10h9v9H0zm1 1v7h7V12zm18-11h9v9h-9zm1 1v7h7V12zm-8 10h3v3h-3zm3 3h3v3h-3zm-3 3h3v3h-3zm11-11h3v3h-3zm-3 3h3v3h-3zm3 3h3v3h-3zm-11 2h3v3h-3zm3 3h3v3h-3zm-6-6h3v3H8zm3 3h3v3h-3zm6-6h3v3h-3zm3 3h3v3h-3z" fill="#000"/>
            </svg>
            <span style={{ fontSize: '8px', color: 'var(--game-text, #888)', marginTop: '4px', fontFamily: 'var(--game-font, sans-serif)' }}>Scan to download clinical history</span>
          </div>

          {/* Escuela de Adiestramiento Adaptativo — solo para caninos */}
          {mascota.especie === 'Canino' && <div style={{ borderTop: 'var(--game-border, 1px solid #f0f0f0)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }} className="no-print">
            <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold', color: 'var(--game-text-bright, #333)', fontFamily: 'var(--game-font, sans-serif)' }}>
              🎓 Escuela de Adiestramiento Adaptativo
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {trucosEntrenamiento.map((truco) => {
                const progreso = mascota.adiestramientoProgress?.[truco] || 0;
                return (
                  <div key={truco} style={{
                    background: 'var(--code-bg, #f4f3ec)',
                    borderRadius: '8px', padding: '8px 12px',
                    display: 'flex', flexDirection: 'column', gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--game-text-bright)' }}>{truco}</span>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: progreso === 100 ? '#16a34a' : 'var(--accent, #8f20e6)' }}>
                        {progreso === 100 ? '⭐ Dominado' : `${progreso}%`}
                      </span>
                    </div>
                    
                    {/* Barra de progreso */}
                    <div style={{ width: '100%', height: '5px', background: '#cbd5e1', borderRadius: '3px', overflow: 'hidden' }}>
                      <div className="liquid-progress-bar" style={{ width: `${progreso}%`, height: '100%', background: progreso === 100 ? '#16a34a' : 'var(--accent, #8f20e6)', transition: 'width 0.3s' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                      <button
                        type="button"
                        onClick={(e) => iniciarEntrenamiento(e, truco)}
                        disabled={activeTrainingTrick !== null}
                        style={{
                          padding: '3px 8px', fontSize: '9.5px', fontWeight: 'bold',
                          background: 'transparent', border: '1px solid var(--border)',
                          borderRadius: '4px', cursor: 'pointer', color: 'var(--text-h)'
                        }}
                      >
                        {progreso === 100 ? 'Reforzar 🎓' : 'Entrenar ⏱️'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>}

          {/* Botones de Acción: Exportar, Nutrición */}
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
              {locale === 'en' ? 'Export Record 📄' : 'Exportar Ficha 📄'}
            </button>
            <button
              onClick={runChefIA}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'var(--game-accent-light, rgba(25, 118, 210, 0.1))',
                color: 'var(--game-text-bright, #1976d2)',
                border: '1.5px solid var(--game-border-color, #1976d2)',
                borderRadius: 'var(--game-radius, 8px)',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'var(--game-font, sans-serif)'
              }}
            >
              {locale === 'en' ? 'Nutritional Chef 🍖' : 'Chef Nutricional 🍖'}
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
                <h4 style={{ margin: '0 0 12px 0', color: '#c62828', fontSize: '18px', fontFamily: 'var(--game-font, sans-serif)' }}>⚠️ Delete Pet?</h4>
                <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--game-text, #555)', fontFamily: 'var(--game-font, sans-serif)', lineHeight: '1.4' }}>
                  Are you sure you want to permanently delete the record for <strong>{mascota.nombre}</strong>? This action cannot be undone.
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
                    Yes, delete 🗑️
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
                      🩺 Reporte de Salud por IA
                    </h3>
                    <span style={{ fontSize: '11px', color: '#666', marginTop: '2px', fontWeight: '500' }}>
                      Category: {iaReporteModal.subtipo} ❖ Date: {iaReporteModal.fecha}
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
                      💉 Health Diagnosis
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

                {/* Botón inferior de cerrar y TTS */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', width: '100%' }}>
                  <TTSButton
                    text={`Diagnosis: ${iaReporteModal.diagnostico}. Suggested treatment: ${iaReporteModal.tratamiento}. ${iaReporteModal.advertencia ? `Warning: ${iaReporteModal.advertencia}` : ''}`}
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
        item={mascota}
        type="pet"
      />

      {/* MODAL DEL CHEF NUTRICIONAL IA */}
      {showChefModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(8,6,13,0.7)', backdropFilter: 'blur(8px)',
          zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', boxSizing: 'border-box'
        }} className="modal-backdrop no-print">
          <div className="chef-modal-content" style={{
            background: 'var(--bg, #fff)',
            border: '1px solid var(--border, #e5e4e7)',
            borderRadius: '16px',
            width: '100%', maxWidth: '500px',
            maxHeight: '90vh',
            padding: '24px', boxSizing: 'border-box',
            textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px',
            boxShadow: 'var(--shadow)', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-h, #08060d)', fontWeight: 800 }}>
                Chef Nutricional IA 🍖
              </h3>
              <span style={{ fontSize: '11px', background: 'var(--accent-bg)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                Gemini AI
              </span>
            </div>

            {chefLoading ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', animation: 'spin 2s linear infinite', display: 'inline-block' }}>🍖</div>
                <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: 'var(--text)' }}>Generating recipe and caloric proportions...</p>
              </div>
            ) : chefRecipe ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2px' }}>
                  <TTSButton text={chefRecipe.receta} theme={theme} size="small" />
                </div>
                
                <div style={{ 
                  background: 'var(--code-bg, #f4f3ec)', 
                  borderRadius: '12px', padding: '16px',
                  fontFamily: 'monospace', fontSize: '12px',
                  whiteSpace: 'pre-wrap', color: 'var(--text-h)',
                  border: '1px solid var(--border)'
                }}>
                  {chefRecipe.receta}
                </div>

                {chefRecipe.advertencia && (
                  <div style={{
                    fontSize: '11px', color: '#c2410c', background: '#fff7ed',
                    border: '1px solid #fed7aa', borderRadius: '8px', padding: '8px 12px'
                  }}>
                    ⚠️ {chefRecipe.advertencia}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Receta Chef IA - ${mascota.nombre}</title>
                              <style>
                                body { font-family: system-ui, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
                                h1 { border-bottom: 2px solid #ea580c; padding-bottom: 10px; color: #7c2d12; }
                                pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; font-size: 14px; white-space: pre-wrap; }
                              </style>
                            </head>
                            <body>
                              <h1>🍖 Receta y Plan Nutricional: ${mascota.nombre}</h1>
                              <p><strong>Especie:</strong> Perro/Gato | <strong>Actividad:</strong> ${mascota.actividad}</p>
                              <hr />
                              <pre>${chefRecipe.receta.replace('[Modo Offline - Receta Estimada]', '')}</pre>
                              <script>window.print();</script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }}
                    style={{
                      flex: 1, padding: '10px', background: 'transparent',
                      border: '1px solid var(--border)', borderRadius: '8px',
                      cursor: 'pointer', fontSize: '13px', fontWeight: 'bold'
                    }}
                  >
                    Imprimir Receta 🖨️
                  </button>
                </div>
              </div>
            ) : null}

            <button 
              type="button" 
              onClick={() => setShowChefModal(false)}
              style={{
                width: '100%', padding: '10px',
                background: 'var(--accent, #8f20e6)', color: 'white',
                border: 'none', borderRadius: '8px',
                fontWeight: 'bold', fontSize: '13.5px', cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE ENTRENAMIENTO ACTIVO */}
      {activeTrainingTrick && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(8,6,13,0.7)', backdropFilter: 'blur(8px)',
          zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', boxSizing: 'border-box'
        }} className="modal-backdrop no-print">
          <div className="training-modal-content" style={{
            background: 'var(--bg, #fff)',
            border: '1px solid var(--border, #e5e4e7)',
            borderRadius: '16px',
            width: '100%', maxWidth: '380px',
            padding: '24px', boxSizing: 'border-box',
            textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px',
            boxShadow: 'var(--shadow)'
          }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-h)', fontWeight: 'bold' }}>
              Entrenando "{activeTrainingTrick}" ⏱️
            </h3>
            
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>
              Practica el comando con tu mascota ahora.
            </p>

            <div style={{ fontSize: '48px', fontWeight: '800', color: 'var(--accent)' }}>
              {trainingTimer > 0 ? `${trainingTimer}s` : "Time's up! 🏆"}
            </div>

            {trainingTimer === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>How did your pet respond?</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button" 
                    onClick={() => registrarResultadoEntrenamiento(-10)}
                    style={{ flex: 1, padding: '8px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                  >
                    😰 Struggled
                  </button>
                  <button 
                    type="button" 
                    onClick={() => registrarResultadoEntrenamiento(5)}
                    style={{ flex: 1, padding: '8px', background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                  >
                    🟡 Progreso
                  </button>
                  <button 
                    type="button" 
                    onClick={() => registrarResultadoEntrenamiento(15)}
                    style={{ flex: 1, padding: '8px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                  >
                    🟢 Perfecto
                  </button>
                </div>
              </div>
            ) : (
              <button 
                type="button" 
                onClick={() => setActiveTrainingTrick(null)}
                style={{ padding: '8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
              >
                Cancel Session
              </button>
            )}
          </div>
        </div>
      )}

      {/* CONFETTI ANIMATION ON COMMAND DOMINADO */}
      {showConfettiTrick && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          pointerEvents: 'none', zIndex: 12000, overflow: 'hidden'
        }}>
          {Array.from({ length: 30 }).map((_, i) => {
            const colors = ['#f43f5e', '#3b82f6', '#10b981', '#eab308', '#a855f7', '#ff7849'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const randomTx = (Math.random() - 0.5) * 400;
            const randomTy = (Math.random() - 0.5) * 400 - 200;
            const randomSize = Math.random() * 8 + 6;
            return (
              <div
                key={i}
                className="confetti-particle"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: `${randomSize}px`,
                  height: `${randomSize}px`,
                  borderRadius: '50%',
                  background: randomColor,
                  // @ts-expect-error Custom CSS variable
                  '--tx': `${randomTx}px`,
                  '--ty': `${randomTy}px`,
                  animation: 'confettiExplode 2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
                }}
              />
            );
          })}
          <div style={{
            position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'rgba(255,255,255,0.95)', border: '2px solid #16a34a',
            padding: '12px 24px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            textAlign: 'center', animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <span style={{ fontSize: '32px' }}>🏆</span>
            <h4 style={{ margin: '4px 0 0 0', color: '#15803d', fontWeight: 'bold' }}>Command Mastered!</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#4b5563' }}>Your pet has learned "{showConfettiTrick}"</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes confettiExplode {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0.2); opacity: 0; }
        }
      `}</style>

      {showAvatarLightbox && mascota.fotoUrl && (
        <ImageLightbox
          imageUrl={mascota.fotoUrl}
          onClose={() => setShowAvatarLightbox(false)}
          title={mascota.nombre}
          theme={theme}
        />
      )}
    </div>
  );
};

export const PetCard = React.memo(PetCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.theme === nextProps.theme &&
    JSON.stringify(prevProps.mascota) === JSON.stringify(nextProps.mascota)
  );
});
