import React, { useState } from 'react';
import { TTSButton } from '../utils/useTTS';
import { CameraScanner } from './CameraScanner';
import { GeminiAPIService } from '../services/geminiAPI';
import { LocalDatabase } from '../database/db';
import { safeUUID } from '../utils/uuid';
import type { Mascota, Planta } from '../database/types';
import { IAQuotaManager } from '../utils/iaQuota';

interface ScannerModalProps {
  onClose: () => void;
  mascotas: Mascota[];
  plantas: Planta[];

  onUpdate: () => void;
  forcedMode?: ScanMode;
  forcedAssetId?: string;
}

type ScanMode = 'registrar_mascota' | 'salud_mascota' | 'registrar_planta' | 'enfermedad_planta';

export const ScannerModal: React.FC<ScannerModalProps> = ({ onClose, mascotas, plantas, onUpdate, forcedMode, forcedAssetId }) => {
  const cuota = IAQuotaManager.obtenerEstadoCuota();
  const [mode, setMode] = useState<ScanMode>(forcedMode || 'registrar_mascota');
  const [loading, setLoading] = useState(false);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<{ blob: Blob; dataUrl: string }[]>([]);
  const [customQuery, setCustomQuery] = useState('');
  
  // Resultados del escaneo por IA
  const [scanResult, setScanResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados de edición del formulario de mascota escaneada
  const [petNombre, setPetNombre] = useState('');
  const [petEspecie, setPetEspecie] = useState<'Felino' | 'Canino'>('Felino');
  const [petRaza, setPetRaza] = useState('');
  const [petPeso, setPetPeso] = useState('4.0');
  const [petActividad, setPetActividad] = useState<'Baja' | 'Moderada' | 'Alta'>('Moderada');
  const [petSexo, setPetSexo] = useState<'Macho' | 'Hembra'>('Macho');
  const [petCastrado, setPetCastrado] = useState<boolean>(false);
  const [petFechaNacimiento, setPetFechaNacimiento] = useState(() => new Date().toISOString().split('T')[0]);

  // Estados de edición del formulario de planta escaneada
  const [plantNombreComun, setPlantNombreComun] = useState('');
  const [plantNombreCientifico, setPlantNombreCientifico] = useState('');
  const [plantUbicacion, setPlantUbicacion] = useState('Salón');
  const [plantTipoRiego, setPlantTipoRiego] = useState('Agua del grifo reposada');
  const [plantIntervaloRiego, setPlantIntervaloRiego] = useState('7');
  const [plantToxicidad, setPlantToxicidad] = useState<'Segura' | 'Tóxica leve (irritante)' | 'Altamente tóxica (urgencia)'>('Segura');
  const [plantToxicidadCanina, setPlantToxicidadCanina] = useState<'Segura' | 'Tóxica leve (irritante)' | 'Altamente tóxica (urgencia)'>('Segura');
  const [plantCompuestosToxicos, setPlantCompuestosToxicos] = useState('');
  const [plantUltimoRiegoOpcion, setPlantUltimoRiegoOpcion] = useState('hoy');


  // Estados para asociar diagnósticos de salud/enfermedad
  const [selectedAssetId, setSelectedAssetId] = useState(forcedAssetId || '');

  const handleCapture = async (imageList: { blob: Blob; dataUrl: string }[]) => {
    if (imageList.length === 0) return;
    
    setCapturedImages(imageList);
    const primaryImage = imageList[0];
    setCapturedDataUrl(primaryImage.dataUrl);
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await GeminiAPIService.analizarSmartScanner(primaryImage.blob, mode, customQuery);
      setScanResult(res);

      if (res._isSimulated) {
        setErrorMsg(`Aviso: ${IAQuotaManager.formatearErrorCuota(res._apiError)}`);
      }

      // Pre-rellenar los formularios correspondientes
      if (mode === 'registrar_mascota') {
        setPetEspecie(res.especie === 'Canino' ? 'Canino' : 'Felino');
        setPetRaza(res.raza || '');
        setPetNombre(res.nombreSugerido || '');
        setPetPeso(String(res.pesoEstimadoKg || '4.0'));
        setPetActividad(res.actividadSugerida || 'Moderada');
      } else if (mode === 'registrar_planta') {
        setPlantNombreComun(res.nombreComun || '');
        setPlantNombreCientifico(res.nombreCientifico || '');
        setPlantIntervaloRiego(String(res.intervaloRiegoSugeridoDias || '7'));
        setPlantToxicidad(res.toxicidadFelina || 'Segura');
        setPlantToxicidadCanina(res.toxicidadCanina || 'Segura');
        setPlantCompuestosToxicos(res.compuestosToxicos || '');
      } else if (mode === 'salud_mascota') {
        if (forcedAssetId) {
          setSelectedAssetId(forcedAssetId);
        } else if (mascotas.length > 0) {
          setSelectedAssetId(mascotas[0].id);
        }
      } else if (mode === 'enfermedad_planta') {
        if (forcedAssetId) {
          setSelectedAssetId(forcedAssetId);
        } else if (plantas.length > 0) {
          setSelectedAssetId(plantas[0].id);
        }
      }
    } catch (err: any) {
      console.error("Error al analizar por IA:", err);
      setErrorMsg(`Fallo al contactar con la IA: ${err.message || err}. Por favor, rellena los datos manualmente.`);
    } finally {
      setLoading(false);
    }
  };


  const seleccionarFotoPrincipal = async (image: { blob: Blob; dataUrl: string }) => {
    setCapturedDataUrl(image.dataUrl);
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await GeminiAPIService.analizarSmartScanner(image.blob, mode, customQuery);
      setScanResult(res);

      if (res._isSimulated) {
        setErrorMsg(`Aviso: ${IAQuotaManager.formatearErrorCuota(res._apiError)}`);
      }

      if (mode === 'registrar_mascota') {
        setPetEspecie(res.especie === 'Canino' ? 'Canino' : 'Felino');
        setPetRaza(res.raza || '');
        setPetNombre(res.nombreSugerido || '');
        setPetPeso(String(res.pesoEstimadoKg || '4.0'));
        setPetActividad(res.actividadSugerida || 'Moderada');
      } else if (mode === 'registrar_planta') {
        setPlantNombreComun(res.nombreComun || '');
        setPlantNombreCientifico(res.nombreCientifico || '');
        setPlantIntervaloRiego(String(res.intervaloRiegoSugeridoDias || '7'));
        setPlantToxicidad(res.toxicidadFelina || 'Segura');
        setPlantToxicidadCanina(res.toxicidadCanina || 'Segura');
        setPlantCompuestosToxicos(res.compuestosToxicos || '');
      } else if (mode === 'salud_mascota') {
        if (!selectedAssetId) {
          if (forcedAssetId) {
            setSelectedAssetId(forcedAssetId);
          } else if (mascotas.length > 0) {
            setSelectedAssetId(mascotas[0].id);
          }
        }
      } else if (mode === 'enfermedad_planta') {
        if (!selectedAssetId) {
          if (forcedAssetId) {
            setSelectedAssetId(forcedAssetId);
          } else if (plantas.length > 0) {
            setSelectedAssetId(plantas[0].id);
          }
        }
      }
    } catch (err: any) {
      console.error("Error al analizar por IA:", err);
      setErrorMsg(`Fallo al contactar con la IA: ${err.message || err}. Por favor, rellena los datos manualmente.`);
    } finally {
      setLoading(false);
    }
  };

  const guardarMascotaEscaneada = async () => {
    if (!petNombre.trim()) {
      setErrorMsg('El nombre de la mascota es obligatorio.');
      return;
    }
    if (!capturedDataUrl) {
      setErrorMsg('Se necesita una foto para registrar la mascota.');
      return;
    }
    
    // Calcular porción sugerida (metabólica simplificada)
    const pesoNum = parseFloat(petPeso) || 4.0;
    const rer = Math.round(70 * Math.pow(pesoNum, 0.75));
    const factor = petActividad === 'Baja' ? 1.0 : petActividad === 'Alta' ? 1.4 : 1.2;
    const der = Math.round(rer * factor);
    const porcionSugerida = Math.round((der / 360) * 100);

    const nuevaMascota: Mascota = {
      id: safeUUID(),
      nombre: petNombre.trim(),
      especie: petEspecie,
      fechaNacimiento: petFechaNacimiento,
      registroPeso: [{ fecha: new Date().toISOString(), pesoKg: pesoNum }],
      historialVacunas: [],
      actividad: petActividad,
      porcionDiariaGramos: porcionSugerida,
      diarioClinico: [],
      fotoUrl: capturedDataUrl, // Foto obligatoria
      fotos: capturedImages.length > 0 ? capturedImages.map(img => img.dataUrl) : [capturedDataUrl],
      raza: petRaza.trim() || undefined,
      sexo: petSexo,
      castrado: petCastrado
    };

    try {
      await LocalDatabase.saveMascota(nuevaMascota);
      onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al guardar la mascota en IndexedDB.");
    }
  };

  const guardarPlantaEscaneada = async () => {
    if (!plantNombreComun.trim()) {
      setErrorMsg('El nombre común es obligatorio.');
      return;
    }
    if (!capturedDataUrl) {
      setErrorMsg('Se necesita una foto para registrar la planta.');
      return;
    }

    let ultimaFecha: Date;
    const diasIntervalo = parseInt(plantIntervaloRiego) || 7;

    switch (plantUltimoRiegoOpcion) {
      case 'ayer':
        ultimaFecha = new Date(Date.now() - 1 * 24 * 3600 * 1000);
        break;
      case 'hace_2':
        ultimaFecha = new Date(Date.now() - 2 * 24 * 3600 * 1000);
        break;
      case 'hace_3':
        ultimaFecha = new Date(Date.now() - 3 * 24 * 3600 * 1000);
        break;
      case 'hace_5':
        ultimaFecha = new Date(Date.now() - 5 * 24 * 3600 * 1000);
        break;
      case 'hace_7':
        ultimaFecha = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        break;
      case 'necesita_ya':
        ultimaFecha = new Date(Date.now() - diasIntervalo * 24 * 3600 * 1000);
        break;
      case 'hoy':
      default:
        ultimaFecha = new Date();
        break;
    }

    const proximaFecha = new Date(ultimaFecha.getTime() + diasIntervalo * 24 * 3600 * 1000);

    const nuevaPlanta: Planta = {
      id: safeUUID(),
      nombreComun: plantNombreComun.trim(),
      nombreCientifico: plantNombreCientifico.trim() || undefined,
      ubicacionHabitacion: plantUbicacion,
      tipoRiegoEspecifico: plantTipoRiego as any,
      intervaloRiegoDias: diasIntervalo,
      intervaloRiegoBase: diasIntervalo,
      ultimaFechaRiego: ultimaFecha.toISOString(),
      proximaFechaRiego: proximaFecha.toISOString(),
      toxicidadFelina: plantToxicidad,
      toxicidadCanina: plantToxicidadCanina,
      compuestosToxicos: plantCompuestosToxicos || undefined,
      grosorHoja: 'Normal',
      temperaturaZona: 20,
      diarioFoliar: [],
      fotoUrl: capturedDataUrl, // Foto obligatoria
      fotos: capturedImages.length > 0 ? capturedImages.map(img => img.dataUrl) : [capturedDataUrl]
    };

    try {
      await LocalDatabase.savePlanta(nuevaPlanta);
      onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al guardar la planta en IndexedDB.");
    }
  };



  const guardarReporteSaludEnDiario = async () => {
    if (!selectedAssetId || !scanResult) return;
    const pet = mascotas.find(m => m.id === selectedAssetId);
    if (!pet) return;

    const nuevaNota = {
      id: safeUUID(),
      fecha: new Date().toISOString(),
      nota: `[IA Diagnóstico de Salud]: ${scanResult.diagnostico} | Tratamiento: ${scanResult.tratamiento} | Advertencia: ${scanResult.advertencia}`,
      categoria: 'Observación general' as const
    };

    const nuevoDiag = {
      id: safeUUID(),
      fecha: new Date().toISOString(),
      diagnostico: scanResult.diagnostico,
      tratamiento: scanResult.tratamiento,
      advertencia: scanResult.advertencia || '',
      esUrgente: !!scanResult.esUrgente,
      fotoUrl: capturedDataUrl || undefined
    };

    const petActualizado: Mascota = {
      ...pet,
      diarioClinico: [nuevaNota, ...(pet.diarioClinico || [])],
      diagnosticosIA: [nuevoDiag, ...(pet.diagnosticosIA || [])]
    };

    await LocalDatabase.saveMascota(petActualizado);
    onUpdate();
    onClose();
  };

  const guardarReporteEnfermedadEnDiario = async () => {
    if (!selectedAssetId || !scanResult) return;
    const plant = plantas.find(p => p.id === selectedAssetId);
    if (!plant) {
      setErrorMsg('No se encontró la planta seleccionada.');
      return;
    }

    const nuevaNota = {
      id: safeUUID(),
      fecha: new Date().toISOString(),
      nota: `[AI Phytosanitary Diagnosis]: ${scanResult.diagnostico} | Treatment: ${scanResult.tratamiento} | Suggested isolation: ${scanResult.esUrgente ? 'Yes' : 'NO'}`,
      estadoGeneral: (scanResult.esUrgente ? 'Clorosis/Lesión' : 'Normal') as any
    };

    const nuevoDiag = {
      id: safeUUID(),
      fecha: new Date().toISOString(),
      diagnostico: scanResult.diagnostico,
      tratamiento: scanResult.tratamiento,
      advertencia: scanResult.advertencia || '',
      esUrgente: !!scanResult.esUrgente,
      fotoUrl: capturedDataUrl || undefined
    };

    const plantActualizada: Planta = {
      ...plant,
      diarioFoliar: [nuevaNota, ...(plant.diarioFoliar || [])],
      diagnosticosIA: [nuevoDiag, ...(plant.diagnosticosIA || [])]
    };

    await LocalDatabase.savePlanta(plantActualizada);
    onUpdate();
    onClose();
  };



  const resetScanner = () => {
    setCapturedDataUrl(null);
    setCapturedImages([]);
    setScanResult(null);
    setErrorMsg('');
    // Reset pet form
    setPetNombre('');
    setPetEspecie('Felino');
    setPetRaza('');
    setPetPeso('4.0');
    setPetActividad('Moderada');
    setPetSexo('Macho');
    setPetCastrado(false);
    setPetFechaNacimiento(new Date().toISOString().split('T')[0]);
    // Reset plant form
    setPlantNombreComun('');
    setPlantNombreCientifico('');
    setPlantUbicacion('Salón');
    setPlantTipoRiego('Agua del grifo reposada');
    setPlantIntervaloRiego('7');
    setPlantToxicidad('Segura');
    setPlantToxicidadCanina('Segura');
    setPlantCompuestosToxicos('');
    setPlantUltimoRiegoOpcion('hoy');
  };

  const accentColor = (mode === 'registrar_mascota' || mode === 'salud_mascota') 
    ? 'var(--game-accent, #1976d2)' 
    : 'var(--game-accent, #2e7d32)';

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999,
      padding: '16px',
      overflowY: 'auto',
      overflowX: 'hidden'
    }}>
      <div className="scanner-modal-content" style={{
        background: 'var(--game-card-bg, #ffffff)',
        borderRadius: 'var(--game-radius, 16px)',
        border: 'var(--game-border, 1px solid #f0f0f0)',
        boxShadow: 'var(--game-shadow, 0 10px 30px rgba(0,0,0,0.15))',
        width: '100%',
        maxWidth: '500px',
        padding: '24px',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto',
        color: 'var(--game-text, #333)',
        fontFamily: 'var(--game-font, sans-serif)',
        margin: 'auto'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}
        >
          ✕
        </button>

        <h2 style={{ marginTop: '0', fontSize: '20px', color: 'var(--game-text-bright, #333)' }}>
          🔬 Smart Clinical Scanner
        </h2>

        <div style={{
          background: (!cuota.esIlimitado && cuota.restantes === 0) ? 'rgba(244,67,54,0.1)' : 'rgba(25, 118, 210, 0.08)',
          border: '1px solid ' + ((!cuota.esIlimitado && cuota.restantes === 0) ? '#f44336' : 'var(--game-border-color, #1976d2)'),
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '12px',
          color: (!cuota.esIlimitado && cuota.restantes === 0) ? '#c62828' : 'var(--game-text-bright)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: '500'
        }}>
          <span>
            {cuota.esIlimitado 
              ? '✅ Premium Mode: Unlimited analyses with your API key.' 
              : cuota.restantes === 0 
                ? `❌ Daily analysis limit reached (Wait ${IAQuotaManager.obtenerMensajeTiempoRestante()} or add your API Key in Settings 🔑)` 
                : `🔬 You have ${cuota.restantes} AI analyses available today.`}
          </span>
        </div>

        {/* 1. Panel de selección de Modos */}
        {!capturedDataUrl && !forcedMode && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '16px 0' }}>
            <button 
              onClick={() => setMode('registrar_mascota')} 
              style={{ padding: '10px 6px', background: mode === 'registrar_mascota' ? 'var(--game-accent, #1976d2)' : 'rgba(0,0,0,0.05)', color: mode === 'registrar_mascota' ? '#fff' : 'var(--game-text)', border: '1px solid var(--game-border-color, #ccc)', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Registrar Mascota 🐾
            </button>
            <button 
              onClick={() => setMode('salud_mascota')} 
              style={{ padding: '10px 6px', background: mode === 'salud_mascota' ? 'var(--game-accent, #1976d2)' : 'rgba(0,0,0,0.05)', color: mode === 'salud_mascota' ? '#fff' : 'var(--game-text)', border: '1px solid var(--game-border-color, #ccc)', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Salud Mascota 🩺
            </button>
            <button 
              onClick={() => setMode('registrar_planta')} 
              style={{ padding: '10px 6px', background: mode === 'registrar_planta' ? 'var(--game-accent, #2e7d32)' : 'rgba(0,0,0,0.05)', color: mode === 'registrar_planta' ? '#fff' : 'var(--game-text)', border: '1px solid var(--game-border-color, #ccc)', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Registrar Planta 🌿
            </button>
            <button 
              onClick={() => setMode('enfermedad_planta')} 
              style={{ padding: '10px 6px', background: mode === 'enfermedad_planta' ? 'var(--game-accent, #2e7d32)' : 'rgba(0,0,0,0.05)', color: mode === 'enfermedad_planta' ? '#fff' : 'var(--game-text)', border: '1px solid var(--game-border-color, #ccc)', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Enfermedad Planta 🍂
            </button>

          </div>
        )}

        {/* Caja de consulta para los modos de salud/diagnóstico */}
        {!capturedDataUrl && (mode === 'salud_mascota' || mode === 'enfermedad_planta') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Consulta / Notas adicionales:</label>
            <input 
              type="text" 
              placeholder="Ej: Tiene una calva en el lomo / Manchas marrones en las hojas"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--game-border-color, #ccc)', borderRadius: '6px', fontSize: '13px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
            />
          </div>
        )}

        {/* 2. Captura / Vídeo */}
        {!capturedDataUrl ? (
          (!cuota.esIlimitado && cuota.restantes === 0) ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              background: 'rgba(244,67,54,0.05)',
              border: '1.5px dashed #f44336',
              borderRadius: '12px',
              color: 'var(--game-text-bright)'
            }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>⚠️</span>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#c62828', fontWeight: 'bold' }}>Scanner Disabled</h3>
              <p style={{ fontSize: '13px', margin: '0 0 16px 0', color: 'var(--game-text)' }}>
                {`You have reached your daily free analysis limit. It will be available again in ${IAQuotaManager.obtenerMensajeTiempoRestante()}. For immediate unlimited analyses, enter your API key in Settings 🔑.`}
              </p>
            </div>
          ) : (
            <CameraScanner mode={(mode === 'registrar_mascota' || mode === 'salud_mascota') ? 'mascota' : 'planta'} onCapture={handleCapture} />
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              position: 'relative',
              padding: '12px 12px 24px 12px',
              background: 'var(--game-card-bg, #ffffff)',
              border: 'var(--game-border, 1.5px solid #ccc)',
              borderRadius: 'var(--game-radius, 12px)',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box'
            }}>
              <img 
                src={capturedDataUrl} 
                alt="Captured" 
                style={{ 
                  width: '100%', 
                  borderRadius: '6px', 
                  objectFit: 'contain', 
                  height: 'auto',
                  maxHeight: '320px',
                  background: '#121212',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.2)' 
                }} 
              />
              <div style={{
                marginTop: '12px',
                fontFamily: 'var(--game-font, sans-serif)',
                fontSize: '11px',
                fontWeight: 'bold',
                letterSpacing: '0.05em',
                color: 'var(--game-text-bright, #333)',
                textTransform: 'uppercase',
                opacity: 0.85
              }}>
                📷 ESCANEO REALIZADO
              </div>
            </div>
            
            {capturedImages.length > 1 && (
              <div style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap',
                width: '100%',
                boxSizing: 'border-box',
                marginTop: '-8px',
                marginBottom: '4px'
              }}>
                {capturedImages.map((img, idx) => {
                  const isSelected = img.dataUrl === capturedDataUrl;
                  return (
                    <div
                      key={idx}
                      onClick={() => !loading && seleccionarFotoPrincipal(img)}
                      style={{
                        position: 'relative',
                        width: '50px',
                        height: '50px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        border: isSelected 
                          ? `2.5px solid ${accentColor}` 
                          : '1.5px solid rgba(0, 0, 0, 0.15)',
                        boxSizing: 'border-box',
                        transition: 'all 0.15s',
                        opacity: loading ? 0.6 : 1
                      }}
                    >
                      <img
                        src={img.dataUrl}
                        alt={`Miniatura ${idx + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      {isSelected && (
                        <span style={{
                          position: 'absolute',
                          bottom: '1px',
                          right: '1px',
                          fontSize: '8px',
                          color: '#fff',
                          background: accentColor,
                          borderRadius: '50%',
                          width: '12px',
                          height: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold'
                        }}>
                          ✓
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {loading && <p style={{ textAlign: 'center', fontSize: '14px', color: accentColor }}>Processing molecular AI analysis...</p>}
            
            {errorMsg && (
              <p style={{ 
                color: errorMsg.startsWith('Aviso') ? '#e65100' : '#ff3333', 
                fontSize: '12px', 
                background: errorMsg.startsWith('Aviso') ? 'rgba(230,81,0,0.08)' : 'rgba(255,51,51,0.08)', 
                border: errorMsg.startsWith('Aviso') ? '1px solid rgba(230,81,0,0.25)' : '1px solid rgba(255,51,51,0.25)',
                padding: '10px 12px', 
                borderRadius: '8px',
                lineHeight: '1.4',
                margin: '8px 0 16px 0'
              }}>
                {errorMsg}
              </p>
            )}

            {!loading && scanResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* FORMULARIO MODO: Registrar Mascota */}
                {mode === 'registrar_mascota' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Especie:</label>
                        <select value={petEspecie} onChange={(e) => setPetEspecie(e.target.value as any)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
                          <option value="Felino">Felino 🐱</option>
                          <option value="Canino">Canino 🐶</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Raza sugerida:</label>
                        <input type="text" value={petRaza} onChange={(e) => setPetRaza(e.target.value)} style={{ width: '100%', padding: '5px', border: '1px solid #ccc', borderRadius: '4px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Nombre Mascota:</label>
                      <input type="text" placeholder="Ponle un nombre..." value={petNombre} onChange={(e) => setPetNombre(e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Fecha de Nacimiento:</label>
                      <input 
                        type="date" 
                        value={petFechaNacimiento} 
                        onChange={(e) => setPetFechaNacimiento(e.target.value)} 
                        max={new Date().toISOString().split('T')[0]}
                        style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)', fontSize: '12px', boxSizing: 'border-box' }} 
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Peso Estimado (kg):</label>
                        <input type="number" step="0.1" value={petPeso} onChange={(e) => setPetPeso(e.target.value)} style={{ width: '100%', padding: '5px', border: '1px solid #ccc', borderRadius: '4px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Actividad:</label>
                        <select value={petActividad} onChange={(e) => setPetActividad(e.target.value as any)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
                          <option value="Baja">Baja</option>
                          <option value="Moderada">Moderada</option>
                          <option value="Alta">Alta</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Sexo:</label>
                        <select value={petSexo} onChange={(e) => setPetSexo(e.target.value as any)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
                          <option value="Macho">Macho ♂</option>
                          <option value="Hembra">Hembra ♀</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Neutered/Spayed?:</label>
                        <select value={petCastrado ? 'si' : 'no'} onChange={(e) => setPetCastrado(e.target.value === 'si')} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
                          <option value="no">No</option>
                          <option value="si">Yes</option>
                        </select>
                      </div>
                    </div>


                    <button onClick={guardarMascotaEscaneada} disabled={!petNombre.trim()} style={{ padding: '12px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: petNombre.trim() ? 'pointer' : 'not-allowed', marginTop: '10px', opacity: petNombre.trim() ? 1 : 0.6 }}>
                      Registrar Mascota 💾
                    </button>
                  </div>
                )}

                {/* FORMULARIO MODO: Registrar Planta */}
                {mode === 'registrar_planta' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Common Name:</label>
                      <input type="text" value={plantNombreComun} onChange={(e) => setPlantNombreComun(e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Scientific Name:</label>
                      <input type="text" value={plantNombreCientifico} onChange={(e) => setPlantNombreCientifico(e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Location:</label>
                        <input type="text" value={plantUbicacion} onChange={(e) => setPlantUbicacion(e.target.value)} style={{ width: '100%', padding: '5px', border: '1px solid #ccc', borderRadius: '4px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Recommended watering every (days):</label>
                        <input type="number" value={plantIntervaloRiego} onChange={(e) => setPlantIntervaloRiego(e.target.value)} style={{ width: '100%', padding: '5px', border: '1px solid #ccc', borderRadius: '4px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Tipo de Riego:</label>
                      <select value={plantTipoRiego} onChange={(e) => setPlantTipoRiego(e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
                        <option value="Agua del grifo reposada">Agua del grifo reposada</option>
                        <option value="Agua blanda reposada">Agua blanda reposada</option>
                        <option value="Agua destilada">Agua destilada</option>
                        <option value="Agua de lluvia">Agua de lluvia</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 'bold' }}>When was the last watering?</label>
                      <select value={plantUltimoRiegoOpcion} onChange={(e) => setPlantUltimoRiegoOpcion(e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)', fontSize: '12px' }}>
                        <option value="hoy">Hoy 💧</option>
                        <option value="ayer">Ayer</option>
                        <option value="hace_2">2 days ago</option>
                        <option value="hace_3">3 days ago</option>
                        <option value="hace_5">5 days ago</option>
                        <option value="hace_7">7 days ago (1 week)</option>
                        <option value="necesita_ya">Requiere riego ya (Desconocido / Hace mucho)</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Toxicidad Felina:</label>
                        <select value={plantToxicidad} onChange={(e) => setPlantToxicidad(e.target.value as any)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)', fontSize: '12px' }}>
                          <option value="Segura">Segura 🐈</option>
                          <option value="Tóxica leve (irritante)">Mildly Toxic ⚠️</option>
                          <option value="Altamente tóxica (urgencia)">Highly Toxic 🚨</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Toxicidad Canina:</label>
                        <select value={plantToxicidadCanina} onChange={(e) => setPlantToxicidadCanina(e.target.value as any)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)', fontSize: '12px' }}>
                          <option value="Segura">Segura 🐕</option>
                          <option value="Tóxica leve (irritante)">Mildly Toxic ⚠️</option>
                          <option value="Altamente tóxica (urgencia)">Highly Toxic 🚨</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Compuestos:</label>
                      <input type="text" placeholder="Ej: Oxalatos" value={plantCompuestosToxicos} onChange={(e) => setPlantCompuestosToxicos(e.target.value)} style={{ width: '100%', padding: '5px', border: '1px solid #ccc', borderRadius: '4px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }} />
                    </div>
                    <button onClick={guardarPlantaEscaneada} disabled={!plantNombreComun.trim()} style={{ padding: '12px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: plantNombreComun.trim() ? 'pointer' : 'not-allowed', marginTop: '10px', opacity: plantNombreComun.trim() ? 1 : 0.6 }}>
                      Registrar Planta 💾
                    </button>
                  </div>
                )}

                {/* FORMULARIO MODO: Salud Mascota */}
                {mode === 'salud_mascota' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    <div style={{ padding: '12px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', border: '1px solid var(--game-border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                        <TTSButton text={`Diagnosis: ${scanResult.diagnostico}. Suggested treatment: ${scanResult.tratamiento}.${scanResult.advertencia ? ` Alert: ${scanResult.advertencia}` : ''}`} />
                      </div>
                      <p><strong>Diagnosis:</strong> {scanResult.diagnostico}</p>
                      <p><strong>Tratamiento sugerido:</strong> {scanResult.tratamiento}</p>
                      <p style={{ color: scanResult.esUrgente ? '#f44336' : 'inherit' }}><strong>Alerta:</strong> {scanResult.advertencia}</p>
                    </div>

                    {mascotas.length === 0 ? (
                      <p style={{ fontStyle: 'italic', fontSize: '12px', color: '#666' }}>Register a pet first to save this diagnosis to its history.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontWeight: 'bold' }}>Asociar al expediente de:</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
                            {mascotas.map(m => (
                              <option key={m.id} value={m.id}>{m.nombre}</option>
                            ))}
                          </select>
                          <button onClick={guardarReporteSaludEnDiario} style={{ padding: '8px 16px', background: 'var(--game-accent, #1976d2)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                            Guardar en Diario
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* FORMULARIO MODO: Enfermedad Planta */}
                {mode === 'enfermedad_planta' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    <div style={{ padding: '12px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', border: '1px solid var(--game-border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                        <TTSButton text={`Phytosanitary Diagnosis: ${scanResult.diagnostico}. Recommended Action: ${scanResult.tratamiento}.${scanResult.advertencia ? ` Danger: ${scanResult.advertencia}` : ''}`} />
                      </div>
                      <p><strong>Phytosanitary Diagnosis:</strong> {scanResult.diagnostico}</p>
                      <p><strong>Recommended Action:</strong> {scanResult.tratamiento}</p>
                      <p style={{ color: scanResult.esUrgente ? '#f44336' : 'inherit' }}><strong>Peligro:</strong> {scanResult.advertencia}</p>
                    </div>

                    {plantas.length === 0 ? (
                      <p style={{ fontStyle: 'italic', fontSize: '12px', color: '#666' }}>Registra una planta primero para poder guardar esta alerta en su diario foliar.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontWeight: 'bold' }}>Asociar al diario de:</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
                            {plantas.map(p => (
                              <option key={p.id} value={p.id}>{p.nombreComun}</option>
                            ))}
                          </select>
                          <button onClick={guardarReporteEnfermedadEnDiario} style={{ padding: '8px 16px', background: 'var(--game-accent, #2e7d32)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                            Guardar en Diario
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}





                <button onClick={resetScanner} style={{ padding: '8px', border: '1px solid var(--game-border-color)', borderRadius: '6px', cursor: 'pointer', background: 'none', color: 'var(--game-text)', fontSize: '12px', marginTop: '6px' }}>
                  ↩ Volver a escanear
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
