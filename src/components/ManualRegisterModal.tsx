import React, { useState } from 'react';
import { CATALOGO_MASCOTAS, CATALOGO_ASPCA, LocalDatabase } from '../database/db';
import { safeUUID } from '../utils/uuid';
import { ImageOptimizer } from '../utils/imageOptimizer';
import type { Mascota, Planta, EspecieMascota, NivelActividad, TipoRiego, NivelToxicidadFelina, NivelToxicidadCanina } from '../database/types';
import { useTranslations } from '../utils/i18n';

interface FormProps {
  onClose: () => void;
  onUpdate: () => void;
}

export const ManualPetForm: React.FC<FormProps> = ({ onClose, onUpdate }) => {
  const { t, locale } = useTranslations();
  const isEn = locale === 'en';

  const [nombre, setNombre] = useState('');
  const [especie, setEspecie] = useState<EspecieMascota>('Felino');
  const [raza, setRaza] = useState('');
  const [peso, setPeso] = useState('');
  const [actividad, setActividad] = useState<NivelActividad>('Moderada');
  const [sexo, setSexo] = useState<'Macho' | 'Hembra'>('Macho');
  const [castrado, setCastrado] = useState<boolean>(false);
  const [esOtroMamifero, setEsOtroMamifero] = useState<boolean>(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  
  const [fechaNacimiento, setFechaNacimiento] = useState(() => new Date().toISOString().split('T')[0]);
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
      fechaNacimiento,
      registroPeso: [{ fecha: new Date().toISOString(), pesoKg: pesoNum }],
      historialVacunas: [],
      actividad,
      porcionDiariaGramos: porcionSugerida,
      diarioClinico: [],
      fotoUrl, // Foto real obligatoria
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
    <form onSubmit={handleSubmit} className="manual-register-form" style={{
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
        Add Pet 🐾
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

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Fecha de Nacimiento:</label>
        <input 
          type="date" 
          value={fechaNacimiento} 
          onChange={(e) => setFechaNacimiento(e.target.value)} 
          required 
          max={new Date().toISOString().split('T')[0]}
          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
        />
      </div>

      <div className="responsive-form-grid-2" style={{ gap: '10px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'Species:' : 'Especie:'}</label>
          <select value={especie} onChange={handleEspecieChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
            <option value="Felino">{isEn ? 'Cat 🐱' : 'Felino 🐱'}</option>
            <option value="Canino">{isEn ? 'Dog 🐶' : 'Canino 🐶'}</option>
            <option value="Hamster">Hamster 🐹</option>
            <option value="Conejo">{isEn ? 'Rabbit 🐰' : 'Conejo 🐰'}</option>
            <option value="Peces">{isEn ? 'Fish 🐠' : 'Peces 🐠'}</option>
            <option value="Pájaro">{isEn ? 'Bird 🐦' : 'Pájaro 🐦'}</option>
            <option value="Cobaya">{isEn ? 'Guinea Pig 🐹' : 'Cobaya 🐹'}</option>
            <option value="Otro">{isEn ? 'Other 🐾' : 'Otro 🐾'}</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'Breed / Catalog:' : 'Raza / Catálogo:'}</label>
          <select value={raza} onChange={handleRazaChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
            <option value="">{isEn ? '-- Custom --' : '-- Personalizado --'}</option>
            {razasDisponibles.map(r => (
              <option key={r.raza} value={r.raza}>{isEn ? (r.razaEn || r.raza) : r.raza}</option>
            ))}
          </select>
        </div>
      </div>

      {raza === '' && (
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'Specify Breed:' : 'Especificar Raza:'}</label>
          <input 
            type="text" 
            placeholder="Mixed, Siamese, etc."
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
            {isEn ? 'Is it a mammal? (e.g.: ferret, hedgehog, etc.)' : '¿Es un mamífero? (ej: hurón, erizo, etc.)'}
          </label>
        </div>
      )}

      {(esEspecieMamifero(especie) || (especie === 'Otro' && esOtroMamifero)) && (
        <div className="responsive-form-grid-2" style={{ gap: '10px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'Gender:' : 'Sexo:'}</label>
            <select value={sexo} onChange={(e) => setSexo(e.target.value as any)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
              <option value="Macho">{isEn ? 'Male ♂' : 'Macho ♂'}</option>
              <option value="Hembra">{isEn ? 'Female ♀' : 'Hembra ♀'}</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'Neutered/Spayed?:' : '¿Castrado/a?:'}</label>
            <select value={castrado ? 'si' : 'no'} onChange={(e) => setCastrado(e.target.value === 'si')} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
              <option value="no">No</option>
              <option value="si">{isEn ? 'Yes' : 'Sí'}</option>
            </select>
          </div>
        </div>
      )}

      <div className="responsive-form-grid-2" style={{ gap: '10px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'Weight (kg):' : 'Peso (kg):'}</label>
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
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'Activity Level:' : 'Nivel de Actividad:'}</label>
          <select value={actividad} onChange={(e) => setActividad(e.target.value as any)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
            <option value="Baja">{isEn ? 'Low' : 'Baja'}</option>
            <option value="Moderada">{isEn ? 'Moderate' : 'Moderada'}</option>
            <option value="Alta">{isEn ? 'High' : 'Alta'}</option>
          </select>
        </div>
      </div>

      {/* Carga de Foto Obligatoria */}
      <div style={{ background: 'var(--game-accent-light, #fafafa)', padding: '12px', borderRadius: '8px', border: '1px dashed var(--game-border-color)' }}>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>{isEn ? 'Profile Photo (Required):' : 'Foto de Perfil (Obligatoria):'}</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange}
          style={{ fontSize: '12px', width: '100%' }}
        />
        {optimizing && <p style={{ fontSize: '11px', margin: '4px 0 0 0', color: '#1976d2' }}>{isEn ? 'Optimizing image...' : 'Optimizando imagen...'}</p>}
        {fotoUrl && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
            <img src={fotoUrl} alt={isEn ? 'Preview' : 'Vista previa'} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ccc' }} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', border: '1px solid var(--game-border-color)', borderRadius: '8px', background: 'none', color: 'var(--game-text)', cursor: 'pointer', fontWeight: 'bold' }}>
          {isEn ? 'Cancel' : 'Cancelar'}
        </button>
        <button type="submit" disabled={!nombre.trim() || !fotoUrl || optimizing} style={{ flex: 1, padding: '10px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: (nombre.trim() && fotoUrl && !optimizing) ? 'pointer' : 'not-allowed', opacity: (nombre.trim() && fotoUrl && !optimizing) ? 1 : 0.6 }}>
          {isEn ? 'Save 💾' : 'Guardar 💾'}
        </button>
      </div>
    </form>
  );
};

export const ManualPlantForm: React.FC<FormProps> = ({ onClose, onUpdate }) => {
  const { t, locale } = useTranslations();
  const isEn = locale === 'en';

  const [nombreComun, setNombreComun] = useState('');
  const [nombreCientifico, setNombreCientifico] = useState('');
  const [ubicacion, setUbicacion] = useState('Living Room');
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
      setNombreComun(isEn ? (plant.nombreComunEn || plant.nombreComun) : plant.nombreComun);
      setNombreCientifico(plant.nombreCientifico);
      setTipoRiego(plant.tipoRiego);
      setToxicidad(plant.toxicidadFelina);
      setToxicidadCanina(plant.toxicidadCanina || 'Segura');
      setCompuestosToxicos(isEn ? (plant.compuestosToxicosEn || plant.compuestosToxicos || '') : (plant.compuestosToxicos || ''));
      setUbicacion(isEn ? (plant.ubicacionSugeridaEn || plant.ubicacionSugerida || 'Indoor') : (plant.ubicacionSugerida || 'Interior'));
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
      setErrorMsg("Common name and photo are required.");
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
      intervaloRiegoBase: diasIntervalo,
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
    <form onSubmit={handleSubmit} className="manual-register-form" style={{
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
        Add Plant 🌿
      </h3>

      {errorMsg && <p style={{ color: '#f44336', fontSize: '12px', background: 'rgba(244,67,54,0.1)', padding: '8px', borderRadius: '6px', margin: '0' }}>{errorMsg}</p>}

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'Select from Catalog (ASPCA):' : 'Seleccionar del Catálogo (ASPCA):'}</label>
        <select onChange={handleCatalogoChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
          <option value="">{isEn ? '-- Custom --' : '-- Personalizado --'}</option>
          {CATALOGO_ASPCA.map(p => (
            <option key={p.id} value={p.id}>
              {isEn ? (p.nombreComunEn || p.nombreComun) : p.nombreComun} ({isEn ? (p.ubicacionSugeridaEn || p.ubicacionSugerida) : p.ubicacionSugerida})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'Common Name:' : 'Nombre Común:'}</label>
        <input 
          type="text" 
          value={nombreComun} 
          onChange={(e) => setNombreComun(e.target.value)} 
          required 
          placeholder={isEn ? "E.g.: Boston Fern" : "Ej: Helecho de Boston"}
          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
        />
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'Scientific Name:' : 'Nombre Científico:'}</label>
        <input 
          type="text" 
          value={nombreCientifico} 
          onChange={(e) => setNombreCientifico(e.target.value)} 
          placeholder={isEn ? "E.g.: Nephrolepis exaltata" : "Ej: Nephrolepis exaltata"}
          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
        />
      </div>

      <div className="responsive-form-grid-2" style={{ gap: '10px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'Location:' : 'Ubicación:'}</label>
          <input 
            type="text" 
            value={ubicacion} 
            onChange={(e) => setUbicacion(e.target.value)} 
            placeholder="E.g.: Terrace, Living Room"
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'Watering (days):' : 'Riego (días):'}</label>
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
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'Watering Type:' : 'Tipo de Riego:'}</label>
        <select value={tipoRiego} onChange={(e) => setTipoRiego(e.target.value as any)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
          <option value="Agua del grifo reposada">{isEn ? 'Settled tap water' : 'Agua del grifo reposada'}</option>
          <option value="Agua blanda reposada">{isEn ? 'Settled soft water' : 'Agua blanda reposada'}</option>
          <option value="Agua destilada">{isEn ? 'Distilled water' : 'Agua destilada'}</option>
          <option value="Agua de lluvia">{isEn ? 'Rainwater' : 'Agua de lluvia'}</option>
        </select>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'When was the last watering?' : '¿Cuándo fue el último riego?'}</label>
        <select value={ultimoRiegoOpcion} onChange={(e) => setUltimoRiegoOpcion(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)', fontSize: '12px' }}>
          <option value="hoy">{isEn ? 'Today 💧' : 'Hoy 💧'}</option>
          <option value="ayer">{isEn ? 'Yesterday' : 'Ayer'}</option>
          <option value="hace_2">{isEn ? '2 days ago' : 'Hace 2 días'}</option>
          <option value="hace_3">{isEn ? '3 days ago' : 'Hace 3 días'}</option>
          <option value="hace_5">{isEn ? '5 days ago' : 'Hace 5 días'}</option>
          <option value="hace_7">{isEn ? '7 days ago (1 week)' : 'Hace 7 días (1 semana)'}</option>
          <option value="necesita_ya">{isEn ? 'Needs watering now (Unknown / Long ago)' : 'Requiere riego ya (Desconocido / Hace mucho)'}</option>
        </select>
      </div>

      <div className="responsive-form-grid-2" style={{ gap: '10px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'Feline Safety:' : 'Seguridad Felina:'}</label>
          <select value={toxicidad} onChange={(e) => setToxicidad(e.target.value as any)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)', fontSize: '12px' }}>
            <option value="Segura">{isEn ? 'Safe 🐈' : 'Segura 🐈'}</option>
            <option value="Tóxica leve (irritante)">{isEn ? 'Mildly Toxic ⚠️' : 'Tóxica Leve ⚠️'}</option>
            <option value="Altamente tóxica (urgencia)">{isEn ? 'Highly Toxic 🚨' : 'Muy Tóxica ⚠️'}</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'Canine Safety:' : 'Seguridad Canina:'}</label>
          <select value={toxicidadCanina} onChange={(e) => setToxicidadCanina(e.target.value as any)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)', fontSize: '12px' }}>
            <option value="Segura">{isEn ? 'Safe 🐕' : 'Segura 🐕'}</option>
            <option value="Tóxica leve (irritante)">{isEn ? 'Mildly Toxic ⚠️' : 'Tóxica Leve ⚠️'}</option>
            <option value="Altamente tóxica (urgencia)">{isEn ? 'Highly Toxic 🚨' : 'Muy Tóxica ⚠️'}</option>
          </select>
        </div>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'Toxic Compound (if any):' : 'Compuesto Tóxico (si lo hay):'}</label>
        <input 
          type="text" 
          placeholder={isEn ? "E.g.: Oxalate, Saponins..." : "Ej: Oxalato, Saponinas..."}
          value={compuestosToxicos} 
          onChange={(e) => setCompuestosToxicos(e.target.value)} 
          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}
        />
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{isEn ? 'Leaf Thickness:' : 'Grosor de Hoja:'}</label>
        <select value={grosorHoja} onChange={(e) => setGrosorHoja(e.target.value as any)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', background: 'var(--game-card-bg)', color: 'var(--game-text-bright)' }}>
          <option value="Normal">Normal</option>
          <option value="Crasa">{isEn ? 'Succulent (Crasa)' : 'Crasa (Suculenta)'}</option>
          <option value="Delgada">{isEn ? 'Thin (Ferns)' : 'Delgada (Helechos)'}</option>
        </select>
      </div>

      {/* Carga de Foto Obligatoria */}
      <div style={{ background: 'var(--game-accent-light, #fafafa)', padding: '12px', borderRadius: '8px', border: '1px dashed var(--game-border-color)' }}>
        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>{isEn ? 'Plant Photo (Required):' : 'Foto de la Planta (Obligatoria):'}</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange}
          style={{ fontSize: '12px', width: '100%' }}
        />
        {optimizing && <p style={{ fontSize: '11px', margin: '4px 0 0 0', color: '#2e7d32' }}>{isEn ? 'Optimizing image...' : 'Optimizando imagen...'}</p>}
        {fotoUrl && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
            <img src={fotoUrl} alt={isEn ? 'Preview' : 'Vista previa'} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ccc' }} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', border: '1px solid var(--game-border-color)', borderRadius: '8px', background: 'none', color: 'var(--game-text)', cursor: 'pointer', fontWeight: 'bold' }}>
          {isEn ? 'Cancel' : 'Cancelar'}
        </button>
        <button type="submit" disabled={!nombreComun.trim() || !fotoUrl || optimizing} style={{ flex: 1, padding: '10px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: (nombreComun.trim() && fotoUrl && !optimizing) ? 'pointer' : 'not-allowed', opacity: (nombreComun.trim() && fotoUrl && !optimizing) ? 1 : 0.6 }}>
          {isEn ? 'Save 💾' : 'Guardar 💾'}
        </button>
      </div>
    </form>
  );
};


