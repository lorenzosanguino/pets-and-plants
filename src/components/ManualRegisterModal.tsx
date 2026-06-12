import React, { useState } from 'react';
import { CATALOGO_MASCOTAS, CATALOGO_ASPCA, LocalDatabase } from '../database/db';
import { safeUUID } from '../utils/uuid';
import { ImageOptimizer } from '../utils/imageOptimizer';
import { AvatarGeneratorService } from '../services/avatarGenerator';
import type { Mascota, Planta, EspecieMascota, NivelActividad, TipoRiego, NivelToxicidadFelina, NivelToxicidadCanina } from '../database/types';

interface FormProps {
  onClose: () => void;
  onUpdate: () => void;
}

export const ManualPetForm: React.FC<FormProps> = ({ onClose, onUpdate }) => {
  const [nombre, setNombre] = useState('');
  const [especie, setEspecie] = useState<EspecieMascota>('Felino');
  const [raza, setRaza] = useState('');
  const [peso, setPeso] = useState('');
  const [actividad, setActividad] = useState<NivelActividad>('Moderada');
  const [sexo, setSexo] = useState<'Macho' | 'Hembra'>('Macho');
  const [castrado, setCastrado] = useState<boolean>(false);
  const [esOtroMamifero, setEsOtroMamifero] = useState<boolean>(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarStatus, setAvatarStatus] = useState('');
  const [estilo, setEstilo] = useState<'Óleo Clásico' | 'Cómic Hiperrealista' | 'Renderizado 3D' | 'Retrato Minimalista Claro'>('Retrato Minimalista Claro');
  
  const [optimizing, setOptimizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const esEspecieMamifero = (esp: string) => {
    return ['Felino', 'Canino', 'Hamster', 'Conejo', 'Cobaya'].includes(esp);
  };

  // Filtrar razas disponibles del catálogo según especie seleccionada
  const razasDisponibles = CATALOGO_MASCOTAS.filter(m => m.especie === (especie === 'Felino' ? 'Felino' : 'Canino'));

  const handleEspecieChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const esp = e.target.value as EspecieMascota;
    setEspecie(esp);
    setRaza('');
  };

  const handleRazaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const r = e.target.value;
    setRaza(r);
    
    // Autocompletar datos del catálogo si existe
    const item = CATALOGO_MASCOTAS.find(c => c.raza === r);
    if (item) {
      setPeso(String(item.pesoAdultoKg));
      setActividad(item.actividadSugerida);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOptimizing(true);
      setErrorMsg('');
      try {
        const optimized = await ImageOptimizer.optimize(file);
        setFotoUrl(optimized.dataUrl);
      } catch (err: any) {
        console.error(err);
        setErrorMsg("Error al procesar y optimizar la imagen.");
      } finally {
        setOptimizing(false);
      }
    }
  };

  const handleGenerateAvatar = async () => {
    if (!fotoUrl) return;
    setAvatarStatus('Generando...');
    try {
      // Convertir base64 a Blob para el generador
      const response = await fetch(fotoUrl);
      const blob = await response.blob();
      
      const fakeImages = Array(5).fill(blob);
      const avatar = await AvatarGeneratorService.generate(fakeImages, estilo, (_, percent) => {
        setAvatarStatus(`${percent}%`);
      });
      setAvatarUrl(avatar);
      setAvatarStatus('¡Avatar Creado!');
    } catch (err: any) {
      setAvatarStatus(`Fallo: ${err.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !fotoUrl) {
      setErrorMsg("El nombre y la foto son obligatorios.");
      return;
    }

    const pesoNum = parseFloat(peso) || 4.0;
    const rer = Math.round(70 * Math.pow(pesoNum, 0.75));
    const factor = actividad === 'Baja' ? 1.0 : actividad === 'Alta' ? 1.4 : 1.2;
    const der = Math.round(rer * factor);
    const porcionSugerida = Math.round((der / 360) * 100);

    const esMamiferoActivo = esEspecieMamifero(especie) || (especie === 'Otro' && esOtroMamifero);

    const nuevaMascota: Mascota = {
      id: safeUUID(),
      nombre: nombre.trim(),
      especie,
      fechaNacimiento: new Date().toISOString().split('T')[0],
      registroPeso: [{ fecha: new Date().toISOString(), pesoKg: pesoNum }],
      historialVacunas: [],
      actividad,
      porcionDiariaGramos: porcionSugerida,
      diarioClinico: [],
      fotoUrl, // Foto real obligatoria
      avatarUrl: avatarUrl || undefined,
      raza: raza.trim() || undefined,
      sexo: esMamiferoActivo ? sexo : undefined,
      castrado: esMamiferoActivo ? castrado : undefined
    };

    try {
      await LocalDatabase.saveMascota(nuevaMascota);
      onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg("No se pudo guardar la mascota en la base de datos.");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--game-card-bg, #fff)',
      borderRadius: 'var(--game-radius, 16px)',
      border: 'var(--game-border, 1px solid #f0f0f0)',
      padding: '24px',
      width: '100%',
      maxWidth: '440px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      maxHeight: '85vh',
      overflowY: 'auto',
      color: 'var(--game-text, #333)',
      fontFamily: 'var(--game-font, sans-serif)',
      margin: 'auto'
    }}>
      <h3 style={{ margin: '0', fontSize: '18px', color: 'var(--game-text-bright, #111)', borderBottom: '1px solid #f0f0f0', paddingBottom: '8px' }}>
        Añadir Mascota 🐾
      </h3>

      {errorMsg && <p style={{ color: '#f44336', fontSize: '12px', background: 'rgba(244,67,54,0.1)', padding: '8px', borderRadius: '6px', margin: '0' }}>{errorMsg}</p>}

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Nombre Mascota:</label>
        <input 
          type="text" 
          value={nombre} 
          onChange={(e) => setNombre(e.target.value)} 
          required 
          placeholder="Nombre del animal"
          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Especie:</label>
          <select value={especie} onChange={handleEspecieChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
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
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Raza / Catálogo:</label>
          <select value={raza} onChange={handleRazaChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
            <option value="">-- Personalizado --</option>
            {razasDisponibles.map(r => (
              <option key={r.raza} value={r.raza}>{r.raza}</option>
            ))}
          </select>
        </div>
      </div>

      {raza === '' && (
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Especificar Raza:</label>
          <input 
            type="text" 
            placeholder="Mestizo, Siamés, etc."
            value={raza} 
            onChange={(e) => setRaza(e.target.value)} 
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
          />
        </div>
      )}

      {especie === 'Otro' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input 
            type="checkbox" 
            id="checkbox-es-mamifero"
            checked={esOtroMamifero} 
            onChange={(e) => setEsOtroMamifero(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor="checkbox-es-mamifero" style={{ fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', userSelect: 'none' }}>
            ¿Es un mamífero? (ej: hurón, erizo, etc.)
          </label>
        </div>
      )}

      {(esEspecieMamifero(especie) || (especie === 'Otro' && esOtroMamifero)) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Sexo:</label>
            <select value={sexo} onChange={(e) => setSexo(e.target.value as any)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
              <option value="Macho">Macho ♂</option>
              <option value="Hembra">Hembra ♀</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>¿Castrado/a?:</label>
            <select value={castrado ? 'si' : 'no'} onChange={(e) => setCastrado(e.target.value === 'si')} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
              <option value="no">No</option>
              <option value="si">Sí</option>
            </select>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Peso (kg):</label>
          <input 
            type="number" 
            step="0.1" 
            value={peso} 
            onChange={(e) => setPeso(e.target.value)} 
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Nivel de Actividad:</label>
          <select value={actividad} onChange={(e) => setActividad(e.target.value as any)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
            <option value="Baja">Baja</option>
            <option value="Moderada">Moderada</option>
            <option value="Alta">Alta</option>
          </select>
        </div>
      </div>

      {/* Carga de Foto Obligatoria */}
      <div style={{ background: 'var(--game-accent-light, #fafafa)', padding: '12px', borderRadius: '8px', border: '1px dashed var(--game-border-color)' }}>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Foto de Perfil (Obligatoria):</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange}
          style={{ fontSize: '12px', width: '100%' }}
        />
        {optimizing && <p style={{ fontSize: '11px', margin: '4px 0 0 0', color: '#1976d2' }}>Optimizando imagen...</p>}
        {fotoUrl && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
            <img src={fotoUrl} alt="Vista previa" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ccc' }} />
          </div>
        )}
      </div>

      {/* Avatares Retro Opcionales */}
      {fotoUrl && (
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '10px', background: 'rgba(0,0,0,0.02)' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>¿Generar avatar retro pixelado?</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select value={estilo} onChange={(e) => setEstilo(e.target.value as any)} style={{ flex: 1, padding: '4px', fontSize: '11px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
              <option value="Óleo Clásico">Óleo Clásico</option>
              <option value="Cómic Hiperrealista">Cómic Hiperrealista</option>
              <option value="Renderizado 3D">Renderizado 3D</option>
              <option value="Retrato Minimalista Claro">Retrato Minimalista Claro</option>
            </select>
            <button type="button" onClick={handleGenerateAvatar} style={{ padding: '6px 12px', background: 'var(--game-accent, #1976d2)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
              Generar
            </button>
          </div>
          {avatarStatus && <span style={{ fontSize: '10px', display: 'block', marginTop: '4px' }}>{avatarStatus}</span>}
          {avatarUrl && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
              <img src={avatarUrl} alt="Avatar generado" style={{ width: '50px', height: '50px', borderRadius: '50%', border: '1.5px solid var(--game-border-color)' }} />
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', border: '1px solid var(--game-border-color)', borderRadius: '8px', background: 'none', color: 'var(--game-text)', cursor: 'pointer', fontWeight: 'bold' }}>
          Cancelar
        </button>
        <button type="submit" disabled={!nombre.trim() || !fotoUrl || optimizing} style={{ flex: 1, padding: '10px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: (nombre.trim() && fotoUrl && !optimizing) ? 'pointer' : 'not-allowed', opacity: (nombre.trim() && fotoUrl && !optimizing) ? 1 : 0.6 }}>
          Guardar 💾
        </button>
      </div>
    </form>
  );
};

export const ManualPlantForm: React.FC<FormProps> = ({ onClose, onUpdate }) => {
  const [nombreComun, setNombreComun] = useState('');
  const [nombreCientifico, setNombreCientifico] = useState('');
  const [ubicacion, setUbicacion] = useState('Salón');
  const [tipoRiego, setTipoRiego] = useState<TipoRiego>('Agua del grifo reposada');
  const [intervaloRiego, setIntervaloRiego] = useState('7');
  const [toxicidad, setToxicidad] = useState<NivelToxicidadFelina>('Segura');
  const [toxicidadCanina, setToxicidadCanina] = useState<NivelToxicidadCanina>('Segura');
  const [compuestosToxicos, setCompuestosToxicos] = useState('');
  const [grosorHoja, setGrosorHoja] = useState<'Crasa' | 'Normal' | 'Delgada'>('Normal');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [ultimoRiegoOpcion, setUltimoRiegoOpcion] = useState('hoy');
  
  const [optimizing, setOptimizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCatalogoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = e.target.value;
    const plant = CATALOGO_ASPCA.find(p => p.id === cid);
    if (plant) {
      setNombreComun(plant.nombreComun);
      setNombreCientifico(plant.nombreCientifico);
      setTipoRiego(plant.tipoRiego);
      setToxicidad(plant.toxicidadFelina);
      setToxicidadCanina(plant.toxicidadCanina || 'Segura');
      setCompuestosToxicos(plant.compuestosToxicos || '');
      setUbicacion(plant.ubicacionSugerida || 'Interior');
    } else {
      setNombreComun('');
      setNombreCientifico('');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOptimizing(true);
      setErrorMsg('');
      try {
        const optimized = await ImageOptimizer.optimize(file);
        setFotoUrl(optimized.dataUrl);
      } catch (err: any) {
        console.error(err);
        setErrorMsg("Error al optimizar imagen.");
      } finally {
        setOptimizing(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreComun.trim() || !fotoUrl) {
      setErrorMsg("El nombre común y la foto son obligatorios.");
      return;
    }

    let ultimaFecha: Date;
    const diasIntervalo = parseInt(intervaloRiego) || 7;

    switch (ultimoRiegoOpcion) {
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
      nombreComun: nombreComun.trim(),
      nombreCientifico: nombreCientifico.trim() || undefined,
      ubicacionHabitacion: ubicacion,
      tipoRiegoEspecifico: tipoRiego,
      intervaloRiegoDias: diasIntervalo,
      ultimaFechaRiego: ultimaFecha.toISOString(),
      proximaFechaRiego: proximaFecha.toISOString(),
      toxicidadFelina: toxicidad,
      toxicidadCanina: toxicidadCanina,
      compuestosToxicos: compuestosToxicos || undefined,
      grosorHoja: grosorHoja,
      temperaturaZona: 20,
      diarioFoliar: [],
      fotoUrl // Foto obligatoria
    };

    try {
      await LocalDatabase.savePlanta(nuevaPlanta);
      onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al guardar la planta.");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--game-card-bg, #fff)',
      borderRadius: 'var(--game-radius, 16px)',
      border: 'var(--game-border, 1px solid #f0f0f0)',
      padding: '24px',
      width: '100%',
      maxWidth: '440px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      maxHeight: '85vh',
      overflowY: 'auto',
      color: 'var(--game-text, #333)',
      fontFamily: 'var(--game-font, sans-serif)',
      margin: 'auto'
    }}>
      <h3 style={{ margin: '0', fontSize: '18px', color: 'var(--game-text-bright, #111)', borderBottom: '1px solid #f0f0f0', paddingBottom: '8px' }}>
        Añadir Planta 🌿
      </h3>

      {errorMsg && <p style={{ color: '#f44336', fontSize: '12px', background: 'rgba(244,67,54,0.1)', padding: '8px', borderRadius: '6px', margin: '0' }}>{errorMsg}</p>}

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Seleccionar del Catálogo (ASPCA):</label>
        <select onChange={handleCatalogoChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
          <option value="">-- Personalizado --</option>
          {CATALOGO_ASPCA.map(p => (
            <option key={p.id} value={p.id}>{p.nombreComun} ({p.ubicacionSugerida})</option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Nombre Común:</label>
        <input 
          type="text" 
          value={nombreComun} 
          onChange={(e) => setNombreComun(e.target.value)} 
          required 
          placeholder="Ej: Helecho de Boston"
          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
        />
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Nombre Científico:</label>
        <input 
          type="text" 
          value={nombreCientifico} 
          onChange={(e) => setNombreCientifico(e.target.value)} 
          placeholder="Ej: Nephrolepis exaltata"
          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Ubicación:</label>
          <input 
            type="text" 
            value={ubicacion} 
            onChange={(e) => setUbicacion(e.target.value)} 
            placeholder="Ej: Terraza, Salón"
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Riego (días):</label>
          <input 
            type="number" 
            value={intervaloRiego} 
            onChange={(e) => setIntervaloRiego(e.target.value)} 
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
          />
        </div>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Tipo de Riego:</label>
        <select value={tipoRiego} onChange={(e) => setTipoRiego(e.target.value as any)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
          <option value="Agua del grifo reposada">Agua del grifo reposada</option>
          <option value="Agua blanda reposada">Agua blanda reposada</option>
          <option value="Agua destilada">Agua destilada</option>
          <option value="Agua de lluvia">Agua de lluvia</option>
        </select>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>¿Cuándo fue el último riego?</label>
        <select value={ultimoRiegoOpcion} onChange={(e) => setUltimoRiegoOpcion(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)', fontSize: '12px' }}>
          <option value="hoy">Hoy 💧</option>
          <option value="ayer">Ayer</option>
          <option value="hace_2">Hace 2 días</option>
          <option value="hace_3">Hace 3 días</option>
          <option value="hace_5">Hace 5 días</option>
          <option value="hace_7">Hace 7 días (1 semana)</option>
          <option value="necesita_ya">Requiere riego ya (Desconocido / Hace mucho)</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Seguridad Felina:</label>
          <select value={toxicidad} onChange={(e) => setToxicidad(e.target.value as any)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)', fontSize: '12px' }}>
            <option value="Segura">Segura 🐈</option>
            <option value="Tóxica leve (irritante)">Tóxica Leve ⚠️</option>
            <option value="Altamente tóxica (urgencia)">Muy Tóxica 🚨</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Seguridad Canina:</label>
          <select value={toxicidadCanina} onChange={(e) => setToxicidadCanina(e.target.value as any)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)', fontSize: '12px' }}>
            <option value="Segura">Segura 🐕</option>
            <option value="Tóxica leve (irritante)">Tóxica Leve ⚠️</option>
            <option value="Altamente tóxica (urgencia)">Muy Tóxica 🚨</option>
          </select>
        </div>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Compuesto Tóxico (si lo hay):</label>
        <input 
          type="text" 
          placeholder="Ej: Oxalato, Saponinas..."
          value={compuestosToxicos} 
          onChange={(e) => setCompuestosToxicos(e.target.value)} 
          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
        />
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Grosor de Hoja:</label>
        <select value={grosorHoja} onChange={(e) => setGrosorHoja(e.target.value as any)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
          <option value="Normal">Normal</option>
          <option value="Crasa">Crasa (Suculenta)</option>
          <option value="Delgada">Delgada (Helechos)</option>
        </select>
      </div>

      {/* Carga de Foto Obligatoria */}
      <div style={{ background: 'var(--game-accent-light, #fafafa)', padding: '12px', borderRadius: '8px', border: '1px dashed var(--game-border-color)' }}>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Foto de la Planta (Obligatoria):</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange}
          style={{ fontSize: '12px', width: '100%' }}
        />
        {optimizing && <p style={{ fontSize: '11px', margin: '4px 0 0 0', color: '#2e7d32' }}>Optimizando imagen...</p>}
        {fotoUrl && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
            <img src={fotoUrl} alt="Vista previa" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ccc' }} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', border: '1px solid var(--game-border-color)', borderRadius: '8px', background: 'none', color: 'var(--game-text)', cursor: 'pointer', fontWeight: 'bold' }}>
          Cancelar
        </button>
        <button type="submit" disabled={!nombreComun.trim() || !fotoUrl || optimizing} style={{ flex: 1, padding: '10px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: (nombreComun.trim() && fotoUrl && !optimizing) ? 'pointer' : 'not-allowed', opacity: (nombreComun.trim() && fotoUrl && !optimizing) ? 1 : 0.6 }}>
          Guardar 💾
        </button>
      </div>
    </form>
  );
};

export const ManualExoticForm: React.FC<FormProps> = ({ onClose, onUpdate }) => {
  const [nombre, setNombre] = useState('');
  const [especie, setEspecie] = useState<'Serpiente' | 'Rana' | 'Tarántula' | 'Escorpión' | 'Otro'>('Serpiente');
  const [tipoEspecifico, setTipoEspecifico] = useState('');
  const [temperatura, setTemperatura] = useState('25');
  const [humedad, setHumedad] = useState('60');
  const [intervaloAlimentacion, setIntervaloAlimentacion] = useState('7');
  const [chip, setChip] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOptimizing(true);
      setErrorMsg('');
      try {
        const optimized = await ImageOptimizer.optimize(file);
        setFotoUrl(optimized.dataUrl);
      } catch (err: any) {
        console.error(err);
        setErrorMsg("Error al optimizar imagen.");
      } finally {
        setOptimizing(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !fotoUrl) {
      setErrorMsg("El nombre y la foto son obligatorios.");
      return;
    }

    const nuevoExotico: any = {
      id: safeUUID(),
      nombre: nombre.trim(),
      especie,
      tipoEspecifico: tipoEspecifico.trim() || especie,
      temperaturaTerrario: parseFloat(temperatura) || 25,
      humedadTerrario: parseFloat(humedad) || 60,
      ultimaAlimentacion: new Date().toISOString().split('T')[0],
      intervaloAlimentacionDias: parseInt(intervaloAlimentacion) || 7,
      diarioExotico: [],
      fotoUrl,
      chip: chip.trim() || undefined,
      historialPasado: []
    };

    try {
      await LocalDatabase.saveExotico(nuevoExotico);
      onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al guardar el animal exótico.");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--game-card-bg, #fff)',
      borderRadius: 'var(--game-radius, 16px)',
      border: 'var(--game-border, 1px solid #f0f0f0)',
      padding: '24px',
      width: '100%',
      maxWidth: '440px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      maxHeight: '85vh',
      overflowY: 'auto',
      color: 'var(--game-text, #333)',
      fontFamily: 'var(--game-font, sans-serif)',
      margin: 'auto'
    }}>
      <h3 style={{ margin: '0', fontSize: '18px', color: 'var(--game-text-bright, #111)', borderBottom: '1px solid #f0f0f0', paddingBottom: '8px' }}>
        Añadir Animal Exótico 🦎
      </h3>

      {errorMsg && <p style={{ color: '#f44336', fontSize: '12px', background: 'rgba(244,67,54,0.1)', padding: '8px', borderRadius: '6px', margin: '0' }}>{errorMsg}</p>}

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Nombre:</label>
        <input 
          type="text" 
          value={nombre} 
          onChange={(e) => setNombre(e.target.value)} 
          required 
          placeholder="Ej: Spidey"
          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Especie Exótica:</label>
          <select value={especie} onChange={(e) => setEspecie(e.target.value as any)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
            <option value="Serpiente">Serpiente 🐍</option>
            <option value="Rana">Rana 🐸</option>
            <option value="Tarántula">Tarántula 🕷️</option>
            <option value="Escorpión">Escorpión 🦂</option>
            <option value="Otro">Otro 🦎</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Tipo Específico:</label>
          <input 
            type="text" 
            placeholder="Ej: Pitón Regius"
            value={tipoEspecifico} 
            onChange={(e) => setTipoEspecifico(e.target.value)} 
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Temp (°C):</label>
          <input 
            type="number" 
            value={temperatura} 
            onChange={(e) => setTemperatura(e.target.value)} 
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Humedad (%):</label>
          <input 
            type="number" 
            value={humedad} 
            onChange={(e) => setHumedad(e.target.value)} 
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Alimentar (días):</label>
          <input 
            type="number" 
            value={intervaloAlimentacion} 
            onChange={(e) => setIntervaloAlimentacion(e.target.value)} 
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
          />
        </div>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Número de Chip (Opcional):</label>
        <input 
          type="text" 
          placeholder="Número identificativo"
          value={chip} 
          onChange={(e) => setChip(e.target.value)} 
          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
        />
      </div>

      {/* Carga de Foto Obligatoria */}
      <div style={{ background: 'var(--game-accent-light, #fafafa)', padding: '12px', borderRadius: '8px', border: '1px dashed var(--game-border-color)' }}>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Foto (Obligatoria):</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange}
          style={{ fontSize: '12px', width: '100%' }}
        />
        {optimizing && <p style={{ fontSize: '11px', margin: '4px 0 0 0', color: '#1976d2' }}>Optimizando imagen...</p>}
        {fotoUrl && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
            <img src={fotoUrl} alt="Vista previa" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ccc' }} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', border: '1px solid var(--game-border-color)', borderRadius: '8px', background: 'none', color: 'var(--game-text)', cursor: 'pointer', fontWeight: 'bold' }}>
          Cancelar
        </button>
        <button type="submit" disabled={!nombre.trim() || !fotoUrl || optimizing} style={{ flex: 1, padding: '10px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: (nombre.trim() && fotoUrl && !optimizing) ? 'pointer' : 'not-allowed', opacity: (nombre.trim() && fotoUrl && !optimizing) ? 1 : 0.6 }}>
          Guardar 💾
        </button>
      </div>
    </form>
  );
};
