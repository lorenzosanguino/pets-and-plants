export type EspecieMascota = 'Felino' | 'Canino' | 'Hamster' | 'Conejo' | 'Peces' | 'Pájaro' | 'Cobaya' | 'Otro';
export type NivelActividad = 'Baja' | 'Moderada' | 'Alta';

export interface RegistroPeso {
  fecha: string; // ISO Date
  pesoKg: number;
}

export interface RegistroVacuna {
  fecha: string; // ISO Date
  vacuna: 'Trivalente' | 'Leucemia' | 'Rabia' | 'Otras';
  lote: string;
  proximaDosis?: string; // ISO Date para medicina preventiva
}

export interface EntradaDiarioClinico {
  id: string;
  fecha: string;
  nota: string;
  categoria: 'Nutrición' | 'Comportamiento' | 'Observación general';
}

export interface EventoPasado {
  id: string;
  fecha: string; // YYYY-MM-DD
  tipo: 'Enfermedad' | 'Parásito' | 'Poda' | 'Tratamiento' | 'Muda' | 'Otro';
  descripcion: string;
}

export interface Mascota {
  id: string; // UUID
  nombre: string;
  especie: EspecieMascota;
  fechaNacimiento: string; // ISO Date
  numeroChip?: string;
  raza?: string;
  sexo?: 'Macho' | 'Hembra';
  castrado?: boolean;
  registroPeso: RegistroPeso[]; // Para trazado de curvas de condición corporal
  historialVacunas: RegistroVacuna[];
  actividad: NivelActividad;
  porcionDiariaGramos?: number; // Calculado por la fórmula metabólica
  diarioClinico: EntradaDiarioClinico[];
  fotoUrl?: string; // Foto real de la mascota (Base64 optimizado)
  fotos?: string[]; // Colección de fotos (Base64 optimizado)
  vacunasChecklist?: string[]; // Checklist de vacunas colocadas
  historialPasado?: EventoPasado[]; // Historial de enfermedades/parásitos
}

export type TipoRiego = 'Agua del grifo reposada' | 'Agua blanda reposada' | 'Agua destilada' | 'Agua de lluvia';
export type NivelToxicidadFelina = 'Segura' | 'Tóxica leve (irritante)' | 'Altamente tóxica (urgencia)';
export type NivelToxicidadCanina = 'Segura' | 'Tóxica leve (irritante)' | 'Altamente tóxica (urgencia)';

export interface EntradaDiarioFoliar {
  id: string;
  fecha: string;
  nota: string;
  fotoUrl?: string;
  estadoGeneral: 'Excelente' | 'Normal' | 'Clorosis/Lesión';
}

export interface Planta {
  id: string; // UUID
  nombreComun: string;
  nombreCientifico?: string;
  ubicacionHabitacion: string;
  tipoRiegoEspecifico: TipoRiego;
  intervaloRiegoDias: number;
  ultimaFechaRiego: string; // ISO Date
  proximaFechaRiego: string; // ISO Date
  toxicidadFelina: NivelToxicidadFelina; // Seguridad Felina Soberana
  toxicidadCanina?: NivelToxicidadCanina; // Seguridad Canina
  compuestosToxicos?: string; // Ej: "Oxalatos de calcio insolubles"
  grosorHoja: 'Crasa' | 'Normal' | 'Delgada'; // Biophysics transpiración
  temperaturaZona: number; // Grados C estacional
  diarioFoliar: EntradaDiarioFoliar[];
  fotoUrl?: string; // Foto de la planta (Base64 optimizado)
  fotos?: string[]; // Colección de fotos (Base64 optimizado)
  historialPasado?: EventoPasado[]; // Historial de enfermedades/parásitos/podas
}

export interface AnimalExotico {
  id: string; // UUID
  nombre: string;
  especie: 'Serpiente' | 'Rana' | 'Tarántula' | 'Escorpión' | 'Otro';
  tipoEspecifico: string; // Ej: Pitón Regius, Rana arborícola, etc.
  temperaturaTerrario: number;
  humedadTerrario: number;
  ultimaAlimentacion: string; // ISO Date o YYYY-MM-DD
  intervaloAlimentacionDias: number;
  diarioExotico: EntradaDiarioClinico[];
  fotoUrl: string; // Foto del animal (Base64 optimizada)
  fotos?: string[]; // Colección de fotos (Base64 optimizado)
  chip?: string; // Microchip del animal exótico
  historialPasado: EventoPasado[]; // Historial de enfermedades/muda/parásitos
}

export interface EventoCalendario {
  id: string;
  fecha: string; // YYYY-MM-DD
  categoria: 'veterinario' | 'riego' | 'peluqueria' | 'medicacion' | 'abono' | 'otro';
  texto: string;
  completado?: boolean;
}

export interface ChatMensaje {
  id: string;
  remitente: 'usuario' | 'ia';
  texto: string;
  fecha: string; // ISO Date
}

export interface ChatHistorial {
  id: string; // advisorType (e.g. 'veterinario', 'agronomo', 'exoticos')
  mensajes: ChatMensaje[];
  ultimaActualizacion: string; // ISO Date
}

export interface CatalogoPlanta {
  id: string;
  nombreComun: string;
  nombreCientifico: string;
  toxicidadFelina: NivelToxicidadFelina;
  toxicidadCanina: NivelToxicidadCanina;
  compuestosToxicos?: string;
  tipoRiego: TipoRiego;
  ubicacionSugerida?: 'Interior' | 'Exterior';
  descripcion: string;
}

