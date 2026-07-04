export type EspecieMascota = 'Felino' | 'Canino' | 'Hamster' | 'Conejo' | 'Peces' | 'Pájaro' | 'Cobaya' | 'Otro';
export type NivelActividad = 'Baja' | 'Moderada' | 'Alta';

export interface RegistroPeso {
  fecha: string; // ISO Date
  pesoKg: number;
}

export interface RegistroCrecimiento {
  fecha: string; // ISO Date
  alturaCm: number;
}

export interface RegistroVacuna {
  fecha: string; // ISO Date
  vacuna: string;
  lote: string;
  proximaDosis?: string; // ISO Date para medicina preventiva
  vacunaPersonalizada?: string; // Nombre libre cuando vacuna === 'Otras'
}

export interface MedicamentoRegistro {
  id: string; // UUID
  nombre: string;
  dosis: string;
  frecuencia: string; // ej: "Cada 12 horas", "Diario", etc.
  fechaInicio: string; // YYYY-MM-DD
  fechaFin?: string; // YYYY-MM-DD
  activo: boolean;
  proximaDosis?: string; // ISO Date o YYYY-MM-DD HH:mm
  historialTomas?: string[]; // Fechas ISO de cuándo se tomó
}

export interface EntradaDiarioClinico {
  id: string;
  fecha: string;
  nota: string;
  categoria: 'Nutrición' | 'Comportamiento' | 'Observación general';
}

export interface RegistroDiagnosticoIA {
  id: string; // UUID
  fecha: string; // ISO Date
  diagnostico: string;
  tratamiento: string;
  advertencia: string;
  esUrgente: boolean;
  fotoUrl?: string; // Foto opcional que originó el diagnóstico
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
  diagnosticosIA?: RegistroDiagnosticoIA[]; // Historial de diagnósticos IA
  adiestramientoProgress?: Record<string, number>; // Progreso de adiestramiento (truco -> porcentaje)
  medicamentos?: MedicamentoRegistro[];
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
  intervaloRiegoBase?: number;
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
  diagnosticosIA?: RegistroDiagnosticoIA[]; // Historial de diagnósticos IA
  registroCrecimiento?: RegistroCrecimiento[]; // Registro de evolución de altura
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
  nombreComunEn?: string;
  nombreCientifico: string;
  toxicidadFelina: NivelToxicidadFelina;
  toxicidadCanina: NivelToxicidadCanina;
  compuestosToxicos?: string;
  compuestosToxicosEn?: string;
  tipoRiego: TipoRiego;
  tipoRiegoEn?: string;
  ubicacionSugerida?: 'Interior' | 'Exterior';
  ubicacionSugeridaEn?: string;
  descripcion: string;
  descripcionEn?: string;
}

export interface AccionSincronizacion {
  id: string; // UUID de la acción
  timestamp: number;
  tipoAccion: 'save_mascota' | 'delete_mascota' | 'save_planta' | 'delete_planta' | 'save_evento' | 'delete_evento';
  payload: any; // El objeto completo (Mascota, Planta, etc.) o ID del elemento a eliminar
}

export interface NotificacionProgramada {
  id: string;
  titulo: string;
  cuerpo: string;
  timestamp: number;
}

