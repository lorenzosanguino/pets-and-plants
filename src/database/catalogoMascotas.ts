export interface CatalogoMascota {
  raza: string;
  razaEn?: string;
  especie: 'Felino' | 'Canino';
  pesoAdultoKg: number;
  actividadSugerida: 'Baja' | 'Moderada' | 'Alta';
  actividadSugeridaEn?: string;
}

export const CATALOGO_MASCOTAS: CatalogoMascota[] = [
  { raza: "Siamés", razaEn: "Siamese", especie: "Felino", pesoAdultoKg: 4.0, actividadSugerida: "Moderada", actividadSugeridaEn: "Moderate" },
  { raza: "Persa", razaEn: "Persian", especie: "Felino", pesoAdultoKg: 4.5, actividadSugerida: "Baja", actividadSugeridaEn: "Low" },
  { raza: "Maine Coon", razaEn: "Maine Coon", especie: "Felino", pesoAdultoKg: 8.0, actividadSugerida: "Alta", actividadSugeridaEn: "High" },
  { raza: "Común Europeo", razaEn: "European Shorthair", especie: "Felino", pesoAdultoKg: 4.2, actividadSugerida: "Moderada", actividadSugeridaEn: "Moderate" },
  { raza: "Golden Retriever", razaEn: "Golden Retriever", especie: "Canino", pesoAdultoKg: 30.0, actividadSugerida: "Alta", actividadSugeridaEn: "High" },
  { raza: "Pastor Alemán", razaEn: "German Shepherd", especie: "Canino", pesoAdultoKg: 35.0, actividadSugerida: "Alta", actividadSugeridaEn: "High" },
  { raza: "Labrador", razaEn: "Labrador", especie: "Canino", pesoAdultoKg: 28.0, actividadSugerida: "Alta", actividadSugeridaEn: "High" },
  { raza: "Bulldog Francés", razaEn: "French Bulldog", especie: "Canino", pesoAdultoKg: 12.0, actividadSugerida: "Baja", actividadSugeridaEn: "Low" },
  { raza: "Chihuahua", razaEn: "Chihuahua", especie: "Canino", pesoAdultoKg: 2.5, actividadSugerida: "Moderada", actividadSugeridaEn: "Moderate" },
  { raza: "Caniche", razaEn: "Poodle", especie: "Canino", pesoAdultoKg: 6.5, actividadSugerida: "Moderada", actividadSugeridaEn: "Moderate" }
];
